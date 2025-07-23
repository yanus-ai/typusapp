const { prisma } = require('../services/prisma.service');
const webSocketService = require('../services/websocket.service');

async function handleRunPodWebhook(req, res) {
  try {
    const webhookData = req.body;
    
    console.log('RunPod webhook received:', {
      id: webhookData.id,
      status: webhookData.status,
      jobId: webhookData.input?.job_id,
      uuid: webhookData.input?.uuid
    });

    if (!webhookData.id || !webhookData.input?.job_id) {
      console.error('Invalid RunPod webhook data - missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const jobId = webhookData.input.job_id;
    const runpodId = webhookData.id;
    const status = webhookData.status;

    // Find the generation batch by job_id
    const batch = await prisma.generationBatch.findFirst({
      where: {
        metaData: {
          path: ['jobId'],
          equals: jobId
        }
      },
      include: {
        user: true
      }
    });

    if (!batch) {
      console.error('Generation batch not found for job_id:', jobId);
      return res.status(404).json({ error: 'Batch not found' });
    }

    if (status === 'COMPLETED' && webhookData.output?.status === 'succeeded') {
      // Successful completion
      const outputImages = webhookData.output?.output || [];
      
      if (outputImages.length === 0) {
        console.error('No output images in completed RunPod job:', jobId);
        await updateBatchStatus(batch.id, 'FAILED', { error: 'No output images generated' });
        notifyUser(batch.user.id, batch.id, 'FAILED', { error: 'No output images generated' });
        return res.status(400).json({ error: 'No output images' });
      }

      // Update batch status to completed
      await updateBatchStatus(batch.id, 'COMPLETED');

      // Create image records for each output
      const imagePromises = outputImages.map((imageUrl, index) => 
        prisma.image.create({
          data: {
            batchId: batch.id,
            userId: batch.userId,
            processedImageUrl: imageUrl,
            variationNumber: index + 1,
            status: 'COMPLETED',
            metadata: {
              runpodId,
              generatedAt: new Date().toISOString(),
              originalPrompt: webhookData.input.prompt,
              settings: {
                model: webhookData.input.model,
                seed: webhookData.input.seed,
                steps_ksampler1: webhookData.input.steps_ksampler1,
                cfg_ksampler1: webhookData.input.cfg_ksampler1
              }
            }
          }
        })
      );

      const createdImages = await Promise.all(imagePromises);
      
      console.log('RunPod generation completed successfully:', {
        batchId: batch.id,
        jobId,
        imageCount: createdImages.length
      });

      // Notify via WebSocket using inputImageId (same pattern as masks)
      webSocketService.notifyGenerationCompleted(batch.inputImageId, {
        batchId: batch.id,
        status: 'COMPLETED',
        images: createdImages.map(img => ({
          id: img.id,
          url: img.processedImageUrl,
          variationNumber: img.variationNumber
        }))
      });

    } else if (status === 'FAILED' || webhookData.output?.status === 'failed') {
      // Failed generation
      const errorMessage = webhookData.output?.error || 'Generation failed';
      
      await updateBatchStatus(batch.id, 'FAILED', { 
        error: errorMessage,
        runpodId 
      });

      console.error('RunPod generation failed:', {
        batchId: batch.id,
        jobId,
        error: errorMessage
      });

      // Notify via WebSocket using inputImageId (same pattern as masks)
      webSocketService.notifyGenerationFailed(batch.inputImageId, errorMessage);

    } else if (status === 'IN_PROGRESS' || status === 'IN_QUEUE') {
      // Update progress
      await updateBatchStatus(batch.id, 'PROCESSING', { 
        runpodStatus: status,
        runpodId,
        executionTime: webhookData.executionTime
      });

      // Notify progress via WebSocket using inputImageId
      webSocketService.notifyGenerationStarted(batch.inputImageId, {
        batchId: batch.id,
        status: 'PROCESSING',
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

async function updateBatchStatus(batchId, status, additionalData = {}) {
  try {
    const updateData = {
      status,
      updatedAt: new Date()
    };

    if (Object.keys(additionalData).length > 0) {
      // Merge additional data into metaData
      const existingBatch = await prisma.generationBatch.findUnique({
        where: { id: batchId },
        select: { metaData: true }
      });

      updateData.metaData = {
        ...existingBatch.metaData,
        ...additionalData,
        lastUpdated: new Date().toISOString()
      };
    }

    await prisma.generationBatch.update({
      where: { id: batchId },
      data: updateData
    });

    console.log('Batch status updated:', { batchId, status });
  } catch (error) {
    console.error('Error updating batch status:', {
      batchId,
      status,
      error: error.message
    });
    throw error;
  }
}


module.exports = {
  handleRunPodWebhook
};