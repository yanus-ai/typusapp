const { prisma } = require('../services/prisma.service');
const runpodService = require('../services/runpod.service');
const webSocketService = require('../services/websocket.service');
const { v4: uuidv4 } = require('uuid');

const generateWithRunPod = async (req, res) => {
  try {
    const { 
      prompt,
      negativePrompt,
      inputImageId,
      maskImageId,
      maskPrompt = '',
      variations = 1,
      settings = {}
    } = req.body;

    // Validate required fields
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    if (!inputImageId) {
      return res.status(400).json({ message: 'Input image is required' });
    }

    // Check user credits
    const now = new Date();
    const activeCredits = await prisma.creditTransaction.aggregate({
      where: {
        userId: req.user.id,
        status: 'COMPLETED',
        OR: [
          { expiresAt: { gt: now } },
          { expiresAt: null }
        ]
      },
      _sum: {
        amount: true
      }
    });

    const availableCredits = activeCredits._sum.amount || 0;
    if (availableCredits < variations) {
      return res.status(402).json({ 
        message: 'Not enough credits',
        required: variations,
        available: availableCredits
      });
    }

    // Verify input image belongs to user
    const inputImage = await prisma.inputImage.findFirst({
      where: {
        id: parseInt(inputImageId),
        userId: req.user.id
      }
    });

    if (!inputImage) {
      return res.status(404).json({ message: 'Input image not found' });
    }

    // Get mask image if provided
    let maskImage = null;
    if (maskImageId) {
      maskImage = await prisma.inputImage.findFirst({
        where: {
          id: parseInt(maskImageId),
          userId: req.user.id
        }
      });

      if (!maskImage) {
        return res.status(404).json({ message: 'Mask image not found' });
      }
    }

    // Generate unique identifiers
    const jobId = Date.now();
    const uuid = uuidv4();
    const requestGroup = uuidv4();

    // Create generation batch
    const batch = await prisma.generationBatch.create({
      data: {
        userId: req.user.id,
        inputImageId: inputImage.id,
        moduleType: 'CREATE',
        prompt,
        totalVariations: variations,
        status: 'PROCESSING',
        creditsUsed: variations,
        metaData: {
          negativePrompt,
          maskPrompt,
          jobId,
          uuid,
          requestGroup,
          settings,
          maskImageId: maskImage?.id || null,
          createdAt: new Date().toISOString()
        }
      }
    });

    // Deduct credits
    await prisma.creditTransaction.create({
      data: {
        userId: req.user.id,
        amount: -variations,
        type: 'IMAGE_CREATE',
        status: 'COMPLETED',
        description: `RunPod image generation - ${variations} variations`,
        batchId: batch.id
      }
    });

    // Prepare RunPod API parameters
    const webhookUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/runpod/webhook`;
    
    const runpodParams = {
      webhook: webhookUrl,
      prompt,
      negativePrompt: negativePrompt || 'low quality, blurry, distorted, watermark',
      rawImage: inputImage.processedUrl || inputImage.originalUrl,
      yellowMask: maskImage ? (maskImage.processedUrl || maskImage.originalUrl) : (inputImage.processedUrl || inputImage.originalUrl),
      yellowPrompt: maskPrompt,
      jobId,
      uuid,
      requestGroup,
      seed: settings.seed || Math.floor(Math.random() * 1000000).toString(),
      upscale: settings.upscale || 'Yes',
      style: settings.style || 'No',
      model: settings.model || 'realvisxlLightning.safetensors',
      task: 'regional_prompt',
      // K-Sampler settings
      stepsKsampler1: settings.stepsKsampler1 || 6,
      cfgKsampler1: settings.cfgKsampler1 || 3,
      denoiseKsampler1: settings.denoiseKsampler1 || 1,
      stepsKsampler2: settings.stepsKsampler2 || 4,
      cfgKsampler2: settings.cfgKsampler2 || 2,
      denoiseKsampler2: settings.denoiseKsampler2 || 0.3,
      // Canny settings
      cannyStrength: settings.cannyStrength || 1,
      cannyStart: settings.cannyStart || 0,
      cannyEnd: settings.cannyEnd || 1,
      // Depth settings
      depthStrength: settings.depthStrength || 0.4,
      depthStart: settings.depthStart || 0,
      depthEnd: settings.depthEnd || 0.5,
      // LoRA settings
      loraNames: settings.loraNames || ['add-detail.safetensors', 'nunu-XL.safetensors'],
      loraStrength: settings.loraStrength || [1, 0.5],
      loraClip: settings.loraClip || [1, 0.6]
    };

    console.log('Starting RunPod generation:', {
      batchId: batch.id,
      jobId,
      userId: req.user.id,
      variations
    });

    // Send request to RunPod
    const result = await runpodService.generateImage(runpodParams);

    if (!result.success) {
      // Update batch status to failed
      await prisma.generationBatch.update({
        where: { id: batch.id },
        data: { 
          status: 'FAILED',
          metaData: {
            ...batch.metaData,
            error: result.error,
            failedAt: new Date().toISOString()
          }
        }
      });

      // Refund credits
      await prisma.creditTransaction.create({
        data: {
          userId: req.user.id,
          amount: variations,
          type: 'REFUND',
          status: 'COMPLETED',
          description: `Refund for failed RunPod generation - batch ${batch.id}`,
          batchId: batch.id
        }
      });

      return res.status(500).json({
        message: 'Generation request failed',
        error: result.error
      });
    }

    // Update batch with RunPod ID
    await prisma.generationBatch.update({
      where: { id: batch.id },
      data: {
        metaData: {
          ...batch.metaData,
          runpodId: result.runpodId,
          runpodStatus: result.status,
          submittedAt: new Date().toISOString()
        }
      }
    });

    // Notify via WebSocket using inputImageId (same pattern as masks)
    webSocketService.notifyGenerationStarted(inputImage.id, {
      batchId: batch.id,
      runpodId: result.runpodId,
      status: 'PROCESSING',
      estimatedTime: '2-5 minutes'
    });

    res.status(200).json({
      success: true,
      batchId: batch.id,
      runpodId: result.runpodId,
      status: 'PROCESSING',
      message: 'Generation started successfully',
      estimatedTime: '2-5 minutes'
    });

  } catch (error) {
    console.error('RunPod generation error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getGenerationStatus = async (req, res) => {
  try {
    const { batchId } = req.params;

    const batch = await prisma.generationBatch.findFirst({
      where: {
        id: parseInt(batchId),
        userId: req.user.id
      },
      include: {
        variations: {
          orderBy: { variationNumber: 'asc' }
        }
      }
    });

    if (!batch) {
      return res.status(404).json({ message: 'Generation batch not found' });
    }

    res.json({
      batchId: batch.id,
      status: batch.status,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
      prompt: batch.prompt,
      totalVariations: batch.totalVariations,
      creditsUsed: batch.creditsUsed,
      metaData: batch.metaData,
      images: batch.variations.map(img => ({
        id: img.id,
        url: img.processedImageUrl,
        thumbnailUrl: img.thumbnailUrl,
        variationNumber: img.variationNumber,
        status: img.status,
        createdAt: img.createdAt
      }))
    });

  } catch (error) {
    console.error('Get generation status error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getUserGenerations = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const batches = await prisma.generationBatch.findMany({
      where: {
        userId: req.user.id,
        moduleType: 'CREATE'
      },
      include: {
        variations: {
          take: 1,
          orderBy: { variationNumber: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.generationBatch.count({
      where: {
        userId: req.user.id,
        moduleType: 'CREATE'
      }
    });

    res.json({
      batches: batches.map(batch => ({
        id: batch.id,
        status: batch.status,
        createdAt: batch.createdAt,
        prompt: batch.prompt,
        totalVariations: batch.totalVariations,
        creditsUsed: batch.creditsUsed,
        previewImage: batch.variations[0]?.processedImageUrl || null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get user generations error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  generateWithRunPod,
  getGenerationStatus,
  getUserGenerations
};