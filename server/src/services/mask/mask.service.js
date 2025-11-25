const axios = require('axios');
const http = require('http');
const https = require('https');
const FormData = require('form-data');
const { FAST_API_URL } = require("../../config/constants");

class MaskService {
  constructor() {
    this.fastApiUrl = FAST_API_URL || 'http://34.45.42.199:8001';
  }

  async testConnection() {
    try {
      console.log('🔍 [MASK] Testing FastAPI connection...', { url: this.fastApiUrl });
      const startedAt = Date.now();
      const response = await axios({
        method: 'GET',
        url: `${this.fastApiUrl}/`,
        timeout: 10000
      });
      console.log('✅ [MASK] FastAPI is accessible:', {
        data: response.data,
        elapsedMs: Date.now() - startedAt
      });
      return true;
    } catch (error) {
      console.error('❌ [MASK] FastAPI connection test failed:', error.message);
      return false;
    }
  }

  async downloadImage(imageUrl) {
    try {
      const startedAt = Date.now();
      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ImageDownloader/1.0)'
        }
      });
      const buffer = Buffer.from(response.data);
      console.log('📥 [MASK] Image downloaded for color filter:', {
        url: imageUrl,
        size: buffer.length,
        elapsedMs: Date.now() - startedAt
      });
      return buffer;
    } catch (error) {
      console.error('❌ [MASK] Failed to download image:', { url: imageUrl, error: error.message });
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

      console.log('🚀 [MASK] Making request to FastAPI color filter...');
      console.log('📊 [MASK] Request details:', {
        url: `${this.fastApiUrl}/color_filter`,
        imageSize: imageBuffer.length,
        callbackUrl: callbackUrl,
        revertExtra: imageId.toString()
      });
      
      // Keep-alive agents to reduce socket hang ups
      const isHttps = this.fastApiUrl.startsWith('https');
      const agent = isHttps
        ? new https.Agent({ keepAlive: true, maxSockets: 50 })
        : new http.Agent({ keepAlive: true, maxSockets: 50 });

      const doRequest = async () => axios({
        method: 'POST',
        url: `${this.fastApiUrl}/color_filter`,
        data: form,
        headers: {
          ...form.getHeaders(),
          'Accept': 'application/json'
        },
        timeout: 120000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        httpAgent: agent,
        httpsAgent: agent
      });

      // Simple retry once on ECONNRESET / socket hang up
      let response;
      try {
        const startedAt = Date.now();
        response = await doRequest();
        console.log('✅ [MASK] FastAPI color_filter responded:', {
          status: response.status,
          elapsedMs: Date.now() - startedAt
        });
      } catch (err) {
        if (err?.code === 'ECONNRESET' || (err?.message || '').toLowerCase().includes('socket hang up')) {
          console.warn('⚠️ [MASK] Color filter request failed with ECONNRESET; retrying once...', {
            code: err?.code,
            message: err?.message
          });
          const retryStarted = Date.now();
          response = await doRequest();
          console.log('✅ [MASK] Retry succeeded:', { elapsedMs: Date.now() - retryStarted });
        } else {
          console.error('❌ [MASK] FastAPI color_filter error:', { code: err?.code, message: err?.message });
          throw err;
        }
      }

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