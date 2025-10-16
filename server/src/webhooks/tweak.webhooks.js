const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const webSocketService = require('../services/websocket.service');
const s3Service = require('../services/image/s3.service');
const { checkAndSendImageMilestones } = require('../utils/milestoneHelper');
const sharp = require('sharp');
const axios = require('axios');

/**
 * Handle outpaint webhook from Replicate (formerly RunPod)
 */
async function handleOutpaintWebhook(req, res) {
  try {
    const webhookData = req.body;

    // Extract parameters from query string (Replicate format)
    const { jobId, uuid, task, isRetry, retryAttempt, originalJobId } = req.query;

    console.log('Outpaint webhook received:', {
      id: webhookData.id,
      status: webhookData.status,
      jobId: jobId,
      uuid: uuid,
      task: task,
      isRetry: isRetry,
      retryAttempt: retryAttempt,
      originalJobId: originalJobId
    });

    if (!webhookData.id || !jobId) {
      console.error('Invalid outpaint webhook data - missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const replicateId = webhookData.id;
    const status = webhookData.status;
    const imageId = parseInt(jobId); // We use image ID as job_id

    // Find the specific Image record
    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        runpodJobId: replicateId // Still using runpodJobId field for compatibility
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
      console.error('Image record not found for outpaint job:', { replicateId, imageId });
      return res.status(404).json({ error: 'Image record not found' });
    }

    console.log('Processing outpaint webhook for variation:', {
      imageId: image.id,
      batchId: image.batchId,
      variationNumber: image.variationNumber,
      status
    });

    if (status === 'succeeded') {
      // Successful completion - process the outpaint result
      const outputImageUrl = webhookData.output;

      if (!outputImageUrl) {
        console.error('No output images in completed outpaint job:', replicateId);
        await updateImageStatus(image.id, 'FAILED', {
          metadata: {
            error: 'No output images generated',
            failedAt: new Date().toISOString()
          }
        });
        return res.status(400).json({ error: 'No output images' });
      }
      
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

        // Get original image metadata
        const metadata = await sharp(imageBuffer).metadata();
        console.log('Outpaint image dimensions:', {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format
        });

        // Step 1: Upload original high-resolution image directly to S3 (preserves original quality and file size)
        console.log('Uploading original outpaint image buffer directly to S3...');
        const originalUpload = await s3Service.uploadGeneratedImage(
          imageBuffer,
          `outpaint-${image.id}-original.jpg`,
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

          console.log('Resizing outpaint image for LoRA training from', `${metadata.width}x${metadata.height}`, 'to', `${finalWidth}x${finalHeight}`);

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
          console.log('Outpaint image is within LoRA bounds, no resizing needed for training');
          // Convert to JPEG for consistency
          processedBuffer = await sharp(imageBuffer)
            .jpeg({ 
              quality: 100, // Maximum quality for LoRA training
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

        // Upload processed image to S3 (for LoRA training)
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

        // Get the preview URL from the original base input image
        let previewUrl = null;
        if (image.originalBaseImageId) {
          const baseInputImage = await prisma.inputImage.findUnique({
            where: { id: image.originalBaseImageId },
            select: { previewUrl: true, originalUrl: true }
          });
          if (baseInputImage) {
            previewUrl = baseInputImage.previewUrl || baseInputImage.originalUrl;
          }
        }

        // Update image record with original URL for canvas display and processed URL for LoRA
        await updateImageStatus(image.id, 'COMPLETED', {
          originalImageUrl: originalUpload.url, // High-resolution original for canvas display
          processedImageUrl: processedUpload.url, // Processed/resized for LoRA training
          thumbnailUrl: thumbnailUpload.success ? thumbnailUpload.url : processedUpload.url,
          previewUrl: previewUrl, // URL of the actual base input image for preview
          runpodStatus: 'COMPLETED',
          metadata: {
            task: 'outpaint',
            seed: webhookData.input?.seed || 'unknown',
            steps: webhookData.input?.steps || 50,
            guidance: webhookData.input?.guidance || 3,
            model: 'flux-fill-pro',
            dimensions: {
              width: metadata.width, // Original dimensions for canvas display
              height: metadata.height,
              originalWidth: metadata.width,
              originalHeight: metadata.height,
              processedWidth: finalWidth, // Processed dimensions for LoRA
              processedHeight: finalHeight,
              wasResized: finalWidth !== metadata.width || finalHeight !== metadata.height
            }
          }
        });

        console.log('Outpaint variation completed and processed successfully:', {
          imageId: image.id,
          variationNumber: image.variationNumber,
          originalUrl: originalUpload.url, // High-resolution for canvas
          processedUrl: processedUpload.url, // Processed for LoRA training
          thumbnailUrl: thumbnailUpload.success ? thumbnailUpload.url : processedUpload.url,
          originalDimensions: `${metadata.width}x${metadata.height}`,
          processedDimensions: `${finalWidth}x${finalHeight}`,
          originalBaseImageId: image.originalBaseImageId
        });

        // Notify individual variation completion via WebSocket (use original URL for canvas display)
        const notificationData = {
          batchId: image.batchId,
          imageId: image.id,
          variationNumber: image.variationNumber,
          imageUrl: originalUpload.url, // Use ORIGINAL high-resolution image for canvas display
          processedUrl: processedUpload.url, // Processed URL for LoRA training
          thumbnailUrl: thumbnailUpload.success ? thumbnailUpload.url : processedUpload.url,
          previewUrl: previewUrl, // Include preview URL in WebSocket notification
          status: 'COMPLETED',
          dimensions: {
            width: metadata.width, // Original dimensions for canvas
            height: metadata.height
          },
          operationType: 'outpaint',
          originalBaseImageId: image.originalBaseImageId, // Include for frontend to refresh tweak history
          // 🔥 ENHANCEMENT: Include prompt data for UI
          promptData: {
            prompt: image.aiPrompt,
            settingsSnapshot: image.settingsSnapshot,
            moduleType: 'TWEAK'
          },
          // 🔥 FIX: Explicitly mark this as a generated result, not an input image
          resultType: 'GENERATED', // This is a generated result from tweak operation
          sourceModule: 'TWEAK' // Source module that generated this result
        };
        
        console.log('🔔 Sending user-based WebSocket notification for outpaint completion:', {
          userId: image.batch.user.id,
          imageId: image.id,
          originalBaseImageId: image.originalBaseImageId,
          batchId: image.batchId
        });
        
        // Use user-based notification - SECURE: Only notify the correct user
        const notificationSent = webSocketService.notifyUserVariationCompleted(image.batch.user.id, notificationData);

        if (!notificationSent) {
          console.warn('⚠️ User-based notification failed - user may not be connected. Image processing completed but user will not be notified until reconnection.');
          // SECURITY: Removed dangerous fallback that broadcasted to ALL users
        }

      } catch (processingError) {
        console.error('Error processing outpaint output image:', {
          imageId: image.id,
          variationNumber: image.variationNumber,
          error: processingError.message,
          stack: processingError.stack
        });

        // Get the preview URL from the original base input image for fallback case too
        let previewUrl = null;
        if (image.originalBaseImageId) {
          try {
            const baseInputImage = await prisma.inputImage.findUnique({
              where: { id: image.originalBaseImageId },
              select: { previewUrl: true, originalUrl: true }
            });
            if (baseInputImage) {
              previewUrl = baseInputImage.previewUrl || baseInputImage.originalUrl;
            }
          } catch (previewError) {
            console.warn('Failed to get preview URL for fallback:', previewError);
          }
        }

        // Fall back to using the original RunPod URL if processing fails
        await updateImageStatus(image.id, 'COMPLETED', {
          originalImageUrl: outputImageUrl, // Use original RunPod output as original
          processedImageUrl: outputImageUrl, // Same URL as fallback for processed
          previewUrl: previewUrl, // Include preview URL even in fallback
          runpodStatus: 'COMPLETED',
          metadata: {
            task: 'outpaint',
            seed: webhookData.input.seed,
            steps: webhookData.input.steps,
            cfg: webhookData.input.cfg,
            processingError: processingError.message
          }
        });

        // Notify completion even with processing error (use original URL for canvas)
        const errorNotificationData = {
          batchId: image.batchId,
          imageId: image.id,
          variationNumber: image.variationNumber,
          imageUrl: outputImageUrl, // Use original RunPod output for canvas display
          status: 'COMPLETED',
          operationType: 'outpaint',
          originalBaseImageId: image.originalBaseImageId,
          processingWarning: 'Image processing failed, using original RunPod output',
          // 🔥 FIX: Explicitly mark this as a generated result, not an input image
          resultType: 'GENERATED', // This is a generated result from tweak operation
          sourceModule: 'TWEAK' // Source module that generated this result
        };
        
        // Use user-based notification - SECURE: Only notify the correct user
        const notificationSent = webSocketService.notifyUserVariationCompleted(image.batch.user.id, errorNotificationData);

        if (!notificationSent) {
          console.warn('⚠️ User-based notification failed - user may not be connected. Error notification not sent.');
          // SECURITY: Removed dangerous fallback that broadcasted to ALL users
        }
      }

    } else if (status === 'failed' || status === 'canceled') {
      // Failed completion
      console.error('Outpaint job failed:', {
        replicateId,
        imageId: image.id,
        status: status,
        error: webhookData.error
      });

      await updateImageStatus(image.id, 'FAILED', {
        runpodStatus: 'FAILED',
        metadata: {
          error: webhookData.error || 'Replicate job failed',
          failedAt: new Date().toISOString()
        }
      });

      // Notify failure via WebSocket
      const failureNotificationData = {
        batchId: image.batchId,
        imageId: image.id,
        variationNumber: image.variationNumber,
        status: 'FAILED',
        error: webhookData.error || 'Generation failed',
        operationType: 'outpaint',
        originalBaseImageId: image.originalBaseImageId,
        // 🔥 FIX: Explicitly mark this as a generated result, not an input image
        resultType: 'GENERATED', // This is a generated result from tweak operation
        sourceModule: 'TWEAK' // Source module that generated this result
      };
      
      // Use user-based notification - SECURE: Only notify the correct user
      const notificationSent = webSocketService.notifyUserVariationCompleted(image.batch.user.id, failureNotificationData);

      if (!notificationSent) {
        console.warn('⚠️ User-based notification failed - user may not be connected. Failure notification not sent.');
        // SECURITY: Removed dangerous fallback that broadcasted to ALL users
      }

    } else {
      // Update status for other states (IN_PROGRESS, etc.)
      await updateImageStatus(image.id, 'PROCESSING', {
        runpodStatus: status
      });
      
      // Notify processing status via WebSocket
      const processingNotificationData = {
        batchId: image.batchId,
        imageId: image.id,
        variationNumber: image.variationNumber,
        status: 'PROCESSING',
        operationType: 'outpaint',
        originalBaseImageId: image.originalBaseImageId,
        runpodStatus: status,
        // 🔥 FIX: Explicitly mark this as a generated result, not an input image
        resultType: 'GENERATED', // This is a generated result from tweak operation
        sourceModule: 'TWEAK' // Source module that generated this result
      };
      
      // Use user-based notification - SECURE: Only notify the correct user
      const notificationSent = webSocketService.notifyUserVariationCompleted(image.batch.user.id, processingNotificationData);

      if (!notificationSent) {
        console.warn('⚠️ User-based notification failed - user may not be connected. Processing status not sent.');
        // SECURITY: Removed dangerous fallback that broadcasted to ALL users
      }
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error handling outpaint webhook:', error);
    
    // Try to update image status to failed if we can identify the image
    if (req.body?.input?.job_id) {
      try {
        const imageId = parseInt(req.body.input.job_id);
        await updateImageStatus(imageId, 'FAILED', {
          runpodStatus: 'WEBHOOK_ERROR',
          metadata: {
            error: error.message,
            failedAt: new Date().toISOString()
          }
        });
        
        // Notify failure via WebSocket - try to get user from image if possible
        const errorImage = await prisma.image.findFirst({
          where: { id: imageId },
          include: { batch: { include: { user: true } } }
        });
        
        const errorNotificationData = {
          batchId: null,
          imageId: imageId,
          variationNumber: 1,
          status: 'FAILED',
          error: 'Webhook processing error: ' + error.message,
          operationType: 'outpaint',
          // 🔥 FIX: Explicitly mark this as a generated result, not an input image
          resultType: 'GENERATED', // This is a generated result from tweak operation
          sourceModule: 'TWEAK' // Source module that generated this result
        };
        
        if (errorImage?.batch?.user?.id) {
          const notificationSent = webSocketService.notifyUserVariationCompleted(errorImage.batch.user.id, errorNotificationData);
          if (!notificationSent) {
            console.warn('⚠️ User-based notification failed - user may not be connected. Error notification not sent.');
            // SECURITY: Removed dangerous fallback that broadcasted to ALL users
          }
        } else {
          console.error('😱 No user ID found for error image - cannot send secure notification');
          // SECURITY: Cannot send notification without user ID to avoid broadcasting
        }
      } catch (updateError) {
        console.error('Failed to update image status after webhook error:', updateError);
      }
    }
    
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

  // Get image with user info for milestone checking before updating
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    include: { user: true }
  });

  const updatedImage = await prisma.image.update({
    where: { id: imageId },
    data: updateData
  });

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

  return updatedImage;
}

/**
 * Handle inpaint webhook from Replicate (formerly RunPod)
 */
async function handleInpaintWebhook(req, res) {
  try {
    const webhookData = req.body;

    // Extract parameters from query string (Replicate format)
    const { jobId, uuid, task, isRetry, retryAttempt, originalJobId } = req.query;

    console.log('Inpaint webhook received:', {
      id: webhookData.id,
      status: webhookData.status,
      jobId: jobId,
      uuid: uuid,
      task: task,
      isRetry: isRetry,
      retryAttempt: retryAttempt,
      originalJobId: originalJobId
    });

    if (!webhookData.id || !jobId) {
      console.error('Invalid inpaint webhook data - missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const replicateId = webhookData.id;
    const status = webhookData.status;
    const imageId = parseInt(jobId); // We use image ID as job_id

    // Find the specific Image record
    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        runpodJobId: replicateId // Still using runpodJobId field for compatibility
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
      console.error('Image record not found for inpaint job:', { replicateId, imageId });
      return res.status(404).json({ error: 'Image record not found' });
    }

    console.log('Processing inpaint webhook for variation:', {
      imageId: image.id,
      batchId: image.batchId,
      variationNumber: image.variationNumber,
      status
    });

    if (status === 'succeeded') {
      // Successful completion - process the inpaint result
      const outputImageUrl = webhookData.output;

      if (!outputImageUrl) {
        console.error('No output images in completed inpaint job:', replicateId);
        await updateImageStatus(image.id, 'FAILED', {
          metadata: {
            error: 'No output images generated',
            failedAt: new Date().toISOString()
          }
        });
        return res.status(400).json({ error: 'No output images' });
      }
      
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

        // Get original image metadata
        const metadata = await sharp(imageBuffer).metadata();
        console.log('Inpaint image dimensions:', {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format
        });

        // Step 1: Upload original high-resolution image directly to S3 (preserves original quality and file size)
        console.log('Uploading original inpaint image buffer directly to S3...');
        const originalUpload = await s3Service.uploadGeneratedImage(
          imageBuffer,
          `inpaint-${image.id}-original.jpg`,
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

          console.log('Resizing inpaint image for LoRA training from', `${metadata.width}x${metadata.height}`, 'to', `${finalWidth}x${finalHeight}`);

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
          console.log('Inpaint image is within LoRA bounds, no resizing needed for training');
          processedBuffer = await sharp(imageBuffer)
            .jpeg({ 
              quality: 100, // Maximum quality for LoRA training
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

        // Upload processed image to S3 (for LoRA training)
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

        // Get the preview URL from the original base input image
        let previewUrl = null;
        if (image.originalBaseImageId) {
          const baseInputImage = await prisma.inputImage.findUnique({
            where: { id: image.originalBaseImageId },
            select: { previewUrl: true, originalUrl: true }
          });
          if (baseInputImage) {
            previewUrl = baseInputImage.previewUrl || baseInputImage.originalUrl;
          }
        }

        // Update image record with original URL for canvas display and processed URL for LoRA
        await updateImageStatus(image.id, 'COMPLETED', {
          originalImageUrl: originalUpload.url, // High-resolution original for canvas display
          processedImageUrl: processedUpload.url, // Processed/resized for LoRA training
          thumbnailUrl: thumbnailUpload.success ? thumbnailUpload.url : processedUpload.url,
          previewUrl: previewUrl, // URL of the actual base input image for preview
          runpodStatus: 'COMPLETED',
          metadata: {
            task: 'inpaint',
            seed: webhookData.input?.seed || 'unknown',
            steps: webhookData.input?.steps || 50,
            guidance: webhookData.input?.guidance || 3,
            model: 'flux-fill-pro',
            dimensions: {
              width: metadata.width, // Original dimensions for canvas display
              height: metadata.height,
              originalWidth: metadata.width,
              originalHeight: metadata.height,
              processedWidth: finalWidth, // Processed dimensions for LoRA
              processedHeight: finalHeight,
              wasResized: finalWidth !== metadata.width || finalHeight !== metadata.height
            }
          }
        });

        console.log('Inpaint variation completed and processed successfully:', {
          imageId: image.id,
          variationNumber: image.variationNumber,
          originalUrl: originalUpload.url, // High-resolution for canvas
          processedUrl: processedUpload.url, // Processed for LoRA training
          thumbnailUrl: thumbnailUpload.success ? thumbnailUpload.url : processedUpload.url,
          originalDimensions: `${metadata.width}x${metadata.height}`,
          processedDimensions: `${finalWidth}x${finalHeight}`,
          originalBaseImageId: image.originalBaseImageId
        });

        // Notify individual variation completion via WebSocket (use original URL for canvas display)
        const notificationData = {
          batchId: image.batchId,
          imageId: image.id,
          variationNumber: image.variationNumber,
          imageUrl: originalUpload.url, // Use ORIGINAL high-resolution image for canvas display
          processedUrl: processedUpload.url, // Processed URL for LoRA training
          thumbnailUrl: thumbnailUpload.success ? thumbnailUpload.url : processedUpload.url,
          previewUrl: previewUrl, // Include preview URL in WebSocket notification
          status: 'COMPLETED',
          dimensions: {
            width: metadata.width, // Original dimensions for canvas
            height: metadata.height
          },
          operationType: 'inpaint',
          originalBaseImageId: image.originalBaseImageId,
          // 🔥 ENHANCEMENT: Include prompt data for UI
          promptData: {
            prompt: image.aiPrompt,
            settingsSnapshot: image.settingsSnapshot,
            moduleType: 'TWEAK'
          },
          // 🔥 FIX: Explicitly mark this as a generated result, not an input image
          resultType: 'GENERATED', // This is a generated result from tweak operation
          sourceModule: 'TWEAK' // Source module that generated this result
        };
        
        console.log('🔔 Sending user-based WebSocket notification for inpaint completion:', {
          userId: image.batch.user.id,
          imageId: image.id,
          originalBaseImageId: image.originalBaseImageId,
          batchId: image.batchId
        });
        
        // Use user-based notification - SECURE: Only notify the correct user
        const notificationSent = webSocketService.notifyUserVariationCompleted(image.batch.user.id, notificationData);

        if (!notificationSent) {
          console.warn('⚠️ User-based notification failed - user may not be connected. Image processing completed but user will not be notified until reconnection.');
          // SECURITY: Removed dangerous fallback that broadcasted to ALL users
        }

      } catch (processingError) {
        console.error('Error processing inpaint output image:', processingError);

        // Get the preview URL from the original base input image for fallback case too
        let previewUrl = null;
        if (image.originalBaseImageId) {
          try {
            const baseInputImage = await prisma.inputImage.findUnique({
              where: { id: image.originalBaseImageId },
              select: { previewUrl: true, originalUrl: true }
            });
            if (baseInputImage) {
              previewUrl = baseInputImage.previewUrl || baseInputImage.originalUrl;
            }
          } catch (previewError) {
            console.warn('Failed to get preview URL for fallback:', previewError);
          }
        }

        // Fall back to using the original RunPod URL if processing fails
        await updateImageStatus(image.id, 'COMPLETED', {
          originalImageUrl: outputImageUrl, // Use original RunPod output as original
          processedImageUrl: outputImageUrl, // Same URL as fallback for processed
          previewUrl: previewUrl, // Include preview URL even in fallback
          runpodStatus: 'COMPLETED',
          metadata: {
            task: 'inpaint',
            processingError: processingError.message
          }
        });

        // Notify completion even with processing error (use original URL for canvas)
        const errorNotificationData = {
          batchId: image.batchId,
          imageId: image.id,
          variationNumber: image.variationNumber,
          imageUrl: outputImageUrl, // Use original RunPod output for canvas display
          status: 'COMPLETED',
          operationType: 'inpaint',
          originalBaseImageId: image.originalBaseImageId,
          processingWarning: 'Image processing failed, using original RunPod output',
          // 🔥 FIX: Explicitly mark this as a generated result, not an input image
          resultType: 'GENERATED', // This is a generated result from tweak operation
          sourceModule: 'TWEAK' // Source module that generated this result
        };
        
        // Use user-based notification - SECURE: Only notify the correct user
        const notificationSent = webSocketService.notifyUserVariationCompleted(image.batch.user.id, errorNotificationData);

        if (!notificationSent) {
          console.warn('⚠️ User-based notification failed - user may not be connected. Error notification not sent.');
          // SECURITY: Removed dangerous fallback that broadcasted to ALL users
        }
      }

    } else if (status === 'failed' || status === 'canceled') {
      // Failed completion
      console.error('Inpaint job failed:', {
        replicateId,
        imageId: image.id,
        status: status,
        error: webhookData.error
      });

      await updateImageStatus(image.id, 'FAILED', {
        runpodStatus: 'FAILED',
        metadata: {
          error: webhookData.error || 'Replicate job failed',
          failedAt: new Date().toISOString()
        }
      });

      // Notify failure via WebSocket
      const failureNotificationData = {
        batchId: image.batchId,
        imageId: image.id,
        variationNumber: image.variationNumber,
        status: 'FAILED',
        error: webhookData.error || 'Generation failed',
        operationType: 'inpaint',
        originalBaseImageId: image.originalBaseImageId,
        // 🔥 FIX: Explicitly mark this as a generated result, not an input image
        resultType: 'GENERATED', // This is a generated result from tweak operation
        sourceModule: 'TWEAK' // Source module that generated this result
      };
      
      // Use user-based notification - SECURE: Only notify the correct user
      const notificationSent = webSocketService.notifyUserVariationCompleted(image.batch.user.id, failureNotificationData);

      if (!notificationSent) {
        console.warn('⚠️ User-based notification failed - user may not be connected. Failure notification not sent.');
        // SECURITY: Removed dangerous fallback that broadcasted to ALL users
      }

    } else {
      // Update status for other states (IN_PROGRESS, etc.)
      await updateImageStatus(image.id, 'PROCESSING', {
        runpodStatus: status
      });
      
      // Notify processing status via WebSocket
      const processingNotificationData = {
        batchId: image.batchId,
        imageId: image.id,
        variationNumber: image.variationNumber,
        status: 'PROCESSING',
        operationType: 'inpaint',
        originalBaseImageId: image.originalBaseImageId,
        runpodStatus: status,
        // 🔥 FIX: Explicitly mark this as a generated result, not an input image
        resultType: 'GENERATED', // This is a generated result from tweak operation
        sourceModule: 'TWEAK' // Source module that generated this result
      };
      
      // Use user-based notification - SECURE: Only notify the correct user
      const notificationSent = webSocketService.notifyUserVariationCompleted(image.batch.user.id, processingNotificationData);

      if (!notificationSent) {
        console.warn('⚠️ User-based notification failed - user may not be connected. Processing status not sent.');
        // SECURITY: Removed dangerous fallback that broadcasted to ALL users
      }
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error handling inpaint webhook:', error);
    
    // Try to update image status to failed if we can identify the image
    if (req.body?.input?.job_id) {
      try {
        const imageId = parseInt(req.body.input.job_id);
        await updateImageStatus(imageId, 'FAILED', {
          runpodStatus: 'WEBHOOK_ERROR',
          metadata: {
            error: error.message,
            failedAt: new Date().toISOString()
          }
        });
        
        // Notify failure via WebSocket - try to get user from image if possible
        const errorImage = await prisma.image.findFirst({
          where: { id: imageId },
          include: { batch: { include: { user: true } } }
        });
        
        const errorNotificationData = {
          batchId: null,
          imageId: imageId,
          variationNumber: 1,
          status: 'FAILED',
          error: 'Webhook processing error: ' + error.message,
          operationType: 'inpaint',
          // 🔥 FIX: Explicitly mark this as a generated result, not an input image
          resultType: 'GENERATED', // This is a generated result from tweak operation
          sourceModule: 'TWEAK' // Source module that generated this result
        };
        
        if (errorImage?.batch?.user?.id) {
          const notificationSent = webSocketService.notifyUserVariationCompleted(errorImage.batch.user.id, errorNotificationData);
          if (!notificationSent) {
            console.warn('⚠️ User-based notification failed - user may not be connected. Error notification not sent.');
            // SECURITY: Removed dangerous fallback that broadcasted to ALL users
          }
        } else {
          console.error('😱 No user ID found for error image - cannot send secure notification');
          // SECURITY: Cannot send notification without user ID to avoid broadcasting
        }
      } catch (updateError) {
        console.error('Failed to update image status after webhook error:', updateError);
      }
    }
    
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