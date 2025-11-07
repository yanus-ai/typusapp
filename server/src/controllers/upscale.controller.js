const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const replicateService = require('../services/replicate.service');
const { v4: uuidv4 } = require('uuid');
const webSocketService = require('../services/websocket.service');
const { deductCredits, isSubscriptionUsable } = require('../services/subscriptions.service');
const axios = require('axios');
const sharp = require('sharp');

/**
 * Generate upscale using Replicate API
 */
exports.generateUpscale = async (req, res) => {
  try {
    const {
      imageId,
      imageUrl,
      prompt = "Refine this image of a contemporary kitchen with its stunning ocean view, incorporating sleek glass countertops to catch and reflect the natural light, accentuating the depth and clarity of the scene. Enhance the polished stone flooring to exude a luxurious sheen, perfectly complementing the seamless integration of the modern appliances set against the panoramic backdrop, meticulously captured in 8K resolution for optimal realism and detail.",
      scale_factor = 2,
      creativity = 0.5,
      resemblance = 0.6,
      dynamic = 2,
      tiling_width = 128,
      tiling_height = 128,
      variations = 1,
      savePrompt = true,
      preserveAIMaterials = true
    } = req.body;

    console.log('🚀 Upscale generation request:', {
      imageId,
      hasPrompt: !!prompt,
      promptLength: prompt ? prompt.length : 0,
      scale_factor,
      creativity,
      resemblance,
      dynamic,
      tiling_width,
      tiling_height,
      variations,
      savePrompt,
      preserveAIMaterials
    });
    const userId = req.user.id;

    // Validate input
    if (!imageId || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: imageId, imageUrl'
      });
    }

    // Validate variations
    if (variations < 1 || variations > 2) {
      return res.status(400).json({
        success: false,
        message: 'Variations must be between 1 and 2'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });

    // Check user subscription
    const subscription = user?.subscription;
    if (!subscription || !['STARTER', 'EXPLORER', 'PRO'].includes(subscription.planType) || !isSubscriptionUsable(subscription)) {
      return res.status(403).json({
        message: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED'
      });
    }

    // Check user credits
    const now = new Date();
    const activeCredits = user.remainingCredits || 0;

    const availableCredits = activeCredits || 0;
    if (availableCredits < variations) {
      return res.status(402).json({
        message: 'Not enough credits',
        required: variations,
        available: availableCredits
      });
    }

    // Determine the source image and set IDs for database tracking
    let originalBaseImageId = null;
    let sourceImage = null;
    let sourceImageType = null;
    let inputImageIdForBatch = null; // New: separate ID for batch creation

    // First, try to find as input image
    sourceImage = await prisma.inputImage.findFirst({
      where: {
        id: parseInt(imageId),
        userId: userId
      }
    });

    if (sourceImage) {
      sourceImageType = 'inputImage';
      // For InputImage sources, use the input image ID for batch
      inputImageIdForBatch = sourceImage.id;
      originalBaseImageId = null; // InputImages don't have Image references
    } else {
      // Try to find as generated image
      sourceImage = await prisma.image.findFirst({
        where: {
          id: parseInt(imageId),
          userId: userId
        }
      });

      if (sourceImage) {
        sourceImageType = 'image';

        // Find the root input image for batch tracking
        let currentImage = sourceImage;
        let inputImageFound = null;

        // Traverse the chain to find the original input image
        while (currentImage && !inputImageFound) {
          if (currentImage.originalBaseImageId) {
            // Check if this references an input image or another generated image
            const maybeInputImage = await prisma.inputImage.findFirst({
              where: { id: currentImage.originalBaseImageId, userId: userId }
            });

            if (maybeInputImage) {
              inputImageFound = maybeInputImage;
              break;
            } else {
              // Continue traversing the chain
              currentImage = await prisma.image.findFirst({
                where: { id: currentImage.originalBaseImageId, userId: userId }
              });
            }
          } else {
            break;
          }
        }

        if (inputImageFound) {
          inputImageIdForBatch = inputImageFound.id;
          originalBaseImageId = inputImageFound.id; // ALWAYS point to original InputImage
        } else {
          // Fallback: create a synthetic input image reference or handle gracefully
          console.warn('⚠️ No root input image found for generated image, batch will not have inputImageId');
          inputImageIdForBatch = null;
          originalBaseImageId = sourceImage.originalBaseImageId; // SECURITY: Don't fall back to generated image ID
        }
      }
    }

    console.log('🔍 Upscale source image determination:', {
      imageId: parseInt(imageId),
      userId,
      sourceImageType,
      originalBaseImageId,
      inputImageIdForBatch,
      sourceImageFound: !!sourceImage,
      sourceImageId: sourceImage?.id,
      sourceImagePreviewUrl: sourceImage?.previewUrl
    });

    if (!sourceImage) {
      return res.status(404).json({
        success: false,
        message: 'Source image not found or access denied'
      });
    }

    // Check image dimensions - only allow upscale if image is under 2k pixels (width or height)
    try {
      // Get the source image URL
      const sourceImageUrl = sourceImageType === 'inputImage' 
        ? (sourceImage.originalUrl || sourceImage.processedUrl || imageUrl)
        : (sourceImage.originalImageUrl || sourceImage.processedImageUrl || imageUrl);

      if (!sourceImageUrl) {
        return res.status(400).json({
          success: false,
          message: 'Source image URL not found'
        });
      }

      console.log('📐 Checking source image dimensions before upscale:', { sourceImageUrl });

      // Download image to get dimensions
      const imageResponse = await axios.get(sourceImageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000
      });
      const imageBuffer = Buffer.from(imageResponse.data);
      
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      
      console.log('📐 Source image dimensions:', {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format
      });

      // Check if image is larger than 2k (reject if width OR height > 2000, allow exactly 2000x2000)
      if (metadata.width > 2000 || metadata.height > 2000) {
        return res.status(400).json({
          success: false,
          message: `Cannot upscale image. Image dimensions must be 2000x2000 pixels or smaller. Your image is ${metadata.width}x${metadata.height} pixels. Please use a smaller image or resize it first.`,
          prompt: `⚠️ Image Too Large for Upscale\n\nYour image (${metadata.width}x${metadata.height}px) exceeds the maximum allowed size of 2000x2000 pixels.\n\nTo upscale this image:\n• Use an image with dimensions 2000x2000 pixels or smaller\n• Or resize your current image first`,
          code: 'IMAGE_TOO_LARGE',
          dimensions: {
            width: metadata.width,
            height: metadata.height
          },
          maxAllowed: {
            width: 2000,
            height: 2000
          }
        });
      }

      console.log('✅ Image dimensions validated - under 2k, proceeding with upscale');
    } catch (dimensionError) {
      console.error('❌ Error checking image dimensions:', dimensionError);
      // If dimension check fails, we could either:
      // 1. Allow the upscale (risky - might fail later)
      // 2. Reject the request (safer)
      // Going with option 2 for safety
      return res.status(400).json({
        success: false,
        message: 'Failed to validate image dimensions. Please ensure the image is accessible and valid.',
        error: dimensionError.message
      });
    }

    // Start transaction for database operations
    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
      // Save the prompt to the input image for upscale operations
      if (prompt && savePrompt && sourceImage && (sourceImage.originalUrl || sourceImage.processedUrl)) {
        try {
          console.log('💾 Saving prompt to input image for upscale operation:', {
            imageId: parseInt(imageId),
            promptLength: prompt.length,
            existingPrompt: sourceImage.generatedPrompt ? 'Yes' : 'No'
          });
          
          await tx.inputImage.update({
            where: { id: parseInt(imageId) },
            data: {
              generatedPrompt: prompt,
              updatedAt: new Date()
            }
          });
          console.log('✅ Prompt saved to input image for upscale operation');
        } catch (promptError) {
          console.warn('⚠️ Failed to save prompt to input image:', promptError.message);
          // Don't fail the entire operation for prompt saving issues
        }
      }

      // Create generation batch
      const batchData = {
        userId,
        moduleType: 'REFINE',
        prompt: prompt,
        totalVariations: variations,
        status: 'PROCESSING',
        creditsUsed: variations,
        metaData: {
          operationType: 'upscale',
          sourceImageId: imageId,
          sourceImageUrl: imageUrl,
          scale_factor,
          creativity,
          resemblance,
          dynamic,
          prompt,
          savePrompt,
          preserveAIMaterials
        }
      };

      // Only add inputImageId if we found a valid input image
      if (inputImageIdForBatch) {
        batchData.inputImageId = inputImageIdForBatch;
      }

      const batch = await tx.generationBatch.create({
        data: batchData
      });

      // Create Image records for each variation
      const imagePromises = Array.from({ length: variations }, async (_, index) => {
        const jobId = uuidv4();

        // Always use the input image preview URL for generated image preview as requested
        let previewUrlToUse = null;
        if (sourceImageType === 'inputImage') {
          // For InputImage sources, use the InputImage's previewUrl directly
          previewUrlToUse = sourceImage.previewUrl;
        } else if (sourceImageType === 'image') {
          // For Image sources, we need to find the original InputImage to get its previewUrl
          // This ensures we always use the input image preview URL as requested
          if (sourceImage.originalBaseImageId) {
            // Try to find the original base image that might have the input reference
            const baseImage = await tx.image.findUnique({
              where: { id: sourceImage.originalBaseImageId }
            });
            if (baseImage && baseImage.previewUrl) {
              previewUrlToUse = baseImage.previewUrl;
            }
          }
          // Fallback to the source image's preview URL if we can't find the original
          if (!previewUrlToUse) {
            previewUrlToUse = sourceImage.previewUrl;
          }
        }

        console.log('📷 Preview URL determination for upscale:', {
          sourceImageType,
          sourceImageId: sourceImage.id,
          originalBaseImageId: sourceImage.originalBaseImageId,
          previewUrlToUse,
          variationNumber: index + 1
        });

        // Use the prompt that will be sent to Replicate (either from source image or provided prompt)
        const promptToStore = sourceImage.generatedPrompt || prompt;

        return await tx.image.create({
          data: {
            userId,
            batchId: batch.id,
            originalBaseImageId: originalBaseImageId, // Now properly handles both InputImage (null) and Image sources
            status: 'PROCESSING',
            runpodJobId: jobId, // Using this field for Replicate job ID
            runpodStatus: 'SUBMITTED', // Initial status before Replicate response
            variationNumber: index + 1,
            previewUrl: previewUrlToUse, // Always use input image preview URL
            aiPrompt: promptToStore, // Store the prompt used for upscale so it can be displayed when image is clicked
            metadata: {
              operationType: 'upscale',
              sourceImageId: imageId,
              sourceImageUrl: imageUrl,
              sourceImageType: sourceImageType,
              scale_factor,
              creativity,
              resemblance,
              dynamic,
              prompt: promptToStore,
              savePrompt,
              preserveAIMaterials
            }
          }
        });
      });

      const images = await Promise.all(imagePromises);

      // Deduct credits using standardized function
      await deductCredits(userId, variations, `Upscale operation - ${variations} variation${variations > 1 ? 's' : ''}`, tx, 'IMAGE_REFINE');

      return { batch, images };
    });
    } catch (transactionError) {
      console.error('❌ Upscale database transaction failed:', transactionError);
      return res.status(500).json({
        success: false,
        message: 'Database transaction failed',
        error: transactionError.message
      });
    }

    console.log('✅ Upscale database transaction completed:', {
      batchId: result.batch.id,
      imagesCreated: result.images.length
    });

    // Prepare Replicate API calls
    const replicatePromises = result.images.map(async (image, index) => {
      try {
        // Use inputImage ID for UUID fields as specified
        const inputImageId = sourceImage.id;
        const requestGroupID = inputImageId.toString();
        const uuid = inputImageId.toString();
        const session_uuid = inputImageId.toString();

        // Use inputImage original URL and generated prompt
        const imageUrlToUse = sourceImage.originalUrl || sourceImage.processedUrl || imageUrl;
        const promptToUse = sourceImage.generatedPrompt || prompt;

        // Build HTTPS webhook URL for Replicate using PUBLIC_BASE_URL when available
        const rawBase = process.env.PUBLIC_BASE_URL || process.env.BASE_URL || (req && req.get ? req.get('origin') : '');
        let normalizedBase = rawBase || '';
        if (normalizedBase.endsWith('/')) normalizedBase = normalizedBase.slice(0, -1);
        if (normalizedBase.startsWith('http://')) {
          // Replicate requires HTTPS webhooks
          normalizedBase = 'https://' + normalizedBase.replace(/^http:\/\//, '');
        }
        // If still pointing to localhost/127.0.0.1, skip webhook and rely on polling
        const isLocalhost = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:|$)/i.test(normalizedBase);
        const webhookUrl = isLocalhost || !normalizedBase ? undefined : `${normalizedBase}/api/upscale/webhook`;

        const replicateParams = {
          webhook: webhookUrl,
          image: imageUrlToUse,
          prompt: promptToUse,
          requestGroupID,
          seed: Math.floor(Math.random() * 10000) + 1000,
          dynamic: dynamic,
          sd_model: "juggernaut_reborn.safetensors [338b85bc4f]",
          scheduler: "DPM++ 3M SDE Karras",
          creativity,
          lora_links: "https://civitai.com/api/download/models/78018",
          downscaling: false,
          resemblance,
          scale_factor,
          tiling_width,
          tiling_height,
          negative_prompt: "(worst quality, low quality:2) face, person, woman, multiple heads multiple eyes",
          num_inference_steps: 18,
          downscaling_resolution: 768,
          uuid,
          session_uuid,
          addStyle: "yes",
          GeneratedStatus: "COMPLETED"
        };

        console.log(`🚀 Sending upscale request to Replicate for image ${image.id}:`, {
          uuid,
          imageId: image.id,
          requestGroupID
        });

        const replicateResponse = await replicateService.generateUpscale(replicateParams);

        if (replicateResponse.success) {
          // Update image with Replicate ID and initial status
          await prisma.image.update({
            where: { id: image.id },
            data: {
              runpodJobId: replicateResponse.replicateId, // Store Replicate ID in this field
              runpodStatus: replicateResponse.status || 'starting' // Set initial Replicate status
            }
          });

          console.log(`✅ Replicate upscale request successful for image ${image.id}:`, replicateResponse);
        } else {
          throw new Error(replicateResponse.error || 'Replicate request failed');
        }

        return { success: true, imageId: image.id, response: replicateResponse };
      } catch (error) {
        console.error(`❌ Replicate upscale request failed for image ${image.id}:`, error);

        // Update image status to failed
        await prisma.image.update({
          where: { id: image.id },
          data: {
            status: 'FAILED',
            errorMessage: error.message
          }
        });

        return { success: false, imageId: image.id, error: error.message };
      }
    });

    const replicateResults = await Promise.allSettled(replicatePromises);

    // Check if any requests succeeded
    const successfulRequests = replicateResults.filter(result =>
      result.status === 'fulfilled' && result.value.success
    );

    if (successfulRequests.length === 0) {
      // All requests failed, mark batch as failed
      await prisma.generationBatch.update({
        where: { id: result.batch.id },
        data: { status: 'FAILED' }
      });

      return res.status(500).json({
        success: false,
        message: 'All upscale requests failed',
        batchId: result.batch.id
      });
    }

    // Send WebSocket notification about generation start
    webSocketService.sendToUser(userId, 'upscale_generation_started', {
      batchId: result.batch.id,
      originalBaseImageId,
      variations: variations,
      operationType: 'upscale'
    });
    
    const remainingCredits = user.remainingCredits || 0;

    res.json({
      success: true,
      message: `Upscale operation started successfully`,
      batchId: result.batch.id,
      variations: successfulRequests.length,
      remainingCredits: remainingCredits,
      images: result.images.map(img => ({
        id: img.id,
        status: img.status,
        replicateJobId: img.runpodJobId // Return as replicateJobId for clarity
      }))
    });

  } catch (error) {
    console.log('Upscale generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to start upscale operation',
      error: error.message
    });
  }
};

/**
 * Get upscale operations history for a specific base image
 */
exports.getUpscaleOperations = async (req, res) => {
  try {
    const { baseImageId } = req.params;
    const userId = req.user.id;

    console.log(`Getting upscale operations for baseImageId: ${baseImageId}, userId: ${userId}`);

    // First verify the base image exists and belongs to the user
    const baseImage = await prisma.image.findFirst({
      where: {
        id: parseInt(baseImageId),
        userId: userId
      }
    });

    if (!baseImage) {
      // Check if it's an InputImage instead
      const inputImage = await prisma.inputImage.findFirst({
        where: {
          id: parseInt(baseImageId),
          userId: userId
        }
      });

      if (!inputImage) {
        return res.status(404).json({
          success: false,
          message: 'Base image not found'
        });
      }
    }

    // Look for upscale operations that used this base image
    const operations = await prisma.image.findMany({
      where: {
        originalBaseImageId: parseInt(baseImageId),
        userId: userId,
        batch: {
          moduleType: 'REFINE'
        }
      },
      include: {
        batch: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${operations.length} upscale operations for base image ${baseImageId}`);

    res.json({
      success: true,
      operations: operations.map(operation => ({
        ...operation,
        // Map batch.inputImageId to originalInputImageId for frontend compatibility
        originalInputImageId: operation.batch.inputImageId,
      })) || []
    });

  } catch (error) {
    console.error('Get upscale operations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upscale operations',
      error: error.message
    });
  }
};