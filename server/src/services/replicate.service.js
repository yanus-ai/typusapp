const axios = require('axios');

class ReplicateService {
  constructor() {
    this.apiUrl = 'https://api.replicate.com/v1/predictions';
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Token ${process.env.REPLICATE_IMAGE_TAGGING_TOKEN}`
    };
  }

  /**
   * Generate upscale using Replicate API
   */
  async generateUpscale(params) {
    try {
      const {
        webhook,
        image,
        prompt,
        requestGroupID,
        seed = 1309,
        dynamic = 2,
        sd_model = "juggernaut_reborn.safetensors [338b85bc4f]",
        scheduler = "DPM++ 3M SDE Karras",
        creativity = 0.5,
        lora_links = "https://civitai.com/api/download/models/78018",
        downscaling = false,
        resemblance = 0.6,
        scale_factor = 2,
        tiling_width = 112,
        tiling_height = 112,
        negative_prompt = "(worst quality, low quality:2) face, person, woman, multiple heads multiple eyes",
        num_inference_steps = 18,
        downscaling_resolution = 768,
        uuid,
        session_uuid,
        addStyle = "yes",
        GeneratedStatus = "COMPLETED"
      } = params;

      const requestData = {
        version: "dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e",
        input: {
          requestGroupID,
          seed,
          image,
          prompt,
          dynamic,
          sd_model,
          scheduler,
          creativity,
          lora_links,
          downscaling,
          resemblance,
          scale_factor,
          tiling_width,
          tiling_height,
          negative_prompt,
          num_inference_steps,
          downscaling_resolution,
          uuid,
          session_uuid,
          "addStyle?": addStyle,
          GeneratedStatus
        },
        webhook
      };

      // Debug logs for troubleshooting
      console.log('🔍 Debug: Replicate API Token:', process.env.REPLICATE_IMAGE_TAGGING_TOKEN ? 'Token found' : 'Token missing');
      console.log('🔍 Debug: Request headers:', this.headers);
      console.log('🔍 Debug: Request params received:', params);
      console.log('🔍 Debug: Request body to send:', JSON.stringify(requestData, null, 2));

      console.log('🚀 Sending Upscale request to Replicate:', {
        url: this.apiUrl,
        uuid,
        session_uuid,
        requestGroupID
      });

      const response = await axios.post(this.apiUrl, requestData, {
        headers: this.headers,
        timeout: 30000
      });

      if (response.data && response.data.id) {
        console.log('✅ Replicate upscale request successful:', {
          replicateId: response.data.id,
          status: response.data.status,
          uuid
        });

        return {
          success: true,
          replicateId: response.data.id,
          status: response.data.status,
          uuid
        };
      } else {
        throw new Error('Invalid response from Replicate API');
      }

    } catch (error) {
      console.error('❌ Replicate upscale error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        uuid: params.uuid
      });

      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        uuid: params.uuid
      };
    }
  }

  /**
   * Get upscale job status from Replicate
   */
  async getJobStatus(replicateId) {
    try {
      const statusUrl = `https://api.replicate.com/v1/predictions/${replicateId}`;

      console.log('🔍 Checking Replicate job status:', {
        replicateId,
        statusUrl
      });

      const response = await axios.get(statusUrl, {
        headers: this.headers,
        timeout: 10000
      });

      console.log('✅ Replicate status response:', {
        replicateId,
        status: response.data.status,
        progress: response.data.progress
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Replicate status check error:', {
        replicateId,
        message: error.message,
        status: error.response?.status
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    // Replicate API doesn't require API key for public models
    // but we can add validation if needed
    return true;
  }
}

module.exports = new ReplicateService();