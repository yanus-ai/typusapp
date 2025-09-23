// server/src/jobs/imageStatusChecker.js
const cron = require('node-cron');
const { prisma } = require('../services/prisma.service');
const runpodService = require('../services/runpod.service');
const replicateService = require('../services/replicate.service');
const websocketService = require('../services/websocket.service');

class ImageStatusChecker {
  constructor() {
    this.isRunning = false;
    this.maxRetryAttempts = 1;
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
      // await this.cleanupTimedOutImages();
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
            include: {
              createSettings: true,
              tweakBatch: true
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

      // Skip refine operations (comment out for now)
      if (operationType === 'refine') {
        console.log(`⏭️ Skipping refine operation for image ${image.id} - refine operations temporarily disabled`);
        return;
      }

      // Handle upscale operations with Replicate API
      if (operationType === 'upscale') {
        await this.handleUpscaleStatusCheck(image);
        return;
      }

      // Check status with RunPod API for other operations (create, outpaint, inpaint)
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

  async handleUpscaleStatusCheck(image) {
    try {
      console.log(`🔍 Checking upscale status for image ${image.id}, replicate job ${image.runpodJobId}`);

      // Check status with Replicate API (runpodJobId stores the Replicate job ID for upscale operations)
      const statusResult = await replicateService.getJobStatus(image.runpodJobId);

      if (statusResult.success) {
        const replicateStatus = statusResult.data.status;
        const replicateData = statusResult.data;

        console.log(`✅ Replicate status check successful for image ${image.id}: ${replicateStatus}`);

        // Map Replicate status to our internal status
        const mappedStatus = this.mapReplicateStatus(replicateStatus);

        // Update the database with the new status
        await this.updateUpscaleImageStatus(image, replicateStatus, mappedStatus, replicateData);

        // Handle completed/failed states based on Replicate status
        if (replicateStatus === 'succeeded' && replicateData.output) {
          console.log(`🎉 Upscale completed for image ${image.id}, but webhook should have already handled this`);
          // Webhook should have already processed this, but we can log it
        } else if (replicateStatus === 'failed') {
          console.log(`❌ Upscale failed for image ${image.id}, ensuring it's marked as failed`);
          await this.handleFailedUpscaleImage(image, replicateData);
        } else if (replicateStatus === 'processing' || replicateStatus === 'starting') {
          console.log(`⏳ Upscale still processing for image ${image.id}: ${replicateStatus}`);
          // Just status update, no additional action needed
        }

      } else {
        console.error(`❌ Failed to check upscale status for image ${image.id}:`, statusResult.error);

        // If API call fails, check if image should be retried or marked as failed
        await this.handleUpscaleStatusCheckFailure(image);
      }

    } catch (error) {
      console.error(`❌ Error checking upscale status for image ${image.id}:`, error);
    }
  }

  mapReplicateStatus(replicateStatus) {
    // Map Replicate statuses to our internal status format
    switch (replicateStatus) {
      case 'succeeded':
        return 'COMPLETED';
      case 'failed':
        return 'FAILED';
      case 'canceled':
        return 'CANCELED';
      case 'processing':
        return 'PROCESSING';
      case 'starting':
        return 'STARTING';
      default:
        return 'PROCESSING';
    }
  }

  async updateUpscaleImageStatus(image, replicateStatus, mappedStatus, statusData) {
    try {
      await prisma.image.update({
        where: { id: image.id },
        data: {
          runpodStatus: replicateStatus, // Store original Replicate status
          status: mappedStatus, // Store mapped internal status
          updatedAt: new Date(),
          metadata: {
            ...(image.metadata || {}),
            replicateStatus: replicateStatus,
            lastStatusCheck: new Date().toISOString(),
            progress: statusData.progress || null
          }
        }
      });

      console.log(`✅ Updated upscale image ${image.id} status: ${replicateStatus} -> ${mappedStatus}`);

    } catch (error) {
      console.error(`❌ Failed to update upscale image ${image.id} status:`, error);
    }
  }

  async handleFailedUpscaleImage(image, statusData) {
    try {
      console.log(`❌ Handling failed upscale for image ${image.id}`);

      // Check if we should retry this failed upscale
      const retryAttempts = (image.metadata && image.metadata.retryAttempts) || 0;

      if (retryAttempts < this.maxRetryAttempts) {
        console.log(`🔄 Attempting retry ${retryAttempts + 1} for failed upscale image ${image.id}`);
        await this.retryUpscaleGeneration(image, retryAttempts + 1);
        return;
      }

      // Mark as permanently failed
      console.log(`💀 Marking upscale image ${image.id} as permanently failed after ${retryAttempts} retries`);

      await prisma.image.update({
        where: { id: image.id },
        data: {
          status: 'FAILED',
          runpodStatus: 'FAILED',
          updatedAt: new Date(),
          metadata: {
            ...(image.metadata || {}),
            error: statusData.error || 'Replicate upscale job failed',
            failedAt: new Date().toISOString(),
            finalFailure: true,
            totalRetryAttempts: retryAttempts
          }
        }
      });

      // Send WebSocket notification about permanent failure
      await this.sendWebSocketUpdate(image, 'variation_failed', {
        imageId: image.id,
        batchId: image.batchId,
        variationNumber: image.variationNumber,
        operationType: 'upscale',
        error: retryAttempts > 0
          ? `Failed after ${retryAttempts} retry attempts: ${statusData.error || 'Replicate upscale job failed'}`
          : statusData.error || 'Replicate upscale job failed',
        retryAttempts: retryAttempts
      });

    } catch (error) {
      console.error(`❌ Failed to handle failed upscale image ${image.id}:`, error);
    }
  }

  async handleUpscaleStatusCheckFailure(image) {
    // If we can't check upscale status, increment failure count
    const statusCheckFailures = (image.metadata && image.metadata.statusCheckFailures) || 0;

    if (statusCheckFailures >= 5) {
      await this.markImageAsFailed(image, 'Unable to check Replicate upscale status after 5 attempts');
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

  async retryUpscaleGeneration(image, retryAttempt) {
    try {
      console.log(`🔄 Attempting to retry Replicate upscale for image ${image.id}, attempt ${retryAttempt}`);

      // Update status to indicate retry in progress
      await prisma.image.update({
        where: { id: image.id },
        data: {
          status: 'PROCESSING',
          runpodStatus: retryAttempt === 1 ? 'RETRY_1' : 'RETRY_2',
          updatedAt: new Date(),
          metadata: {
            ...(image.metadata || {}),
            retryAttempts: retryAttempt,
            lastRetryAt: new Date().toISOString(),
            isRetry: true,
            originalJobId: image.runpodJobId
          }
        }
      });

      // For upscale retries, we would need to reconstruct the original parameters
      // and call the upscale controller again. This is more complex than RunPod retries
      // because we need to extract the original upscale parameters from the image metadata

      console.log(`⚠️ Upscale retry not yet implemented - marking as failed for now`);
      await this.markImageAsFailed(image, `Upscale retry not implemented yet (attempt ${retryAttempt})`);

    } catch (error) {
      console.error(`❌ Failed to retry upscale image ${image.id} generation:`, error);
      await this.markImageAsFailed(image, `Failed to retry upscale: ${error.message}`);
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

      // Check if we should retry this failed image
      const retryAttempts = (image.metadata && image.metadata.retryAttempts) || 0;
      
      if (retryAttempts < this.maxRetryAttempts) {
        console.log(`🔄 Attempting retry ${retryAttempts + 1} for failed image ${image.id}`);
        await this.retryImageGeneration(image, retryAttempts + 1);
        return; // Exit early, don't mark as failed yet
      }

      // If we've exhausted retries or this is already a retry, mark as permanently failed
      console.log(`💀 Marking image ${image.id} as permanently failed after ${retryAttempts} retries`);

      await prisma.image.update({
        where: { id: image.id },
        data: {
          status: 'FAILED',
          runpodStatus: 'FAILED',
          updatedAt: new Date(),
          metadata: {
            ...(image.metadata || {}),
            error: statusData.error || 'RunPod job failed',
            failedAt: new Date().toISOString(),
            finalFailure: true,
            totalRetryAttempts: retryAttempts
          }
        }
      });

      // Send WebSocket notification about permanent failure
      await this.sendWebSocketUpdate(image, 'variation_failed', {
        imageId: image.id,
        batchId: image.batchId,
        variationNumber: image.variationNumber,
        operationType: this.getOperationTypeFromBatch(image.batch),
        error: retryAttempts > 0 
          ? `Failed after ${retryAttempts} retry attempts: ${statusData.error || 'RunPod job failed'}`
          : statusData.error || 'RunPod job failed',
        retryAttempts: retryAttempts
      });

      console.log(`💥 Image ${image.id} marked as permanently failed and notification sent`);

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
            include: {
              createSettings: true,
              tweakBatch: true
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
    try {
      console.log(`🔄 Attempting to retry RunPod job for image ${image.id}, attempt ${retryAttempt}`);
      
      // First, update the image status to indicate retry in progress
      await prisma.image.update({
        where: { id: image.id },
        data: {
          status: 'PROCESSING',
          runpodStatus: retryAttempt === 1 ? 'RETRY_1' : 'RETRY_2',
          updatedAt: new Date(),
          metadata: {
            ...(image.metadata || {}),
            retryAttempts: retryAttempt,
            lastRetryAt: new Date().toISOString(),
            isRetry: true,
            originalJobId: image.runpodJobId
          }
        }
      });

      // Reconstruct the original parameters for retry
      const operationType = this.getOperationTypeFromBatch(image.batch);
      const retryParams = await this.buildRetryParams(image, operationType, retryAttempt);

      if (!retryParams) {
        throw new Error(`Unable to reconstruct parameters for ${operationType} operation`);
      }

      // Call the appropriate RunPod service method
      let retryResult;
      switch (operationType) {
        case 'outpaint':
          retryResult = await runpodService.generateOutpaint(retryParams);
          break;
        case 'inpaint':
          retryResult = await runpodService.generateInpaint(retryParams);
          break;
        case 'create':
        case 'regional_prompt':
          retryResult = await runpodService.generateImage(retryParams);
          break;
        default:
          throw new Error(`Unsupported operation type for retry: ${operationType}`);
      }

      if (retryResult.success) {
        // Update with new RunPod job ID
        await prisma.image.update({
          where: { id: image.id },
          data: {
            runpodJobId: retryResult.runpodId,
            runpodStatus: 'SUBMITTED',
            updatedAt: new Date(),
            metadata: {
              ...(image.metadata || {}),
              retryAttempts: retryAttempt,
              lastRetryAt: new Date().toISOString(),
              isRetry: true,
              originalJobId: image.metadata?.originalJobId || image.runpodJobId,
              newJobId: retryResult.runpodId
            }
          }
        });

        console.log(`✅ Retry successful for image ${image.id}. New RunPod job: ${retryResult.runpodId}`);
        
        // Send WebSocket notification about retry
        await this.sendWebSocketUpdate(image, 'variation_progress', {
          imageId: image.id,
          batchId: image.batchId,
          variationNumber: image.variationNumber,
          operationType: operationType,
          status: 'PROCESSING',
          runpodStatus: retryAttempt === 1 ? 'RETRY_1' : 'RETRY_2',
          message: `Retrying generation (attempt ${retryAttempt})`
        });

      } else {
        throw new Error(`RunPod retry failed: ${retryResult.error}`);
      }

    } catch (error) {
      console.error(`❌ Failed to retry image ${image.id} generation:`, error);
      
      // Update metadata to track retry failure
      await prisma.image.update({
        where: { id: image.id },
        data: {
          runpodStatus: 'RETRY_FAILED',
          updatedAt: new Date(),
          metadata: {
            ...(image.metadata || {}),
            retryAttempts: retryAttempt,
            lastRetryAt: new Date().toISOString(),
            retryError: error.message
          }
        }
      });

      // If this was our last retry attempt, mark as failed
      if (retryAttempt >= this.maxRetryAttempts) {
        await this.markImageAsFailed(image, `Failed after ${retryAttempt} retry attempts: ${error.message}`);
      }
    }
  }

  async buildRetryParams(image, operationType, retryAttempt) {
    try {
      const baseParams = {
        jobId: image.id,
        uuid: image.id,
        webhook: this.getWebhookUrl(operationType),
        isRetry: true,
        retryAttempt: retryAttempt,
        originalJobId: image.metadata?.originalJobId || image.runpodJobId
      };

      switch (operationType) {
        case 'create':
        case 'regional_prompt':
          // For CREATE module operations
          const createSettings = image.batch.createSettings;
          const settingsSnapshot = image.settingsSnapshot;
          
          return {
            ...baseParams,
            operationType: operationType,
            // Required params from settingsSnapshot or createSettings
            prompt: image.aiPrompt || settingsSnapshot?.prompt || '',
            // Mask prompts from settingsSnapshot
            yellow_mask: settingsSnapshot?.yellow_mask || '',
            yellow_prompt: settingsSnapshot?.yellow_prompt || '',
            red_mask: settingsSnapshot?.red_mask || '',
            red_prompt: settingsSnapshot?.red_prompt || '',
            green_mask: settingsSnapshot?.green_mask || '',
            green_prompt: settingsSnapshot?.green_prompt || '',
            blue_mask: settingsSnapshot?.blue_mask || '',
            blue_prompt: settingsSnapshot?.blue_prompt || '',
            gold_mask: settingsSnapshot?.gold_mask || '',
            gold_prompt: settingsSnapshot?.gold_prompt || '',
            // Settings
            creativity: createSettings?.creativity || 50,
            expressivity: createSettings?.expressivity || 50,
            resemblance: createSettings?.resemblance || 50,
            category: createSettings?.category || settingsSnapshot?.category || '',
            context: createSettings?.context || settingsSnapshot?.context || '',
            style: createSettings?.style || settingsSnapshot?.style || '',
            buildingType: createSettings?.buildingType || settingsSnapshot?.buildingType || '',
            // Random seed for retry
            seed: Math.floor(Math.random() * 1000000).toString()
          };

        case 'outpaint':
          // For OUTPAINT operations
          const outpaintSettings = image.settingsSnapshot;
          
          return {
            ...baseParams,
            // Get base image URL from the original base image or input image
            image: await this.getBaseImageUrl(image),
            prompt: image.aiPrompt || outpaintSettings?.prompt || '',
            // Outpaint bounds from settingsSnapshot
            top: outpaintSettings?.outpaintBounds?.top || 0,
            bottom: outpaintSettings?.outpaintBounds?.bottom || 0,
            left: outpaintSettings?.outpaintBounds?.left || 0,
            right: outpaintSettings?.outpaintBounds?.right || 0,
            // Random seed for retry
            seed: Math.floor(Math.random() * 1000000),
            steps: 30,
            cfg: 3.5,
            denoise: 1,
            task: 'outpaint'
          };

        case 'inpaint':
          // For INPAINT operations
          const inpaintSettings = image.settingsSnapshot;
          
          return {
            ...baseParams,
            // Get base image and mask URLs
            image: await this.getBaseImageUrl(image),
            mask: inpaintSettings?.maskImageUrl || '',
            prompt: image.aiPrompt || inpaintSettings?.prompt || '',
            negativePrompt: inpaintSettings?.negativePrompt || '',
            maskKeyword: inpaintSettings?.maskKeyword || '',
            // Random seed for retry
            seed: Math.floor(Math.random() * 1000000),
            steps: 40,
            cfg: 1,
            denoise: 1,
            task: 'inpaint'
          };

        default:
          throw new Error(`Unsupported operation type: ${operationType}`);
      }

    } catch (error) {
      console.error(`Failed to build retry params for ${operationType}:`, error);
      return null;
    }
  }

  getWebhookUrl(operationType) {
    const baseUrl = process.env.BASE_URL;
    switch (operationType) {
      case 'outpaint':
        return `${baseUrl}/api/tweak/outpaint/webhook`;
      case 'inpaint':
        return `${baseUrl}/api/tweak/inpaint/webhook`;
      case 'create':
      case 'regional_prompt':
        return `${baseUrl}/api/create/webhook`;
      default:
        return `${baseUrl}/api/create/webhook`;
    }
  }

  async getBaseImageUrl(image) {
    try {
      // If we have originalBaseImageId, get the URL from that image
      if (image.originalBaseImageId) {
        const baseImage = await prisma.image.findUnique({
          where: { id: image.originalBaseImageId },
          select: { originalImageUrl: true, processedImageUrl: true }
        });
        
        if (baseImage) {
          return baseImage.originalImageUrl || baseImage.processedImageUrl;
        }
      }

      // Fall back to base image URL from settingsSnapshot
      const settingsSnapshot = image.settingsSnapshot;
      if (settingsSnapshot?.baseImageUrl) {
        return settingsSnapshot.baseImageUrl;
      }

      // If we still don't have a base image URL, try to get it from batch metadata
      const batchMetadata = image.batch.metaData;
      if (batchMetadata?.baseImageUrl) {
        return batchMetadata.baseImageUrl;
      }

      throw new Error(`Could not determine base image URL for image ${image.id}`);
    } catch (error) {
      console.error(`Failed to get base image URL for image ${image.id}:`, error);
      throw error;
    }
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