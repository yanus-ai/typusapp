const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { uploadToS3 } = require('../services/image/s3.service');
const { generateTweakOutpaint, generateTweakInpaint } = require('../services/image/comfyui.service');
const { deductCredits } = require('../services/subscriptions.service');

/**
 * Generate outpaint - triggered when canvas bounds are extended
 */
exports.generateOutpaint = async (req, res) => {
  try {
    const { baseImageId, newBounds, originalBounds } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!baseImageId || !newBounds || !originalBounds) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters: baseImageId, newBounds, originalBounds' 
      });
    }

    // Get base image
    const inputImage = await prisma.inputImage.findFirst({
      where: { id: baseImageId, userId }
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
        inputImageId: baseImageId,
        moduleType: 'TWEAK',
        prompt: `Outpaint image to extend boundaries`,
        totalVariations: 1,
        status: 'PROCESSING',
        creditsUsed: 1,
        metaData: {
          operationType: 'outpaint',
          newBounds,
          originalBounds
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
        operationType: 'SELECT_RESIZE',
        operationData: {
          newBounds,
          originalBounds,
          extendedAreas: calculateExtendedAreas(newBounds, originalBounds)
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
    await deductCredits(userId, 1, 'IMAGE_TWEAK', batch.id);

    // Start ComfyUI generation (async)
    generateTweakOutpaint({
      inputImageUrl: inputImage.originalUrl,
      newBounds,
      originalBounds,
      batchId: batch.id,
      imageId: imageRecord.id
    }).catch(error => {
      console.error('Outpaint generation failed:', error);
      // Update status to failed
      prisma.image.update({
        where: { id: imageRecord.id },
        data: { status: 'FAILED', runpodStatus: 'FAILED' }
      }).catch(console.error);
    });

    res.json({
      success: true,
      data: {
        batchId: batch.id,
        operationId: operation.id,
        imageId: imageRecord.id,
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
    const { baseImageId, regions, prompt } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!baseImageId || (!regions?.length && !prompt)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters: baseImageId and (regions or prompt)' 
      });
    }

    // Get base image
    const inputImage = await prisma.inputImage.findFirst({
      where: { id: baseImageId, userId }
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
        inputImageId: baseImageId,
        moduleType: 'TWEAK',
        prompt: prompt || 'Inpaint selected regions',
        totalVariations: 1,
        status: 'PROCESSING',
        creditsUsed: 1,
        metaData: {
          operationType: 'inpaint',
          regions: regions || [],
          prompt
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
        operationType: 'CHANGE_REGION',
        operationData: {
          regions: regions || [],
          prompt
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
    await deductCredits(userId, 1, 'IMAGE_TWEAK', batch.id);

    // Start ComfyUI generation (async)
    generateTweakInpaint({
      inputImageUrl: inputImage.originalUrl,
      regions: regions || [],
      prompt,
      batchId: batch.id,
      imageId: imageRecord.id
    }).catch(error => {
      console.error('Inpaint generation failed:', error);
      // Update status to failed
      prisma.image.update({
        where: { id: imageRecord.id },
        data: { status: 'FAILED', runpodStatus: 'FAILED' }
      }).catch(console.error);
    });

    res.json({
      success: true,
      data: {
        batchId: batch.id,
        operationId: operation.id,
        imageId: imageRecord.id,
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
    await deductCredits(userId, 1, 'IMAGE_TWEAK', batch.id);

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