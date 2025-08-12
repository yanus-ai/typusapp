const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { uploadToS3 } = require('../services/image/s3.service');
// const { generateTweakOutpaint, generateTweakInpaint } = require('../services/image/comfyui.service');
const { deductCredits } = require('../services/subscriptions.service');
const runpodService = require('../services/runpod.service');
const { v4: uuidv4 } = require('uuid');
const webSocketService = require('../services/websocket.service');
const s3Service = require('../services/image/s3.service');
const sharp = require('sharp');

// Helper function to calculate remaining credits
async function calculateRemainingCredits(userId) {
  const now = new Date();
  const result = await prisma.creditTransaction.aggregate({
    where: {
      userId: userId,
      status: 'COMPLETED',
      OR: [
        { expiresAt: { gt: now } },
        { expiresAt: null }
      ]
    },
    _sum: {
      amount: true
    }
  });
  return result._sum.amount || 0;
}
const axios = require('axios');

/**
 * Generate outpaint - triggered when canvas bounds are extended
 */
exports.generateOutpaint = async (req, res) => {
  try {
    const { baseImageUrl, canvasBounds, originalImageBounds, variations = 1, originalBaseImageId: providedOriginalBaseImageId, selectedBaseImageId: providedSelectedBaseImageId } = req.body;
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

    // Calculate outpaint bounds (pixels to extend)
    const outpaintBounds = calculateOutpaintPixels(canvasBounds, originalImageBounds);
    
    if (outpaintBounds.top === 0 && outpaintBounds.bottom === 0 && 
        outpaintBounds.left === 0 && outpaintBounds.right === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No outpaint area detected. Canvas bounds must be extended beyond original image.' 
      });
    }

    // Find the original base image ID - prioritize frontend-provided value
    let originalBaseImageId = providedOriginalBaseImageId;
    
    if (!originalBaseImageId) {
      // Fallback: Try to find the image by its URL in both input images and generated images
      try {
        const inputImage = await prisma.inputImage.findFirst({
          where: {
            OR: [
              { originalUrl: baseImageUrl },
              { processedUrl: baseImageUrl }
            ]
          }
        });

        if (inputImage) {
          originalBaseImageId = inputImage.id;
        } else {
          // Look in generated images - if it's a variant, use its originalBaseImageId
          const generatedImage = await prisma.image.findFirst({
            where: {
              processedImageUrl: baseImageUrl
            }
          });
          if (generatedImage) {
            // If the found image is itself a variant, use its original base image ID
            originalBaseImageId = generatedImage.originalBaseImageId || generatedImage.id;
          }
        }
      } catch (error) {
        console.warn('Could not resolve original base image ID:', error.message);
      }
    }

    // Start transaction for database operations
    const result = await prisma.$transaction(async (tx) => {
      // Create generation batch
      const batch = await tx.generationBatch.create({
        data: {
          userId,
          moduleType: 'TWEAK',
          prompt: 'Outpaint image to extend boundaries',
          totalVariations: variations,
          status: 'PROCESSING',
          creditsUsed: variations,
          metaData: {
            operationType: 'outpaint',
            canvasBounds,
            originalImageBounds,
            outpaintBounds
          }
        }
      });

      // Create tweak batch
      const tweakBatch = await tx.tweakBatch.create({
        data: {
          batchId: batch.id,
          baseImageUrl,
          variations
        }
      });

      // Create tweak operation
      const operation = await tx.tweakOperation.create({
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

      // Create image records for each variation
      const imageRecords = [];
      for (let i = 1; i <= variations; i++) {
        const imageRecord = await tx.image.create({
          data: {
            batchId: batch.id,
            userId,
            variationNumber: i,
            status: 'PROCESSING',
            runpodStatus: 'SUBMITTED',
            originalBaseImageId, // Track the original base image for this tweak operation
            metadata: {
              selectedBaseImageId: providedSelectedBaseImageId // Track what the frontend was subscribed to
            }
          }
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
          prompt: '',
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
      selectedBaseImageId: providedSelectedBaseImageId
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

    // Find the original base image ID - prioritize frontend-provided value
    let originalBaseImageId = providedOriginalBaseImageId;
    
    if (!originalBaseImageId) {
      // Fallback: Try to find the image by its URL in both input images and generated images
      try {
        const inputImage = await prisma.inputImage.findFirst({
          where: {
            OR: [
              { originalUrl: baseImageUrl },
              { processedUrl: baseImageUrl }
            ]
          }
        });

        if (inputImage) {
          originalBaseImageId = inputImage.id;
        } else {
          // Look in generated images - if it's a variant, use its originalBaseImageId
          const generatedImage = await prisma.image.findFirst({
            where: {
              processedImageUrl: baseImageUrl
            }
          });
          if (generatedImage) {
            // If the found image is itself a variant, use its original base image ID
            originalBaseImageId = generatedImage.originalBaseImageId || generatedImage.id;
          }
        }
      } catch (error) {
        console.warn('Could not resolve original base image ID:', error.message);
      }
    }

    // Start transaction for database operations
    const result = await prisma.$transaction(async (tx) => {
      // Create generation batch
      const batch = await tx.generationBatch.create({
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
            negativePrompt
          }
        }
      });

      // Create tweak batch
      const tweakBatch = await tx.tweakBatch.create({
        data: {
          batchId: batch.id,
          baseImageUrl,
          variations
        }
      });

      // Create tweak operation
      const operation = await tx.tweakOperation.create({
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

      // Create image records for each variation
      const imageRecords = [];
      for (let i = 1; i <= variations; i++) {
        const imageRecord = await tx.image.create({
          data: {
            batchId: batch.id,
            userId,
            variationNumber: i,
            status: 'PROCESSING',
            runpodStatus: 'SUBMITTED',
            originalBaseImageId, // Track the original base image for this tweak operation
            metadata: {
              selectedBaseImageId: providedSelectedBaseImageId // Track what the frontend was subscribed to
            }
          }
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

