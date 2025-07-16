// server/src/controllers/mask.controller.js
const { prisma } = require('../services/prisma.service');
const axios = require('axios');
const FormData = require('form-data');

const generateImageMasks = async (req, res) => {
  try {
    const { imageUrl, inputImageId, callbackUrl } = req.body;
    
    console.log('🎭 Generating mask images for:', { imageUrl, inputImageId, callbackUrl });

    // Validate required fields
    if (!imageUrl || !inputImageId) {
      return res.status(400).json({ 
        error: 'Missing required fields: imageUrl and inputImageId are required' 
      });
    }

    // Convert inputImageId to number
    const imageId = parseInt(inputImageId, 10);
    
    if (isNaN(imageId)) {
      return res.status(400).json({ 
        error: 'Invalid inputImageId: must be a valid number' 
      });
    }

    // Step 1: Test FastAPI connectivity
    const isConnected = await testFastAPIConnection();
    if (!isConnected) {
      return res.status(503).json({
        error: 'FastAPI service is not accessible',
        message: 'External service is down or unreachable'
      });
    }

    // Get the input image from database
    const inputImage = await prisma.inputImage.findUnique({
      where: { id: imageId }
    });

    if (!inputImage) {
      return res.status(404).json({ error: 'Input image not found' });
    }

    console.log('📷 Found input image:', {
      id: inputImage.id,
      originalUrl: inputImage.originalUrl,
      fileName: inputImage.fileName
    });

    // Download the image
    console.log('⬇️ Downloading image from:', inputImage.originalUrl);
    const imageBuffer = await downloadImageWithAxios(inputImage.originalUrl);
    console.log('✅ Image downloaded, size:', imageBuffer.length, 'bytes');

    // Check if image is too large
    if (imageBuffer.length > 10 * 1024 * 1024) { // 10MB
      return res.status(413).json({
        error: 'Image too large',
        message: 'Image size exceeds 10MB limit'
      });
    }

    // Prepare callback URL
    const defaultCallbackUrl = callbackUrl || `${process.env.BACKEND_URL}/api/masks/callback`;
    console.log('📝 Using callback URL:', defaultCallbackUrl);

    // Make the API call to your Python FastAPI
    const apiResponse = await callColorFilterAPI(imageBuffer, imageId, defaultCallbackUrl);
    
    console.log('✅ Mask generation initiated successfully');
    
    res.status(200).json({
      success: true,
      message: 'Mask generation initiated',
      data: {
        inputImageId: imageId,
        requestId: apiResponse.revert_extra || 'pending',
        callbackUrl: defaultCallbackUrl,
        status: 'processing',
        colorMapping: apiResponse.image_uuid_mapping || {}
      }
    });

  } catch (error) {
    console.error('❌ Generate mask images error:', error);
    
    let errorMessage = 'Server error during mask image generation';
    let statusCode = 500;
    
    if (error.code === 'ECONNRESET' || error.message.includes('socket hang up')) {
      errorMessage = 'Connection lost to external service';
      statusCode = 502;
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to external service';
      statusCode = 503;
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Request timeout';
      statusCode = 504;
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: error.message,
      code: error.code
    });
  }
};

// Download image using axios
const downloadImageWithAxios = async (imageUrl) => {
  try {
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageDownloader/1.0)'
      }
    });
    
    return Buffer.from(response.data);
  } catch (error) {
    throw new Error(`Failed to download image: ${error.message}`);
  }
};

// Corrected API call function that matches your FastAPI expectations
const callColorFilterAPI = async (imageBuffer, imageId, callbackUrl) => {
  try {
    // Create form data with the exact field names your FastAPI expects
    const form = new FormData();
    
    // Add the image file - FastAPI expects 'input_image'
    form.append('input_image', imageBuffer, {
      filename: `input_${imageId}.png`,
      contentType: 'image/png'
    });
    
    // Add form fields exactly as FastAPI expects them
    form.append('callback_url', callbackUrl);
    form.append('revert_extra', imageId.toString());

    console.log('🚀 Making request to FastAPI color filter...');
    console.log('📊 Request details:', {
      url: 'http://34.45.42.199:8001/color_filter',
      imageSize: imageBuffer.length,
      callbackUrl: callbackUrl,
      revertExtra: imageId.toString()
    });
    
    // Try axios first
    try {
      const response = await axios({
        method: 'POST',
        url: 'http://34.45.42.199:8001/color_filter',
        data: form,
        headers: {
          ...form.getHeaders(),
          'Accept': 'application/json'
        },
        timeout: 120000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      console.log('✅ FastAPI Response:', {
        status: response.status,
        data: response.data
      });
      
      return response.data;
      
    } catch (axiosError) {
      console.log('❌ Axios failed, trying curl fallback...');
      return await callColorFilterAPIWithCurl(imageBuffer, imageId, callbackUrl);
    }
    
  } catch (error) {
    console.error('❌ All methods failed:', error);
    throw error;
  }
};

// Callback handler - Updated to match your Python response format
const handleMaskCallback = async (req, res) => {
  try {

    console.log('📥 Complete callback request body:', JSON.stringify(req.body, null, 2));

    // const { revert_extra, uuids, ...maskData } = req.body;
    
    // const inputImageId = parseInt(revert_extra, 10);
    
    // if (isNaN(inputImageId)) {
    //   return res.status(400).json({ 
    //     error: 'Invalid revert_extra: must be a valid number' 
    //   });
    // }
    
    // console.log('🎭 Received mask callback for image:', inputImageId);
    // console.log('📄 Mask data:', { uuids, ...maskData });
    
    // // Update the input image record with mask data
    // await prisma.inputImage.update({
    //   where: { id: inputImageId },
    //   data: {
    //     maskData: JSON.stringify({ uuids, ...maskData }),
    //     maskStatus: 'completed',
    //     updatedAt: new Date()
    //   }
    // });
    
    // console.log('✅ Mask data saved successfully');
    
    // res.status(200).json({ 
    //   success: true,
    //   message: 'Mask data received and processed'
    // });
    
  } catch (error) {
    // console.error('❌ Mask callback error:', error);
    // res.status(500).json({ 
    //   error: 'Failed to process mask callback',
    //   message: error.message 
    // });
  }
};

const generatededMasks = async (req, res) => {
  try {
    const data = req.body;
    console.log('Generating mask images for:', data);
    res.status(201).json(data);
  } catch (error) {
    console.error('Generate mask images error:', error);
    res.status(500).json({ message: 'Server error during mask image generation' });
  }
};

// Test with minimal data
const testColorFilterAPI = async () => {
  try {
    const form = new FormData();
    
    // Create a tiny test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
      0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x02, 0x9a, 0x1c, 0x7a, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
    ]);
    
    form.append('input_image', testImageBuffer, {
      filename: 'test.png',
      contentType: 'image/png'
    });
    form.append('callback_url', 'https://httpbin.org/post');
    form.append('revert_extra', 'test123');

    console.log('🧪 Testing with minimal request...');
    
    const response = await axios({
      method: 'POST',
      url: 'http://34.45.42.199:8001/color_filter',
      data: form,
      headers: {
        ...form.getHeaders()
      },
      timeout: 30000
    });

    console.log('✅ Test request successful:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('❌ Test request failed:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
};

// Add this test function to debug connectivity
const testFastAPIConnection = async () => {
  try {
    console.log('🔍 Testing FastAPI connection...');
    const response = await axios({
      method: 'GET',
      url: 'http://34.45.42.199:8001/',
      timeout: 10000
    });
    console.log('✅ FastAPI is accessible:', response.data);
    return true;
  } catch (error) {
    console.error('❌ FastAPI connection test failed:', error.message);
    return false;
  }
};

module.exports = {
  generatededMasks,
  generateImageMasks,
  handleMaskCallback,
  testColorFilterAPI
};