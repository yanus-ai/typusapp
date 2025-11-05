const { prisma } = require('../services/prisma.service');
const s3Service = require('../services/image/s3.service');
const maskService = require('../services/mask/mask.service');
const maskRegionService = require('../services/mask/maskRegion.service');
const replicateImageUploader = require('../services/image/replicateImageUploader.service');
const imageTaggingService = require('../services/imageTagging.service');
const openaiService = require('../services/openai.service');
const webSocketService = require('../services/websocket.service');
const sharp = require('sharp');
const axios = require('axios');
const FormData = require('form-data');
const { BASE_URL, BUBBLE_FILE_UPLOAD_URL } = require('../config/constants');

/**
 * Handle webhook for creating input images from external JSON payload
 * Expected payload: { ImageData, InputImage, map, token }
 */
const createInputImageFromWebhook = async (req, res) => {
  try {
    console.log('🔗 Webhook received for input image creation');
    
    const { ImageData, InputImage, map, token } = req.body;
    
    // Validate required fields
    if (!ImageData) {
      return res.status(400).json({
        status: "error",
        response: {
          message: "ImageData is required",
          messageText: "Error: ImageData field is missing from the request",
          link: null
        }
      });
    }

    if (!token) {
      return res.status(400).json({
        status: "error",
        response: {
          message: "Authentication token is required",
          messageText: "Error: Authentication token is missing from the request",
          link: null
        }
      });
    }

    // Get user from token (same as auth middleware)
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        status: "error",
        response: {
          message: "Invalid authentication token",
          messageText: "Error: Authentication token is invalid or expired",
          link: null
        }
      });
    }

    console.log('🔐 Authenticated user for webhook:', user.id);

    // Step 1: Convert base64 ImageData to image URL using Bubble API
    console.log('📤 Converting base64 to Bubble URL...');
    const bubbleImageUrl = await convertBase64ToBubbleUrl(ImageData);
    console.log('✅ Bubble image URL created:', bubbleImageUrl);

    let bubbleInputImageUrl, inputImageBuffer = null;

    if (InputImage) {
      console.log('📤 Converting base64 to Bubble URL...');
      bubbleInputImageUrl = await convertBase64ToBubbleUrl(InputImage);
      console.log('✅ Bubble image URL created:', bubbleInputImageUrl);
    }

    // Step 2: Download the image from Bubble
    console.log('⬇️ Downloading image from Bubble...');
    const imageBuffer = await downloadImageFromUrl(bubbleImageUrl);
    console.log('✅ Image downloaded, size:', imageBuffer.length);

    if (bubbleInputImageUrl) {
      console.log('⬇️ Downloading image from Bubble...');
      inputImageBuffer = await downloadImageFromUrl(bubbleInputImageUrl);
      console.log('✅ Image downloaded, size:', inputImageBuffer.length);
    }

    // Step 3: Get original image metadata
    console.log('🖼️ Getting original image metadata...');
    const originalMetadata = await sharp(imageBuffer).metadata();
    console.log('📏 Original image dimensions:', {
      width: originalMetadata.width,
      height: originalMetadata.height,
      format: originalMetadata.format,
      size: imageBuffer.length
    });

    let originalInputMetadata = null;
    if (inputImageBuffer) {
      originalInputMetadata = await sharp(inputImageBuffer).metadata();
      console.log('� Original input image dimensions:', {
        width: originalInputMetadata.width,
        height: originalInputMetadata.height,
        format: originalInputMetadata.format,
        size: inputImageBuffer.length
      });
    }

    // Step 4: Upload ORIGINAL unresized images to S3 (for high-quality canvas display)
    console.log('☁️ Uploading ORIGINAL image to S3...');
    const fileName = `original-webhook-${Date.now()}-${user.id}.jpg`;
    
    // Convert to JPEG format for consistency while preserving quality
    const originalJpegBuffer = await sharp(imageBuffer)
      .jpeg({ quality: 95, progressive: true })
      .toBuffer();
    
    const originalUpload = await s3Service.uploadInputImage(
      originalJpegBuffer,
      fileName,
      'image/jpeg'
    );

    if (!originalUpload.success) {
      throw new Error('Failed to upload original image: ' + originalUpload.error);
    }

    let inputOriginalUpload = null;
    if (inputImageBuffer) {
      console.log('☁️ Uploading ORIGINAL input image to S3...');
      const inputFileName = `original-input-${Date.now()}-${user.id}.jpg`;
      
      // Convert to JPEG format for consistency while preserving quality
      const inputOriginalJpegBuffer = await sharp(inputImageBuffer)
        .jpeg({ quality: 95, progressive: true })
        .toBuffer();
      
      inputOriginalUpload = await s3Service.uploadInputImage(
        inputOriginalJpegBuffer,
        inputFileName,
        'image/jpeg'
      );

      if (!inputOriginalUpload.success) {
        throw new Error('Failed to upload original input image: ' + inputOriginalUpload.error);
      }
    }

    // Step 5: Create resized versions for processing/fallback (max 800x600)
    console.log('🖼️ Creating resized versions for processing...');
    const resizedImage = await resizeImageForUpload(imageBuffer, 800, 600);

    let resizedInputImage = null;
    if (inputImageBuffer) {
      console.log('🖼️ Creating resized input image...');
      resizedInputImage = await resizeImageForUpload(inputImageBuffer, 800, 600);
    }

    // Step 6: Upload resized images to S3 (for processing/fallback)
    console.log('☁️ Uploading resized image to S3...');
    const resizedFileName = `resized-webhook-${Date.now()}-${user.id}.jpg`;
    const resizedUpload = await s3Service.uploadInputImage(
      resizedImage.buffer,
      resizedFileName,
      'image/jpeg'
    );

    if (!resizedUpload.success) {
      console.warn('Failed to upload resized image, using original only');
    }

    let resizedInputUpload = null;
    if (resizedInputImage) {
      console.log('☁️ Uploading resized input image to S3...');
      const resizedInputFileName = `resized-input-${Date.now()}-${user.id}.jpg`;
      resizedInputUpload = await s3Service.uploadInputImage(
        resizedInputImage.buffer,
        resizedInputFileName,
        'image/jpeg'
      );

      if (!resizedInputUpload.success) {
        console.warn('Failed to upload resized input image, using original only');
      }
    }

    // Step 7: Create thumbnails from resized images
    console.log('🖼️ Creating thumbnail...');
    const thumbnailBuffer = await sharp(resizedImage.buffer)
      .resize(300, 300, { 
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    let inputThumbnailBuffer = null;
    if (resizedInputImage) {
      console.log('🖼️ Creating input thumbnail...');
      inputThumbnailBuffer = await sharp(resizedInputImage.buffer)
        .resize(300, 300, { 
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    // Step 8: Upload thumbnails to S3
    console.log('☁️ Uploading thumbnail to S3...');
    const thumbnailUpload = await s3Service.uploadThumbnail(
      thumbnailBuffer,
      `thumbnail-${fileName}`,
      'image/jpeg'
    );

    if (!thumbnailUpload.success) {
      console.warn('Failed to upload thumbnail, continuing without it');
    }

    let inputThumbnailUpload = null;
    if (inputThumbnailBuffer) {
      console.log('☁️ Uploading input thumbnail to S3...');
      inputThumbnailUpload = await s3Service.uploadThumbnail(
        inputThumbnailBuffer,
        `input-thumbnail-${fileName}`,
        'image/jpeg'
      );

      if (!inputThumbnailUpload.success) {
        console.warn('Failed to upload input thumbnail, continuing without it');
      }
    }

    // Step 9: Process with Replicate API (optional enhancement)
    console.log('🔄 Processing with Replicate API...');
    let processedUrl, inputProcessedUrl = null;
    try {
      processedUrl = await replicateImageUploader.processImage(originalUpload.url);
      console.log('✅ Replicate processing successful:', processedUrl);
    } catch (replicateError) {
      console.warn('⚠️ Replicate processing failed, using original S3 URL:', replicateError.message);
    }

    if (inputOriginalUpload && inputOriginalUpload.success) {
      try {
        inputProcessedUrl = await replicateImageUploader.processImage(inputOriginalUpload.url);
        console.log('✅ Replicate input processing successful:', inputProcessedUrl);
      } catch (replicateError) {
        console.warn('⚠️ Replicate input processing failed, using original S3 URL:', replicateError.message);
      }
    }

    // Step 10: Save to InputImage table
    console.log('💾 Saving to database...');
    const inputImage = await prisma.inputImage.create({
      data: {
        userId: user.id,
        originalUrl: inputOriginalUpload?.url || originalUpload.url, // ORIGINAL high-resolution image for canvas
        processedUrl: inputProcessedUrl || processedUrl || resizedInputUpload?.url || resizedUpload?.url, // Processed/resized fallback
        thumbnailUrl: inputThumbnailUpload?.success ? inputThumbnailUpload.url : thumbnailUpload.success ? thumbnailUpload.url : null,
        fileName: fileName,
        fileSize: inputImageBuffer?.length || imageBuffer.length, // Original file size
        dimensions: {
          width: originalInputMetadata?.width || originalMetadata.width, // Original dimensions
          height: originalInputMetadata?.height || originalMetadata.height,
          originalWidth: originalInputMetadata?.width || originalMetadata.width,
          originalHeight: originalInputMetadata?.height || originalMetadata.height,
          // Store resized dimensions as fallback
          resizedWidth: resizedInputImage?.width || resizedImage.width,
          resizedHeight: resizedInputImage?.height || resizedImage.height
        },
        uploadSource: 'CREATE_MODULE',
        maskStatus: 'processing'  // Set mask status to processing immediately for loading animation
      }
    });

    console.log('✅ Input image created from webhook:', inputImage.id);
    console.log('🎭 Mask status set to "processing" for immediate loading animation display');

    // Step 11: Generate OpenAI base prompt from materials
    let generatedPrompt = null;
    if (map && Array.isArray(map) && map.length > 0) {
      try {
        console.log('🤖 Generating AI prompt from materials...');
        
        // Extract material names from map array and format them
        const materialNames = map
          .map(item => item.MaterialName || item.material || '')
          .filter(material => material.trim() !== '')
          .join(', ');

        console.log('📝 Materials for prompt:', materialNames);

        if (materialNames) {
          // Generate prompt using OpenAI service with original materials first
          generatedPrompt = await openaiService.generatePrompt({
            userPrompt: 'CREATE AN ARCHITECTURAL VISUALIZATION',
            materialsText: materialNames,
            systemPromptName: 'architectural-visualization'
          });

          console.log('✅ AI prompt generated successfully');
          console.log('Generated prompt preview:', generatedPrompt.substring(0, 100) + '...');

          // Step 9a: Translate materials to English after prompt generation
          let translatedMaterialsLocal = materialNames;
          try {
            console.log('🌐 Translating materials to English...');
            translatedMaterialsLocal = await openaiService.translateText(materialNames);
            console.log('✅ Materials translated:', translatedMaterialsLocal);
            translatedMaterials = translatedMaterialsLocal; // Store for response
          } catch (translationError) {
            console.warn('⚠️ Translation failed, using original materials:', translationError.message);
            // Continue with original materials if translation fails
          }

          // Save the generated prompt to the database
          await prisma.inputImage.update({
            where: { id: inputImage.id },
            data: {
              generatedPrompt,
              updatedAt: new Date()
            }
          });

          console.log('💾 Generated prompt saved to database');

          // Step 9b: Generate Revit masks using external API
          if (map && map.length > 0) {
            try {
              console.log('🎭 Generating Revit masks...');
              
              // Extract RGB colors from map array
              const rgbColors = map
                .map(item => item.Color || '')
                .filter(color => color.trim() !== '')
                .join(',');

              // Use translated materials for textures, fallback to original if translation failed
              const textures = translatedMaterialsLocal || materialNames;

              await generateRevitMasks({
                inputImage: ImageData, // Original base64 image data
                rgbColors: rgbColors,
                callbackUrl: `${BASE_URL}/api/webhooks/revit-masks-callback`,
                revertExtra: `${inputImage.id}|hasInputImage=${!!InputImage}`,
                textures: textures,
                mode: 'yes'
              });

              console.log('✅ Revit mask generation initiated');
            } catch (revitMaskError) {
              console.warn('⚠️ Revit mask generation failed:', revitMaskError.message);
              // Don't fail the entire request, just log the error
            }
          }

        } else {
          console.log('⚠️ No valid materials found in map, using default prompt generation');
          generatedPrompt = await openaiService.generatePrompt({
            userPrompt: 'CREATE AN ARCHITECTURAL VISUALIZATION',
            systemPromptName: 'architectural-visualization'
          });

          // Save the default generated prompt to the database
          await prisma.inputImage.update({
            where: { id: inputImage.id },
            data: {
              generatedPrompt,
              updatedAt: new Date()
            }
          });

          console.log('💾 Default generated prompt saved to database');
        }

      } catch (openaiError) {
        console.warn('⚠️ OpenAI prompt generation failed:', openaiError.message);
        // Don't fail the entire request, just continue without the generated prompt
      }
    }

    // Step 10: Generate masks if map data is provided (commented out for now)
    // let maskRegions = [];
    // if (map && Array.isArray(map) && map.length > 0) {
    //   console.log('🎭 Processing mask regions from map data...');
    //   try {
    //     // Use the same mask generation flow as the existing system
    //     const callbackUrl = `${BASE_URL}/api/masks/callback`;
    //     const imageUrl = processedUrl || originalUpload.url;
        
    //     console.log('🎭 Generating color filter masks...');
    //     await maskService.generateColorFilter(resizedImage.buffer, inputImage.id, callbackUrl);
        
    //     console.log('✅ Mask generation initiated');
    //   } catch (maskError) {
    //     console.warn('⚠️ Mask generation failed:', maskError.message);
    //     // Don't fail the entire request, just log the error
    //   }
    // }

    // Step 11: Generate website URL for webview response
    const websiteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/create?imageId=${inputImage.id}&showMasks=true&source=webhook`;

    // Step 12: Return success response with website URL in C# format
    res.status(201).json({
      status: "success",
      response: {
        message: "Input image created successfully from webhook",
        messageText: `Image processed with ID: ${inputImage.id}. ${generatedPrompt ? 'AI prompt generated. ' : ''}${map && map.length > 0 ? 'Masks processing initiated.' : ''}`,
        link: websiteUrl
      }
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    
    // Provide specific error responses
    let statusCode = 500;
    let message = 'Internal server error';
    
    if (error.message.includes('base64')) {
      statusCode = 400;
      message = 'Invalid base64 image data';
    } else if (error.message.includes('Bubble')) {
      statusCode = 502;
      message = 'Failed to convert image via Bubble API';
    } else if (error.message.includes('download')) {
      statusCode = 502;
      message = 'Failed to download image from external source';
    } else if (error.message.includes('S3') || error.message.includes('upload')) {
      statusCode = 500;
      message = 'Failed to upload image to storage';
    } else if (error.message.includes('resize') || error.message.includes('sharp')) {
      statusCode = 500;
      message = 'Failed to process image';
    }
    
    res.status(statusCode).json({
      status: "error",
      response: {
        message: message,
        messageText: `Error: ${error.message}`,
        link: null
      }
    });
  }
};

/**
 * Handle Revit masks callback - receives the generated masks from external API
 */
const handleRevitMasksCallback = async (req, res) => {
  try {
    console.log('🎭 Revit masks callback received');
    console.log('Callback payload:', JSON.stringify(req.body, null, 2));

    const { revert_extra, uuids } = req.body;

    // Check if we have valid mask data - presence of uuids array indicates success
    if (!uuids || !Array.isArray(uuids) || uuids.length === 0) {
      console.error('❌ Revit mask generation failed - no valid uuids array:', req.body);
      return res.status(200).json({
        status: "error",
        response: {
          message: "No valid mask data received",
          messageText: "Error: Revit mask generation failed - no valid uuids array",
          link: null
        }
      });
    }

    if (!revert_extra) {
      console.error('❌ No revert_extra (inputImage ID) provided in callback');
      return res.status(400).json({
        status: "error",
        response: {
          message: "Missing revert_extra",
          messageText: "Error: No revert_extra (inputImage ID) provided in callback",
          link: null
        }
      });
    }

    // Parse revertExtra to get inputImageId and InputImage presence info
    const [inputImageIdStr, hasInputImageFlag] = revert_extra.split('|');
    const inputImageId = parseInt(inputImageIdStr);
    const hasInputImage = hasInputImageFlag === 'hasInputImage=true';
    
    console.log('🔍 Processing masks for InputImage ID:', inputImageId);
    console.log('🔍 Original request had InputImage:', hasInputImage);

    // Verify InputImage exists and get user information
    const inputImage = await prisma.inputImage.findUnique({
      where: { id: inputImageId },
      include: { user: true }
    });

    if (!inputImage) {
      console.error('❌ InputImage not found:', inputImageId);
      return res.status(404).json({
        status: "error",
        response: {
          message: "InputImage not found",
          messageText: `Error: InputImage with ID ${inputImageId} not found`,
          link: null
        }
      });
    }

    // Process and save mask data from the uuids array
    console.log(`💾 Saving ${uuids.length} mask regions...`);
    
    // Collect materials for AI prompt when InputImage is not present
    const aiMaterials = [];
    const savedMasks = []; // Collect saved masks for WebSocket notification
    
    for (const [index, maskContainer] of uuids.entries()) {
      try {
        // Extract the mask data from the nested object (mask1, mask2, etc.)
        const maskKey = Object.keys(maskContainer)[0]; // Gets 'mask1', 'mask2', etc.
        const mask = maskContainer[maskKey];
        
        console.log(`📝 Processing mask ${index + 1}:`, {
          maskKey,
          mask_url: mask.mask_url,
          color: mask.color,
          texture: mask.texture,
          hasInputImage
        });

        // Determine customText and visibility based on InputImage presence
        const customText = hasInputImage ? '' : (mask.texture || ''); // Empty if no InputImage
        const isVisible = !hasInputImage; // Show masks when no InputImage, hide when InputImage exists
        
        const savedMask = await prisma.maskRegion.create({
          data: {
            inputImageId: inputImageId,
            maskUrl: mask.mask_url || '',
            color: mask.color || '',
            customText: customText,
            isVisible: isVisible,
            orderIndex: index,
          }
        });

        // Add to saved masks collection for WebSocket notification
        savedMasks.push(savedMask);

        // Collect materials for AI prompt when InputImage is NOT present
        if (hasInputImage && mask.texture && mask.texture.trim() !== '') {
          aiMaterials.push(mask.texture.trim());
        }

        console.log(`✅ Mask ${index + 1} saved successfully with customText: "${customText}"`);
      } catch (maskError) {
        console.error(`❌ Failed to save mask ${index}:`, maskError);
      }
    }

    // Update InputImage mask status
    await prisma.inputImage.update({
      where: { id: inputImageId },
      data: {
        maskStatus: 'completed',
        updatedAt: new Date()
      }
    });

    // Create AI prompt materials when materials are collected
    if (aiMaterials.length > 0) {
      try {
        const materialType = hasInputImage ? 'mask textures (InputImage present)' : 'mask textures (no InputImage)';
        console.log(`💾 Saving plain text AI materials from ${materialType}...`);
        
        const materialPromises = aiMaterials.map(async (materialName, index) => {
          console.log(`📝 Saving AI material ${index + 1}: "${materialName}"`);
          
          return await prisma.aIPromptMaterial.create({
            data: {
              inputImageId: inputImageId,
              displayName: materialName,
              isCustomText: true,              // Mark as plain text
              // Leave database link fields as null for plain text
              materialOptionId: null,
              customizationOptionId: null,
              subCategoryId: null
            }
          });
        });

        const savedAIMaterials = await Promise.all(materialPromises);
        console.log(`✅ Successfully saved ${savedAIMaterials.length} AI materials from ${materialType}`);
        
      } catch (aiMaterialError) {
        console.warn('⚠️ Failed to save AI materials from mask textures:', aiMaterialError.message);
        // Don't fail the entire request
      }
    }

    console.log('✅ Revit masks processed and saved successfully');
    console.log(`📊 Total masks saved: ${uuids.length}`);
    console.log(`📊 Total AI materials created: ${aiMaterials.length}`);

    // 🚀 NOTIFY WEBSOCKET CLIENTS IMMEDIATELY (similar to regular mask callback)
    webSocketService.notifyUserMaskCompletion(inputImage.user.id, inputImageId, {
      maskCount: savedMasks.length,
      maskStatus: 'completed',
      masks: savedMasks
    });

    console.log(`📡 WebSocket notification sent to subscribed clients for Revit masks on image ${inputImageId}`);

    res.status(200).json({
      status: "success",
      response: {
        message: "Revit masks processed successfully",
        messageText: hasInputImage 
          ? `Successfully processed and saved ${uuids.length} mask regions with custom textures and ${aiMaterials.length} AI materials for InputImage ID ${inputImageId}`
          : `Successfully processed and saved ${uuids.length} mask regions (empty customText) and ${aiMaterials.length} AI materials for InputImage ID ${inputImageId}`,
        link: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/create?imageId=${inputImageId}&source=revit`
      }
    });

  } catch (error) {
    console.error('❌ Revit masks callback error:', error);
    
    // Parse revertExtra to get inputImageId for WebSocket notification
    const [inputImageIdStr] = (revert_extra || '').split('|');
    const inputImageIdForNotification = parseInt(inputImageIdStr);
    
    // 🚀 NOTIFY WEBSOCKET CLIENTS OF FAILURE
    if (!isNaN(inputImageIdForNotification)) {
      try {
        const failedInputImage = await prisma.inputImage.findUnique({
          where: { id: inputImageIdForNotification },
          include: { user: true }
        });

        if (failedInputImage) {
          webSocketService.notifyUserMaskFailure(failedInputImage.user.id, inputImageIdForNotification, error);
          console.log(`📡 WebSocket failure notification sent for Revit masks on image ${inputImageIdForNotification}`);
        }
      } catch (notificationError) {
        console.error('❌ Failed to send mask failure notification:', notificationError);
      }
    }
    
    res.status(500).json({
      status: "error",
      response: {
        message: "Revit masks processing failed",
        messageText: `Error: ${error.message}`,
        link: null
      }
    });
  }
};

/**
 * Convert base64 image data to Bubble image URL
 */
async function convertBase64ToBubbleUrl(base64Data) {
  try {
    // Validate that base64Data exists and is not empty
    if (!base64Data || typeof base64Data !== 'string') {
      throw new Error('Base64 data is required and must be a string');
    }

    // Clean the base64 data (remove data URL prefix if present and trim whitespace)
    let cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    // Remove any whitespace, newlines, or carriage returns
    cleanBase64 = cleanBase64.replace(/\s/g, '');
    
    // Validate that cleaned base64 is not empty
    if (!cleanBase64 || cleanBase64.length === 0) {
      throw new Error('Base64 data is empty after cleaning');
    }

    // Validate base64 format (basic check - should only contain base64 characters)
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (!base64Regex.test(cleanBase64)) {
      throw new Error('Invalid base64 format: contains invalid characters');
    }

    // Validate base64 length (should be reasonable - not too small)
    if (cleanBase64.length < 100) {
      throw new Error('Base64 data is too short to be a valid image');
    }
    
    const requestData = {
      contents: cleanBase64,
      name: "image.png"
    };

    console.log('🔗 Making request to Bubble API...');
    console.log('📊 Base64 data length:', cleanBase64.length);
    console.log('🔗 Bubble API endpoint:', BUBBLE_FILE_UPLOAD_URL);
    
    const response = await axios({
      method: 'post',
      url: BUBBLE_FILE_UPLOAD_URL,
      data: requestData,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000,
      maxBodyLength: Infinity
    });

    if (!response.data || typeof response.data !== 'string') {
      throw new Error(`Invalid response from Bubble API: ${JSON.stringify(response.data)}`);
    }

    // Add https protocol to the URL
    const imageUrl = `https:${response.data}`;
    return imageUrl;

  } catch (error) {
    console.error('❌ Bubble API error:', error);
    
    // If it's an axios error, include the response details
    if (error.response) {
      const statusCode = error.response.status;
      const responseData = error.response.data;
      console.error('❌ Bubble API response error:', {
        status: statusCode,
        data: responseData,
        headers: error.response.headers
      });
      throw new Error(`Failed to convert base64 to Bubble URL: Request failed with status code ${statusCode}. ${typeof responseData === 'object' ? JSON.stringify(responseData) : responseData}`);
    }
    
    throw new Error(`Failed to convert base64 to Bubble URL: ${error.message}`);
  }
}

/**
 * Download image from URL
 */
async function downloadImageFromUrl(imageUrl) {
  try {
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YanusWebhook/1.0)'
      }
    });
    
    return Buffer.from(response.data);
  } catch (error) {
    console.error('❌ Image download error:', error);
    throw new Error(`Failed to download image: ${error.message}`);
  }
}

/**
 * Resize image for upload (reusing existing function logic)
 */
async function resizeImageForUpload(imageBuffer, maxWidth = 800, maxHeight = 600) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    console.log('Original image metadata:', {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
    });

    // Calculate new dimensions while maintaining aspect ratio
    let newWidth = metadata.width;
    let newHeight = metadata.height;

    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      const widthRatio = maxWidth / metadata.width;
      const heightRatio = maxHeight / metadata.height;
      const ratio = Math.min(widthRatio, heightRatio);

      newWidth = Math.round(metadata.width * ratio);
      newHeight = Math.round(metadata.height * ratio);

      console.log('Resizing from', `${metadata.width}x${metadata.height}`, 'to', `${newWidth}x${newHeight}`);
    }

    const resizedBuffer = await sharp(imageBuffer)
      .resize(newWidth, newHeight, { 
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality: 90,
        progressive: true 
      })
      .toBuffer();

    return {
      buffer: resizedBuffer,
      width: newWidth,
      height: newHeight,
      originalWidth: metadata.width,
      originalHeight: metadata.height
    };
  } catch (error) {
    console.error('Error resizing image:', error);
    throw new Error('Failed to resize image: ' + error.message);
  }
}

/**
 * Generate Revit masks using external API
 */
async function generateRevitMasks({ inputImage, rgbColors, callbackUrl, revertExtra, textures, mode }) {
  try {
    console.log('🎭 Calling Revit mask generation API...');
    console.log('Parameters:', {
      rgbColors,
      callbackUrl,
      revertExtra,
      textures: textures.substring(0, 100) + '...',
      mode
    });

    // Create FormData for the API request
    const formData = new FormData();
    formData.append('input_image', inputImage);
    formData.append('rgb_colors', rgbColors);
    formData.append('callback_url', callbackUrl);
    formData.append('revert_extra', revertExtra);
    formData.append('textures', textures);
    formData.append('mode', mode);

    console.log('📤 Sending request to Revit mask generation service...', formData);

    const response = await axios({
      method: 'post',
      maxBodyLength: Infinity,
      url: 'http://34.45.42.199:8001/mask_generator',
      headers: {
        ...formData.getHeaders()
      },
      data: formData,
      timeout: 30000
    });



    console.log('✅ Revit mask generation response:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Revit mask generation error:', error);
    throw new Error(`Failed to generate Revit masks: ${error.message}`);
  }
}

/**
 * Handle image tagging webhook from Replicate API
 */
const handleImageTagsCallback = async (req, res) => {
  try {
    console.log('🏷️ Image tags webhook received');
    console.log('Webhook payload:', JSON.stringify(req.body, null, 2));

    const result = await imageTaggingService.processWebhookResponse(req.body);

    if (!result.success) {
      if (result.inProgress) {
        // Still processing, return success to avoid retries
        return res.status(200).json({
          status: "processing",
          message: "Image tagging still in progress",
          inputImageId: result.inputImageId
        });
      } else {
        // Failed processing
        console.error('❌ Image tagging webhook processing failed:', result.error);
        return res.status(500).json({
          status: "error",
          message: "Failed to process image tagging webhook",
          error: result.error
        });
      }
    }

    const { inputImageId, tags, predictionId } = result;

    // Verify InputImage exists
    const inputImage = await prisma.inputImage.findUnique({
      where: { id: inputImageId }
    });

    if (!inputImage) {
      console.error('❌ InputImage not found:', inputImageId);
      return res.status(404).json({
        status: "error",
        message: "InputImage not found",
        inputImageId
      });
    }

    // Update InputImage with tags and mark tagging as completed
    console.log(`💾 Saving ${tags.length} tags to InputImage ${inputImageId}...`);

    await prisma.inputImage.update({
      where: { id: inputImageId },
      data: {
        tags: tags, // Save as JSON array
        taggingStatus: 'completed',
        updatedAt: new Date()
      }
    });

    console.log('✅ Image tags saved successfully:', {
      inputImageId,
      tagCount: tags.length,
      predictionId
    });

    // Send WebSocket notification if needed
    webSocketService.sendToUser(inputImage.userId, {
      type: 'image_tags_completed',
      data: {
        inputImageId,
        tagCount: tags.length,
        tags: tags.slice(0, 10) // Send first 10 tags in notification
      }
    });

    console.log('📡 WebSocket notification sent for image tags completion:', {
      userId: inputImage.userId,
      inputImageId,
      tagCount: tags.length
    });

    res.status(200).json({
      status: "success",
      message: "Image tags processed successfully",
      inputImageId,
      tagCount: tags.length,
      predictionId
    });

  } catch (error) {
    console.error('❌ Image tags webhook error:', error);

    res.status(500).json({
      status: "error",
      message: "Image tags webhook processing failed",
      error: error.message
    });
  }
};

module.exports = {
  createInputImageFromWebhook,
  handleRevitMasksCallback,
  handleImageTagsCallback
};