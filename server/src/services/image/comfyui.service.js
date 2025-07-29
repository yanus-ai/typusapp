// server/src/services/comfyui.service.js
const axios = require('axios');

// Base URL for ComfyUI API
const COMFYUI_BASE_URL = process.env.COMFYUI_URL || 'http://localhost:8188/api';

// Generate an image based on a prompt
const generateImage = async (prompt, negativePrompt, width, height, steps, cfgScale) => {
  try {
    // This is a placeholder - replace with actual ComfyUI API structure
    const response = await axios.post(`${COMFYUI_BASE_URL}/generate`, {
      prompt,
      negative_prompt: negativePrompt,
      width: width || 512,
      height: height || 512,
      steps: steps || 20,
      cfg_scale: cfgScale || 7
    });
    
    return response.data;
  } catch (error) {
    console.error('ComfyUI generation error:', error);
    throw new Error('Failed to generate image with ComfyUI');
  }
};

// Check the status of a generation job
const checkGenerationStatus = async (jobId) => {
  try {
    const response = await axios.get(`${COMFYUI_BASE_URL}/status/${jobId}`);
    return response.data;
  } catch (error) {
    console.error('ComfyUI status check error:', error);
    throw new Error('Failed to check generation status with ComfyUI');
  }
};

// Generate outpaint for tweak module
const generateTweakOutpaint = async ({ inputImageUrl, newBounds, originalBounds, batchId, imageId }) => {
  try {
    // This is a placeholder - replace with actual ComfyUI outpaint workflow
    const response = await axios.post(`${COMFYUI_BASE_URL}/outpaint`, {
      input_image: inputImageUrl,
      new_bounds: newBounds,
      original_bounds: originalBounds,
      batch_id: batchId,
      image_id: imageId
    });
    
    return response.data;
  } catch (error) {
    console.error('ComfyUI tweak outpaint error:', error);
    throw new Error('Failed to generate outpaint with ComfyUI');
  }
};

// Generate inpaint for tweak module
const generateTweakInpaint = async ({ inputImageUrl, regions, prompt, batchId, imageId }) => {
  try {
    // This is a placeholder - replace with actual ComfyUI inpaint workflow
    const response = await axios.post(`${COMFYUI_BASE_URL}/inpaint`, {
      input_image: inputImageUrl,
      mask_regions: regions,
      prompt: prompt,
      batch_id: batchId,
      image_id: imageId
    });
    
    return response.data;
  } catch (error) {
    console.error('ComfyUI tweak inpaint error:', error);
    throw new Error('Failed to generate inpaint with ComfyUI');
  }
};

module.exports = {
  generateImage,
  checkGenerationStatus,
  generateTweakOutpaint,
  generateTweakInpaint
};