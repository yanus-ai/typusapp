// server/src/jobs/imageStatusChecker.js
const cron = require('node-cron');
const { prisma } = require('../services/prisma.service');
const runpodService = require('../services/runpod.service');
const websocketService = require('../services/websocket.service');

class ImageStatusChecker {
  constructor() {
    this.isRunning = false;
    this.maxRetryAttempts = 3;
    this.timeoutThreshold = 8 * 60 * 1000; // 8 minutes in milliseconds
  }

  // Start the cron job - runs every 30 seconds
  start() {
    console.log('🕒 Starting image status checker cron job...');
    
    // Check every 30 seconds for processing images
    cron.schedule('*/30 * * * * *', async () => {
      if (!this.isRunning) {
        await this.checkProcessingImages();
      }
    });

    // Cleanup failed images every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      await this.cleanupTimedOutImages();
    });

    console.log('✅ Image status checker cron job started');
  }

  async checkProcessingImages() {
    this.isRunning = true;
    
    try {
      // Find all processing images with RunPod job IDs
      const processingImages = await prisma.image.findMany({
        where: {
          status: 'PROCESSING',
          runpodJobId: {
            not: null
          }
        },
        include: {
          batch: {
            select: {
              userId: true,
              moduleType: true,
              metaData: true
            }
          }
        },
        take: 50 // Limit to prevent overload
      });

      console.log(`🔍 Found ${processingImages.length} processing images to check`);

      for (const image of processingImages) {
        await this.checkSingleImageStatus(image);
        // Small delay to prevent API rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error('❌ Error in checkProcessingImages:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async checkSingleImageStatus(image) {
    try {
      // Determine operation type from batch metadata
      let operationType = 'create';
      if (image.batch.metaData?.operationType) {
        operationType = image.batch.metaData.operationType;
      } else if (image.batch.moduleType === 'TWEAK') {
        operationType = 'outpaint'; // Default for tweak
      }

      console.log(`🔍 Checking status for image ${image.id}, job ${image.runpodJobId}, operation: ${operationType}`);

      // Check status with RunPod API
      const statusResult = await runpodService.getJobStatus(image.runpodJobId, operationType);

      if (statusResult.success) {
        const runpodStatus = statusResult.data.status;
        
        // Update the database with the new status
        await this.updateImageStatus(image, runpodStatus, statusResult.data);

        // Handle completed/failed states
        if (runpodStatus === 'COMPLETED' && statusResult.data.output?.imageUrl) {
          await this.handleCompletedImage(image, statusResult.data);
        } else if (runpodStatus === 'FAILED') {
          await this.handleFailedImage(image, statusResult.data);
        }

      } else {
        console.error(`❌ Failed to check status for image ${image.id}:`, statusResult.error);
        
        // If API call fails, check if image should be retried or marked as failed
        await this.handleStatusCheckFailure(image);
      }

    } catch (error) {
      console.error(`❌ Error checking status for image ${image.id}:`, error);
    }
  }

  async updateImageStatus(image, runpodStatus, statusData) {
    try {
      await prisma.image.update({
        where: { id: image.id },
        data: {
          runpodStatus: runpodStatus,
          updatedAt: new Date(),
          // Store additional metadata if available
          ...(statusData.executionTime && {
            metadata: {
              ...(image.metadata || {}),
              executionTime: statusData.executionTime,
              delayTime: statusData.delayTime || 0
            }
          })
        }
      });

      console.log(`✅ Updated image ${image.id} runpodStatus to: ${runpodStatus}`);

    } catch (error) {
      console.error(`❌ Failed to update image ${image.id} status:`, error);
    }
  }

  async handleCompletedImage(image, statusData) {
    try {
      console.log(`✅ Image ${image.id} completed, updating with final URLs`);

      const updateData = {
        status: 'COMPLETED',
        runpodStatus: 'COMPLETED',
        updatedAt: new Date()
      };

      // Update image URLs if provided
      if (statusData.output?.imageUrl) {
        updateData.originalImageUrl = statusData.output.imageUrl;
      }
      if (statusData.output?.thumbnailUrl) {
        updateData.thumbnailUrl = statusData.output.thumbnailUrl;
      }

      await prisma.image.update({
        where: { id: image.id },
        data: updateData
      });

      // Send WebSocket notification about completion
      await this.sendWebSocketUpdate(image, 'variation_completed', {
        imageId: image.id,
        imageUrl: statusData.output.imageUrl,
        thumbnailUrl: statusData.output.thumbnailUrl,
        batchId: image.batchId,
        variationNumber: image.variationNumber,
        operationType: this.getOperationTypeFromBatch(image.batch),
        originalBaseImageId: image.originalBaseImageId
      });

      console.log(`🎉 Image ${image.id} marked as completed and notification sent`);

    } catch (error) {
      console.error(`❌ Failed to handle completed image ${image.id}:`, error);
    }
  }

  async handleFailedImage(image, statusData) {
    try {
      console.log(`❌ Image ${image.id} failed on RunPod`);

      await prisma.image.update({
        where: { id: image.id },
        data: {
          status: 'FAILED',
          runpodStatus: 'FAILED',
          updatedAt: new Date(),
          metadata: {
            ...(image.metadata || {}),
            error: statusData.error || 'RunPod job failed',
            failedAt: new Date().toISOString()
          }
        }
      });

      // Send WebSocket notification about failure
      await this.sendWebSocketUpdate(image, 'variation_failed', {
        imageId: image.id,
        batchId: image.batchId,
        variationNumber: image.variationNumber,
        operationType: this.getOperationTypeFromBatch(image.batch),
        error: statusData.error || 'RunPod job failed'
      });

      console.log(`💥 Image ${image.id} marked as failed and notification sent`);

    } catch (error) {
      console.error(`❌ Failed to handle failed image ${image.id}:`, error);
    }
  }

  async cleanupTimedOutImages() {
    try {
      // Find images that have been processing for more than 8 minutes
      const timeoutThreshold = new Date(Date.now() - this.timeoutThreshold);
      
      const timedOutImages = await prisma.image.findMany({
        where: {
          status: 'PROCESSING',
          createdAt: {
            lt: timeoutThreshold
          }
        },
        include: {
          batch: {
            select: {
              userId: true,
              moduleType: true
            }
          }
        }
      });

      console.log(`🕐 Found ${timedOutImages.length} timed out images to cleanup`);

      for (const image of timedOutImages) {
        await this.handleTimedOutImage(image);
      }

    } catch (error) {
      console.error('❌ Error in cleanupTimedOutImages:', error);
    }
  }

  async handleTimedOutImage(image) {
    try {
      // Check if we should retry this image
      const retryAttempts = (image.metadata && image.metadata.retryAttempts) || 0;
      
      if (retryAttempts < this.maxRetryAttempts) {
        console.log(`🔄 Attempting retry ${retryAttempts + 1} for timed out image ${image.id}`);
        await this.retryImageGeneration(image, retryAttempts + 1);
      } else {
        console.log(`💀 Marking image ${image.id} as failed after ${retryAttempts} retries`);
        await this.markImageAsFailed(image, 'Timed out after 8 minutes');
      }

    } catch (error) {
      console.error(`❌ Failed to handle timed out image ${image.id}:`, error);
    }
  }

  async retryImageGeneration(image, retryAttempt) {
    // This would trigger a new RunPod job - implementation depends on your retry logic
    // For now, we'll just update the metadata to track retry attempts
    await prisma.image.update({
      where: { id: image.id },
      data: {
        runpodStatus: `RETRY_${retryAttempt}`,
        updatedAt: new Date(),
        metadata: {
          ...(image.metadata || {}),
          retryAttempts: retryAttempt,
          lastRetryAt: new Date().toISOString()
        }
      }
    });

    console.log(`🔄 Image ${image.id} marked for retry attempt ${retryAttempt}`);
  }

  async markImageAsFailed(image, reason) {
    await prisma.image.update({
      where: { id: image.id },
      data: {
        status: 'FAILED',
        runpodStatus: 'FAILED',
        updatedAt: new Date(),
        metadata: {
          ...(image.metadata || {}),
          error: reason,
          failedAt: new Date().toISOString()
        }
      }
    });

    // Send WebSocket notification
    await this.sendWebSocketUpdate(image, 'variation_failed', {
      imageId: image.id,
      batchId: image.batchId,
      variationNumber: image.variationNumber,
      operationType: this.getOperationTypeFromBatch(image.batch),
      error: reason
    });
  }

  async handleStatusCheckFailure(image) {
    // If we can't check status, increment failure count
    const statusCheckFailures = (image.metadata && image.metadata.statusCheckFailures) || 0;
    
    if (statusCheckFailures >= 5) {
      await this.markImageAsFailed(image, 'Unable to check RunPod status after 5 attempts');
    } else {
      await prisma.image.update({
        where: { id: image.id },
        data: {
          metadata: {
            ...(image.metadata || {}),
            statusCheckFailures: statusCheckFailures + 1
          }
        }
      });
    }
  }

  async sendWebSocketUpdate(image, messageType, data) {
    try {
      if (websocketService && websocketService.broadcastToUser) {
        await websocketService.broadcastToUser(image.batch.userId, {
          type: messageType,
          data: data
        });
        console.log(`📡 WebSocket notification sent: ${messageType} for image ${image.id}`);
      } else {
        console.warn('⚠️ WebSocket service not available, skipping notification');
      }
    } catch (error) {
      console.error('❌ Failed to send WebSocket update:', error);
    }
  }

  getOperationTypeFromBatch(batch) {
    if (batch.metaData?.operationType) {
      return batch.metaData.operationType;
    }
    return batch.moduleType === 'TWEAK' ? 'outpaint' : 'create';
  }
}

const imageStatusChecker = new ImageStatusChecker();

module.exports = imageStatusChecker;