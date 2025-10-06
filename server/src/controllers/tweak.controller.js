const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { uploadToS3 } = require('../services/image/s3.service');
// const { generateTweakOutpaint, generateTweakInpaint } = require('../services/image/comfyui.service');
const { deductCredits, isSubscriptionUsable } = require('../services/subscriptions.service');
const runpodService = require('../services/runpod.service');
const { v4: uuidv4 } = require('uuid');
const webSocketService = require('../services/websocket.service');
const imageTaggingService = require('../services/imageTagging.service');
const s3Service = require('../services/image/s3.service');
const sharp = require('sharp');
const axios = require('axios');

// Helper function to calculate remaining credits
async function calculateRemainingCredits(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  const result = user.remainingCredits;
  return result || 0;
}

/**
 * Generate outpaint - triggered when canvas bounds are extended
 */
exports.generateOutpaint = async (req, res) => {
  try {
    const { baseImageUrl, canvasBounds, originalImageBounds, variations = 1, originalBaseImageId: providedOriginalBaseImageId, selectedBaseImageId: providedSelectedBaseImageId, prompt = '', existingBatchId = null } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!baseImageUrl || !canvasBounds || !originalImageBounds) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: baseImageUrl, canvasBounds, originalImageBounds'
      });
    }

    // Validate variations
    if (variations < 1 || variations > 2) {
      return res.status(400).json({
        success: false,
        message: 'Variations must be between 1 and 2'
      });
    }

    // Check user subscription and credits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });

    const subscription = user?.subscription;
    if (!subscription || !['STARTER', 'EXPLORER', 'PRO'].includes(subscription.planType) || !isSubscriptionUsable(subscription)) {
      return res.status(403).json({
        message: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED'
      });
    }

    const availableCredits = user.remainingCredits || 0;
    if (availableCredits < variations) {
      return res.status(402).json({
        message: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        required: variations,
        available: availableCredits
      });
    }

    // Calculate outpaint bounds (pixels to extend)
    const outpaintBounds = calculateOutpaintPixels(canvasBounds, originalImageBounds);
    
    if (outpaintBounds.top === 0 && outpaintBounds.bottom === 0 && 
        outpaintBounds.left === 0 && outpaintBounds.right === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No outpaint area detected. Canvas bounds must be extended beyond original image.' 
      });
    }

    // Find the original base image ID - this should reference a generated Image record
    let originalBaseImageId = null;
    
    // First, try to find the generated image by URL
    try {
      const generatedImage = await prisma.image.findFirst({
        where: {
          OR: [
            { originalImageUrl: baseImageUrl },
            { processedImageUrl: baseImageUrl }
          ]
        }
      });
      
      if (generatedImage) {
        // If the found image is itself a variant, use its original base image ID, otherwise use its own ID
        originalBaseImageId = generatedImage.originalBaseImageId; // SECURITY: Don't fall back to generated image ID
      } else if (providedOriginalBaseImageId) {
        // If frontend provided an ID, verify it exists in the Image table
        const providedImage = await prisma.image.findUnique({
          where: { id: providedOriginalBaseImageId }
        });
        if (providedImage) {
          originalBaseImageId = providedOriginalBaseImageId;
        }
      }
    } catch (error) {
      console.warn('Could not resolve original base image ID:', error.message);
    }
    
    // Debug logging
    console.log('📍 OUTPAINT DEBUG: originalBaseImageId resolution:', {
      providedOriginalBaseImageId,
      resolvedOriginalBaseImageId: originalBaseImageId,
      baseImageUrl
    });
    
    // For outpaint operations, originalBaseImageId is optional - if we can't find it, we'll proceed without it
    // This allows outpainting of input images that haven't been generated yet
    if (originalBaseImageId) {
      // Verify that the originalBaseImageId exists in the database
      const baseImageExists = await prisma.image.findUnique({
        where: { id: originalBaseImageId }
      });
      
      console.log('📍 OUTPAINT DEBUG: baseImageExists check:', {
        originalBaseImageId,
        exists: !!baseImageExists,
        baseImageData: baseImageExists
      });
      
      if (!baseImageExists) {
        console.warn('⚠️ originalBaseImageId does not exist in Image table, proceeding without it:', originalBaseImageId);
        originalBaseImageId = null;
      }
    }

    // Start transaction for database operations
    const result = await prisma.$transaction(async (tx) => {
      let batch;
      let tweakBatch;

      if (existingBatchId) {
        // Use existing batch and update its totals
        batch = await tx.generationBatch.findFirst({
          where: {
            id: parseInt(existingBatchId),
            userId: userId,
            moduleType: 'TWEAK'
          },
          include: {
            tweakBatch: true
          }
        });

        if (!batch) {
          throw new Error(`Existing tweak batch ${existingBatchId} not found or access denied`);
        }

        // Update batch totals
        batch = await tx.generationBatch.update({
          where: { id: batch.id },
          data: {
            totalVariations: batch.totalVariations + variations,
            creditsUsed: batch.creditsUsed + variations,
            status: 'PROCESSING' // Ensure it's processing again
          }
        });

        // Get the tweakBatch with proper ID
        tweakBatch = await tx.tweakBatch.findFirst({
          where: { batchId: batch.id }
        });
        console.log('📦 Using existing tweak batch:', batch.id, 'tweakBatch ID:', tweakBatch?.id, 'new total variations:', batch.totalVariations);
      } else {
        // Create generation batch with enhanced metadata
        batch = await tx.generationBatch.create({
          data: {
            userId,
            moduleType: 'TWEAK',
            prompt: prompt || '',
            totalVariations: variations,
            status: 'PROCESSING',
            creditsUsed: variations,
            metaData: {
              operationType: 'outpaint',
              canvasBounds,
              originalImageBounds,
              outpaintBounds,
              // Enhanced metadata for better tracking
              tweakSettings: {
                prompt: prompt || '',
                variations,
                operationType: 'outpaint',
                canvasBounds,
                originalImageBounds,
                outpaintBounds,
                baseImageUrl
              }
            }
          }
        });

        // Create tweak batch
        tweakBatch = await tx.tweakBatch.create({
          data: {
            batchId: batch.id,
            baseImageUrl,
            variations
          }
        });

        console.log('📦 Created new tweak batch:', batch.id);
      }

      // Create tweak operation only for new batches
      let operation;
      if (!existingBatchId) {
        operation = await tx.tweakOperation.create({
          data: {
            tweakBatchId: tweakBatch.id,
            operationType: 'SELECT_RESIZE',
            operationData: {
              canvasBounds,
              originalImageBounds,
              outpaintBounds,
              extendedAreas: calculateExtendedAreas(canvasBounds, originalImageBounds)
            },
            sequenceOrder: 1
          }
        });
      } else {
        // Use existing operation
        operation = await tx.tweakOperation.findFirst({
          where: { tweakBatchId: tweakBatch.id }
        });
      }

      // Get the highest variation number from existing images in this batch
      const existingImages = await tx.image.findMany({
        where: { batchId: batch.id },
        select: { variationNumber: true },
        orderBy: { variationNumber: 'desc' },
        take: 1
      });

      const nextVariationNumber = existingImages.length > 0 ? existingImages[0].variationNumber + 1 : 1;
      console.log('📊 Next variation number for batch', batch.id, ':', nextVariationNumber);

      // Create image records for each variation with FULL prompt storage
      const imageRecords = [];
      for (let i = 0; i < variations; i++) {
        const imageData = {
          batchId: batch.id,
          userId,
          variationNumber: nextVariationNumber + i,
          status: 'PROCESSING',
          runpodStatus: 'SUBMITTED',
          // 🔥 ENHANCEMENT: Store full prompt details like Create section
          aiPrompt: prompt || '',
          settingsSnapshot: {
            prompt: prompt || '',
            variations,
            operationType: 'outpaint',
            moduleType: 'TWEAK',
            baseImageUrl,
            canvasBounds,
            originalImageBounds,
            outpaintBounds,
            timestamp: new Date().toISOString()
          },
          metadata: {
            selectedBaseImageId: providedSelectedBaseImageId, // Track what the frontend was subscribed to
            tweakOperation: 'outpaint',
            operationData: {
              canvasBounds,
              originalImageBounds,
              outpaintBounds
            }
          }
        };

        // Only include originalBaseImageId if it's not null (to avoid foreign key constraint violation)
        if (originalBaseImageId) {
          imageData.originalBaseImageId = originalBaseImageId;
        }

        const imageRecord = await tx.image.create({
          data: imageData
        });
        imageRecords.push(imageRecord);
      }

      // Deduct credits
      await deductCredits(userId, variations, `Outpaint generation - ${variations} variation(s)`, tx, 'IMAGE_TWEAK');

      return { batch, tweakBatch, operation, imageRecords };
    });

    // Generate each variation
    const generationPromises = result.imageRecords.map(async (imageRecord, index) => {
      try {
        const uuid = uuidv4();
        const jobId = imageRecord.id;
        
        const runpodResponse = await runpodService.generateOutpaint({
          webhook: `${process.env.BASE_URL}/api/tweak/outpaint/webhook`,
          image: baseImageUrl,
          top: outpaintBounds.top,
          bottom: outpaintBounds.bottom,
          left: outpaintBounds.left,
          right: outpaintBounds.right,
          prompt: prompt || '',
          seed: Math.floor(Math.random() * 1000000) + index, // Different seed for each variation
          steps: 30,
          cfg: 3.5,
          denoise: 1,
          jobId,
          uuid,
          task: 'outpaint'
        });

        if (runpodResponse.success) {
          // Update image record with RunPod ID
          await prisma.image.update({
            where: { id: imageRecord.id },
            data: { 
              runpodJobId: runpodResponse.runpodId,
              runpodStatus: 'IN_QUEUE'
            }
          });

          console.log(`Outpaint variation ${index + 1} submitted to RunPod:`, {
            imageId: imageRecord.id,
            runpodJobId: runpodResponse.runpodId,
            jobId
          });
        } else {
          throw new Error(runpodResponse.error || 'Failed to submit to RunPod');
        }

      } catch (error) {
        console.error(`Outpaint variation ${index + 1} failed:`, error);
        
        // Update image status to failed
        await prisma.image.update({
          where: { id: imageRecord.id },
          data: { status: 'FAILED', runpodStatus: 'FAILED' }
        }).catch(console.error);
      }
    });

    // Wait for all variations to be submitted (don't wait for completion)
    await Promise.allSettled(generationPromises);

    // Calculate remaining credits after deduction
    const remainingCredits = await calculateRemainingCredits(userId);

    res.json({
      success: true,
      data: {
        batchId: result.batch.id,
        operationId: result.operation.id,
        imageIds: result.imageRecords.map(img => img.id),
        variations,
        outpaintBounds,
        remainingCredits: remainingCredits, // Add remaining credits
        status: 'processing'
      }
    });

  } catch (error) {
    console.error('Error generating outpaint:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate outpaint',
      error: error.message 
    });
  }
};

/**
 * Generate inpaint - for selected regions with prompt
 */
exports.generateInpaint = async (req, res) => {
  try {
    const {
      baseImageUrl,
      maskImageUrl,
      prompt,
      negativePrompt,
      maskKeyword,
      variations = 1,
      originalBaseImageId: providedOriginalBaseImageId,
      selectedBaseImageId: providedSelectedBaseImageId,
      existingBatchId = null
    } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!baseImageUrl || !maskImageUrl || !prompt) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: baseImageUrl, maskImageUrl, and prompt'
      });
    }

    // Validate variations
    if (variations < 1 || variations > 2) {
      return res.status(400).json({
        success: false,
        message: 'Variations must be between 1 and 2'
      });
    }

    // Check user subscription and credits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });

    const subscription = user?.subscription;
    if (!subscription || !['STARTER', 'EXPLORER', 'PRO'].includes(subscription.planType) || !isSubscriptionUsable(subscription)) {
      return res.status(403).json({
        message: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED'
      });
    }

    const availableCredits = user.remainingCredits || 0;
    if (availableCredits < variations) {
      return res.status(402).json({
        message: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        required: variations,
        available: availableCredits
      });
    }

    // Find the original base image ID - this should reference a generated Image record
    let originalBaseImageId = null;
    
    // First, try to find the generated image by URL
    try {
      const generatedImage = await prisma.image.findFirst({
        where: {
          OR: [
            { originalImageUrl: baseImageUrl },
            { processedImageUrl: baseImageUrl }
          ]
        }
      });
      
      if (generatedImage) {
        // If the found image is itself a variant, use its original base image ID, otherwise use its own ID
        originalBaseImageId = generatedImage.originalBaseImageId; // SECURITY: Don't fall back to generated image ID
      } else if (providedOriginalBaseImageId) {
        // If frontend provided an ID, verify it exists in the Image table
        const providedImage = await prisma.image.findUnique({
          where: { id: providedOriginalBaseImageId }
        });
        if (providedImage) {
          originalBaseImageId = providedOriginalBaseImageId;
        }
      }
    } catch (error) {
      console.warn('Could not resolve original base image ID:', error.message);
    }
    
    // Debug logging
    console.log('📍 INPAINT DEBUG: originalBaseImageId resolution:', {
      providedOriginalBaseImageId,
      resolvedOriginalBaseImageId: originalBaseImageId,
      baseImageUrl
    });
    
    // For inpaint operations, originalBaseImageId is optional - if we can't find it, we'll proceed without it
    // This allows inpainting of input images that haven't been generated yet
    if (originalBaseImageId) {
      // Verify that the originalBaseImageId exists in the database
      const baseImageExists = await prisma.image.findUnique({
        where: { id: originalBaseImageId }
      });
      
      console.log('📍 INPAINT DEBUG: baseImageExists check:', {
        originalBaseImageId,
        exists: !!baseImageExists,
        baseImageData: baseImageExists
      });
      
      if (!baseImageExists) {
        console.warn('⚠️ originalBaseImageId does not exist in Image table, proceeding without it:', originalBaseImageId);
        originalBaseImageId = null;
      }
    }

    // Start transaction for database operations
    const result = await prisma.$transaction(async (tx) => {
      let batch;
      let tweakBatch;

      if (existingBatchId) {
        // Use existing batch and update its totals
        batch = await tx.generationBatch.findFirst({
          where: {
            id: parseInt(existingBatchId),
            userId: userId,
            moduleType: 'TWEAK'
          },
          include: {
            tweakBatch: true
          }
        });

        if (!batch) {
          throw new Error(`Existing tweak batch ${existingBatchId} not found or access denied`);
        }

        // Update batch totals
        batch = await tx.generationBatch.update({
          where: { id: batch.id },
          data: {
            totalVariations: batch.totalVariations + variations,
            creditsUsed: batch.creditsUsed + variations,
            status: 'PROCESSING' // Ensure it's processing again
          }
        });

        // Get the tweakBatch with proper ID
        tweakBatch = await tx.tweakBatch.findFirst({
          where: { batchId: batch.id }
        });
        console.log('📦 Using existing tweak batch for inpaint:', batch.id, 'tweakBatch ID:', tweakBatch?.id, 'new total variations:', batch.totalVariations);
      } else {
        // Create generation batch with enhanced metadata
        batch = await tx.generationBatch.create({
          data: {
            userId,
            moduleType: 'TWEAK',
            prompt: prompt,
            totalVariations: variations,
            status: 'PROCESSING',
            creditsUsed: variations,
            metaData: {
              operationType: 'inpaint',
              maskKeyword,
              negativePrompt,
              // Enhanced metadata for better tracking
              tweakSettings: {
                prompt,
                maskKeyword,
                negativePrompt,
                variations,
                operationType: 'inpaint',
                baseImageUrl,
                maskImageUrl
              }
            }
          }
        });

        // Create tweak batch
        tweakBatch = await tx.tweakBatch.create({
          data: {
            batchId: batch.id,
            baseImageUrl,
            variations
          }
        });

        console.log('📦 Created new tweak batch for inpaint:', batch.id);
      }

      // Create tweak operation only for new batches
      let operation;
      if (!existingBatchId) {
        operation = await tx.tweakOperation.create({
          data: {
            tweakBatchId: tweakBatch.id,
            operationType: 'CHANGE_REGION',
            operationData: {
              maskImageUrl,
              prompt,
              negativePrompt,
              maskKeyword
            },
            sequenceOrder: 1
          }
        });
      } else {
        // Use existing operation
        operation = await tx.tweakOperation.findFirst({
          where: { tweakBatchId: tweakBatch.id }
        });
      }

      // Get the highest variation number from existing images in this batch
      const existingImages = await tx.image.findMany({
        where: { batchId: batch.id },
        select: { variationNumber: true },
        orderBy: { variationNumber: 'desc' },
        take: 1
      });

      const nextVariationNumber = existingImages.length > 0 ? existingImages[0].variationNumber + 1 : 1;
      console.log('📊 Next variation number for inpaint batch', batch.id, ':', nextVariationNumber);

      // Create image records for each variation with FULL prompt storage
      const imageRecords = [];
      for (let i = 0; i < variations; i++) {
        const imageData = {
          batchId: batch.id,
          userId,
          variationNumber: nextVariationNumber + i,
          status: 'PROCESSING',
          runpodStatus: 'SUBMITTED',
          // 🔥 ENHANCEMENT: Store full prompt details like Create section
          aiPrompt: prompt,
          settingsSnapshot: {
            prompt,
            maskKeyword,
            negativePrompt,
            variations,
            operationType: 'inpaint',
            moduleType: 'TWEAK',
            baseImageUrl,
            maskImageUrl,
            timestamp: new Date().toISOString()
          },
          metadata: {
            selectedBaseImageId: providedSelectedBaseImageId, // Track what the frontend was subscribed to
            tweakOperation: 'inpaint',
            operationData: {
              maskKeyword,
              negativePrompt,
              maskImageUrl
            }
          }
        };

        // Only include originalBaseImageId if it's not null (to avoid foreign key constraint violation)
        if (originalBaseImageId) {
          imageData.originalBaseImageId = originalBaseImageId;
        }

        const imageRecord = await tx.image.create({
          data: imageData
        });
        imageRecords.push(imageRecord);
      }

      // Deduct credits
      await deductCredits(userId, variations, `Inpaint generation - ${variations} variation(s)`, tx, 'IMAGE_TWEAK');

      return { batch, tweakBatch, operation, imageRecords };
    });

    // Generate each variation
    const generationPromises = result.imageRecords.map(async (imageRecord, index) => {
      try {
        const uuid = uuidv4();
        const jobId = imageRecord.id;
        
        const runpodResponse = await runpodService.generateInpaint({
          webhook: `${process.env.BASE_URL}/api/tweak/inpaint/webhook`,
          image: baseImageUrl,
          mask: maskImageUrl,
          prompt: prompt,
          negativePrompt: negativePrompt || 'saturated full colors, neon lights,blurry  jagged edges, noise, and pixelation, oversaturated, unnatural colors or gradients  overly smooth or plastic-like surfaces, imperfections. deformed, watermark, (face asymmetry, eyes asymmetry, deformed eyes, open mouth), low quality, worst quality, blurry, soft, noisy extra digits, fewer digits, and bad anatomy. Poor Texture Quality: Avoid repeating patterns that are noticeable and break the illusion of realism. ,sketch, graphite, illustration, Unrealistic Proportions and Scale:  incorrect proportions. Out of scale',
          seed: Math.floor(Math.random() * 1000000) + index, // Different seed for each variation
          steps: 40,
          cfg: 1,
          denoise: 1,
          jobId,
          uuid,
          task: 'inpaint'
        });

        if (runpodResponse.success) {
          // Update image record with RunPod ID
          await prisma.image.update({
            where: { id: imageRecord.id },
            data: { 
              runpodJobId: runpodResponse.runpodId,
              runpodStatus: 'IN_QUEUE'
            }
          });

          console.log(`Inpaint variation ${index + 1} submitted to RunPod:`, {
            imageId: imageRecord.id,
            runpodJobId: runpodResponse.runpodId,
            jobId
          });
        } else {
          throw new Error(runpodResponse.error || 'Failed to submit to RunPod');
        }

      } catch (error) {
        console.error(`Inpaint variation ${index + 1} failed:`, error);
        
        // Update image status to failed
        await prisma.image.update({
          where: { id: imageRecord.id },
          data: { status: 'FAILED', runpodStatus: 'FAILED' }
        }).catch(console.error);
      }
    });

    // Wait for all variations to be submitted (don't wait for completion)
    await Promise.allSettled(generationPromises);

    // Calculate remaining credits after deduction
    const remainingCredits = await calculateRemainingCredits(userId);

    res.json({
      success: true,
      data: {
        batchId: result.batch.id,
        operationId: result.operation.id,
        imageIds: result.imageRecords.map(img => img.id),
        variations,
        remainingCredits: remainingCredits, // Add remaining credits
        status: 'processing'
      }
    });

  } catch (error) {
    console.error('Error generating inpaint:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate inpaint',
      error: error.message 
    });
  }
};

/**
 * Add image to canvas
 */
exports.addImageToCanvas = async (req, res) => {
  try {
    const { baseImageId, position, size } = req.body;
    const userId = req.user.id;
    const uploadedFile = req.file;

    // Validate input
    if (!baseImageId || !uploadedFile || !position || !size) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters: baseImageId, image file, position, size' 
      });
    }

    // Upload added image to S3
    const uploadResult = await uploadToS3(uploadedFile, 'tweak-images');
    
    // Get base image
    const inputImage = await prisma.inputImage.findFirst({
      where: { id: parseInt(baseImageId), userId }
    });

    if (!inputImage) {
      return res.status(404).json({ 
        success: false, 
        message: 'Base image not found' 
      });
    }

    // Create generation batch
    const batch = await prisma.generationBatch.create({
      data: {
        userId,
        inputImageId: parseInt(baseImageId),
        moduleType: 'TWEAK',
        prompt: 'Add image to canvas',
        totalVariations: 1,
        status: 'PROCESSING',
        creditsUsed: 1,
        metaData: {
          operationType: 'add_image',
          addedImageUrl: uploadResult.url,
          position: JSON.parse(position),
          size: JSON.parse(size)
        }
      }
    });

    // Create tweak batch
    const tweakBatch = await prisma.tweakBatch.create({
      data: {
        batchId: batch.id,
        baseImageUrl: inputImage.originalUrl,
        variations: 1
      }
    });

    // Create tweak operation
    const operation = await prisma.tweakOperation.create({
      data: {
        tweakBatchId: tweakBatch.id,
        operationType: 'ADD_IMAGE',
        operationData: {
          addedImageUrl: uploadResult.url,
          position: JSON.parse(position),
          size: JSON.parse(size)
        },
        sequenceOrder: 1
      }
    });

    // Create image record for the result
    const imageRecord = await prisma.image.create({
      data: {
        batchId: batch.id,
        userId,
        variationNumber: 1,
        status: 'PROCESSING',
        runpodStatus: 'SUBMITTED'
      }
    });

    // Deduct credits
    await deductCredits(userId, 1, `Add image to canvas operation`, prisma, 'IMAGE_TWEAK');

    res.json({
      success: true,
      data: {
        batchId: batch.id,
        operationId: operation.id,
        imageId: imageRecord.id,
        addedImageUrl: uploadResult.url,
        status: 'processing'
      }
    });

  } catch (error) {
    console.error('Error adding image to canvas:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add image to canvas',
      error: error.message 
    });
  }
};

/**
 * Get tweak operations for a base image
 */
exports.getTweakOperations = async (req, res) => {
  try {
    const { baseImageId } = req.params;
    const userId = req.user.id;

    const operations = await prisma.tweakOperation.findMany({
      where: {
        tweakBatch: {
          batch: {
            userId,
            inputImageId: parseInt(baseImageId)
          }
        }
      },
      include: {
        tweakBatch: {
          include: {
            batch: {
              include: {
                variations: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: operations
    });

  } catch (error) {
    console.error('Error fetching tweak operations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch tweak operations',
      error: error.message 
    });
  }
};

/**
 * Get tweak batch details
 */
exports.getTweakBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const userId = req.user.id;

    const batch = await prisma.generationBatch.findFirst({
      where: {
        id: parseInt(batchId),
        userId,
        moduleType: 'TWEAK'
      },
      include: {
        tweakBatch: {
          include: {
            operations: true
          }
        },
        variations: true
      }
    });

    if (!batch) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tweak batch not found' 
      });
    }

    res.json({
      success: true,
      data: batch
    });

  } catch (error) {
    console.error('Error fetching tweak batch:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch tweak batch',
      error: error.message 
    });
  }
};

/**
 * Cancel ongoing tweak operation
 */
exports.cancelTweakOperation = async (req, res) => {
  try {
    const { operationId } = req.params;
    const userId = req.user.id;

    // Find operation and verify ownership
    const operation = await prisma.tweakOperation.findFirst({
      where: {
        id: parseInt(operationId),
        tweakBatch: {
          batch: {
            userId
          }
        }
      },
      include: {
        tweakBatch: {
          include: {
            batch: {
              include: {
                variations: true
              }
            }
          }
        }
      }
    });

    if (!operation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tweak operation not found' 
      });
    }

    // Update operation status (if needed)
    // TODO: Cancel RunPod job if still running

    // Update image status to failed
    const imageUpdates = operation.tweakBatch.batch.variations.map(img => 
      prisma.image.update({
        where: { id: img.id },
        data: { status: 'FAILED', runpodStatus: 'CANCELLED' }
      })
    );

    await Promise.all(imageUpdates);

    // Update batch status
    await prisma.generationBatch.update({
      where: { id: operation.tweakBatch.batchId },
      data: { status: 'FAILED' }
    });

    res.json({
      success: true,
      message: 'Tweak operation cancelled'
    });

  } catch (error) {
    console.error('Error cancelling tweak operation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cancel tweak operation',
      error: error.message 
    });
  }
};


/**
 * Helper function to calculate outpaint pixels from canvas and original image bounds
 */
function calculateOutpaintPixels(canvasBounds, originalImageBounds) {
  return {
    top: Math.max(0, originalImageBounds.y - canvasBounds.y),
    bottom: Math.max(0, (canvasBounds.y + canvasBounds.height) - (originalImageBounds.y + originalImageBounds.height)),
    left: Math.max(0, originalImageBounds.x - canvasBounds.x),
    right: Math.max(0, (canvasBounds.x + canvasBounds.width) - (originalImageBounds.x + originalImageBounds.width))
  };
}

/**
 * Helper function to calculate extended areas for outpainting
 */
function calculateExtendedAreas(newBounds, originalBounds) {
  const extended = [];
  
  // Top extension
  if (newBounds.y < originalBounds.y) {
    extended.push({
      area: 'top',
      bounds: {
        x: newBounds.x,
        y: newBounds.y,
        width: newBounds.width,
        height: originalBounds.y - newBounds.y
      }
    });
  }
  
  // Bottom extension
  if (newBounds.y + newBounds.height > originalBounds.y + originalBounds.height) {
    extended.push({
      area: 'bottom',
      bounds: {
        x: newBounds.x,
        y: originalBounds.y + originalBounds.height,
        width: newBounds.width,
        height: (newBounds.y + newBounds.height) - (originalBounds.y + originalBounds.height)
      }
    });
  }
  
  // Left extension
  if (newBounds.x < originalBounds.x) {
    extended.push({
      area: 'left',
      bounds: {
        x: newBounds.x,
        y: originalBounds.y,
        width: originalBounds.x - newBounds.x,
        height: originalBounds.height
      }
    });
  }
  
  // Right extension
  if (newBounds.x + newBounds.width > originalBounds.x + originalBounds.width) {
    extended.push({
      area: 'right',
      bounds: {
        x: originalBounds.x + originalBounds.width,
        y: originalBounds.y,
        width: (newBounds.x + newBounds.width) - (originalBounds.x + originalBounds.width),
        height: originalBounds.height
      }
    });
  }
  
  return extended;
}

/**
 * Create InputImage from tweak generated image - for "Create Again" functionality
 */
exports.createInputImageFromTweakGenerated = async (req, res) => {
  try {
    const { 
      generatedImageUrl, 
      generatedThumbnailUrl, 
      originalInputImageId, 
      fileName, 
      tweakSettings,
      uploadSource = 'TWEAK_MODULE' 
    } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!generatedImageUrl || !originalInputImageId || !fileName) {
      return res.status(400).json({
        success: false,
        message: 'Generated image URL, original input image ID, and file name are required'
      });
    }

    console.log('📋 Creating InputImage from tweak generated image:', {
      generatedImageUrl,
      originalInputImageId,
      fileName,
      uploadSource,
      userId
    });

    // Test S3 connection first
    const s3Connected = await s3Service.testConnection();
    if (!s3Connected) {
      return res.status(500).json({ 
        success: false, 
        message: 'S3 service unavailable' 
      });
    }

    // Verify the original input image exists and belongs to the user
    const originalInputImage = await prisma.inputImage.findFirst({
      where: { 
        id: parseInt(originalInputImageId, 10),
        userId: userId
      }
    });

    if (!originalInputImage) {
      return res.status(404).json({
        success: false,
        message: 'Original input image not found or access denied'
      });
    }

    // Download the generated image
    console.log('🔄 Downloading generated image from URL:', generatedImageUrl);
    const response = await axios({
      method: 'GET',
      url: generatedImageUrl,
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YanusWebhook/1.0)'
      }
    });
    const imageBuffer = Buffer.from(response.data);
    console.log('✅ Downloaded image, size:', imageBuffer.length);

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    console.log('📏 Image dimensions:', {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
    });

    // Upload original image to S3
    const s3Key = `tweak-inputs/${userId}/${Date.now()}-${fileName}`;
    const uploadResult = await s3Service.uploadBuffer(imageBuffer, s3Key, {
      ContentType: metadata.format === 'png' ? 'image/png' : 'image/jpeg'
    });
    
    const s3Url = uploadResult.Location || uploadResult.location;
    console.log('✅ Uploaded original image to S3:', s3Url);

    // Create thumbnail if not provided
    let thumbnailS3Url = null;
    if (generatedThumbnailUrl) {
      try {
        console.log('🔄 Downloading thumbnail from URL:', generatedThumbnailUrl);
        const thumbnailResponse = await axios({
          method: 'GET',
          url: generatedThumbnailUrl,
          responseType: 'arraybuffer',
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; YanusWebhook/1.0)'
          }
        });
        const thumbnailBuffer = Buffer.from(thumbnailResponse.data);
        
        const thumbnailS3Key = `tweak-inputs/thumbnails/${userId}/${Date.now()}-thumb-${fileName}`;
        const thumbnailUploadResult = await s3Service.uploadBuffer(thumbnailBuffer, thumbnailS3Key, {
          ContentType: 'image/jpeg'
        });
        
        thumbnailS3Url = thumbnailUploadResult.Location || thumbnailUploadResult.location;
        console.log('✅ Uploaded thumbnail to S3:', thumbnailS3Url);
      } catch (error) {
        console.warn('⚠️ Failed to process thumbnail, continuing without it:', error.message);
      }
    }

    // Create new InputImage record
    const newInputImage = await prisma.inputImage.create({
      data: {
        userId,
        originalUrl: s3Url,
        processedUrl: s3Url,
        thumbnailUrl: thumbnailS3Url,
        fileName,
        fileSize: imageBuffer.length,
        dimensions: {
          width: metadata.width,
          height: metadata.height
        },
        uploadSource,
        // Store reference to the generated image this was created from
        sourceGeneratedImageId: null, // We don't have access to the generated image ID in this context
        // Copy tweak-specific metadata
        metadata: {
          sourceType: 'TWEAK_GENERATED',
          originalInputImageId: parseInt(originalInputImageId),
          originalTweakSettings: tweakSettings,
          createdFromTweakResult: true,
          generatedImageUrl,
          timestamp: new Date().toISOString()
        }
      }
    });

    console.log('✅ Created new InputImage from tweak generated image:', newInputImage.id);

    // Trigger image tagging for REFINE_MODULE uploads
    if (uploadSource === 'REFINE_MODULE') {
      try {
        console.log('🏷️ Triggering image tagging for REFINE_MODULE upload...');

        // Update status to indicate tagging is starting
        await prisma.inputImage.update({
          where: { id: newInputImage.id },
          data: {
            taggingStatus: 'processing',
            updatedAt: new Date()
          }
        });

        const tagResult = await imageTaggingService.generateImageTags({
          imageUrl: newInputImage.originalUrl,
          inputImageId: newInputImage.id
        });

        if (tagResult.success) {
          console.log('✅ Image tagging initiated successfully:', {
            inputImageId: newInputImage.id,
            predictionId: tagResult.predictionId
          });

          // Send WebSocket notification that tagging has started
          const webSocketService = require('../services/websocket.service');
          webSocketService.sendToUser(userId, {
            type: 'image_tagging_started',
            data: {
              inputImageId: newInputImage.id,
              predictionId: tagResult.predictionId,
              status: 'processing'
            }
          });

        } else {
          console.warn('⚠️ Image tagging failed to initiate:', {
            inputImageId: newInputImage.id,
            error: tagResult.error
          });

          // Update status to failed and notify
          await prisma.inputImage.update({
            where: { id: newInputImage.id },
            data: {
              taggingStatus: 'failed',
              updatedAt: new Date()
            }
          });

          const webSocketService = require('../services/websocket.service');
          webSocketService.sendToUser(userId, {
            type: 'image_tagging_failed',
            data: {
              inputImageId: newInputImage.id,
              error: tagResult.error
            }
          });
        }
      } catch (tagError) {
        console.error('❌ Error triggering image tagging:', {
          inputImageId: newInputImage.id,
          error: tagError.message
        });

        // Update status to failed and notify
        await prisma.inputImage.update({
          where: { id: newInputImage.id },
          data: {
            taggingStatus: 'failed',
            updatedAt: new Date()
          }
        }).catch(console.error);

        const webSocketService = require('../services/websocket.service');
        webSocketService.sendToUser(userId, {
          type: 'image_tagging_failed',
          data: {
            inputImageId: newInputImage.id,
            error: tagError.message
          }
        });

        // Don't fail the entire request if tagging fails
      }
    }

    res.json({
      success: true,
      data: {
        id: newInputImage.id,
        originalUrl: newInputImage.originalUrl,
        processedUrl: newInputImage.processedUrl,
        imageUrl: newInputImage.originalUrl,
        thumbnailUrl: newInputImage.thumbnailUrl,
        fileName: newInputImage.fileName,
        uploadSource: newInputImage.uploadSource,
        isProcessed: true,
        createdAt: newInputImage.createdAt,
        metadata: newInputImage.metadata
      }
    });

  } catch (error) {
    console.error('❌ Error creating InputImage from tweak generated image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create input image from generated result',
      error: error.message
    });
  }
};

