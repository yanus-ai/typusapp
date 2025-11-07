const { prisma } = require('../services/prisma.service');
const { deductCredits, isSubscriptionUsable, refundCredits } = require('../services/subscriptions.service');
const webSocketService = require('../services/websocket.service');
const s3Service = require('../services/image/s3.service');
const { generateThumbnail } = require('../services/image/thumbnail.service');
const { checkAndSendImageMilestones } = require('../utils/milestoneHelper');
const { updateImageStatus } = require('../webhooks/tweak.webhooks');
const sharp = require('sharp');
const axios = require('axios');
const Replicate = require("replicate");
// Initialize Replicate client with API token from env
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// Helper function to calculate remaining credits (reusable)
async function calculateRemainingCredits(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { remainingCredits: true }
  });
  return user?.remainingCredits || 0;
}

/**
 * Generate image using Flux Konect - Edit by Text functionality
 */
const runpodGenerationController = require('./runpodGeneration.controller');

const runFluxKonect = async (req, res) => {
  try {
    const {
      prompt,
      imageUrl,
      variations = 1,
      model = 'flux-konect',
      originalBaseImageId: providedOriginalBaseImageId,
      selectedBaseImageId: providedSelectedBaseImageId,
      existingBatchId = null,
      moduleType: providedModuleType,
      baseAttachmentUrl,
      referenceImageUrl,
      referenceImageUrls,
      textureUrls,
      surroundingUrls, // Surrounding texture URLs
      wallsUrls, // Walls texture URLs
      size, // Size parameter: "1K", "2K", "4K", "custom"
      aspectRatio // Aspect ratio parameter
    } = req.body;
    const userId = req.user.id;

    // Log which model is being called
    console.log('🎯 BACKEND: Model selected for generation:', {
      model,
      hasImageUrl: !!imageUrl,
      hasBaseAttachment: !!baseAttachmentUrl,
      referenceImageCount: referenceImageUrls?.length || 0,
      textureCount: textureUrls?.length || 0,
      moduleType: providedModuleType || 'TWEAK'
    });

    // console.log(userId , "=============1=============" , req.body);


    // Validate input: for seedream4, imageUrl is optional; for others it's required
    if (!prompt || (!imageUrl && model !== 'seedream4')) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: prompt' + (model === 'seedream4' ? '' : ' and imageUrl')
      });
    }

    // Determine module type (default TWEAK for backward compatibility)
    const desiredModuleType = (providedModuleType === 'CREATE' || providedModuleType === 'TWEAK') ? providedModuleType : 'TWEAK';

    // Validate variations
    if (variations < 1 || variations > 2) {
      return res.status(400).json({
        success: false,
        message: 'Variations must be between 1 and 2'
      });
    }

    // Check user subscription and credits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });

    // console.log(user , "============================2");


    const subscription = user?.subscription;
    if (!subscription || !['STARTER', 'EXPLORER', 'PRO'].includes(subscription.planType) || !isSubscriptionUsable(subscription)) {
      return res.status(403).json({
        message: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED'
      });
    }

    // console.log(subscription , "=================================3");


    const availableCredits = user.remainingCredits || 0;
    if (availableCredits < variations) {
      return res.status(402).json({
        message: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        required: variations,
        available: availableCredits
      });
    }


    // console.log(availableCredits , "===================================4");


    // Find the original base image ID - this should reference a generated Image record
    let originalBaseImageId = null;

    // First, try to find the generated image by URL
    try {
      const generatedImage = await prisma.image.findFirst({
        where: {
          OR: [
            { originalImageUrl: imageUrl },
            { processedImageUrl: imageUrl }
          ]
        }
      });

      if (generatedImage) {
        // If the found image is itself a variant, use its original base image ID, otherwise use its own ID
        originalBaseImageId = generatedImage.originalBaseImageId;
      } else if (providedOriginalBaseImageId) {
        // If frontend provided an ID, verify it exists in the Image table
        const providedImage = await prisma.image.findUnique({
          where: { id: providedOriginalBaseImageId }
        });
        if (providedImage) {
          originalBaseImageId = providedOriginalBaseImageId;
        }
      }
    } catch (error) {
      console.warn('Could not resolve original base image ID:', error.message);
    }

    // Debug logging
    console.log('📍 FLUX DEBUG: originalBaseImageId resolution:', {
      providedOriginalBaseImageId,
      resolvedOriginalBaseImageId: originalBaseImageId,
      imageUrl
    });

    // For flux operations, originalBaseImageId is optional - if we can't find it, we'll proceed without it
    // This allows flux editing of input images that haven't been generated yet
    if (originalBaseImageId) {
      // Verify that the originalBaseImageId exists in the database
      const baseImageExists = await prisma.image.findUnique({
        where: { id: originalBaseImageId }
      });

      console.log('📍 FLUX DEBUG: baseImageExists check:', {
        originalBaseImageId,
        exists: !!baseImageExists,
        baseImageData: baseImageExists
      });

      if (!baseImageExists) {
        console.warn('⚠️ originalBaseImageId does not exist in Image table, proceeding without it:', originalBaseImageId);
        originalBaseImageId = null;
      }
    }

    // Find originalInputImageId by looking up the InputImage table using the image URL
    // This is important for tracking which input image was used to generate this image
    let originalInputImageId = null;
    if (providedOriginalBaseImageId) {
      // If frontend provided an ID, check if it's an InputImage ID
      try {
        const inputImage = await prisma.inputImage.findUnique({
          where: { id: providedOriginalBaseImageId }
        });
        if (inputImage) {
          originalInputImageId = providedOriginalBaseImageId;
          console.log('✅ Found originalInputImageId from provided ID:', originalInputImageId);
        }
      } catch (error) {
        console.warn('⚠️ Could not verify providedOriginalBaseImageId as InputImage:', error.message);
      }
    }
    
    // If not found by ID, try to find by URL (for images uploaded via drag/drop)
    if (!originalInputImageId && imageUrl) {
      try {
        const inputImageByUrl = await prisma.inputImage.findFirst({
          where: {
            userId,
            OR: [
              { originalUrl: imageUrl },
              { processedUrl: imageUrl },
              { imageUrl: imageUrl } // Also check imageUrl field
            ]
          }
        });
        if (inputImageByUrl) {
          originalInputImageId = inputImageByUrl.id;
          console.log('✅ Found originalInputImageId by URL lookup:', { url: imageUrl, inputImageId: originalInputImageId });
        }
      } catch (error) {
        console.warn('⚠️ Could not find InputImage by URL:', error.message);
      }
    }
    
    // Also check baseAttachmentUrl if provided
    if (!originalInputImageId && baseAttachmentUrl) {
      try {
        const inputImageByAttachmentUrl = await prisma.inputImage.findFirst({
          where: {
            userId,
            OR: [
              { originalUrl: baseAttachmentUrl },
              { processedUrl: baseAttachmentUrl },
              { imageUrl: baseAttachmentUrl } // Also check imageUrl field
            ]
          }
        });
        if (inputImageByAttachmentUrl) {
          originalInputImageId = inputImageByAttachmentUrl.id;
          console.log('✅ Found originalInputImageId by baseAttachmentUrl lookup:', { url: baseAttachmentUrl, inputImageId: originalInputImageId });
        }
      } catch (error) {
        console.warn('⚠️ Could not find InputImage by baseAttachmentUrl:', error.message);
      }
    }
    
    // Check reference/texture URLs for input image ID (for all models)
    // This helps track which input images were used even when base image exists
    // Always check textures even if base image exists, as they might be the primary source
    if (!originalInputImageId && (referenceImageUrls?.length > 0 || textureUrls?.length > 0)) {
      // Try reference images first
      if (referenceImageUrls && referenceImageUrls.length > 0) {
        for (const refUrl of referenceImageUrls) {
          try {
            const inputImageByRefUrl = await prisma.inputImage.findFirst({
              where: {
                userId,
                OR: [
                  { originalUrl: refUrl },
                  { processedUrl: refUrl },
                  { imageUrl: refUrl } // Also check imageUrl field
                ]
              }
            });
            if (inputImageByRefUrl) {
              originalInputImageId = inputImageByRefUrl.id;
              console.log('✅ Found originalInputImageId by reference image URL lookup:', { url: refUrl, inputImageId: originalInputImageId });
              break;
            }
          } catch (error) {
            console.warn('⚠️ Could not find InputImage by reference URL:', error.message);
          }
        }
      }
      
      // If still not found, try texture URLs
      if (!originalInputImageId && textureUrls && textureUrls.length > 0) {
        for (const textureUrl of textureUrls) {
          try {
            const inputImageByTextureUrl = await prisma.inputImage.findFirst({
              where: {
                userId,
                OR: [
                  { originalUrl: textureUrl },
                  { processedUrl: textureUrl },
                  { imageUrl: textureUrl } // Also check imageUrl field
                ]
              }
            });
            if (inputImageByTextureUrl) {
              originalInputImageId = inputImageByTextureUrl.id;
              console.log('✅ Found originalInputImageId by texture URL lookup:', { url: textureUrl, inputImageId: originalInputImageId });
              break;
            }
          } catch (error) {
            console.warn('⚠️ Could not find InputImage by texture URL:', error.message);
          }
        }
      }
    }

    console.log('📍 FLUX DEBUG: originalInputImageId resolution:', {
      providedOriginalBaseImageId,
      resolvedOriginalInputImageId: originalInputImageId,
      imageUrl,
      baseAttachmentUrl
    });

    // Start transaction for database operations
    const result = await prisma.$transaction(async (tx) => {
      let batch;
      let tweakBatch;

      if (existingBatchId) {
        // Use existing batch and update its totals
        batch = await tx.generationBatch.findFirst({
          where: {
            id: parseInt(existingBatchId),
            userId: userId,
            moduleType: desiredModuleType
          },
          include: {
            tweakBatch: true
          }
        });

        if (!batch) {
          throw new Error(`Existing tweak batch ${existingBatchId} not found or access denied`);
        }

        // Update batch totals
        batch = await tx.generationBatch.update({
          where: { id: batch.id },
          data: {
            totalVariations: batch.totalVariations + variations,
            creditsUsed: batch.creditsUsed + variations,
            status: 'PROCESSING' // Ensure it's processing again
          }
        });

        // Get the tweakBatch with proper ID
        tweakBatch = await tx.tweakBatch.findFirst({
          where: { batchId: batch.id }
        });
        console.log('📦 Using existing tweak batch for flux:', batch.id, 'tweakBatch ID:', tweakBatch?.id, 'new total variations:', batch.totalVariations);
      } else {
        // Create generation batch with enhanced metadata
        batch = await tx.generationBatch.create({
          data: {
            userId,
            moduleType: desiredModuleType,
            prompt: prompt,
            totalVariations: variations,
            status: 'PROCESSING',
            creditsUsed: variations,
            metaData: {
              operationType: 'flux_edit',
              // Enhanced metadata for better tracking
              tweakSettings: {
                prompt,
                variations,
                operationType: 'flux_edit',
                baseImageUrl: imageUrl || '',
                attachments: {
                  baseAttachmentUrl,
                  referenceImageUrls,
                  textureUrls
                }
              }
            }
          }
        });

        // Create tweak batch
        tweakBatch = await tx.tweakBatch.create({
          data: {
            batchId: batch.id,
            baseImageUrl: imageUrl || '',
            variations
          }
        });

        console.log('📦 Created new tweak batch for flux:', batch.id);
      }

      // Create tweak operation only for new batches
      let operation;
      if (!existingBatchId) {
        operation = await tx.tweakOperation.create({
          data: {
            tweakBatchId: tweakBatch.id,
            operationType: 'FLUX_EDIT',
            operationData: {
              prompt,
              baseImageUrl: imageUrl || ''
            },
            sequenceOrder: 1
          }
        });
      } else {
        // Use existing operation
        operation = await tx.tweakOperation.findFirst({
          where: { tweakBatchId: tweakBatch.id }
        });
      }

      // Get the highest variation number from existing images in this batch
      const existingImages = await tx.image.findMany({
        where: { batchId: batch.id },
        select: { variationNumber: true },
        orderBy: { variationNumber: 'desc' },
        take: 1
      });

      const nextVariationNumber = existingImages.length > 0 ? existingImages[0].variationNumber + 1 : 1;
      console.log('📊 Next variation number for flux batch', batch.id, ':', nextVariationNumber);

      // Create image records for each variation with FULL prompt storage
      const imageRecords = [];
      for (let i = 0; i < variations; i++) {
          const imageData = {
          batchId: batch.id,
          userId,
          variationNumber: nextVariationNumber + i,
          status: 'PROCESSING',
          runpodStatus: 'SUBMITTED',
          // 🔥 ENHANCEMENT: Store full prompt details like Create section
          aiPrompt: prompt,
          settingsSnapshot: {
            prompt,
            variations,
            operationType: 'flux_edit',
            moduleType: desiredModuleType, // Use actual module type (CREATE or TWEAK)
            baseImageUrl: imageUrl,
              timestamp: new Date().toISOString(),
              attachments: {
                baseAttachmentUrl,
                referenceImageUrls,
                textureUrls, // Combined for backward compatibility
                surroundingUrls: surroundingUrls || (textureUrls ? textureUrls.slice(0, Math.floor(textureUrls.length / 2)) : []), // Store separately if provided, otherwise split textureUrls
                wallsUrls: wallsUrls || (textureUrls ? textureUrls.slice(Math.floor(textureUrls.length / 2)) : []) // Store separately if provided, otherwise split textureUrls
              }
          },
          metadata: {
            selectedBaseImageId: providedSelectedBaseImageId, // Track what the frontend was subscribed to
            tweakOperation: 'flux_edit',
            operationData: {
              prompt,
              baseImageUrl: imageUrl
            }
          }
        };

        // Only include originalBaseImageId if it's not null (to avoid foreign key constraint violation)
        if (originalBaseImageId) {
          imageData.originalBaseImageId = originalBaseImageId;
        }

        // Include the appropriate upload ID based on module type (for tracking which input image was used)
        // Note: Prisma schema doesn't have originalInputImageId, use module-specific fields instead
        if (originalInputImageId) {
          if (desiredModuleType === 'CREATE') {
            imageData.createUploadId = originalInputImageId;
            console.log('✅ Setting createUploadId on image record:', originalInputImageId);
          } else if (desiredModuleType === 'TWEAK') {
            imageData.tweakUploadId = originalInputImageId;
            console.log('✅ Setting tweakUploadId on image record:', originalInputImageId);
          } else if (desiredModuleType === 'REFINE') {
            imageData.refineUploadId = originalInputImageId;
            console.log('✅ Setting refineUploadId on image record:', originalInputImageId);
          }
        } else {
          console.warn('⚠️ No originalInputImageId found for image - will be null');
        }

        const imageRecord = await tx.image.create({
          data: imageData
        });
        imageRecords.push(imageRecord);
      }

      return { batch, tweakBatch, operation, imageRecords };
    }, {
      timeout: 30000 // 30 seconds timeout for transactions
    });

    // Deduct credits outside transaction to avoid timeout issues
    await deductCredits(userId, variations, `Flux edit generation - ${variations} variation(s)`, prisma, 'IMAGE_TWEAK');

  // Generate each variation. Each promise returns a structured result so we can decide final API response.
  const generationPromises = result.imageRecords.map(async (imageRecord, index) => {
      try {
        // No need for UUID generation - using image ID directly

        console.log('🚀 Starting Flux generation for image:', {
          imageId: imageRecord.id,
          variationNumber: imageRecord.variationNumber,
          prompt,
          imageUrl
        });

        let generatedImageUrl;
        let output;

        // Normalize model value for comparison (handle case variations)
        let normalizedModel = typeof model === 'string' ? model.toLowerCase().trim() : model;
        
        console.log('🔍 MODEL DECISION POINT:', { 
          receivedModel: model, 
          normalizedModel: normalizedModel,
          modelType: typeof model, 
          isNanobanana: normalizedModel === 'nanobanana',
          isSeedream4: normalizedModel === 'seedream4',
          hasImageUrl: !!imageUrl,
          hasBaseAttachment: !!baseAttachmentUrl,
          hasTextures: !!(textureUrls && textureUrls.length > 0),
          textureCount: textureUrls?.length || 0,
          hasReferences: !!(referenceImageUrls && referenceImageUrls.length > 0),
          referenceCount: referenceImageUrls?.length || 0
        });
        
        // Validate model selection
        if (!normalizedModel || (normalizedModel !== 'nanobanana' && normalizedModel !== 'seedream4' && normalizedModel !== 'sdxl')) {
          console.error('❌ Invalid model selected:', normalizedModel, 'Defaulting to nanobanana');
          normalizedModel = 'nanobanana';
        }

        if (normalizedModel === 'nanobanana') {
          // Use Replicate to run Google Nano Banana model
          console.log('🍌 Running Replicate model google/nano-banana');
          
          // Collect all images to send: base image + attachments (base attachment, reference, textures)
          const imageInputArray = [imageUrl]; // Start with the main base image
          
          // Add base attachment image if provided
          if (baseAttachmentUrl) {
            imageInputArray.push(baseAttachmentUrl);
            console.log('📎 Added base attachment image to input');
          }
          
          // Add reference image(s) if provided
          if (referenceImageUrl) {
            imageInputArray.push(referenceImageUrl);
            console.log('📎 Added reference image to input');
          }
          if (referenceImageUrls && Array.isArray(referenceImageUrls) && referenceImageUrls.length > 0) {
            imageInputArray.push(...referenceImageUrls);
            console.log(`📎 Added ${referenceImageUrls.length} additional reference image(s) to input`);
          }
          
          // Add texture samples if provided (textureUrls is an array)
          if (textureUrls && Array.isArray(textureUrls) && textureUrls.length > 0) {
            imageInputArray.push(...textureUrls);
            console.log(`📎 Added ${textureUrls.length} texture sample(s) to input`);
          }
          
          console.log(`📦 Total images being sent to Google Nano Banana: ${imageInputArray.length}`, {
            baseImage: imageUrl,
            baseAttachment: baseAttachmentUrl || 'none',
            reference: referenceImageUrl || 'none',
            textureCount: textureUrls?.length || 0
          });
          
          // Build prompt with texture guidance if textures are provided
          let enhancedPrompt = prompt;
          if (textureUrls && textureUrls.length > 0) {
            const textureGuidance = "Use the provided textures for the walls of the building and the surrounding environment.";
            enhancedPrompt = `${prompt}. ${textureGuidance}`;
            console.log('🎨 Added texture guidance to Nano Banana prompt');
          }
          
          // Ensure prompt is always present (required field)
          if (!enhancedPrompt || enhancedPrompt.trim() === '') {
            enhancedPrompt = 'Architectural visualization';
            console.log('⚠️ Empty prompt, using default');
          }
          
          // Nano Banana accepts: prompt (required), image_input array, aspect_ratio, output_format
          const input = {
            prompt: enhancedPrompt, // Always include prompt
            image_input: imageInputArray // Include all images: base, attachment, reference, textures
          };
          
          // Add aspect_ratio if provided (default to match_input_image)
          if (aspectRatio) {
            input.aspect_ratio = aspectRatio;
          } else {
            input.aspect_ratio = 'match_input_image'; // Default per schema
          }
          
          // Add output_format (default to jpg per schema)
          input.output_format = 'jpg'; // Default per schema
          
          const modelId = process.env.NANOBANANA_REPLICATE_MODEL || 'google/nano-banana';
          console.log('Using Replicate modelId for nanobanana:', modelId ? modelId : '(none)');
          if (!modelId || typeof modelId !== 'string') {
            // Return structured failure so higher-level logic can decide final response
            return {
              success: false,
              error: 'Replicate model id not configured for nanobanana',
              code: 'REPLICATE_MODEL_NOT_CONFIGURED'
            };
          }
          output = await replicate.run(modelId, { input });
        } else if (normalizedModel === 'seedream4') {
          console.log('🌊 Running Replicate model bytedance/seedream-4');
          
          // Collect all images to send to Seed Dream: reference and texture images
          const imageInputArray = [];
          
          // Add base image if provided (for Seed Dream, base image can be used as reference)
          if (imageUrl) {
            imageInputArray.push(imageUrl);
            console.log('📎 Added base image to Seed Dream input');
          }
          
          // Add base attachment image if provided
          if (baseAttachmentUrl) {
            imageInputArray.push(baseAttachmentUrl);
            console.log('📎 Added base attachment image to Seed Dream input');
          }
          
          // Add reference image(s) if provided
          if (referenceImageUrl) {
            imageInputArray.push(referenceImageUrl);
            console.log('📎 Added reference image to Seed Dream input');
          }
          if (referenceImageUrls && Array.isArray(referenceImageUrls) && referenceImageUrls.length > 0) {
            imageInputArray.push(...referenceImageUrls);
            console.log(`📎 Added ${referenceImageUrls.length} additional reference image(s) to Seed Dream input`);
          }
          
          // Add texture samples if provided (textureUrls is an array)
          if (textureUrls && Array.isArray(textureUrls) && textureUrls.length > 0) {
            imageInputArray.push(...textureUrls);
            console.log(`📎 Added ${textureUrls.length} texture sample(s) to Seed Dream input`);
          }
          
          console.log(`📦 Total images being sent to Seed Dream: ${imageInputArray.length}`, {
            baseImage: imageUrl || 'none',
            baseAttachment: baseAttachmentUrl || 'none',
            reference: referenceImageUrl || 'none',
            referenceCount: referenceImageUrls?.length || 0,
            textureCount: textureUrls?.length || 0
          });
          
          // Build input object for Seed Dream 4
          // According to Seed Dream 4 schema: prompt (required), aspect_ratio, image_input array, size, enhance_prompt, max_images
          const input = {
            prompt: prompt, // Required - always include prompt
            aspect_ratio: aspectRatio || 'match_input_image', // Use provided aspectRatio or default
            size: size || '2K', // Use provided size or default to 2K resolution (2048px)
            enhance_prompt: true, // Enable prompt enhancement for higher quality
            max_images: variations || 1 // Use variations count or default to 1
          };
          
          // Add images to input if any are provided
          // Seed Dream 4 uses image_input array (can contain 1-10 images)
          if (imageInputArray.length > 0) {
            input.image_input = imageInputArray;
          }
          
          // Add guidance prompts for textures if provided
          if (textureUrls && textureUrls.length > 0) {
            // Enhance prompt with texture guidance
            const textureGuidance = "Use the provided textures for the walls of the building and the surrounding environment.";
            input.prompt = `${prompt}. ${textureGuidance}`;
            console.log('🎨 Added texture guidance to prompt');
          }
          
          // Ensure prompt is always present (required field)
          if (!input.prompt || input.prompt.trim() === '') {
            input.prompt = 'Architectural visualization';
            console.log('⚠️ Empty prompt, using default');
          }
          
          const modelId = process.env.SEEDREAM4_REPLICATE_MODEL || 'bytedance/seedream-4';
          console.log('Using Replicate modelId for seedream4:', modelId ? modelId : '(none)');
          console.log('🌊 Seed Dream input parameters:', JSON.stringify(input, null, 2));
          if (!modelId || typeof modelId !== 'string') {
            return {
              success: false,
              error: 'Replicate model id not configured for seedream4',
              code: 'REPLICATE_MODEL_NOT_CONFIGURED'
            };
          }
          
          try {
            output = await replicate.run(modelId, { input });
          } catch (replicateError) {
            console.error('❌ Seed Dream Replicate API error:', {
              error: replicateError.message,
              errorDetails: replicateError,
              inputParams: input,
              imageCount: imageInputArray.length,
              stack: replicateError.stack
            });
            
            // If error is about invalid input parameter, try text-only mode
            if (replicateError.message && (
              replicateError.message.includes('image') || 
              replicateError.message.includes('reference_image') ||
              replicateError.message.includes('invalid') ||
              replicateError.message.includes('unexpected') ||
              replicateError.message.includes('parameter')
            )) {
              console.log('🔄 Retrying Seed Dream in text-only mode (without image parameters)...');
              // Try with just prompt and aspect_ratio (pure text-to-image)
              const textOnlyInput = {
                prompt: prompt,
                aspect_ratio: '1:1'
              };
              console.log('🌊 Seed Dream retry input parameters (text-only):', JSON.stringify(textOnlyInput, null, 2));
              output = await replicate.run(modelId, { input: textOnlyInput });
            } else {
              // Re-throw if it's a different error (e.g., network, auth, etc.)
              throw replicateError;
            }
          }
        } else if (normalizedModel === 'sdxl') {
          // Route SDXL to RunPod generation pipeline (same as master branch logic)
          // Note: This is handled outside the variation loop, so we return early
          // The generateWithRunPod function will handle the response
          try {
            // Prepare body for runpod controller
            req.body = {
              ...req.body,
              prompt: prompt,
              inputImageId: originalInputImageId || providedOriginalBaseImageId || providedSelectedBaseImageId,
              variations: variations,
              settings: {
                ...(req.body.settings || {}),
                context: 'CREATE',
                model: 'sdxl'
              }
            };
            // generateWithRunPod will send the response, so we return here
            // and don't continue with the variation processing loop
            await runpodGenerationController.generateWithRunPod(req, res);
            return; // Exit early - response already sent by generateWithRunPod
          } catch (err) {
            console.error('❌ SDXL (RunPod) generation failed:', err);
            // Only send error response if headers haven't been sent
            if (!res.headersSent) {
              return res.status(500).json({ success: false, message: 'SDXL generation failed', error: err?.message });
            }
            return;
          }
        } else {
          // Call Replicate Flux model (existing behavior)
          const input = {
            prompt: prompt,
            guidance: 2.5,
            speed_mode: "Real Time",
            img_cond_path: imageUrl
          };
          const modelId = process.env.REPLICATE_MODEL_VERSION;
          console.log('Using Replicate modelId for flux:', modelId ? modelId : '(none)');
          if (!modelId || typeof modelId !== 'string') {
            return {
              success: false,
              error: 'Replicate model id not configured for flux',
              code: 'REPLICATE_MODEL_NOT_CONFIGURED'
            };
          }
          output = await replicate.run(modelId, { input });
        }

        // Extract URL from replicate output (handle variations in return shape)
        if (!output) {
          throw new Error('No output returned from Replicate');
        }

        if (typeof output === 'string') {
          generatedImageUrl = output;
        } else if (typeof output?.url === 'function') {
          generatedImageUrl = output.url();
        } else if (Array.isArray(output) && typeof output[0] === 'string') {
          generatedImageUrl = output[0];
        } else if (Array.isArray(output) && typeof output[0]?.url === 'function') {
          generatedImageUrl = output[0].url();
        } else if (typeof output?.url === 'string') {
          generatedImageUrl = output.url;
        } else if (Array.isArray(output) && output[0] && typeof output[0].url === 'string') {
          generatedImageUrl = output[0].url;
        } else {
          // Fallback - stringify the output for debugging
          generatedImageUrl = JSON.stringify(output);
        }

        console.log('✅ Flux generation completed:', {
          imageId: imageRecord.id,
          generatedUrl: generatedImageUrl
        });

  // Process and save the generated image using existing utilities
  // Pass the selected model so downstream processing/notifications can include the model name
  await processAndSaveFluxImage(imageRecord, generatedImageUrl, model);

        return {
          success: true,
          generatedImageUrl
        };

      } catch (error) {
        console.error(`Flux variation ${index + 1} failed:`, error);

        // Update image status to failed
        await prisma.image.update({
          where: { id: imageRecord.id },
          data: { status: 'FAILED', runpodStatus: 'FAILED' }
        }).catch(console.error);

        // Refund the user for this failed variation to avoid charging on upstream failures
        try {
          await refundCredits(userId, 1, `Refund for failed flux variation ${imageRecord.id} due to upstream error`, prisma);
        } catch (refundErr) {
          console.error('Failed to refund credits after Replicate failure:', refundErr);
        }

        // Return structured failure information for final decision
        const statusCode = error?.response?.status || null;
        return {
          success: false,
          error: error?.message || String(error),
          code: statusCode
        };
      }
    });

    // Wait for all variations to be submitted (don't wait for completion)
    const generationResults = await Promise.all(generationPromises);

    // Check if response was already sent (e.g., by SDXL generateWithRunPod)
    if (res.headersSent) {
      return; // Response already sent, don't try to send another
    }

    // If all variations failed, propagate a clear error to the client so the UI can show a popup
    const allFailed = generationResults.every(r => !r || r.success === false);
    if (allFailed) {
      // Detect Replicate model-not-configured error
      const hasModelNotConfigured = generationResults.some(r => r && r.code === 'REPLICATE_MODEL_NOT_CONFIGURED');
      if (hasModelNotConfigured) {
        console.error('All Flux variations failed due to replicate model not configured. Returning error to client.');
        return res.status(500).json({
          success: false,
          message: 'Server misconfiguration: replicate model id not configured for the selected model. Please contact the admin.',
          code: 'REPLICATE_MODEL_NOT_CONFIGURED',
          details: generationResults
        });
      }

      // Detect Replicate billing error (HTTP 402) specifically
      const hasBillingError = generationResults.some(r => r && (r.code === 402 || (r.error && typeof r.error === 'string' && r.error.toLowerCase().includes('insufficient credit'))));
      if (hasBillingError) {
        console.error('All Flux variations failed due to Replicate billing (402). Returning error to client.');
        return res.status(402).json({
          success: false,
          message: 'Replicate billing error: insufficient credit to run google/nano-banana. Please fund the Replicate account or use a different model.',
          code: 'REPLICATE_BILLING_ERROR',
          details: generationResults
        });
      }

      console.error('All Flux variations failed. Returning error to client.');
      return res.status(500).json({
        success: false,
        message: 'All variations failed during generation',
        code: 'ALL_VARIATIONS_FAILED',
        details: generationResults
      });
    }


    // Calculate remaining credits after deduction
    const remainingCredits = await calculateRemainingCredits(userId);

    // Pick a representative generated image URL (first successful variation) to return to the client
    const firstSuccessful = generationResults.find(r => r && r.success);
    const representativeGeneratedImageUrl = firstSuccessful ? firstSuccessful.generatedImageUrl : null;

    res.json({
      success: true,
      data: {
        batchId: result.batch.id,
        operationId: result.operation.id,
        imageIds: result.imageRecords.map(img => img.id),
        variations,
        remainingCredits: remainingCredits,
        status: 'processing',
        generatedImageUrl: representativeGeneratedImageUrl
      }
    });

  } catch (error) {
    console.error('Error running Flux Konect:', error);
    // Only send error response if headers haven't been sent
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to run Flux Konect',
        error: error.message
      });
    }
  }
};

/**
 * Process and save generated image using existing reusable utilities
 */
async function processAndSaveFluxImage(imageRecord, generatedImageUrl, model = 'flux-konect') {
  try {
    console.log('Processing Flux output image:', {
      imageId: imageRecord.id,
      variationNumber: imageRecord.variationNumber,
      outputUrl: generatedImageUrl
    });

    // Download the Flux result image
    const response = await axios({
      method: 'GET',
      url: generatedImageUrl,
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YanusWebhook/1.0)'
      }
    });
    const imageBuffer = Buffer.from(response.data);

    console.log('Downloaded Flux image, size:', imageBuffer.length);

    // Get original image metadata
    const metadata = await sharp(imageBuffer).metadata();
    console.log('Flux image dimensions:', {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
    });

    // Step 1: Upload original high-resolution image directly to S3 (preserves original quality and file size)
    console.log('Uploading original Flux image buffer directly to S3...');
    const originalUpload = await s3Service.uploadGeneratedImage(
      imageBuffer,
      `flux-${imageRecord.id}-original.jpg`,
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

      console.log('Resizing Flux image for LoRA training from', `${metadata.width}x${metadata.height}`, 'to', `${finalWidth}x${finalHeight}`);

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
      console.log('Flux image is within LoRA bounds, no resizing needed for training');
      // Convert to JPEG for consistency
      processedBuffer = await sharp(imageBuffer)
        .jpeg({
          quality: 100, // Maximum quality for LoRA training
          progressive: true
        })
        .toBuffer();
    }

    // Upload processed image (reusing existing service)
    const processedUpload = await s3Service.uploadGeneratedImage(
      processedBuffer,
      `flux-${imageRecord.id}-processed.jpg`,
      'image/jpeg'
    );

    if (!processedUpload.success) {
      throw new Error(`Failed to upload processed image: ${processedUpload.error}`);
    }

    // Generate thumbnail using existing service instead of manual creation
    let thumbnailUrl;
    try {
      thumbnailUrl = await generateThumbnail(
        originalUpload.url,
        `flux-${imageRecord.id}-thumb.jpg`,
        300,
        'uploads/generated'
      );
    } catch (thumbnailError) {
      console.warn('Failed to generate thumbnail, using processed image URL:', thumbnailError.message);
      thumbnailUrl = processedUpload.url;
    }

    // Get the preview URL from the original base input image
    let previewUrl = null;
    if (imageRecord.originalBaseImageId) {
      const baseInputImage = await prisma.inputImage.findUnique({
        where: { id: imageRecord.originalBaseImageId },
        select: { previewUrl: true, originalUrl: true }
      });
      if (baseInputImage) {
        previewUrl = baseInputImage.previewUrl || baseInputImage.originalUrl;
      }
    }

    // Use existing updateImageStatus function instead of manual update
    await updateImageStatus(imageRecord.id, 'COMPLETED', {
      originalImageUrl: originalUpload.url,
      processedImageUrl: processedUpload.url,
      thumbnailUrl: thumbnailUrl,
      previewUrl: previewUrl,
      runpodStatus: 'COMPLETED',
      metadata: {
        task: 'flux_edit',
        model: 'flux-konect',
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
    });

    // Get user info for notifications (since updateImageStatus doesn't include relations)
    const imageWithUser = await prisma.image.findUnique({
      where: { id: imageRecord.id },
      include: {
        batch: {
          include: {
            user: true
          }
        }
      }
    });

    console.log('Flux variation completed and processed successfully:', {
      imageId: imageRecord.id,
      variationNumber: imageRecord.variationNumber,
      originalUrl: originalUpload.url, // High-resolution for canvas
      processedUrl: processedUpload.url, // Processed for LoRA training
      thumbnailUrl: thumbnailUrl,
      originalDimensions: `${metadata.width}x${metadata.height}`,
      processedDimensions: `${finalWidth}x${finalHeight}`,
      originalBaseImageId: imageRecord.originalBaseImageId
    });

    // Check for image milestones (reusing existing helper)
    if (imageWithUser.batch?.user) {
      await checkAndSendImageMilestones(
        imageWithUser.userId,
        imageWithUser.batch.user.email,
        imageWithUser.batch.user.fullName,
        imageWithUser.batch.user.firstImageEmailSent,
        imageWithUser.batch.user.milestone10imagessent
      );
    }

    // Resolve friendly model display name for client notifications
    const modelDisplayName = (function(m) {
      if (!m) return 'Flux';
      const key = String(m).toLowerCase();
      if (key.includes('nano') || key.includes('nanobanana') || key.includes('nano-banana')) return 'Google Nano-Banana';
      if (key.includes('flux')) return 'Flux Konect';
      // Fallback: title-case the model string
      return String(m).replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    })(model);

    // Calculate remaining credits to include in notification
    const remainingCredits = await calculateRemainingCredits(imageWithUser.batch.user.id);

    // Notify individual variation completion via WebSocket (use original URL for canvas display)
    const notificationData = {
      batchId: imageRecord.batchId,
      imageId: imageRecord.id,
      variationNumber: imageRecord.variationNumber,
      imageUrl: originalUpload.url, // Use ORIGINAL high-resolution image for canvas display
      processedUrl: processedUpload.url, // Processed URL for LoRA training
      thumbnailUrl: thumbnailUrl,
      previewUrl: previewUrl, // Include preview URL in WebSocket notification
      status: 'COMPLETED',
      dimensions: {
        width: metadata.width, // Original dimensions for canvas
        height: metadata.height
      },
      operationType: 'flux_edit',
      originalBaseImageId: imageRecord.originalBaseImageId, // Include for frontend to refresh tweak history
      // 🔥 ENHANCEMENT: Include prompt data for UI
      promptData: {
        prompt: imageRecord.aiPrompt,
        settingsSnapshot: imageRecord.settingsSnapshot,
        moduleType: 'TWEAK'
      },
      resultType: 'GENERATED',
      sourceModule: 'TWEAK',
      // Include model info for client-friendly notifications
      model: model,
      modelDisplayName: modelDisplayName,
      // Include remaining credits for real-time UI updates
      remainingCredits: remainingCredits
    };

    console.log('🔔 Sending WebSocket notification for Flux completion:', {
      userId: imageWithUser.batch.user.id,
      imageId: imageRecord.id,
      batchId: imageRecord.batchId
    });

    // Send notification using user from fresh query
    const notificationSent = webSocketService.notifyUserVariationCompleted(imageWithUser.batch.user.id, notificationData);

    if (!notificationSent) {
      console.warn('⚠️ User-based notification failed - user may not be connected. Image processing completed but user will not be notified until reconnection.');
      // SECURITY: Removed dangerous fallback that broadcasted to ALL users
    }

  } catch (processingError) {
    console.error('Error processing Flux output image:', {
      imageId: imageRecord.id,
      variationNumber: imageRecord.variationNumber,
      error: processingError.message,
      stack: processingError.stack
    });

    // Get the preview URL from the original base input image for fallback case too
    let previewUrl = null;
    if (imageRecord.originalBaseImageId) {
      try {
        const baseInputImage = await prisma.inputImage.findUnique({
          where: { id: imageRecord.originalBaseImageId },
          select: { previewUrl: true, originalUrl: true }
        });
        if (baseInputImage) {
          previewUrl = baseInputImage.previewUrl || baseInputImage.originalUrl;
        }
      } catch (previewError) {
        console.warn('Failed to get preview URL for fallback:', previewError);
      }
    }

    // Use existing updateImageStatus for fallback too
    await updateImageStatus(imageRecord.id, 'COMPLETED', {
      originalImageUrl: generatedImageUrl,
      processedImageUrl: generatedImageUrl,
      previewUrl: previewUrl,
      runpodStatus: 'COMPLETED',
      metadata: {
        task: 'flux_edit',
        model: model || 'flux-konect',
        processingError: processingError.message
      }
    });

    // Get user info for notification
    const fallbackImage = await prisma.image.findUnique({
      where: { id: imageRecord.id },
      include: {
        batch: {
          include: {
            user: true
          }
        }
      }
    });

    // Notify completion even with processing error (use original URL for canvas)
    const errorNotificationData = {
      batchId: imageRecord.batchId,
      imageId: imageRecord.id,
      variationNumber: imageRecord.variationNumber,
      imageUrl: generatedImageUrl, // Use original Flux output for canvas display
      status: 'COMPLETED',
      operationType: 'flux_edit',
      originalBaseImageId: imageRecord.originalBaseImageId,
      processingWarning: 'Image processing failed, using original Flux output',
      resultType: 'GENERATED',
      sourceModule: 'TWEAK'
    };

    // Attach model info so client can render correct display name
    errorNotificationData.model = model || 'flux-konect';
    errorNotificationData.modelDisplayName = (function(m) {
      if (!m) return 'Flux';
      const key = String(m).toLowerCase();
      if (key.includes('nano') || key.includes('nanobanana') || key.includes('nano-banana')) return 'Google Nano-Banana';
      if (key.includes('flux')) return 'Flux Konect';
      return String(m).replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    })(model);

    // Use user-based notification - SECURE: Only notify the correct user
    const notificationSent = webSocketService.notifyUserVariationCompleted(fallbackImage.batch.user.id, errorNotificationData);

    if (!notificationSent) {
      console.warn('⚠️ User-based notification failed - user may not be connected. Error notification not sent.');
      // SECURITY: Removed dangerous fallback that broadcasted to ALL users
    }
  }
}

module.exports = {
  runFluxKonect
};
