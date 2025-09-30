const axios = require('axios');
const FormData = require('form-data');
const { FAST_API_URL } = require("../../config/constants");

class MaskService {
  constructor() {
    this.fastApiUrl = FAST_API_URL || 'http://34.45.42.199:8001';
  }

  async testConnection() {
    try {
      console.log('🔍 Testing FastAPI connection...');
      const response = await axios({
        method: 'GET',
        url: `${this.fastApiUrl}/`,
        timeout: 10000
      });
      console.log('✅ FastAPI is accessible:', response.data);
      return true;
    } catch (error) {
      console.error('❌ FastAPI connection test failed:', error.message);
      return false;
    }
  }

  async downloadImage(imageUrl) {
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
  }

  async generateColorFilter(imageBuffer, imageId, callbackUrl) {
    try {
      const form = new FormData();
      
      form.append('input_image', imageBuffer, {
        filename: `input_${imageId}.png`,
        contentType: 'image/png'
      });
      
      form.append('callback_url', callbackUrl);
      form.append('revert_extra', imageId.toString());

      console.log('🚀 Making request to FastAPI color filter...');
      console.log('📊 Request details:', {
        url: `${this.fastApiUrl}/color_filter`,
        imageSize: imageBuffer.length,
        callbackUrl: callbackUrl,
        revertExtra: imageId.toString()
      });
      
      const response = await axios({
        method: 'POST',
        url: `${this.fastApiUrl}/color_filter`,
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
      
    } catch (error) {
      console.error('❌ Color filter API call failed:', error);
      throw error;
    }
  }
}

module.exports = new MaskService();