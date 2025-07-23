const axios = require('axios');
const { RUNPOD_API_URL, RUNPOD_API_KEY } = require('../config/constants');

class RunPodService {
  constructor() {
    this.apiUrl = RUNPOD_API_URL;
    this.apiKey = RUNPOD_API_KEY;
    this.axiosConfig = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      timeout: 30000
    };
  }

  async generateImage(params) {
    try {
      const {
        webhook,
        prompt,
        negativePrompt,
        rawImage,
        yellowMask,
        yellowPrompt = '',
        jobId,
        uuid,
        requestGroup,
        seed = '1337',
        upscale = 'Yes',
        style = 'No',
        model = 'realvisxlLightning.safetensors',
        task = 'regional_prompt',
        // K-Sampler settings
        stepsKsampler1 = 6,
        cfgKsampler1 = 3,
        denoiseKsampler1 = 1,
        stepsKsampler2 = 4,
        cfgKsampler2 = 2,
        denoiseKsampler2 = 0.3,
        // Canny settings
        cannyStrength = 1,
        cannyStart = 0,
        cannyEnd = 1,
        // Depth settings
        depthStrength = 0.4,
        depthStart = 0,
        depthEnd = 0.5,
        // LoRA settings
        loraNames = ['add-detail.safetensors', 'nunu-XL.safetensors'],
        loraStrength = [1, 0.5],
        loraClip = [1, 0.6]
      } = params;

      const requestData = {
        webhook,
        input: {
          prompt,
          negative_prompt: negativePrompt,
          steps_ksampler1: stepsKsampler1,
          cfg_ksampler1: cfgKsampler1,
          denoise_ksampler1: denoiseKsampler1,
          steps_ksampler2: stepsKsampler2,
          cfg_ksampler2: cfgKsampler2,
          denoise_ksampler2: denoiseKsampler2,
          canny_strength: cannyStrength,
          depth_strength: depthStrength,
          canny_start: cannyStart,
          canny_end: cannyEnd,
          depth_start: depthStart,
          depth_end: depthEnd,
          lora_names: loraNames,
          lora_strength: loraStrength,
          lora_clip: loraClip,
          raw_image: rawImage,
          yellow_mask: yellowMask,
          yellow_prompt: yellowPrompt,
          model,
          job_id: jobId,
          seed,
          uuid,
          requestGroup,
          upscale,
          style,
          task
        }
      };

      console.log('Sending RunPod generation request:', {
        url: this.apiUrl,
        jobId,
        uuid,
        prompt: prompt.substring(0, 100) + '...'
      });

      const response = await axios.post(this.apiUrl, requestData, this.axiosConfig);

      if (response.data && response.data.id) {
        console.log('RunPod generation request successful:', {
          runpodId: response.data.id,
          status: response.data.status,
          jobId
        });

        return {
          success: true,
          runpodId: response.data.id,
          status: response.data.status,
          jobId
        };
      } else {
        throw new Error('Invalid response from RunPod API');
      }

    } catch (error) {
      console.error('RunPod generation error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        jobId: params.jobId
      });

      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        jobId: params.jobId
      };
    }
  }

  async getJobStatus(runpodId) {
    try {
      const response = await axios.get(`${this.apiUrl}/${runpodId}`, this.axiosConfig);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('RunPod status check error:', {
        runpodId,
        message: error.message,
        status: error.response?.status
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  validateConfig() {
    const errors = [];
    
    if (!this.apiUrl) {
      errors.push('RUNPOD_API_URL environment variable is required');
    }
    
    if (!this.apiKey) {
      errors.push('RUNPOD_API_KEY environment variable is required');
    }

    if (errors.length > 0) {
      throw new Error(`RunPod configuration errors: ${errors.join(', ')}`);
    }

    return true;
  }
}

module.exports = new RunPodService();