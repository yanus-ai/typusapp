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
      variations = 1,
      settings = {}
    } = req.body;

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

    // Verify input image belongs to user and get mask regions
    const inputImage = await prisma.inputImage.findFirst({
      where: {
        id: parseInt(inputImageId),
        userId: req.user.id
      },
      include: {
        maskRegions: {
          include: {
            materialOption: {
              include: {
                category: true
              }
            },
            customizationOption: {
              include: {
                subCategory: true
              }
            },
            subCategory: true
          }
        }
      }
    });

    if (!inputImage) {
      return res.status(404).json({ message: 'Input image not found' });
    }

    // Get all mask regions and create prompts
    let maskRegions = [];
    if (inputImage.maskRegions && inputImage.maskRegions.length > 0) {
      maskRegions = inputImage.maskRegions.map(mask => {

        return {
          id: mask.id,
          maskUrl: mask.maskUrl,
          color: mask.color,
          prompt: mask.customText,
          materialOption: mask.materialOption,
          customizationOption: mask.customizationOption,
          customText: mask.customText
        };
      });
    }

    console.log('Found mask regions for input image:', {
      inputImageId: inputImage.id,
      maskRegionsCount: maskRegions.length,
      maskRegions: maskRegions.map(m => ({ id: m.id, color: m.color, prompt: m.prompt }))
    });

    // Generate unique identifiers
    const jobId = Date.now();
    const uuid = inputImage.id;
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
          jobId,
          uuid,
          requestGroup,
          settings,
          maskRegions: maskRegions.map(m => ({
            id: m.id,
            color: m.color,
            prompt: m.prompt,
            materialOptionId: m.materialOption?.id,
            customizationOptionId: m.customizationOption?.id,
            customText: m.customText
          })),
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
    
    let runpodParams = {
      webhook: webhookUrl,
      prompt,
      negativePrompt: negativePrompt || 'saturated full colors, neon lights, blurry jagged edges, noise, and pixelation, oversaturated, unnatural colors or gradients overly smooth or plastic-like surfaces, imperfections. deformed, watermark, (face asymmetry, eyes asymmetry, deformed eyes, open mouth), low quality, worst quality, blurry, soft, noisy extra digits, fewer digits, and bad anatomy. Poor Texture Quality: Avoid repeating patterns that are noticeable and break the illusion of realism. ,sketch, graphite, illustration, Unrealistic Proportions and Scale: incorrect proportions. Out of scale',
      rawImage: inputImage.processedUrl || inputImage.originalUrl,
      jobId,
      uuid,
      requestGroup,
      seed: settings.seed || Math.floor(Math.random() * 1000000).toString(),
      upscale: settings.upscale || 'No',
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
      loraClip: settings.loraClip || [1, 0.6],
    };

    if (maskRegions.length > 0) {
      runpodParams = {
        ...runpodParams,
        ...maskRegions.reduce((acc, mask, idx) => {
          // Map RGB color to RunPod color names
          const colorMap = {
            'rgb(255, 255, 0)': 'yellow',
            'rgb(255, 0, 0)': 'red', 
            'rgb(0, 255, 0)': 'green',
            'rgb(0, 0, 255)': 'blue',
            'rgb(0, 255, 255)': 'cyan',
            'rgb(255, 0, 255)': 'magenta',
            'rgb(255, 165, 0)': 'orange',
            'rgb(128, 0, 128)': 'purple',
            'rgb(255, 192, 203)': 'pink',
            'rgb(173, 216, 230)': 'lightblue',
            'rgb(128, 0, 0)': 'marron',
            'rgb(128, 128, 0)': 'olive',
            'rgb(0, 128, 128)': 'teal',
            'rgb(0, 0, 128)': 'navy',
            'rgb(255, 215, 0)': 'gold'
          };

          // Find color name or use fallback color sequence
          let colorName = colorMap[mask.color];
          if (!colorName) {
            const fallbackColors = ['yellow', 'red', 'green', 'blue', 'cyan', 'magenta', 'orange', 'purple', 'pink', 'lightblue', 'marron', 'olive', 'teal', 'navy', 'gold'];
            colorName = fallbackColors[idx % fallbackColors.length];
          }

          acc[`${colorName}_mask`] = mask.maskUrl;
          acc[`${colorName}_prompt`] = mask.prompt; // Don't convert to empty string
          return acc;
        }, {}),
      };

      console.log('RunPod mask parameters:', Object.keys(runpodParams).filter(key => key.includes('_mask') || key.includes('_prompt')));
    } else {
      runpodParams = {
        ...runpodParams,
        yellow_mask: inputImage.processedUrl || inputImage.originalUrl,
        yellow_prompt: prompt || '',
      };
      console.log('No mask regions found, using full image as yellow mask');
    }

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

// New endpoint to get mask regions for an input image
const getInputImageMaskRegions = async (req, res) => {
  try {
    const { inputImageId } = req.params;

    const inputImage = await prisma.inputImage.findFirst({
      where: {
        id: parseInt(inputImageId),
        userId: req.user.id
      },
      include: {
        maskRegions: {
          include: {
            materialOption: {
              include: {
                category: true
              }
            },
            customizationOption: {
              include: {
                subCategory: true
              }
            },
            subCategory: true
          }
        }
      }
    });

    if (!inputImage) {
      return res.status(404).json({ message: 'Input image not found' });
    }

    const maskRegions = inputImage.maskRegions.map(mask => {
      // Generate prompt based on selected material/customization
      let prompt = '';
      
      if (mask.materialOption) {
        prompt = `${mask.materialOption.displayName} ${mask.materialOption.category.displayName}`;
        if (mask.materialOption.description) {
          prompt += ` - ${mask.materialOption.description}`;
        }
      } else if (mask.customizationOption) {
        prompt = `${mask.customizationOption.displayName}`;
        if (mask.customizationOption.description) {
          prompt += ` - ${mask.customizationOption.description}`;
        }
      } else if (mask.customText) {
        prompt = mask.customText;
      }

      return {
        id: mask.id,
        maskUrl: mask.maskUrl,
        color: mask.color,
        prompt: prompt,
        materialOption: mask.materialOption ? {
          id: mask.materialOption.id,
          displayName: mask.materialOption.displayName,
          description: mask.materialOption.description,
          category: {
            id: mask.materialOption.category.id,
            displayName: mask.materialOption.category.displayName
          }
        } : null,
        customizationOption: mask.customizationOption ? {
          id: mask.customizationOption.id,
          displayName: mask.customizationOption.displayName,
          description: mask.customizationOption.description,
          subCategory: {
            id: mask.customizationOption.subCategory.id,
            displayName: mask.customizationOption.subCategory.displayName
          }
        } : null,
        customText: mask.customText,
        createdAt: mask.createdAt
      };
    });

    res.json({
      inputImageId: inputImage.id,
      originalUrl: inputImage.originalUrl,
      processedUrl: inputImage.processedUrl,
      maskStatus: inputImage.maskStatus,
      maskRegions: maskRegions,
      maskRegionsCount: maskRegions.length
    });

  } catch (error) {
    console.error('Get input image mask regions error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  generateWithRunPod,
  getGenerationStatus,
  getUserGenerations,
  getInputImageMaskRegions
};