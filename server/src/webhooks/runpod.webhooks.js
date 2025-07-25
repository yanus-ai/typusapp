const { prisma } = require('../services/prisma.service');
const webSocketService = require('../services/websocket.service');
const s3Service = require('../services/image/s3.service');
const replicateImageUploader = require('../services/image/replicateImageUploader.service');
const sharp = require('sharp');
const axios = require('axios');

async function handleRunPodWebhook(req, res) {
  try {
    const webhookData = req.body;
    
    console.log('RunPod webhook received:', {
      id: webhookData.id,
      status: webhookData.status,
      jobId: webhookData.input?.job_id,
      uuid: webhookData.input?.uuid
    });

    if (!webhookData.id || !webhookData.input?.uuid) {
      console.error('Invalid RunPod webhook data - missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const runpodId = webhookData.id;
    const status = webhookData.status;
    const imageId = parseInt(webhookData.input.uuid); // We use image ID as uuid

    // Find the specific Image record by RunPod job ID
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
      return res.status(404).json({ error: 'Image record not found' });
    }

    console.log('Processing webhook for variation:', {
      imageId: image.id,
      batchId: image.batchId,
      variationNumber: image.variationNumber,
      status
    });

    if (status === 'COMPLETED' && webhookData.output?.status === 'succeeded') {
      // Successful completion - update individual image
      const outputImages = webhookData.output?.output || [];
      
      if (outputImages.length === 0) {
        console.error('No output images in completed RunPod job:', runpodId);
        await updateImageStatus(image.id, 'FAILED', { error: 'No output images generated' });
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

        // Check and resize image dimensions (max 800x600)
        const metadata = await sharp(imageBuffer).metadata();
        console.log('RunPod image dimensions:', {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format
        });

        let processedBuffer = imageBuffer;
        let finalWidth = metadata.width;
        let finalHeight = metadata.height;

        // Resize if needed (following the pattern from image.controller.js)
        if (metadata.width > 800 || metadata.height > 600) {
          const widthRatio = 800 / metadata.width;
          const heightRatio = 600 / metadata.height;
          const ratio = Math.min(widthRatio, heightRatio);

          finalWidth = Math.round(metadata.width * ratio);
          finalHeight = Math.round(metadata.height * ratio);

          console.log('Resizing RunPod image from', `${metadata.width}x${metadata.height}`, 'to', `${finalWidth}x${finalHeight}`);

          processedBuffer = await sharp(imageBuffer)
            .resize(finalWidth, finalHeight, { 
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ 
              quality: 90,
              progressive: true 
            })
            .toBuffer();
        } else {
          console.log('RunPod image is within bounds, no resizing needed');
          // Convert to JPEG for consistency
          processedBuffer = await sharp(imageBuffer)
            .jpeg({ 
              quality: 90,
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

        // Upload processed image to S3
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

        // Process with replicateImageUploader (this may enhance/process the image further)
        console.log('Processing with replicateImageUploader...');
        let finalProcessedUrl = processedUpload.url;
        try {
          const replicateProcessedUrl = await replicateImageUploader.processImage(processedUpload.url);
          if (replicateProcessedUrl) {
            finalProcessedUrl = replicateProcessedUrl;
            console.log('Replicate processing successful:', finalProcessedUrl);
          }
        } catch (replicateError) {
          console.warn('Replicate processing failed, using direct S3 URL:', replicateError.message);
          // Continue with S3 URL as fallback
        }

        // Update image record with final URLs
        await updateImageStatus(image.id, 'COMPLETED', {
          processedImageUrl: finalProcessedUrl,
          thumbnailUrl: thumbnailUpload.url,
          runpodStatus: 'COMPLETED',
          completedAt: new Date().toISOString(),
          dimensions: {
            width: finalWidth,
            height: finalHeight,
            originalWidth: metadata.width,
            originalHeight: metadata.height,
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
          processedUrl: finalProcessedUrl,
          thumbnailUrl: thumbnailUpload.url,
          dimensions: `${finalWidth}x${finalHeight}`
        });

        // Notify individual variation completion via WebSocket
        webSocketService.notifyVariationCompleted(image.batch.inputImageId, {
          batchId: image.batchId,
          imageId: image.id,
          variationNumber: image.variationNumber,
          imageUrl: finalProcessedUrl,
          thumbnailUrl: thumbnailUpload.url,
          status: 'COMPLETED',
          dimensions: {
            width: finalWidth,
            height: finalHeight
          }
        });

      } catch (processingError) {
        console.error('Error processing RunPod output image:', {
          imageId: image.id,
          variationNumber: image.variationNumber,
          error: processingError.message,
          stack: processingError.stack
        });

        // Fall back to using the original RunPod URL if processing fails
        await updateImageStatus(image.id, 'COMPLETED', {
          processedImageUrl: outputImageUrl,
          runpodStatus: 'COMPLETED',
          completedAt: new Date().toISOString(),
          processingError: processingError.message,
          settings: {
            model: webhookData.input.model,
            seed: webhookData.input.seed,
            steps_ksampler1: webhookData.input.steps_ksampler1,
            cfg_ksampler1: webhookData.input.cfg_ksampler1
          }
        });

        // Notify completion even with processing error
        webSocketService.notifyVariationCompleted(image.batch.inputImageId, {
          batchId: image.batchId,
          imageId: image.id,
          variationNumber: image.variationNumber,
          imageUrl: outputImageUrl,
          status: 'COMPLETED',
          processingWarning: 'Image processing failed, using original RunPod output'
        });
      }

      // Check if all variations in the batch are completed
      await checkAndUpdateBatchCompletion(image.batchId);

    } else if (status === 'FAILED' || webhookData.output?.status === 'failed') {
      // Failed generation
      const errorMessage = webhookData.output?.error || 'Generation failed';
      
      await updateImageStatus(image.id, 'FAILED', {
        runpodStatus: 'FAILED',
        error: errorMessage,
        failedAt: new Date().toISOString()
      });

      console.error('Variation failed:', {
        imageId: image.id,
        variationNumber: image.variationNumber,
        error: errorMessage
      });

      // Notify individual variation failure via WebSocket
      webSocketService.notifyVariationFailed(image.batch.inputImageId, {
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

      // Notify progress via WebSocket
      webSocketService.notifyVariationProgress(image.batch.inputImageId, {
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

    await prisma.image.update({
      where: { id: imageId },
      data: updateData
    });

    console.log('Image status updated:', { imageId, status });
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

      // Send batch completion notification
      webSocketService.notifyBatchCompleted(batch.inputImageId, {
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