// server/src/jobs/imageStatusChecker.js
const cron = require('node-cron');
const { prisma } = require('../services/prisma.service');
const runpodService = require('../services/runpod.service');
const replicateService = require('../services/replicate.service');
const websocketService = require('../services/websocket.service');
const { checkAndSendImageMilestones } = require('../utils/milestoneHelper');
const axios = require('axios');
const sharp = require('sharp');
const s3Service = require('../services/image/s3.service');

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

      // Check if this is a Replicate job (inpaint uses Replicate, not RunPod)
      // Replicate job IDs are typically longer alphanumeric strings (like 'a4t68p0jqhrma0ct6099gr4k4m')
      const isReplicateJob = operationType === 'inpaint' || 
                             (image.metadata?.isReplicateJob) ||
                             (image.runpodJobId && image.runpodJobId.length > 15 && /^[a-z0-9]+$/.test(image.runpodJobId));

      if (isReplicateJob) {
        console.log(`🔍 Detected Replicate job for image ${image.id}, using Replicate API`);
        await this.handleReplicateInpaintStatusCheck(image);
        return;
      }

      // Check status with RunPod API for other operations (create, outpaint)
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

        // If RunPod API call fails (404 for Replicate jobs), mark as failed after a few attempts
        const statusCheckFailures = (image.metadata?.statusCheckFailures) || 0;
        if (statusResult.error?.status === 404 || statusCheckFailures >= 2) {
          console.log(`❌ Marking image ${image.id} as failed - API returned 404 (likely Replicate job checked via RunPod API) or too many failures`);
          await this.markImageAsFailed(image, statusResult.error?.message || 'Status check failed - job may not exist');
          return;
        }

        // If API call fails, check if image should be retried or marked as failed
        await this.handleStatusCheckFailure(image);
      }

    } catch (error) {
      console.error(`❌ Error checking status for image ${image.id}:`, error);
      // On error, increment failure count and mark as failed after threshold
      const statusCheckFailures = (image.metadata?.statusCheckFailures) || 0;
      if (statusCheckFailures >= 2) {
        await this.markImageAsFailed(image, `Status check failed: ${error.message}`);
      }
    }
  }

  async handleReplicateInpaintStatusCheck(image) {
    try {
      console.log(`🔍 Checking Replicate inpaint status for image ${image.id}, replicate job ${image.runpodJobId}`);

      // Check status with Replicate API
      const statusResult = await replicateService.getJobStatus(image.runpodJobId);

      if (statusResult.success) {
        const replicateStatus = statusResult.data.status;
        const replicateData = statusResult.data;

        console.log(`✅ Replicate inpaint status check successful for image ${image.id}: ${replicateStatus}`);

        // Map Replicate status to our internal status
        const mappedStatus = this.mapReplicateStatus(replicateStatus);

        // Update the database with the new status
        await this.updateInpaintImageStatus(image, replicateStatus, mappedStatus, replicateData);

        // Handle failed states based on Replicate status
        if (replicateStatus === 'failed' || replicateStatus === 'canceled') {
          const errorDetails = {
            error: replicateData.error || replicateData.message || 'Replicate job failed',
            errorDetails: replicateData.error || replicateData.logs || null,
            fullResponse: replicateData
          };
          console.error(`❌ Replicate inpaint failed for image ${image.id}:`, JSON.stringify(errorDetails, null, 2));
          // Auto-retry once on transient network errors during output download
          const isNetworkDownloadError = typeof errorDetails.error === 'string' && (
            errorDetails.error.includes('Network is unreachable') ||
            errorDetails.error.includes('Cannot connect to host delivery')
          );
          const retryCount = image.metadata?.replicateRetry?.retryCount || 0;
          if (isNetworkDownloadError && retryCount < 1) {
            console.log(`🔁 Retrying inpaint for image ${image.id} due to transient network error (attempt ${retryCount + 1})`);
            const retried = await this.retryReplicateInpaint(image);
            if (retried) return; // keep processing state, do not mark failed
          }
          await this.handleFailedReplicateInpaint(image, errorDetails);
        } else if (replicateStatus === 'succeeded' && replicateData.output) {
          console.log(`🎉 Replicate inpaint succeeded for image ${image.id}; processing output because webhook may be disabled in dev`);
          await this.processReplicateInpaintCompletion(image, replicateData.output);
        } else if (replicateStatus === 'processing' || replicateStatus === 'starting') {
          console.log(`⏳ Replicate inpaint still processing for image ${image.id}: ${replicateStatus}`);
          // Watchdog: if processing for too long (> 12 minutes), attempt one retry or fail
          const startedAt = image.metadata?.replicateRetry?.startedAt ? new Date(image.metadata.replicateRetry.startedAt).getTime() : null;
          if (startedAt) {
            const elapsedMs = Date.now() - startedAt;
            if (elapsedMs > 12 * 60 * 1000) {
              const retryCount = image.metadata?.replicateRetry?.retryCount || 0;
              if (retryCount < 1) {
                console.log(`⏱️ Processing exceeded 12 minutes for image ${image.id}. Retrying once...`);
                const retried = await this.retryReplicateInpaint(image);
                if (retried) return;
              } else {
                console.warn(`⏱️ Processing exceeded 12 minutes for image ${image.id}. Marking as failed.`);
                await this.handleFailedReplicateInpaint(image, { error: 'Processing timeout' });
              }
            }
          }
        }

      } else {
        console.error(`❌ Failed to check Replicate inpaint status for image ${image.id}:`, statusResult.error);

        // If Replicate API call fails, increment failure count
        const statusCheckFailures = (image.metadata?.statusCheckFailures) || 0;
        if (statusCheckFailures >= 3) {
          await this.markImageAsFailed(image, 'Unable to check Replicate inpaint status after 3 attempts');
        } else {
          await prisma.image.update({
            where: { id: image.id },
            data: {
              metadata: {
                ...(image.metadata || {}),
                statusCheckFailures: statusCheckFailures + 1,
                lastStatusCheck: new Date().toISOString()
              }
            }
          });
        }
      }

    } catch (error) {
      console.error(`❌ Error checking Replicate inpaint status for image ${image.id}:`, error);
      const statusCheckFailures = (image.metadata?.statusCheckFailures) || 0;
      if (statusCheckFailures >= 2) {
        await this.markImageAsFailed(image, `Status check error: ${error.message}`);
      }
    }
  }

  async retryReplicateInpaint(image) {
    try {
      const params = image.metadata?.replicateRetry?.inpaintParams;
      if (!params) {
        console.warn(`⚠️ No retry params stored for image ${image.id}; cannot retry`);
        return false;
      }

      const baseUrl = process.env.BASE_URL || '';
      const webhook = baseUrl.startsWith('https://') ? `${baseUrl}/api/tweak/inpaint/webhook` : undefined;

      const requestParams = {
        ...(webhook ? { webhook } : {}),
        ...params,
        jobId: image.id,
        uuid: (image.metadata?.replicateRetry?.uuid) || undefined,
        task: 'inpaint',
        isRetry: true,
        retryAttempt: (image.metadata?.replicateRetry?.retryCount || 0) + 1,
        originalJobId: image.runpodJobId
      };

      const result = await replicateService.generateInpaint(requestParams);
      if (result && result.success) {
        await prisma.image.update({
          where: { id: image.id },
          data: {
            runpodJobId: result.runpodId,
            runpodStatus: 'IN_QUEUE',
            metadata: {
              ...(image.metadata || {}),
              replicateRetry: {
                ...(image.metadata?.replicateRetry || {}),
                retryCount: (image.metadata?.replicateRetry?.retryCount || 0) + 1
              }
            }
          }
        });

        // Inform client it's still processing after retry
        await this.sendWebSocketUpdate(image, 'variation_status_update', {
          imageId: image.id,
          batchId: image.batchId,
          variationNumber: image.variationNumber,
          status: 'PROCESSING',
          runpodStatus: 'IN_QUEUE',
          operationType: 'inpaint'
        });

        console.log(`🔁 Retry submitted for inpaint image ${image.id}, new replicate id ${result.runpodId}`);
        return true;
      }

      console.warn(`⚠️ Retry submission failed for image ${image.id}:`, result?.error);
      return false;
    } catch (err) {
      console.error(`❌ Error retrying inpaint for image ${image.id}:`, err);
      return false;
    }
  }

  async processReplicateInpaintCompletion(image, outputImageUrl) {
    try {
      // Download image
      const response = await axios.get(outputImageUrl, { responseType: 'arraybuffer', timeout: 30000 });
      const imageBuffer = Buffer.from(response.data);

      // Get metadata
      const metadata = await sharp(imageBuffer).metadata();

      // Upload original
      const originalUpload = await s3Service.uploadGeneratedImage(
        imageBuffer,
        `inpaint-${image.id}-original.jpg`,
        'image/jpeg'
      );
      if (!originalUpload.success) throw new Error('Failed to upload original image: ' + originalUpload.error);

      // Prepare processed (max 800x600)
      let processedBuffer = imageBuffer;
      let finalWidth = metadata.width;
      let finalHeight = metadata.height;
      if (metadata.width > 800 || metadata.height > 600) {
        const widthRatio = 800 / metadata.width;
        const heightRatio = 600 / metadata.height;
        const ratio = Math.min(widthRatio, heightRatio);
        finalWidth = Math.round(metadata.width * ratio);
        finalHeight = Math.round(metadata.height * ratio);
        processedBuffer = await sharp(imageBuffer)
          .resize(finalWidth, finalHeight, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 100, progressive: true })
          .toBuffer();
      } else {
        processedBuffer = await sharp(imageBuffer).jpeg({ quality: 100, progressive: true }).toBuffer();
      }

      // Upload processed
      const processedUpload = await s3Service.uploadGeneratedImage(
        processedBuffer,
        `inpaint-${image.id}-processed.jpg`,
        'image/jpeg'
      );
      if (!processedUpload.success) throw new Error('Failed to upload processed image: ' + processedUpload.error);

      // Thumbnail
      const thumbnailBuffer = await sharp(processedBuffer).resize(300, 300, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80, progressive: true }).toBuffer();
      const thumbUpload = await s3Service.uploadGeneratedImage(
        thumbnailBuffer,
        `inpaint-${image.id}-thumb.jpg`,
        'image/jpeg'
      );
      if (!thumbUpload.success) throw new Error('Failed to upload thumbnail: ' + thumbUpload.error);

      // Update DB
      await prisma.image.update({
        where: { id: image.id },
        data: {
          status: 'COMPLETED',
          runpodStatus: 'COMPLETED',
          originalImageUrl: originalUpload.url,
          processedImageUrl: processedUpload.url,
          thumbnailUrl: thumbUpload.url,
          updatedAt: new Date(),
          metadata: {
            ...(image.metadata || {}),
            originalDimensions: `${metadata.width}x${metadata.height}`,
            processedDimensions: `${finalWidth}x${finalHeight}`,
            outputSource: 'replicate-webhook-fallback'
          }
        }
      });

      // Notify frontend
      await this.sendWebSocketUpdate(image, 'variation_completed', {
        imageId: image.id,
        batchId: image.batchId,
        variationNumber: image.variationNumber,
        status: 'COMPLETED',
        runpodStatus: 'COMPLETED',
        operationType: 'inpaint',
        moduleType: 'TWEAK',
        originalBaseImageId: image.originalBaseImageId,
        output: processedUpload.url,
        thumbnailUrl: thumbUpload.url
      });

      console.log(`✅ Replicate inpaint completion processed for image ${image.id}`);
    } catch (error) {
      console.error(`❌ Failed to process Replicate inpaint completion for image ${image.id}:`, error);
      await this.handleFailedReplicateInpaint(image, { error: error.message });
    }
  }

  async updateInpaintImageStatus(image, replicateStatus, mappedStatus, statusData) {
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

      console.log(`✅ Updated Replicate inpaint image ${image.id} status: ${replicateStatus} -> ${mappedStatus}`);

      // Send WebSocket notification for status updates
      await this.sendWebSocketUpdate(image, 'variation_status_update', {
        imageId: image.id,
        batchId: image.batchId,
        variationNumber: image.variationNumber,
        status: mappedStatus,
        runpodStatus: replicateStatus,
        operationType: 'inpaint'
      });

    } catch (error) {
      console.error(`❌ Failed to update Replicate inpaint image ${image.id} status:`, error);
    }
  }

  async handleFailedReplicateInpaint(image, statusData) {
    try {
      console.log(`❌ Handling failed Replicate inpaint for image ${image.id}`);

      await prisma.image.update({
        where: { id: image.id },
        data: {
          status: 'FAILED',
          runpodStatus: 'FAILED',
          updatedAt: new Date(),
          metadata: {
            ...(image.metadata || {}),
            error: statusData.error || 'Replicate inpaint job failed',
            failedAt: new Date().toISOString(),
            finalFailure: true
          }
        }
      });

      // Refund 1 credit for the failed inpaint variation
      let remainingCreditsWs = null;
      try {
        const { refundCredits } = require('../services/subscriptions.service');
        const updatedUser = await refundCredits(image.userId, 1, `Refund for failed inpaint image ${image.id}`);
        remainingCreditsWs = updatedUser?.remainingCredits ?? null;
      } catch (refundErr) {
        console.warn('Failed to refund credits after inpaint failure (status checker):', refundErr?.message);
      }

      // Send WebSocket notification about failure
      await this.sendWebSocketUpdate(image, 'variation_failed', {
        imageId: image.id,
        batchId: image.batchId,
        variationNumber: image.variationNumber,
        operationType: 'inpaint',
        error: statusData.error || 'Replicate inpaint job failed',
        originalBaseImageId: image.originalBaseImageId,
        remainingCredits: remainingCreditsWs
      });

      console.log(`💥 Replicate inpaint image ${image.id} marked as failed and notification sent`);

    } catch (error) {
      console.error(`❌ Failed to handle failed Replicate inpaint image ${image.id}:`, error);
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
        if ((replicateStatus === 'succeeded' || replicateData.output) && replicateData.output) {
          console.log(`🎉 Upscale completed for image ${image.id}. Processing via polling fallback.`);
          await this.processUpscaleSuccessFallback(image, replicateData.output, replicateData.input);
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

  // When no webhook is configured or reachable, process successful upscale via polling
  async processUpscaleSuccessFallback(image, output, input) {
    try {
      const axios = require('axios');
      const sharp = require('sharp');
      const s3Service = require('../services/image/s3.service');

      const outputUrl = Array.isArray(output) ? output[0] : output;
      if (!outputUrl) return;

      // Download output
      const imageResponse = await axios.get(outputUrl, { responseType: 'arraybuffer', timeout: 30000 });
      const imageBuffer = Buffer.from(imageResponse.data);

      // Metadata and thumbnail
      const metadata = await sharp(imageBuffer).metadata();
      const s3Key = `upscale/processed/${image.userId}/${Date.now()}-${image.id}.png`;
      const s3UploadResult = await s3Service.uploadGeneratedImage(imageBuffer, s3Key, 'image/png');

      // Create thumbnail
      const thumbnailBuffer = await sharp(imageBuffer).resize(320).toFormat('png').toBuffer();
      const thumbKey = `upscale/thumbnails/${image.userId}/${Date.now()}-${image.id}.png`;
      const thumbnailUploadResult = await s3Service.uploadGeneratedImage(thumbnailBuffer, thumbKey, 'image/png');

      await prisma.image.update({
        where: { id: image.id },
        data: {
          status: 'COMPLETED',
          runpodStatus: 'succeeded',
          originalImageUrl: s3UploadResult.url,
          processedImageUrl: s3UploadResult.url,
          thumbnailUrl: thumbnailUploadResult.url,
          metadata: {
            ...(image.metadata || {}),
            replicateOutput: output,
            replicateInput: input,
            dimensions: {
              width: metadata.width,
              height: metadata.height
            }
          }
        }
      });

      // Notify clients: send explicit completion event with URLs so history updates immediately
      await this.sendWebSocketUpdate(image, 'upscale_completed', {
        imageId: image.id,
        batchId: image.batchId,
        variationNumber: image.variationNumber,
        imageUrl: s3UploadResult.url,
        processedImageUrl: s3UploadResult.url,
        thumbnailUrl: thumbnailUploadResult.url,
        status: 'COMPLETED',
        runpodStatus: 'COMPLETED',
        operationType: 'upscale',
        originalBaseImageId: image.originalBaseImageId,
        originalInputImageId: image.originalBaseImageId
      });

      // Also emit generic variation completion for broader client compatibility
      await this.sendWebSocketUpdate(image, 'variation_completed', {
        imageId: image.id,
        batchId: image.batchId,
        variationNumber: image.variationNumber,
        imageUrl: s3UploadResult.url,
        processedUrl: s3UploadResult.url,
        thumbnailUrl: thumbnailUploadResult.url,
        status: 'COMPLETED',
        runpodStatus: 'COMPLETED',
        operationType: 'upscale',
        originalBaseImageId: image.originalBaseImageId,
        originalInputImageId: image.originalBaseImageId
      });

      // (Reverted) rely on completion events above; original behavior sent only status update
    } catch (err) {
      console.error(`❌ Failed to process upscale success fallback for image ${image.id}:`, err);
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

      // Send WebSocket notification for upscale status updates
      console.log(`🔄 Sending WebSocket update for upscale image ${image.id}: ${replicateStatus} -> ${mappedStatus}`);
      await this.sendWebSocketUpdate(image, 'variation_status_update', {
        imageId: image.id,
        batchId: image.batchId,
        variationNumber: image.variationNumber,
        status: mappedStatus,
        runpodStatus: replicateStatus,
        operationType: 'upscale'
      });

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

      // Send WebSocket notification for status updates
      await this.sendWebSocketUpdate(image, 'variation_status_update', {
        imageId: image.id,
        batchId: image.batchId,
        variationNumber: image.variationNumber,
        status: image.status,
        runpodStatus: runpodStatus,
        operationType: this.getOperationTypeFromBatch(image.batch)
      });

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

      // Check for image milestones when image is completed
      if (image.user) {
        await checkAndSendImageMilestones(
          image.userId,
          image.user.email,
          image.user.fullName,
          image.user.firstImageEmailSent,
          image.user.milestone10imagessent
        );
      }

      // Send WebSocket notification about completion
      await this.sendWebSocketUpdate(image, 'variation_completed', {
        imageId: image.id,
        imageUrl: statusData.output.imageUrl,
        thumbnailUrl: statusData.output.thumbnailUrl,
        batchId: image.batchId,
        variationNumber: image.variationNumber,
        operationType: this.getOperationTypeFromBatch(image.batch),
        originalBaseImageId: image.originalBaseImageId,
        // For frontend compatibility - originalInputImageId is needed for auto-selection
        originalInputImageId: image.originalBaseImageId || image.batch.inputImageId
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
          
          // Get base image URL from batch inputImage or settingsSnapshot
          let rawImageUrl = '';
          if (image.batch?.inputImage?.originalUrl) {
            rawImageUrl = image.batch.inputImage.originalUrl;
          } else if (settingsSnapshot?.raw_image || settingsSnapshot?.rawImage) {
            rawImageUrl = settingsSnapshot.raw_image || settingsSnapshot.rawImage;
          } else if (image.batch?.inputImage?.processedUrl) {
            rawImageUrl = image.batch.inputImage.processedUrl;
          } else {
            // Fallback: try to get from originalBaseImageId
            rawImageUrl = await this.getBaseImageUrl(image).catch(() => '');
          }
          
          // Get negative prompt from settingsSnapshot or use default
          const negativePrompt = settingsSnapshot?.negative_prompt || settingsSnapshot?.negativePrompt || 
            'saturated full colors, neon lights, blurry jagged edges, noise, and pixelation, oversaturated, unnatural colors or gradients overly smooth or plastic-like surfaces, imperfections. deformed, watermark, (face asymmetry, eyes asymmetry, deformed eyes, open mouth), low quality, worst quality, blurry, soft, noisy extra digits, fewer digits, and bad anatomy. Poor Texture Quality: Avoid repeating patterns that are noticeable and break the illusion of realism. ,sketch, graphite, illustration, Unrealistic Proportions and Scale: incorrect proportions. Out of scale';
          
          // Determine model - use 'sdxl' for regional_prompt, otherwise from settings
          const model = operationType === 'regional_prompt' ? 'sdxl' : 
            (settingsSnapshot?.model || 'realvisxlLightning.safetensors');
          
          return {
            ...baseParams,
            operationType: operationType,
            task: operationType === 'regional_prompt' ? 'regional_prompt' : 'create',
            // Required params from settingsSnapshot or createSettings
            prompt: image.aiPrompt || settingsSnapshot?.prompt || '',
            negativePrompt: negativePrompt,
            rawImage: rawImageUrl,
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
            // RunPod-specific settings
            model: model,
            upscale: settingsSnapshot?.upscale || 'No',
            style: settingsSnapshot?.style || 'No',
            // K-Sampler settings
            stepsKsampler1: settingsSnapshot?.steps_ksampler1 || settingsSnapshot?.stepsKsampler1 || 6,
            cfgKsampler1: settingsSnapshot?.cfg_ksampler1 || settingsSnapshot?.cfgKsampler1 || 4,
            denoiseKsampler1: settingsSnapshot?.denoise_ksampler1 || settingsSnapshot?.denoiseKsampler1 || 1,
            stepsKsampler2: settingsSnapshot?.steps_ksampler2 || settingsSnapshot?.stepsKsampler2 || 4,
            cfgKsampler2: settingsSnapshot?.cfg_ksampler2 || settingsSnapshot?.cfgKsampler2 || 2,
            denoiseKsampler2: settingsSnapshot?.denoise_ksampler2 || settingsSnapshot?.denoiseKsampler2 || 0.3,
            // Canny settings
            cannyStrength: settingsSnapshot?.canny_strength || settingsSnapshot?.cannyStrength || 0.6,
            cannyStart: settingsSnapshot?.canny_start || settingsSnapshot?.cannyStart || 0,
            cannyEnd: settingsSnapshot?.canny_end || settingsSnapshot?.cannyEnd || 1,
            // Depth settings
            depthStrength: settingsSnapshot?.depth_strength || settingsSnapshot?.depthStrength || 0.4,
            depthStart: settingsSnapshot?.depth_start || settingsSnapshot?.depthStart || 0,
            depthEnd: settingsSnapshot?.depth_end || settingsSnapshot?.depthEnd || 0.5,
            // LoRA settings
            loraNames: settingsSnapshot?.lora_names || settingsSnapshot?.loraNames || ['add-detail.safetensors', 'nunu-XL.safetensors'],
            loraStrength: settingsSnapshot?.lora_strength || settingsSnapshot?.loraStrength || [1, 0.2],
            loraClip: settingsSnapshot?.lora_clip || settingsSnapshot?.loraClip || [1, 0.6],
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
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    switch (operationType) {
      case 'outpaint':
        return `${baseUrl}/api/tweak/outpaint/webhook`;
      case 'inpaint':
        return `${baseUrl}/api/tweak/inpaint/webhook`;
      case 'create':
      case 'regional_prompt':
        return `${baseUrl}/api/runpod/webhook`;
      default:
        return `${baseUrl}/api/runpod/webhook`;
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
      if (websocketService && websocketService.sendToUser) {
        websocketService.sendToUser(image.batch.userId, {
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