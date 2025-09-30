const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const runpodService = require('../services/runpod.service');
const { v4: uuidv4 } = require('uuid');
const webSocketService = require('../services/websocket.service');
const { deductCredits } = require('../services/subscriptions.service');

/**
 * Generate refine - for image upscaling with various parameters
 */
exports.generateRefine = async (req, res) => {
  try {
    const { 
      imageId, 
      imageUrl, 
      resolution, 
      scaleFactor, 
      aiStrength, 
      resemblance, 
      clarity, 
      sharpness, 
      matchColor,
      variations = 1 
    } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!imageId || !imageUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters: imageId, imageUrl' 
      });
    }

    // Validate variations
    if (variations < 1 || variations > 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Variations must be between 1 and 2' 
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });

    // Check user subscription
    const subscription = user?.subscription;
    if (!subscription || !['STARTER', 'EXPLORER', 'PRO'].includes(subscription.planType) || subscription.status !== 'ACTIVE') {
      return res.status(403).json({
        message: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED'
      });
    }

    // Check user credits
    const now = new Date();
    const activeCredits = user.remainingCredits || 0;

    const availableCredits = activeCredits || 0;
    if (availableCredits < variations) {
      return res.status(402).json({ 
        message: 'Not enough credits',
        required: variations,
        available: availableCredits
      });
    }

    // Determine the original base image ID and validate access
    let originalBaseImageId = null;
    let sourceImage = null;

    // First, try to find as input image
    sourceImage = await prisma.inputImage.findFirst({
      where: {
        id: parseInt(imageId),
        userId: userId
      }
    });

    if (sourceImage) {
      originalBaseImageId = sourceImage.id;
    } else {
      // Try to find as generated image
      sourceImage = await prisma.image.findFirst({
        where: {
          id: parseInt(imageId),
          userId: userId
        }
      });

      if (sourceImage) {
        originalBaseImageId = sourceImage.originalBaseImageId || sourceImage.id;
      }
    }

    if (!sourceImage) {
      return res.status(404).json({ 
        success: false, 
        message: 'Source image not found or access denied' 
      });
    }

    // Start transaction for database operations
    const result = await prisma.$transaction(async (tx) => {
      // Get the preview URL from the source image/input
      let previewUrl = null;
      if (sourceImage) {
        // Check if source is InputImage and get its previewUrl
        if (sourceImage.originalUrl) {
          // This is an InputImage
          previewUrl = sourceImage.previewUrl || sourceImage.originalUrl;
        } else {
          // This is a generated Image, get the original base input image's preview
          const baseInputImage = await tx.inputImage.findUnique({
            where: { id: originalBaseImageId },
            select: { previewUrl: true, originalUrl: true }
          });
          if (baseInputImage) {
            previewUrl = baseInputImage.previewUrl || baseInputImage.originalUrl;
          }
        }
      }

      // Create generation batch
      const batch = await tx.generationBatch.create({
        data: {
          userId,
          moduleType: 'REFINE',
          prompt: 'Image upscaling and enhancement',
          totalVariations: variations,
          status: 'PROCESSING',
          creditsUsed: variations,
          metaData: {
            operationType: 'refine',
            sourceImageId: imageId,
            sourceImageUrl: imageUrl,
            resolution,
            scaleFactor,
            aiStrength,
            resemblance,
            clarity,
            sharpness,
            matchColor
          }
        }
      });

      // Create Image records for each variation
      const imagePromises = Array.from({ length: variations }, async (_, index) => {
        const jobId = uuidv4();

        return await tx.image.create({
          data: {
            userId,
            batchId: batch.id,
            originalBaseImageId,
            previewUrl: previewUrl, // Set preview URL to show the actual base input image
            status: 'PROCESSING',
            runpodJobId: jobId,
            variationNumber: index + 1,
            metadata: {
              operationType: 'refine',
              sourceImageId: imageId,
              sourceImageUrl: imageUrl,
              resolution,
              scaleFactor,
              aiStrength,
              resemblance,
              clarity,
              sharpness,
              matchColor
            }
          }
        });
      });

      const images = await Promise.all(imagePromises);

      // Deduct credits using standardized function
      await deductCredits(userId, variations, `Refine operation - ${variations} variation${variations > 1 ? 's' : ''}`, tx, 'IMAGE_REFINE');

      return { batch, images };
    });

    // Prepare RunPod API calls
    const runpodPromises = result.images.map(async (image, index) => {
      try {
        const runpodParams = {
          webhook: `${process.env.BASE_URL}/api/refine/webhook`,
          jobId: image.runpodJobId,
          uuid: image.id.toString(),
          requestGroup: result.batch.id.toString(),
          task: 'refine',
          rawImage: imageUrl,
          resolution: resolution || { width: 1024, height: 1024 },
          scaleFactor: scaleFactor || 1,
          aiStrength: aiStrength || 12,
          resemblance: resemblance || 12,
          clarity: clarity || 12,
          sharpness: sharpness || 12,
          matchColor: matchColor || true
        };

        console.log(`🚀 Sending refine request to RunPod for image ${image.id}:`, {
          jobId: image.runpodJobId,
          imageId: image.id,
          params: runpodParams
        });

        const runpodResponse = await runpodService.generateRefine(runpodParams);
        
        console.log(`✅ RunPod refine request successful for image ${image.id}:`, runpodResponse);
        
        return { success: true, imageId: image.id, response: runpodResponse };
      } catch (error) {
        console.error(`❌ RunPod refine request failed for image ${image.id}:`, error);
        
        // Update image status to failed
        await prisma.image.update({
          where: { id: image.id },
          data: { 
            status: 'FAILED',
            errorMessage: error.message 
          }
        });
        
        return { success: false, imageId: image.id, error: error.message };
      }
    });

    const runpodResults = await Promise.allSettled(runpodPromises);
    
    // Check if any requests succeeded
    const successfulRequests = runpodResults.filter(result => 
      result.status === 'fulfilled' && result.value.success
    );

    if (successfulRequests.length === 0) {
      // All requests failed, mark batch as failed
      await prisma.generationBatch.update({
        where: { id: result.batch.id },
        data: { status: 'FAILED' }
      });

      return res.status(500).json({
        success: false,
        message: 'All refine requests failed',
        batchId: result.batch.id
      });
    }

    // Send WebSocket notification about generation start
    webSocketService.sendToUser(userId, 'refine_generation_started', {
      batchId: result.batch.id,
      originalBaseImageId,
      variations: variations,
      operationType: 'refine'
    });

    // Calculate remaining credits after deduction
    const remainingCreditsResult = user.remainingCredits || 0;
    const remainingCredits = remainingCreditsResult || 0;

    res.json({
      success: true,
      message: `Refine operation started successfully`,
      batchId: result.batch.id,
      variations: successfulRequests.length,
      remainingCredits: remainingCredits, // Add remaining credits to response
      images: result.images.map(img => ({
        id: img.id,
        status: img.status,
        runpodJobId: img.runpodJobId
      }))
    });

  } catch (error) {
    console.error('Refine generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start refine operation',
      error: error.message
    });
  }
};

/**
 * Get refine operations history for a specific base image
 */
exports.getRefineOperations = async (req, res) => {
  try {
    const { baseImageId } = req.params;
    const userId = req.user.id;

    console.log(`Getting refine operations for baseImageId: ${baseImageId}, userId: ${userId}`);

    // First verify the base image exists and belongs to the user
    const baseImage = await prisma.image.findFirst({
      where: {
        id: parseInt(baseImageId),
        userId: userId
      }
    });

    if (!baseImage) {
      // Check if it's an InputImage instead
      const inputImage = await prisma.inputImage.findFirst({
        where: {
          id: parseInt(baseImageId),
          userId: userId
        }
      });

      if (!inputImage) {
        return res.status(404).json({
          success: false,
          message: 'Base image not found'
        });
      }
    }

    // Look for refine operations that used this base image
    const operations = await prisma.image.findMany({
      where: {
        originalBaseImageId: parseInt(baseImageId),
        userId: userId,
        batch: {
          moduleType: 'REFINE'
        }
      },
      include: {
        batch: {
          include: {
            refineSettings: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${operations.length} refine operations for base image ${baseImageId}`);

    res.json({
      success: true,
      operations: operations || []
    });

  } catch (error) {
    console.error('Get refine operations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get refine operations',
      error: error.message
    });
  }
};

/**
 * Get refine batch results
 */
exports.getRefineBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const userId = req.user.id;

    const batch = await prisma.generationBatch.findFirst({
      where: {
        id: parseInt(batchId),
        userId: userId,
        moduleType: 'REFINE'
      },
      include: {
        images: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Refine batch not found'
      });
    }

    res.json({
      success: true,
      batch
    });

  } catch (error) {
    console.error('Get refine batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get refine batch',
      error: error.message
    });
  }
};

/**
 * Cancel ongoing refine operation
 */
exports.cancelRefineOperation = async (req, res) => {
  try {
    const { operationId } = req.params;
    const userId = req.user.id;

    const operation = await prisma.image.findFirst({
      where: {
        id: parseInt(operationId),
        userId: userId,
        moduleType: 'REFINE',
        status: 'PROCESSING'
      }
    });

    if (!operation) {
      return res.status(404).json({
        success: false,
        message: 'Refine operation not found or not cancellable'
      });
    }

    // Update operation status
    await prisma.image.update({
      where: { id: operation.id },
      data: { status: 'CANCELLED' }
    });

    // TODO: Cancel RunPod job if API supports it

    res.json({
      success: true,
      message: 'Refine operation cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel refine operation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel refine operation',
      error: error.message
    });
  }
};

/**
 * Get refine settings for a specific image
 */
exports.getRefineSettings = async (req, res) => {
  try {
    const { imageId } = req.params;
    const userId = req.user.id;

    // Check if it's an input image or generated image
    let image = await prisma.inputImage.findFirst({
      where: {
        id: parseInt(imageId),
        userId: userId
      }
    });

    if (!image) {
      image = await prisma.image.findFirst({
        where: {
          id: parseInt(imageId),
          userId: userId
        }
      });
    }

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Get saved refine settings from the most recent batch for this image
    let settings = {
      resolution: { width: 1024, height: 1024 },
      scaleFactor: 1,
      aiStrength: 12,
      resemblance: 12,
      clarity: 12,
      sharpness: 12,
      matchColor: true
    };

    // Look for existing refine settings from the most recent batch
    const recentBatch = await prisma.generationBatch.findFirst({
      where: {
        userId: userId,
        moduleType: 'REFINE',
        inputImageId: parseInt(imageId)
      },
      include: {
        refineSettings: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (recentBatch?.refineSettings) {
      settings = {
        resolution: { 
          width: recentBatch.refineSettings.width,
          height: recentBatch.refineSettings.height
        },
        scaleFactor: recentBatch.refineSettings.scaleFactor,
        aiStrength: recentBatch.refineSettings.aiStrength,
        resemblance: recentBatch.refineSettings.resemblance,
        clarity: recentBatch.refineSettings.clarity,
        sharpness: recentBatch.refineSettings.sharpness,
        matchColor: recentBatch.refineSettings.matchColor
      };
    }

    res.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error('Get refine settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get refine settings',
      error: error.message
    });
  }
};

/**
 * Save refine settings for a specific image
 */
exports.saveRefineSettings = async (req, res) => {
  try {
    const { 
      imageId, 
      resolution, 
      scaleFactor, 
      aiStrength, 
      resemblance, 
      clarity, 
      sharpness, 
      matchColor 
    } = req.body;
    const userId = req.user.id;

    if (!imageId) {
      return res.status(400).json({
        success: false,
        message: 'Image ID is required'
      });
    }

    const settings = {
      resolution,
      scaleFactor,
      aiStrength,
      resemblance,
      clarity,
      sharpness,
      matchColor
    };

    // First verify the image exists
    let image = await prisma.inputImage.findFirst({
      where: {
        id: parseInt(imageId),
        userId: userId
      }
    });

    if (!image) {
      image = await prisma.image.findFirst({
        where: {
          id: parseInt(imageId),
          userId: userId
        }
      });
    }

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Create or update refine settings through a batch
    // For settings saving, we'll create a temporary batch or use the most recent one
    let batch = await prisma.generationBatch.findFirst({
      where: {
        userId: userId,
        moduleType: 'REFINE',
        inputImageId: parseInt(imageId)
      },
      include: {
        refineSettings: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (batch?.refineSettings) {
      // Update existing settings
      await prisma.refineSettings.update({
        where: { batchId: batch.id },
        data: {
          width: resolution.width,
          height: resolution.height,
          scaleFactor,
          aiStrength,
          resemblance,
          clarity,
          sharpness,
          matchColor
        }
      });
    } else {
      // Create new batch and settings for saving preferences
      batch = await prisma.generationBatch.create({
        data: {
          userId,
          inputImageId: parseInt(imageId),
          moduleType: 'REFINE',
          prompt: null,
          totalVariations: 1,
          status: 'COMPLETED', // Settings-only batch
          creditsUsed: 0,
          metaData: {
            settingsOnly: true
          }
        }
      });

      await prisma.refineSettings.create({
        data: {
          batchId: batch.id,
          width: resolution.width,
          height: resolution.height,
          scaleFactor,
          aiStrength,
          resemblance,
          clarity,
          sharpness,
          matchColor
        }
      });
    }

    res.json({
      success: true,
      message: 'Refine settings saved successfully',
      settings
    });

  } catch (error) {
    console.error('Save refine settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save refine settings',
      error: error.message
    });
  }
};
