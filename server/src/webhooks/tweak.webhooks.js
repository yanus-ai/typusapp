const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const webSocketService = require('../services/websocket.service');
const s3Service = require('../services/image/s3.service');
const sharp = require('sharp');
const axios = require('axios');

/**
 * Handle outpaint webhook from RunPod
 */
async function handleOutpaintWebhook(req, res) {
  try {
    const webhookData = req.body;
    
    console.log('Outpaint webhook received:', {
      id: webhookData.id,
      status: webhookData.status,
      jobId: webhookData.input?.job_id,
      uuid: webhookData.input?.uuid,
      task: webhookData.input?.task
    });

    if (!webhookData.id || !webhookData.input?.job_id) {
      console.error('Invalid outpaint webhook data - missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const runpodId = webhookData.id;
    const status = webhookData.status;
    const imageId = parseInt(webhookData.input.job_id); // We use image ID as job_id

    // Find the specific Image record
    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        runpodJobId: runpodId
      },
      include: {
        batch: {
          include: {
            tweakBatch: true,
            user: true
          }
        }
      }
    });

    if (!image) {
      console.error('Image record not found for outpaint job:', { runpodId, imageId });
      return res.status(404).json({ error: 'Image record not found' });
    }

    console.log('Processing outpaint webhook for variation:', {
      imageId: image.id,
      batchId: image.batchId,
      variationNumber: image.variationNumber,
      status
    });

    if (status === 'COMPLETED' && webhookData.output?.status === 'succeeded') {
      // Successful completion - process the outpaint result
      const outputImages = webhookData.output?.output || [];
      
      if (outputImages.length === 0) {
        console.error('No output images in completed outpaint job:', runpodId);
        await updateImageStatus(image.id, 'FAILED', { 
          metadata: {
            error: 'No output images generated',
            failedAt: new Date().toISOString()
          }
        });
        return res.status(400).json({ error: 'No output images' });
      }

      // Use the first output image for this variation
      const outputImageUrl = outputImages[0];
      
      try {
        console.log('Processing outpaint output image:', {
          imageId: image.id,
          variationNumber: image.variationNumber,
          outputUrl: outputImageUrl
        });

        // Download the outpaint result image
        const response = await axios.get(outputImageUrl, {
          responseType: 'arraybuffer',
          timeout: 30000
        });
        const imageBuffer = Buffer.from(response.data);

        console.log('Downloaded outpaint image, size:', imageBuffer.length);

        // Check and resize image dimensions (max 800x600)
        const metadata = await sharp(imageBuffer).metadata();
        console.log('Outpaint image dimensions:', {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format
        });

        let processedBuffer = imageBuffer;
        let finalWidth = metadata.width;
        let finalHeight = metadata.height;

        // Resize if needed
        if (metadata.width > 800 || metadata.height > 600) {
          const widthRatio = 800 / metadata.width;
          const heightRatio = 600 / metadata.height;
          const ratio = Math.min(widthRatio, heightRatio);

          finalWidth = Math.round(metadata.width * ratio);
          finalHeight = Math.round(metadata.height * ratio);

          console.log('Resizing outpaint image from', `${metadata.width}x${metadata.height}`, 'to', `${finalWidth}x${finalHeight}`);

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
          console.log('Outpaint image is within bounds, no resizing needed');
          // Convert to JPEG for consistency
          processedBuffer = await sharp(imageBuffer)
            .jpeg({ 
              quality: 90,
              progressive: true 
            })
            .toBuffer();
        }

        // Create thumbnail
        console.log('Creating thumbnail for outpaint image...');
        const thumbnailBuffer = await sharp(processedBuffer)
          .resize(300, 300, { 
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 80 })
          .toBuffer();

        console.log('Thumbnail created, size:', thumbnailBuffer.length);

        // Upload processed image to S3
        console.log('Uploading processed outpaint image to S3...');
        const processedUpload = await s3Service.uploadGeneratedImage(
          processedBuffer,
          `outpaint-${image.id}-processed.jpg`,
          'image/jpeg'
        );

        if (!processedUpload.success) {
          throw new Error(`Failed to upload processed image: ${processedUpload.error}`);
        }

        // Upload thumbnail to S3
        console.log('Uploading outpaint thumbnail to S3...');
        const thumbnailUpload = await s3Service.uploadGeneratedImage(
          thumbnailBuffer,
          `outpaint-${image.id}-thumb.jpg`,
          'image/jpeg'
        );

        if (!thumbnailUpload.success) {
          console.warn('Failed to upload thumbnail, using processed image URL');
        }

        // Update image record with final URLs
        await updateImageStatus(image.id, 'COMPLETED', {
          processedImageUrl: processedUpload.url,
          thumbnailUrl: thumbnailUpload.success ? thumbnailUpload.url : processedUpload.url,
          runpodStatus: 'COMPLETED',
          metadata: {
            task: 'outpaint',
            seed: webhookData.input.seed,
            steps: webhookData.input.steps,
            cfg: webhookData.input.cfg,
            denoise: webhookData.input.denoise,
            bounds: {
              top: webhookData.input.top,
              bottom: webhookData.input.bottom,
              left: webhookData.input.left,
              right: webhookData.input.right
            }
          }
        });

        console.log('Outpaint variation completed and processed successfully:', {
          imageId: image.id,
          variationNumber: image.variationNumber,
          processedUrl: processedUpload.url,
          thumbnailUrl: thumbnailUpload.success ? thumbnailUpload.url : processedUpload.url,
          dimensions: `${finalWidth}x${finalHeight}`
        });

        // Notify individual variation completion via WebSocket
        webSocketService.notifyVariationCompleted(image.originalBaseImageId || image.batchId, {
          batchId: image.batchId,
          imageId: image.id,
          variationNumber: image.variationNumber,
          imageUrl: processedUpload.url,
          thumbnailUrl: thumbnailUpload.success ? thumbnailUpload.url : processedUpload.url,
          status: 'COMPLETED',
          dimensions: {
            width: finalWidth,
            height: finalHeight
          },
          operationType: 'outpaint',
          originalBaseImageId: image.originalBaseImageId // Include for frontend to refresh tweak history
        });

      } catch (processingError) {
        console.error('Error processing outpaint output image:', {
          imageId: image.id,
          variationNumber: image.variationNumber,
          error: processingError.message,
          stack: processingError.stack
        });

        // Fall back to using the original RunPod URL if processing fails
        await updateImageStatus(image.id, 'COMPLETED', {
          processedImageUrl: outputImageUrl,
          runpodStatus: 'COMPLETED',
          metadata: {
            task: 'outpaint',
            seed: webhookData.input.seed,
            steps: webhookData.input.steps,
            cfg: webhookData.input.cfg,
            processingError: processingError.message
          }
        });

        // Notify completion even with processing error
        webSocketService.notifyVariationCompleted(image.originalBaseImageId || image.batchId, {
          batchId: image.batchId,
          imageId: image.id,
          variationNumber: image.variationNumber,
          imageUrl: outputImageUrl,
          status: 'COMPLETED',
          operationType: 'outpaint',
          originalBaseImageId: image.originalBaseImageId // Include for frontend to refresh tweak history
        });
      }

    } else if (status === 'FAILED' || webhookData.output?.status === 'failed') {
      // Failed completion
      console.error('Outpaint job failed:', {
        runpodId,
        imageId: image.id,
        output: webhookData.output
      });

      await updateImageStatus(image.id, 'FAILED', {
        runpodStatus: 'FAILED',
        metadata: {
          error: webhookData.output?.error || 'RunPod job failed',
          failedAt: new Date().toISOString()
        }
      });

      // Notify failure via WebSocket
      webSocketService.notifyVariationCompleted(image.originalBaseImageId || image.batchId, {
        batchId: image.batchId,
        imageId: image.id,
        variationNumber: image.variationNumber,
        status: 'FAILED',
        error: webhookData.output?.error || 'Generation failed',
        operationType: 'outpaint',
        originalBaseImageId: image.originalBaseImageId // Include for frontend to refresh tweak history
      });

    } else {
      // Update status for other states (IN_PROGRESS, etc.)
      await updateImageStatus(image.id, 'PROCESSING', {
        runpodStatus: status
      });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error handling outpaint webhook:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process outpaint webhook',
      error: error.message 
    });
  }
}

/**
 * Helper function to update image status
 */
async function updateImageStatus(imageId, status, additionalData = {}) {
  return await prisma.image.update({
    where: { id: imageId },
    data: {
      status,
      ...additionalData,
      updatedAt: new Date()
    }
  });
}

/**
 * Handle inpaint webhook from RunPod
 */
async function handleInpaintWebhook(req, res) {
  try {
    const webhookData = req.body;
    
    console.log('Inpaint webhook received:', {
      id: webhookData.id,
      status: webhookData.status,
      jobId: webhookData.input?.job_id,
      uuid: webhookData.input?.uuid,
      task: webhookData.input?.task
    });

    if (!webhookData.id || !webhookData.input?.job_id) {
      console.error('Invalid inpaint webhook data - missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const runpodId = webhookData.id;
    const status = webhookData.status;
    const imageId = parseInt(webhookData.input.job_id); // We use image ID as job_id

    // Find the specific Image record
    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        runpodJobId: runpodId
      },
      include: {
        batch: {
          include: {
            tweakBatch: true,
            user: true
          }
        }
      }
    });

    if (!image) {
      console.error('Image record not found for inpaint job:', { runpodId, imageId });
      return res.status(404).json({ error: 'Image record not found' });
    }

    console.log('Processing inpaint webhook for variation:', {
      imageId: image.id,
      batchId: image.batchId,
      variationNumber: image.variationNumber,
      status
    });

    if (status === 'COMPLETED' && webhookData.output?.status === 'succeeded') {
      // Successful completion - process the inpaint result
      const outputImages = webhookData.output?.output || [];
      
      if (outputImages.length === 0) {
        console.error('No output images in completed inpaint job:', runpodId);
        await updateImageStatus(image.id, 'FAILED', { 
          metadata: {
            error: 'No output images generated',
            failedAt: new Date().toISOString()
          }
        });
        return res.status(400).json({ error: 'No output images' });
      }

      // Use the first output image for this variation
      const outputImageUrl = outputImages[0];
      
      try {
        console.log('Processing inpaint output image:', {
          imageId: image.id,
          variationNumber: image.variationNumber,
          outputUrl: outputImageUrl
        });

        // Download and process the inpaint result image (similar to outpaint processing)
        const response = await axios.get(outputImageUrl, {
          responseType: 'arraybuffer',
          timeout: 30000
        });
        const imageBuffer = Buffer.from(response.data);

        console.log('Downloaded inpaint image, size:', imageBuffer.length);

        // Process and upload similar to outpaint
        const metadata = await sharp(imageBuffer).metadata();
        let processedBuffer = imageBuffer;
        let finalWidth = metadata.width;
        let finalHeight = metadata.height;

        // Resize if needed
        if (metadata.width > 800 || metadata.height > 600) {
          const widthRatio = 800 / metadata.width;
          const heightRatio = 600 / metadata.height;
          const ratio = Math.min(widthRatio, heightRatio);

          finalWidth = Math.round(metadata.width * ratio);
          finalHeight = Math.round(metadata.height * ratio);

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
          processedBuffer = await sharp(imageBuffer)
            .jpeg({ 
              quality: 90,
              progressive: true 
            })
            .toBuffer();
        }

        // Create thumbnail
        const thumbnailBuffer = await sharp(processedBuffer)
          .resize(300, 300, { 
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 80 })
          .toBuffer();

        // Upload processed image to S3
        const processedUpload = await s3Service.uploadGeneratedImage(
          processedBuffer,
          `inpaint-${image.id}-processed.jpg`,
          'image/jpeg'
        );

        if (!processedUpload.success) {
          throw new Error(`Failed to upload processed image: ${processedUpload.error}`);
        }

        // Upload thumbnail to S3
        const thumbnailUpload = await s3Service.uploadGeneratedImage(
          thumbnailBuffer,
          `inpaint-${image.id}-thumb.jpg`,
          'image/jpeg'
        );

        // Update image record with final URLs
        await updateImageStatus(image.id, 'COMPLETED', {
          processedImageUrl: processedUpload.url,
          thumbnailUrl: thumbnailUpload.success ? thumbnailUpload.url : processedUpload.url,
          runpodStatus: 'COMPLETED',
          metadata: {
            task: 'inpaint',
            seed: webhookData.input.seed,
            steps: webhookData.input.steps,
            cfg: webhookData.input.cfg,
            denoise: webhookData.input.denoise
          }
        });

        console.log('Inpaint variation completed and processed successfully:', {
          imageId: image.id,
          variationNumber: image.variationNumber,
          processedUrl: processedUpload.url,
          thumbnailUrl: thumbnailUpload.success ? thumbnailUpload.url : processedUpload.url,
          dimensions: `${finalWidth}x${finalHeight}`
        });

        // Notify individual variation completion via WebSocket
        webSocketService.notifyVariationCompleted(image.originalBaseImageId || image.batchId, {
          batchId: image.batchId,
          imageId: image.id,
          variationNumber: image.variationNumber,
          imageUrl: processedUpload.url,
          thumbnailUrl: thumbnailUpload.success ? thumbnailUpload.url : processedUpload.url,
          status: 'COMPLETED',
          dimensions: {
            width: finalWidth,
            height: finalHeight
          },
          operationType: 'inpaint',
          originalBaseImageId: image.originalBaseImageId
        });

      } catch (processingError) {
        console.error('Error processing inpaint output image:', processingError);

        // Fall back to using the original RunPod URL if processing fails
        await updateImageStatus(image.id, 'COMPLETED', {
          processedImageUrl: outputImageUrl,
          runpodStatus: 'COMPLETED',
          metadata: {
            task: 'inpaint',
            processingError: processingError.message
          }
        });

        // Notify completion even with processing error
        webSocketService.notifyVariationCompleted(image.originalBaseImageId || image.batchId, {
          batchId: image.batchId,
          imageId: image.id,
          variationNumber: image.variationNumber,
          imageUrl: outputImageUrl,
          status: 'COMPLETED',
          operationType: 'inpaint',
          originalBaseImageId: image.originalBaseImageId
        });
      }

    } else if (status === 'FAILED' || webhookData.output?.status === 'failed') {
      // Failed completion
      console.error('Inpaint job failed:', {
        runpodId,
        imageId: image.id,
        output: webhookData.output
      });

      await updateImageStatus(image.id, 'FAILED', {
        runpodStatus: 'FAILED',
        metadata: {
          error: webhookData.output?.error || 'RunPod job failed',
          failedAt: new Date().toISOString()
        }
      });

      // Notify failure via WebSocket
      webSocketService.notifyVariationCompleted(image.originalBaseImageId || image.batchId, {
        batchId: image.batchId,
        imageId: image.id,
        variationNumber: image.variationNumber,
        status: 'FAILED',
        error: webhookData.output?.error || 'Generation failed',
        operationType: 'inpaint',
        originalBaseImageId: image.originalBaseImageId
      });

    } else {
      // Update status for other states (IN_PROGRESS, etc.)
      await updateImageStatus(image.id, 'PROCESSING', {
        runpodStatus: status
      });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error handling inpaint webhook:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process inpaint webhook',
      error: error.message 
    });
  }
}

module.exports = {
  handleOutpaintWebhook,
  handleInpaintWebhook
};