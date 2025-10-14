const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const sharp = require('sharp');
const prisma = new PrismaClient();
const webSocketService = require('../services/websocket.service');
const s3Service = require('../services/image/s3.service');
const { checkAndSend10ImageMilestone } = require('../utils/milestoneHelper');

/**
 * Handle upscale webhook from Replicate
 */
exports.handleUpscaleWebhook = async (req, res) => {
  try {
    console.log('🎯 Received upscale webhook from Replicate:', {
      body: req.body,
      headers: req.headers
    });

    const webhookData = req.body;

    // Extract relevant data from Replicate webhook
    const { id: replicateId, status, output, error, input } = webhookData;

    if (!replicateId) {
      console.error('❌ Missing Replicate ID in webhook');
      return res.status(400).json({ error: 'Missing Replicate ID' });
    }

    // Find the image record by Replicate ID (stored in runpodJobId field)
    const image = await prisma.image.findFirst({
      where: {
        runpodJobId: replicateId
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
      console.error('❌ Image not found for Replicate ID:', replicateId);
      return res.status(404).json({ error: 'Image not found' });
    }

    console.log('✅ Found image for upscale webhook:', {
      imageId: image.id,
      batchId: image.batchId,
      currentStatus: image.status,
      newStatus: status
    });

    // Handle different statuses
    switch (status) {
      case 'succeeded':
        await handleUpscaleSuccess(image, output, input);
        break;
      case 'failed':
        await handleUpscaleFailure(image, error);
        break;
      case 'processing':
      case 'starting':
        await handleUpscaleProcessing(image);
        break;
      default:
        console.log(`⚠️ Unknown upscale status: ${status}`);
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Upscale webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Handle successful upscale completion
 */
async function handleUpscaleSuccess(image, output, input) {
  try {
    console.log('✅ Processing upscale success for image:', image.id);

    // Get the output URL from Replicate response
    const outputUrl = Array.isArray(output) ? output[0] : output;

    if (!outputUrl) {
      throw new Error('No output URL in successful response');
    }

    // Download the upscaled image
    console.log('📥 Downloading upscaled image from:', outputUrl);
    const imageResponse = await axios.get(outputUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    const imageBuffer = Buffer.from(imageResponse.data);

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    console.log('📏 Upscaled image metadata:', {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: imageBuffer.length
    });

    // Upload main upscaled image to S3 (keep original behavior)
    const s3Key = `upscale/processed/${image.userId}/${Date.now()}-${image.id}.png`;
    const s3UploadResult = await s3Service.uploadGeneratedImage(
      imageBuffer,
      s3Key,
      'image/png'
    );

    // Create LoRA-optimized processed version (resize if needed)
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

      console.log('Resizing upscaled image for LoRA training from', `${metadata.width}x${metadata.height}`, 'to', `${finalWidth}x${finalHeight}`);

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
      console.log('Upscaled image is within LoRA bounds, no resizing needed for training');
      // Convert to JPEG for consistency
      processedBuffer = await sharp(imageBuffer)
        .jpeg({ 
          quality: 100, // Maximum quality for LoRA training
          progressive: true 
        })
        .toBuffer();
    }

    // Upload processed image to S3 (for LoRA training)
    console.log('Uploading LoRA-optimized processed image to S3...');
    const processedS3Key = `upscale/lora-processed/${image.userId}/${Date.now()}-${image.id}-lora.jpg`;
    const processedUpload = await s3Service.uploadGeneratedImage(
      processedBuffer,
      processedS3Key,
      'image/jpeg'
    );

    if (!processedUpload.success) {
      throw new Error('Failed to upload LoRA-processed image: ' + processedUpload.error);
    }

    // Process with replicateImageUploader for LoRA training
    console.log('Processing with replicateImageUploader for LoRA training...');
    let finalProcessedUrl = processedUpload.url;
    try {
      const replicateImageUploader = require('../services/image/replicateImageUploader.service');
      const replicateProcessedUrl = await replicateImageUploader.processImage(processedUpload.url);
      if (replicateProcessedUrl) {
        finalProcessedUrl = replicateProcessedUrl;
        console.log('✅ Replicate LoRA processing successful:', finalProcessedUrl);
      }
    } catch (replicateError) {
      console.warn('⚠️ Replicate LoRA processing failed, using direct S3 URL:', replicateError.message);
      // Continue with S3 URL as fallback
    }

    // Create thumbnail
    console.log('Creating thumbnail for upscaled image...');
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Upload thumbnail to S3
    const thumbnailS3Key = `upscale/thumbnails/${image.userId}/${Date.now()}-${image.id}-thumb.jpg`;
    const thumbnailUploadResult = await s3Service.uploadThumbnail(
      thumbnailBuffer,
      thumbnailS3Key,
      'image/jpeg'
    );

    console.log('☁️ Upscaled image uploaded to S3:', s3UploadResult.url);
    console.log('☁️ LoRA-processed image uploaded to S3:', finalProcessedUrl);
    console.log('☁️ Thumbnail uploaded to S3:', thumbnailUploadResult.url);

    // Update the image record (keep original behavior for originalImageUrl)
    await prisma.image.update({
      where: { id: image.id },
      data: {
        status: 'COMPLETED',
        originalImageUrl: s3UploadResult.url, // Keep original behavior - use upscaled image URL
        processedImageUrl: finalProcessedUrl, // Use LoRA-optimized version for processed
        thumbnailUrl: thumbnailUploadResult.url,
        metadata: {
          ...image.metadata,
          replicateOutput: output,
          replicateInput: input,
          dimensions: {
            width: metadata.width,
            height: metadata.height,
            originalWidth: metadata.width,
            originalHeight: metadata.height,
            processedWidth: finalWidth,
            processedHeight: finalHeight,
            wasResized: finalWidth !== metadata.width || finalHeight !== metadata.height
          }
        }
      }
    });

    // Check for 10-image milestone when upscale is completed
    if (image.user) {
      await checkAndSend10ImageMilestone(
        image.userId,
        image.user.email,
        image.user.fullName,
        image.user.milestone10imagessent
      );
    }

    // Check if all images in the batch are completed
    const batchImages = await prisma.image.findMany({
      where: { batchId: image.batchId }
    });

    const allCompleted = batchImages.every(img =>
      img.status === 'COMPLETED' || img.status === 'FAILED'
    );

    if (allCompleted) {
      await prisma.generationBatch.update({
        where: { id: image.batchId },
        data: { status: 'COMPLETED' }
      });

      // Copy AI materials from source image to completed upscale (if any exist)
      try {
        const sourceImageId = image.metadata?.sourceImageId;
        if (sourceImageId) {
          console.log('🔍 Checking for AI materials to copy from source image:', sourceImageId);
          
          // Get AI materials from the source InputImage
          const sourceInputImage = await prisma.inputImage.findUnique({
            where: { id: parseInt(sourceImageId) },
            select: { aiMaterials: true }
          });
          
          if (sourceInputImage?.aiMaterials && Array.isArray(sourceInputImage.aiMaterials) && sourceInputImage.aiMaterials.length > 0) {
            console.log(`📋 Copying ${sourceInputImage.aiMaterials.length} AI materials to upscaled image`);
            
            // Update the completed upscale image with the AI materials
            await prisma.image.update({
              where: { id: image.id },
              data: {
                metadata: {
                  ...image.metadata,
                  aiMaterials: sourceInputImage.aiMaterials,
                  aiMaterialsCopiedFrom: sourceImageId
                }
              }
            });
            
            console.log('✅ AI materials successfully copied to upscaled image');
          } else {
            console.log('ℹ️ No AI materials found on source image to copy');
          }
        }
      } catch (materialError) {
        console.warn('⚠️ Failed to copy AI materials to upscaled image:', materialError.message);
        // Don't fail the entire operation for material copying issues
      }
    }

    // Send both legacy notification (for backwards compatibility) and new user-based notification
    const notificationData = {
      batchId: image.batchId,
      imageId: image.id,
      variationNumber: image.variationNumber || 1,
      imageUrl: s3UploadResult.url, // Keep original behavior - use upscaled image URL
      processedImageUrl: finalProcessedUrl, // Use LoRA-optimized version for processed
      thumbnailUrl: thumbnailUploadResult.url,
      status: 'COMPLETED',
      runpodStatus: 'COMPLETED',
      moduleType: image.batch.moduleType || 'REFINE',
      operationType: 'upscale',
      createdAt: image.createdAt,
      updatedAt: new Date().toISOString(),
      // Include all the saved settings data for AI Prompt Modal
      maskMaterialMappings: image.maskMaterialMappings || {},
      aiPrompt: image.aiPrompt || null,
      aiMaterials: image.aiMaterials || [],
      settingsSnapshot: image.settingsSnapshot || {},
      contextSelection: image.contextSelection || null,
      originalBaseImageId: image.originalBaseImageId,
      // For frontend compatibility - originalInputImageId is needed for auto-selection
      originalInputImageId: image.originalBaseImageId || image.batch.inputImageId,
      batch: {
        id: image.batch.id,
        prompt: image.batch.prompt || 'Upscale operation',
        moduleType: image.batch.moduleType || 'REFINE',
        metaData: image.batch.metaData || {},
        createdAt: image.batch.createdAt,
        inputImageId: image.batch.inputImageId
      },
      dimensions: {
        width: metadata.width,
        height: metadata.height
      }
    };

    // Legacy notification (inputImage-based)
    // if (image.batch.inputImageId) {
    //   webSocketService.notifyVariationCompleted(image.batch.inputImageId, notificationData);
    // }
    
    // SECURE: User-based notification - only notify the correct user
    const notificationSent = webSocketService.notifyUserVariationCompleted(image.user.id, notificationData);

    if (!notificationSent) {
      console.warn('⚠️ User-based notification failed - user may not be connected.');
    }

    console.log('✅ Upscale success processed for image:', image.id);

  } catch (error) {
    console.error('❌ Error processing upscale success:', error);

    // Mark image as failed if processing the success fails
    await prisma.image.update({
      where: { id: image.id },
      data: {
        status: 'FAILED',
        metadata: {
          ...image.metadata,
          error: `Processing error: ${error.message}`,
          failedAt: new Date().toISOString()
        }
      }
    });
  }
}

/**
 * Handle upscale failure
 */
async function handleUpscaleFailure(image, error) {
  try {
    console.log('❌ Processing upscale failure for image:', image.id);

    const errorMessage = error?.message || error || 'Unknown error';

    // Update the image record
    await prisma.image.update({
      where: { id: image.id },
      data: {
        status: 'FAILED',
        metadata: {
          ...image.metadata,
          error: errorMessage,
          failedAt: new Date().toISOString()
        }
      }
    });

    // Check if all images in the batch are completed/failed
    const batchImages = await prisma.image.findMany({
      where: { batchId: image.batchId }
    });

    const allDone = batchImages.every(img =>
      img.status === 'COMPLETED' || img.status === 'FAILED'
    );

    if (allDone) {
      const hasAnySuccess = batchImages.some(img => img.status === 'COMPLETED');
      await prisma.generationBatch.update({
        where: { id: image.batchId },
        data: { status: hasAnySuccess ? 'COMPLETED' : 'FAILED' }
      });
    }

    // Send WebSocket notification using the same pattern as runpod webhook
    const failureNotificationData = {
      batchId: image.batchId,
      imageId: image.id,
      variationNumber: image.variationNumber || 1,
      status: 'FAILED',
      runpodStatus: 'FAILED',
      error: errorMessage,
      operationType: 'upscale',
      originalBaseImageId: image.originalBaseImageId,
      // For frontend compatibility - originalInputImageId is needed for auto-selection
      originalInputImageId: image.originalBaseImageId || image.batch.inputImageId
    };

    // SECURITY: Removed dangerous legacy broadcast method
    // Legacy dangerous call removed: webSocketService.notifyVariationFailed(...)

    // SECURE: User-based notification only
    const notificationSent = webSocketService.notifyUserVariationCompleted(image.user.id, failureNotificationData);

    if (!notificationSent) {
      console.warn('⚠️ User-based notification failed - user may not be connected.');
    }

    console.log('✅ Upscale failure processed for image:', image.id);

  } catch (error) {
    console.error('❌ Error processing upscale failure:', error);
  }
}

/**
 * Handle upscale processing status
 */
async function handleUpscaleProcessing(image) {
  try {
    console.log('⏳ Processing upscale status update for image:', image.id);

    // Update status if not already processing
    if (image.status !== 'PROCESSING') {
      await prisma.image.update({
        where: { id: image.id },
        data: { status: 'PROCESSING' }
      });
    }

    // Send WebSocket notification
    webSocketService.sendToUser(image.userId, 'upscale_processing', {
      imageId: image.id,
      batchId: image.batchId,
      operationType: 'upscale',
      originalBaseImageId: image.originalBaseImageId
    });

  } catch (error) {
    console.error('❌ Error processing upscale status update:', error);
  }
}