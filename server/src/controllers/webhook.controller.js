const { prisma } = require('../services/prisma.service');
const s3Service = require('../services/image/s3.service');
const maskService = require('../services/mask/mask.service');
const maskRegionService = require('../services/mask/maskRegion.service');
const replicateImageUploader = require('../services/image/replicateImageUploader.service');
const openaiService = require('../services/openai.service');
const sharp = require('sharp');
const axios = require('axios');
const { BASE_URL } = require('../config/constants');

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
        success: false,
        message: 'ImageData is required'
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false, 
        message: 'Authentication token is required'
      });
    }

    // Get user from token (same as auth middleware)
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    console.log('🔐 Authenticated user for webhook:', user.id);

    // Step 1: Convert base64 ImageData to image URL using Bubble API
    console.log('📤 Converting base64 to Bubble URL...');
    const bubbleImageUrl = await convertBase64ToBubbleUrl(ImageData);
    console.log('✅ Bubble image URL created:', bubbleImageUrl);

    let bubbleInputImageUrl, inputImageBuffer, resizedInputImage, inputUpload, inputThumbnailUpload, inputThumbnailBuffer = null;

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

    // Step 3: Resize image for our platform (max 800x600)
    console.log('🖼️ Resizing image...');
    const resizedImage = await resizeImageForUpload(imageBuffer, 800, 600);

    if (inputImageBuffer) {
      console.log('🖼️ Resizing image...');
      resizedInputImage = await resizeImageForUpload(inputImageBuffer, 800, 600);
    }

    // Step 4: Create thumbnail
    console.log('🖼️ Creating thumbnail...');
    const thumbnailBuffer = await sharp(resizedImage.buffer)
      .resize(300, 300, { 
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    if (resizedInputImage) {
      console.log('🖼️ Creating thumbnail...');
      inputThumbnailBuffer = await sharp(resizedInputImage.buffer)
        .resize(300, 300, { 
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    // Step 5: Upload resized image to S3
    console.log('☁️ Uploading resized image to S3...');
    const fileName = `webhook-${Date.now()}-${user.id}.jpg`;
    const originalUpload = await s3Service.uploadInputImage(
      resizedImage.buffer,
      fileName,
      'image/jpeg'
    );

    if (!originalUpload.success) {
      throw new Error('Failed to upload resized image: ' + originalUpload.error);
    }

    if (resizedInputImage) {
      console.log('☁️ Uploading input image to S3...');
      const inputFileName = `input-${Date.now()}-${user.id}.jpg`;
      inputUpload = await s3Service.uploadInputImage(
        resizedInputImage.buffer,
        inputFileName,
        'image/jpeg'
      );

      if (!inputUpload.success) {
        throw new Error('Failed to upload input image: ' + inputUpload.error);
      }
    }

    // Step 6: Upload thumbnail to S3
    console.log('☁️ Uploading thumbnail to S3...');
    const thumbnailUpload = await s3Service.uploadThumbnail(
      thumbnailBuffer,
      `thumbnail-${fileName}`,
      'image/jpeg'
    );

    if (!thumbnailUpload.success) {
      console.warn('Failed to upload thumbnail, continuing without it');
    }

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

    // Step 7: Process with Replicate API (optional enhancement)
    console.log('🔄 Processing with Replicate API...');
    let processedUrl, inputProcessedUrl = null;
    try {
      processedUrl = await replicateImageUploader.processImage(originalUpload.url);
      console.log('✅ Replicate processing successful:', processedUrl);
    } catch (replicateError) {
      console.warn('⚠️ Replicate processing failed, using S3 URL:', replicateError.message);
    }

    if (inputUpload && inputUpload.success) {
      try {
        inputProcessedUrl = await replicateImageUploader.processImage(inputUpload.url);
        console.log('✅ Replicate processing successful:', inputProcessedUrl);
      } catch (replicateError) {
        console.warn('⚠️ Replicate processing failed, using S3 URL:', replicateError.message);
      }
    }

    // Step 8: Save to InputImage table
    console.log('💾 Saving to database...');
    const inputImage = await prisma.inputImage.create({
      data: {
        userId: user.id,
        originalUrl: inputUpload?.url || originalUpload.url,
        processedUrl: inputProcessedUrl || processedUrl,
        thumbnailUrl: inputThumbnailUpload?.success ? inputThumbnailUpload.url : thumbnailUpload.success ? thumbnailUpload.url : null,
        fileName: fileName,
        fileSize: resizedInputImage?.buffer.length || resizedImage.buffer.length,
        dimensions: {
          width: resizedInputImage?.width || resizedImage.width,
          height: resizedInputImage?.height || resizedImage.height,
          originalWidth: resizedInputImage?.originalWidth || resizedImage.originalWidth,
          originalHeight: resizedInputImage?.originalHeight || resizedImage.originalHeight
        },
        uploadSource: 'CREATE_MODULE'
      }
    });

    console.log('✅ Input image created from webhook:', inputImage.id);

    // Step 9: Generate OpenAI base prompt from materials
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
          // Generate prompt using OpenAI service
          generatedPrompt = await openaiService.generatePrompt({
            userPrompt: 'CREATE AN ARCHITECTURAL VISUALIZATION',
            materialsText: materialNames,
            systemPromptName: 'architectural-visualization'
          });

          console.log('✅ AI prompt generated successfully');
          console.log('Generated prompt preview:', generatedPrompt.substring(0, 100) + '...');

          // Save the generated prompt to the database
          await prisma.inputImage.update({
            where: { id: inputImage.id },
            data: {
              generatedPrompt,
              updatedAt: new Date()
            }
          });

          console.log('💾 Generated prompt saved to database');

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
    const websiteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/create?imageId=${inputImage.id}`;

    // Step 12: Return success response with website URL
    res.status(201).json({
      success: true,
      message: 'Input image created successfully from webhook',
      data: {
        inputImageId: inputImage.id,
        imageUrl: processedUrl || originalUpload.url,
        thumbnailUrl: inputThumbnailUpload?.success ? inputThumbnailUpload.url : thumbnailUpload.success ? thumbnailUpload.url : null,
        websiteUrl: websiteUrl,
        generatedPrompt: generatedPrompt,
        dimensions: {
          width: resizedInputImage?.width || resizedImage.width,
          height: resizedInputImage?.height || resizedImage.height
        },
        maskStatus: map && map.length > 0 ? 'processing' : 'none',
        createdAt: inputImage.createdAt
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
      success: false,
      message: message,
      error: error.message
    });
  }
};

/**
 * Convert base64 image data to Bubble image URL
 */
async function convertBase64ToBubbleUrl(base64Data) {
  try {
    // Clean the base64 data (remove data URL prefix if present)
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    
    const requestData = {
      contents: cleanBase64,
      name: "image.png"
    };

    console.log('🔗 Making request to Bubble API...');
    const response = await axios({
      method: 'post',
      url: 'https://vistack4.bubbleapps.io/fileupload',
      data: requestData,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000,
      maxBodyLength: Infinity
    });

    if (!response.data || typeof response.data !== 'string') {
      throw new Error('Invalid response from Bubble API');
    }

    // Add https protocol to the URL
    const imageUrl = `https:${response.data}`;
    return imageUrl;

  } catch (error) {
    console.error('❌ Bubble API error:', error);
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

module.exports = {
  createInputImageFromWebhook
};
