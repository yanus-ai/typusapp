const { prisma } = require('../services/prisma.service');
const webSocketService = require('../services/websocket.service');
const s3Service = require('../services/image/s3.service');
const { checkAndSendImageMilestones } = require('../utils/milestoneHelper');
const sharp = require('sharp');
const axios = require('axios');

async function handleRefineWebhook(req, res) {
  try {
    const webhookData = req.body;
    
    console.log('Refine webhook received:', {
      id: webhookData.id,
      status: webhookData.status,
      jobId: webhookData.input?.job_id,
      uuid: webhookData.input?.uuid
    });

    if (!webhookData.id || !webhookData.input?.uuid) {
      console.error('Invalid refine webhook data - missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const runpodId = webhookData.id;
    const status = webhookData.status;
    const imageId = parseInt(webhookData.input.uuid); // We use image ID as uuid

    // Find the specific Image record by RunPod job ID
    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        runpodJobId: runpodId,
        moduleType: 'REFINE'
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
      console.error('Refine image record not found for RunPod job:', { runpodId, imageId });
      return res.status(404).json({ error: 'Refine image record not found' });
    }

    console.log('Processing refine webhook for variation:', {
      imageId: image.id,
      batchId: image.batchId,
      status: status,
      userId: image.userId
    });

    if (status === 'COMPLETED') {
      try {
        // Extract image URLs from webhook output
        const output = webhookData.output;
        let processedImageUrl = null;

        if (Array.isArray(output) && output.length > 0) {
          processedImageUrl = output[0];
        } else if (typeof output === 'string') {
          processedImageUrl = output;
        } else if (output && output.image_url) {
          processedImageUrl = output.image_url;
        }

        if (!processedImageUrl) {
          throw new Error('No processed image URL found in webhook output');
        }

        console.log('📸 Refine webhook - Processing image:', processedImageUrl);

        // Download the processed image
        const imageResponse = await axios.get(processedImageUrl, { 
          responseType: 'arraybuffer',
          timeout: 30000
        });
        const imageBuffer = Buffer.from(imageResponse.data);

        // Get image metadata
        const metadata = await sharp(imageBuffer).metadata();
        console.log('📏 Refine image metadata:', {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: imageBuffer.length
        });

        // Upload to S3
        const s3Key = `refine/processed/${image.userId}/${Date.now()}-${image.id}.jpg`;
        const s3UploadResult = await s3Service.uploadGeneratedImage(imageBuffer, s3Key);
        
        console.log('☁️ Refine image uploaded to S3:', s3UploadResult.Location);

        // Update the image record with the processed URL and metadata
        const updatedImage = await prisma.image.update({
          where: { id: image.id },
          data: {
            status: 'COMPLETED',
            processedImageUrl: s3UploadResult.Location,
            width: metadata.width,
            height: metadata.height,
            fileSize: imageBuffer.length,
            completedAt: new Date(),
            metaData: {
              ...image.metaData,
              s3Key: s3Key,
              originalRunpodUrl: processedImageUrl,
              processedAt: new Date().toISOString()
            }
          }
        });

        // Check for image milestones when refine is completed
        if (image.user) {
          await checkAndSendImageMilestones(
            image.userId,
            image.user.email,
            image.user.fullName,
            image.user.firstImageEmailSent,
            image.user.milestone10imagessent
          );
        }

        console.log('✅ Refine image updated successfully:', {
          id: updatedImage.id,
          status: updatedImage.status,
          processedImageUrl: updatedImage.processedImageUrl
        });

        // Check if all images in this batch are completed
        const batchImages = await prisma.image.findMany({
          where: { batchId: image.batchId }
        });

        const completedCount = batchImages.filter(img => img.status === 'COMPLETED').length;
        const totalCount = batchImages.length;

        console.log('📊 Refine batch progress:', {
          batchId: image.batchId,
          completed: completedCount,
          total: totalCount
        });

        // Update batch status if all images are completed
        if (completedCount === totalCount) {
          await prisma.generationBatch.update({
            where: { id: image.batchId },
            data: { 
              status: 'COMPLETED',
              completedAt: new Date()
            }
          });
          
          console.log('🎉 Refine batch completed:', image.batchId);
        }

        // Send WebSocket notification to user
        webSocketService.sendToUser(image.userId, 'refine_image_completed', {
          imageId: image.id,
          batchId: image.batchId,
          originalBaseImageId: image.originalBaseImageId,
          processedImageUrl: updatedImage.processedImageUrl,
          width: metadata.width,
          height: metadata.height,
          operationType: 'refine',
          completedCount,
          totalCount
        });

        console.log('📡 Refine WebSocket notification sent to user:', image.userId);

      } catch (processingError) {
        console.error('❌ Error processing refine webhook completion:', processingError);
        
        // Update image status to failed
        await prisma.image.update({
          where: { id: image.id },
          data: {
            status: 'FAILED',
            errorMessage: processingError.message,
            completedAt: new Date()
          }
        });

        // Send failure notification
        webSocketService.sendToUser(image.userId, 'refine_image_failed', {
          imageId: image.id,
          batchId: image.batchId,
          originalBaseImageId: image.originalBaseImageId,
          error: processingError.message,
          operationType: 'refine'
        });
      }

    } else if (status === 'FAILED') {
      console.log('❌ Refine job failed:', runpodId);
      
      // Update image status to failed
      const updatedImage = await prisma.image.update({
        where: { id: image.id },
        data: {
          status: 'FAILED',
          errorMessage: webhookData.error || 'Refine job failed',
          completedAt: new Date()
        }
      });

      // Send failure notification
      webSocketService.sendToUser(image.userId, 'refine_image_failed', {
        imageId: image.id,
        batchId: image.batchId,
        originalBaseImageId: image.originalBaseImageId,
        error: webhookData.error || 'Refine job failed',
        operationType: 'refine'
      });

      console.log('📡 Refine failure WebSocket notification sent to user:', image.userId);

    } else {
      console.log('ℹ️ Refine webhook status update:', status);
      
      // Update image status for other statuses (IN_PROGRESS, IN_QUEUE, etc.)
      await prisma.image.update({
        where: { id: image.id },
        data: {
          status: status.toUpperCase(),
          updatedAt: new Date()
        }
      });

      // Send status update notification
      webSocketService.sendToUser(image.userId, 'refine_image_status_update', {
        imageId: image.id,
        batchId: image.batchId,
        originalBaseImageId: image.originalBaseImageId,
        status: status.toUpperCase(),
        operationType: 'refine'
      });
    }

    res.status(200).json({ success: true, message: 'Refine webhook processed successfully' });

  } catch (error) {
    console.error('❌ Error handling refine webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error processing refine webhook',
      details: error.message 
    });
  }
}

module.exports = {
  handleRefineWebhook
};
