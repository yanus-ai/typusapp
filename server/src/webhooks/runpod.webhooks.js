const { prisma } = require('../services/prisma.service');
const webSocketService = require('../services/websocket.service');
const s3Service = require('../services/image/s3.service');
const replicateImageUploader = require('../services/image/replicateImageUploader.service');
const { checkAndSendImageMilestones } = require('../utils/milestoneHelper');
const sharp = require('sharp');
const axios = require('axios');

// Track processed webhooks to prevent duplicates
const processedWebhooks = new Set();

// Clean up old webhook IDs every hour to prevent memory leaks
setInterval(() => {
  processedWebhooks.clear();
  console.log('🧹 Cleared processed webhooks cache');
}, 60 * 60 * 1000); // 1 hour

async function handleRunPodWebhook(req, res) {
  try {
    const webhookData = req.body;
    
    console.log('RunPod webhook received:', {
      id: webhookData.id,
      status: webhookData.status,
      jobId: webhookData.input?.job_id,
      uuid: webhookData.input?.uuid,
      isRetry: webhookData.input?.isRetry,
      retryAttempt: webhookData.input?.retryAttempt,
      originalJobId: webhookData.input?.originalJobId
    });

    if (!webhookData.id || !webhookData.input?.uuid) {
      console.error('Invalid RunPod webhook data - missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const runpodId = webhookData.id;
    const status = webhookData.status;
    const imageId = parseInt(webhookData.input.uuid); // We use image ID as uuid

    // Create a unique key for this webhook to prevent duplicate processing
    const webhookKey = `${runpodId}-${status}-${imageId}`;
    
    if (processedWebhooks.has(webhookKey)) {
      console.log('🔄 Duplicate webhook detected, skipping processing:', {
        webhookKey,
        runpodId,
        status,
        imageId,
        processedWebhooksSize: processedWebhooks.size
      });
      return res.status(200).json({ message: 'Webhook already processed', duplicateSkipped: true });
    }
    
    // Mark this webhook as being processed
    processedWebhooks.add(webhookKey);
    console.log('✅ Processing new webhook:', {
      webhookKey,
      processedWebhooksSize: processedWebhooks.size
    });

    // Find the specific Image record by RunPod job ID with complete data
    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        runpodJobId: runpodId
      },
      include: {
        batch: {
          include: {
            inputImage: true
          }
        },
        user: true
      }
    });

    if (!image) {
      console.error('Image record not found for RunPod job:', { runpodId, imageId });
      // Remove from processed set since this wasn't a valid processing attempt
      processedWebhooks.delete(webhookKey);
      return res.status(404).json({ error: 'Image record not found' });
    }

    console.log('Processing webhook for variation:', {
      imageId: image.id,
      batchId: image.batchId,
      variationNumber: image.variationNumber,
      status,
      currentImageStatus: image.status
    });

    // Check if image is already completed to prevent reprocessing
    if (image.status === 'COMPLETED' && status === 'COMPLETED') {
      console.log('🔄 Image already completed, skipping duplicate processing:', {
        imageId: image.id,
        currentStatus: image.status,
        webhookStatus: status
      });
      return res.status(200).json({ message: 'Image already completed', alreadyProcessed: true });
    }

    // Additional check: verify if this specific webhook was already processed (database-level)
    const webhookMetadata = image.metadata || {};
    const processedWebhookIds = webhookMetadata.processedWebhookIds || [];
    
    if (processedWebhookIds.includes(runpodId)) {
      console.log('🔄 Webhook already processed (database check):', {
        imageId: image.id,
        runpodId,
        processedWebhookIds
      });
      return res.status(200).json({ message: 'Webhook already processed in database', alreadyProcessed: true });
    }

    if (status === 'COMPLETED' && webhookData.output?.status === 'succeeded') {
      // Successful completion - update individual image
      const outputImages = webhookData.output?.output || [];
      
      if (outputImages.length === 0) {
        console.error('No output images in completed RunPod job:', runpodId);
        await updateImageStatus(image.id, 'FAILED', { 
          error: 'No output images generated',
          processedWebhookIds: [...(image.metadata?.processedWebhookIds || []), runpodId]
        });
        return res.status(400).json({ error: 'No output images' });
      }

      // Use the first output image for this variation
      const outputImageUrl = outputImages[0];
      
      try {
        console.log('Processing RunPod output image:', {
          imageId: image.id,
          variationNumber: image.variationNumber,
          outputUrl: outputImageUrl
        });

        // Download the RunPod output image
        const response = await axios.get(outputImageUrl, {
          responseType: 'arraybuffer',
          timeout: 30000
        });
        const imageBuffer = Buffer.from(response.data);

        console.log('Downloaded RunPod image, size:', imageBuffer.length);

        // Get original image metadata
        const metadata = await sharp(imageBuffer).metadata();
        console.log('RunPod image dimensions:', {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format
        });

        // Step 1: Upload original high-resolution image directly to S3 (preserves original quality and file size)
        console.log('Uploading original RunPod image buffer directly to S3...');
        const originalUpload = await s3Service.uploadGeneratedImage(
          imageBuffer,
          `runpod-${image.id}-original.jpg`,
          'image/jpeg'
        );

        if (!originalUpload.success) {
          throw new Error('Failed to upload original image: ' + originalUpload.error);
        }

        // Step 2: Create processed version for LoRA training (resize if needed)
        let processedBuffer = imageBuffer;
        let finalWidth = metadata.width;
        let finalHeight = metadata.height;

        // Resize for LoRA training if image is too large (max 800x600)
        if (metadata.width > 800 || metadata.height > 600) {
          const widthRatio = 800 / metadata.width;
          const heightRatio = 600 / metadata.height;
          const ratio = Math.min(widthRatio, heightRatio);

          finalWidth = Math.round(metadata.width * ratio);
          finalHeight = Math.round(metadata.height * ratio);

          console.log('Resizing RunPod image for LoRA training from', `${metadata.width}x${metadata.height}`, 'to', `${finalWidth}x${finalHeight}`);

          processedBuffer = await sharp(imageBuffer)
            .resize(finalWidth, finalHeight, { 
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ 
              quality: 100, // Maximum quality for LoRA training
              progressive: true 
            })
            .toBuffer();
        } else {
          console.log('RunPod image is within LoRA bounds, no resizing needed for training');
          // Convert to JPEG for consistency
          processedBuffer = await sharp(imageBuffer)
            .jpeg({ 
              quality: 100, // Maximum quality for LoRA training
              progressive: true 
            })
            .toBuffer();
        }

        // Create thumbnail
        console.log('Creating thumbnail for RunPod image...');
        const thumbnailBuffer = await sharp(processedBuffer)
          .resize(300, 300, { 
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 80 })
          .toBuffer();

        console.log('Thumbnail created, size:', thumbnailBuffer.length);

        // Upload processed image to S3 (for LoRA training)
        console.log('Uploading processed RunPod image to S3...');
        const processedUpload = await s3Service.uploadGeneratedImage(
          processedBuffer,
          `runpod-${image.id}-processed.jpg`,
          'image/jpeg'
        );

        if (!processedUpload.success) {
          throw new Error('Failed to upload processed image: ' + processedUpload.error);
        }

        // Upload thumbnail to S3
        console.log('Uploading thumbnail to S3...');
        const thumbnailUpload = await s3Service.uploadThumbnail(
          thumbnailBuffer,
          `runpod-${image.id}-thumbnail.jpg`,
          'image/jpeg'
        );

        if (!thumbnailUpload.success) {
          throw new Error('Failed to upload thumbnail: ' + thumbnailUpload.error);
        }

        // Process with replicateImageUploader for LoRA training (using processed image)
        console.log('Processing with replicateImageUploader for LoRA training...');
        let finalProcessedUrl = processedUpload.url;
        try {
          const replicateProcessedUrl = await replicateImageUploader.processImage(processedUpload.url);
          if (replicateProcessedUrl) {
            finalProcessedUrl = replicateProcessedUrl;
            console.log('Replicate LoRA processing successful:', finalProcessedUrl);
          }
        } catch (replicateError) {
          console.warn('Replicate LoRA processing failed, using direct S3 URL:', replicateError.message);
          // Continue with S3 URL as fallback
        }

        // Update image record with original URL for canvas display and processed URL for LoRA
        await updateImageStatus(image.id, 'COMPLETED', {
          originalImageUrl: originalUpload.url, // High-resolution original for canvas display
          processedImageUrl: finalProcessedUrl, // Processed/resized for LoRA training
          thumbnailUrl: thumbnailUpload.url,
          runpodStatus: 'COMPLETED',
          completedAt: new Date().toISOString(),
          processedWebhookIds: [...(image.metadata?.processedWebhookIds || []), runpodId], // Track processed webhooks
          dimensions: {
            width: metadata.width, // Original dimensions for canvas display
            height: metadata.height,
            originalWidth: metadata.width,
            originalHeight: metadata.height,
            processedWidth: finalWidth, // Processed dimensions for LoRA
            processedHeight: finalHeight,
            wasResized: finalWidth !== metadata.width || finalHeight !== metadata.height
          },
          settings: {
            model: webhookData.input.model,
            seed: webhookData.input.seed,
            steps_ksampler1: webhookData.input.steps_ksampler1,
            cfg_ksampler1: webhookData.input.cfg_ksampler1
          }
        });

        console.log('Variation completed and processed successfully:', {
          imageId: image.id,
          variationNumber: image.variationNumber,
          originalUrl: originalUpload.url, // High-resolution for canvas
          processedUrl: finalProcessedUrl, // Processed for LoRA training
          thumbnailUrl: thumbnailUpload.url,
          originalDimensions: `${metadata.width}x${metadata.height}`,
          processedDimensions: `${finalWidth}x${finalHeight}`
        });

        // Resolve model/display name for client notification
        const resolvedModel = webhookData?.input?.model || image.batch?.metaData?.model || image.metadata?.settings?.model || 'flux-konect';
        const modelDisplayName = (function(m) {
          if (!m) return 'Flux';
          const key = String(m).toLowerCase();
          if (key.includes('nano') || key.includes('nanobanana') || key.includes('nano-banana')) return 'Google Nano-Banana';
          if (key.includes('flux')) return 'Flux Konect';
          return String(m).replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        })(resolvedModel);

        // Send both legacy notification (for backwards compatibility) and new user-based notification
        const notificationData = {
          batchId: image.batchId,
          imageId: image.id,
          variationNumber: image.variationNumber,
          imageUrl: originalUpload.url, // Use ORIGINAL high-resolution image for canvas display
          processedImageUrl: finalProcessedUrl, // Processed URL for LoRA training
          thumbnailUrl: thumbnailUpload.url,
          status: 'COMPLETED',
          runpodStatus: 'COMPLETED',
          moduleType: image.batch.moduleType,
          operationType: image.batch.metaData?.operationType || 'unknown',
          createdAt: image.createdAt,
          updatedAt: new Date().toISOString(),
          // Include all the saved settings data for AI Prompt Modal
          maskMaterialMappings: image.maskMaterialMappings || {},
          aiPrompt: image.aiPrompt || null,
          aiMaterials: image.aiMaterials || [],
          settingsSnapshot: image.settingsSnapshot || {},
          contextSelection: image.contextSelection || null,
          batch: {
            id: image.batch.id,
            prompt: image.batch.prompt,
            moduleType: image.batch.moduleType,
            metaData: image.batch.metaData,
            createdAt: image.batch.createdAt,
            inputImageId: image.batch.inputImageId
          },
          dimensions: {
            width: metadata.width, // Original dimensions for canvas
            height: metadata.height
          },
          // For frontend compatibility - originalInputImageId is needed for auto-selection
          originalInputImageId: image.batch.inputImageId
        };

        // Attach model info
        notificationData.model = resolvedModel;
        notificationData.modelDisplayName = modelDisplayName;

        // SECURE: User-based notification - only notify the correct user
        const notificationSent = webSocketService.notifyUserVariationCompleted(image.user.id, notificationData);

        if (!notificationSent) {
          console.warn('⚠️ User-based notification failed - user may not be connected.');
          // SECURITY: Removed dangerous legacy broadcast method
        }

      } catch (processingError) {
        console.error('Error processing RunPod output image:', {
          imageId: image.id,
          variationNumber: image.variationNumber,
          error: processingError.message,
          stack: processingError.stack
        });

        // Fall back to using the original RunPod URL if processing fails
        await updateImageStatus(image.id, 'COMPLETED', {
          originalImageUrl: outputImageUrl, // Use original RunPod output as original
          processedImageUrl: outputImageUrl, // Same URL as fallback for processed
          runpodStatus: 'COMPLETED',
          completedAt: new Date().toISOString(),
          processedWebhookIds: [...(image.metadata?.processedWebhookIds || []), runpodId], // Track processed webhooks
          processingError: processingError.message,
          settings: {
            model: webhookData.input.model,
            seed: webhookData.input.seed,
            steps_ksampler1: webhookData.input.steps_ksampler1,
            cfg_ksampler1: webhookData.input.cfg_ksampler1
          }
        });

        // Resolve model/display name for fallback notification
        const resolvedFallbackModel = webhookData?.input?.model || image.batch?.metaData?.model || image.metadata?.settings?.model || 'flux-konect';
        const fallbackModelDisplayName = (function(m) {
          if (!m) return 'Flux';
          const key = String(m).toLowerCase();
          if (key.includes('nano') || key.includes('nanobanana') || key.includes('nano-banana')) return 'Google Nano-Banana';
          if (key.includes('flux')) return 'Flux Konect';
          return String(m).replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        })(resolvedFallbackModel);

        // Send both legacy and user-based notifications for fallback case
        const fallbackNotificationData = {
          batchId: image.batchId,
          imageId: image.id,
          variationNumber: image.variationNumber,
          imageUrl: outputImageUrl, // Use original RunPod output for canvas display
          processedImageUrl: outputImageUrl, // Same URL as fallback for processed
          thumbnailUrl: null, // No thumbnail available when processing fails
          status: 'COMPLETED',
          runpodStatus: 'COMPLETED',
          moduleType: image.batch.moduleType,
          operationType: image.batch.metaData?.operationType || 'unknown',
          createdAt: image.createdAt,
          updatedAt: new Date().toISOString(),
          // Include all the saved settings data for AI Prompt Modal
          maskMaterialMappings: image.maskMaterialMappings || {},
          aiPrompt: image.aiPrompt || null,
          aiMaterials: image.aiMaterials || [],
          settingsSnapshot: image.settingsSnapshot || {},
          contextSelection: image.contextSelection || null,
          batch: {
            id: image.batch.id,
            prompt: image.batch.prompt,
            moduleType: image.batch.moduleType,
            metaData: image.batch.metaData,
            createdAt: image.batch.createdAt,
            inputImageId: image.batch.inputImageId
          },
          processingWarning: 'Image processing failed, using original RunPod output',
          // For frontend compatibility - originalInputImageId is needed for auto-selection
          originalInputImageId: image.batch.inputImageId
        };

        // Attach model info to fallback notification
        fallbackNotificationData.model = resolvedFallbackModel;
        fallbackNotificationData.modelDisplayName = fallbackModelDisplayName;

        // SECURE: User-based notification only
        const notificationSent = webSocketService.notifyUserVariationCompleted(image.user.id, fallbackNotificationData);

        if (!notificationSent) {
          console.warn('⚠️ User-based notification failed - user may not be connected.');
          // SECURITY: Removed dangerous legacy broadcast method
        }
      }

      // Check if all variations in the batch are completed
      await checkAndUpdateBatchCompletion(image.batchId);

    } else if (status === 'FAILED' || webhookData.output?.status === 'failed') {
      // Failed generation
      const errorMessage = webhookData.output?.error || 'Generation failed';
      
      await updateImageStatus(image.id, 'FAILED', {
        runpodStatus: 'FAILED',
        error: errorMessage,
        failedAt: new Date().toISOString(),
        processedWebhookIds: [...(image.metadata?.processedWebhookIds || []), runpodId]
      });

      console.error('Variation failed:', {
        imageId: image.id,
        variationNumber: image.variationNumber,
        error: errorMessage
      });

      // SECURITY: Cannot notify failure without user ID - removed dangerous broadcast method
      console.error('😱 Cannot send failure notification - user ID required for secure messaging');
      // Legacy dangerous call removed: webSocketService.notifyVariationFailed(...)
      // TODO: Add user ID to this failure path for secure notifications
      console.log('Failure details:', {
        batchId: image.batchId,
        imageId: image.id,
        variationNumber: image.variationNumber,
        error: errorMessage
      });

      // Check if all variations in the batch are completed (including failed ones)
      await checkAndUpdateBatchCompletion(image.batchId);

    } else if (status === 'IN_PROGRESS' || status === 'IN_QUEUE') {
      // Update progress for individual variation
      await updateImageStatus(image.id, 'PROCESSING', {
        runpodStatus: status,
        executionTime: webhookData.executionTime
      });

      // SECURITY: Cannot notify progress without user ID - removed dangerous broadcast method
      console.error('😱 Cannot send progress notification - user ID required for secure messaging');
      // Legacy dangerous call removed: webSocketService.notifyVariationProgress(...)
      // TODO: Add user ID to this progress path for secure notifications
      console.log('Progress details:', {
        batchId: image.batchId,
        imageId: image.id,
        variationNumber: image.variationNumber,
        runpodStatus: status,
        executionTime: webhookData.executionTime
      });
    }

    res.json({ received: true, processed: true });

  } catch (error) {
    console.error('RunPod webhook processing error:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    // Remove from processed set on error so it can be retried
    const runpodId = req.body?.id;
    const status = req.body?.status;
    const imageId = parseInt(req.body?.input?.uuid);
    if (runpodId && status && imageId) {
      const webhookKey = `${runpodId}-${status}-${imageId}`;
      processedWebhooks.delete(webhookKey);
      console.log('🔄 Removed failed webhook from processed set for retry:', webhookKey);
    }
    
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message 
    });
  }
}

// Update individual image status and metadata
async function updateImageStatus(imageId, status, additionalData = {}) {
  try {
    const updateData = {
      status,
      updatedAt: new Date()
    };

    // Handle special fields
    if (additionalData.originalImageUrl) {
      updateData.originalImageUrl = additionalData.originalImageUrl;
      delete additionalData.originalImageUrl;
    }

    if (additionalData.processedImageUrl) {
      updateData.processedImageUrl = additionalData.processedImageUrl;
      delete additionalData.processedImageUrl;
    }

    if (additionalData.thumbnailUrl) {
      updateData.thumbnailUrl = additionalData.thumbnailUrl;
      delete additionalData.thumbnailUrl;
    }

    if (additionalData.runpodStatus) {
      updateData.runpodStatus = additionalData.runpodStatus;
      delete additionalData.runpodStatus;
    }

    // Merge remaining data into metadata
    if (Object.keys(additionalData).length > 0) {
      const existingImage = await prisma.image.findUnique({
        where: { id: imageId },
        select: { metadata: true }
      });

      updateData.metadata = {
        ...existingImage.metadata,
        ...additionalData,
        lastUpdated: new Date().toISOString()
      };
    }

    // Get the image with user info for milestone checking
    const image = await prisma.image.findUnique({
      where: { id: imageId },
      include: { user: true }
    });

    await prisma.image.update({
      where: { id: imageId },
      data: updateData
    });

    console.log('Image status updated:', { imageId, status });

    // Check for image milestones when image is completed
    if (status === 'COMPLETED' && image && image.user) {
      await checkAndSendImageMilestones(
        image.userId,
        image.user.email,
        image.user.fullName,
        image.user.firstImageEmailSent,
        image.user.milestone10imagessent
      );
    }
  } catch (error) {
    console.error('Error updating image status:', {
      imageId,
      status,
      error: error.message
    });
    throw error;
  }
}

// Check if all variations in a batch are completed and update batch status accordingly
async function checkAndUpdateBatchCompletion(batchId) {
  try {
    const batch = await prisma.generationBatch.findUnique({
      where: { id: batchId },
      include: {
        variations: true,
        inputImage: true
      }
    });

    if (!batch) {
      console.error('Batch not found for completion check:', batchId);
      return;
    }

    const totalVariations = batch.variations.length;
    const completedVariations = batch.variations.filter(img => 
      img.status === 'COMPLETED' || img.status === 'FAILED'
    ).length;
    const successfulVariations = batch.variations.filter(img => 
      img.status === 'COMPLETED'
    ).length;
    const failedVariations = batch.variations.filter(img => 
      img.status === 'FAILED'
    ).length;

    console.log('Batch completion check:', {
      batchId,
      totalVariations,
      completedVariations,
      successfulVariations,
      failedVariations
    });

    // Update batch status if all variations are completed
    if (completedVariations === totalVariations) {
      let batchStatus = 'COMPLETED';
      if (successfulVariations === 0) {
        batchStatus = 'FAILED';
      } else if (failedVariations > 0) {
        batchStatus = 'PARTIALLY_COMPLETED';
      }

      await prisma.generationBatch.update({
        where: { id: batchId },
        data: {
          status: batchStatus,
          metaData: {
            ...batch.metaData,
            completedAt: new Date().toISOString(),
            finalStats: {
              totalVariations,
              successfulVariations,
              failedVariations
            }
          }
        }
      });

      console.log('Batch completed:', { batchId, status: batchStatus });

      // SECURITY: Cannot notify batch completion without user ID - removed dangerous broadcast method
      console.error('😱 Cannot send batch completion notification - user ID required for secure messaging');
      // Legacy dangerous call removed: webSocketService.notifyBatchCompleted(...)
      // TODO: Add user ID to this batch completion path for secure notifications
      console.log('Batch completion details:', {
        batchId: batch.id,
        status: batchStatus,
        totalVariations,
        successfulVariations,
        failedVariations,
        completedImages: batch.variations
          .filter(img => img.status === 'COMPLETED')
          .map(img => ({
            id: img.id,
            url: img.processedImageUrl,
            variationNumber: img.variationNumber
          }))
      });
    }
  } catch (error) {
    console.error('Error checking batch completion:', {
      batchId,
      error: error.message
    });
    throw error;
  }
}


module.exports = {
  handleRunPodWebhook
};