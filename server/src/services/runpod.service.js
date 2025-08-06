const axios = require('axios');
const { 
  RUNPOD_API_URL, 
  RUNPOD_API_KEY,
  RUNPOD_CREATE_API_URL,
  RUNPOD_OUTPAINT_API_URL,
  RUNPOD_INPAINT_API_URL
} = require('../config/constants');

class RunPodService {
  constructor() {
    this.apiUrl = RUNPOD_API_URL;
    this.apiKey = RUNPOD_API_KEY;
    this.createApiUrl = RUNPOD_CREATE_API_URL;
    this.outpaintApiUrl = RUNPOD_OUTPAINT_API_URL;
    this.inpaintApiUrl = RUNPOD_INPAINT_API_URL;
    this.axiosConfig = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      timeout: 30000
    };
  }

  /**
   * Get the appropriate API URL based on operation type
   */
  getApiUrl(operationType = 'create') {
    switch (operationType.toLowerCase()) {
      case 'create':
      case 'regional_prompt':
        return this.createApiUrl || this.apiUrl;
      case 'outpaint':
        return this.outpaintApiUrl || this.apiUrl;
      case 'inpaint':
        return this.inpaintApiUrl || this.apiUrl;
      default:
        return this.apiUrl;
    }
  }

  async generateImage(params) {
    try {
      const {
        webhook,
        prompt: basePrompt,
        negativePrompt,
        rawImage,
        yellow_mask = '',
        yellow_prompt = '',
        red_mask = '',
        red_prompt = '',
        green_mask = '',
        green_prompt = '',
        blue_mask = '',
        blue_prompt = '',
        cyan_mask = '',
        cyan_prompt = '',
        magenta_mask = '',
        magenta_prompt = '',
        orange_mask = '',
        orange_prompt = '',
        purple_mask = '',
        purple_prompt = '',
        pink_mask = '',
        pink_prompt = '',
        lightblue_mask = '',
        lightblue_prompt = '',
        marron_mask = '',
        marron_prompt = '',
        olive_mask = '',
        olive_prompt = '',
        teal_mask = '',
        teal_prompt = '',
        navy_mask = '',
        navy_prompt = '',
        gold_mask = '',
        gold_prompt = '',
        jobId = 123455,
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

      let prompt = basePrompt;

      console.log('loraStrength, loraNames, loraClip', loraStrength, loraNames, loraClip);

      if (!prompt) {
        const startPrompt = "Pen and ink, illustrated by hergé, studio ghibli, stunning color scheme, masterpiece";
        const endPrompt = "saturated full colors, neon lights, blurry jagged edges, noise, and pixelation, oversaturated, unnatural colors or gradients overly smooth or plastic-like surfaces, imperfections. deformed, watermark, (face asymmetry, eyes asymmetry, deformed eyes, open mouth), low quality, worst quality, blurry, soft, noisy extra digits, fewer digits, and bad anatomy. Poor Texture Quality: Avoid repeating patterns that are noticeable and break the illusion of realism. ,sketch, graphite, illustration, Unrealistic Proportions and Scale: incorrect proportions. Out of scale";

        prompt = `${startPrompt}${basePrompt}${endPrompt}`;
      }

      let input = {
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
        model,
        job_id: jobId,
        seed,
        uuid: `${uuid}`,
        requestGroup,
        upscale,
        style,
        task
      };

      this.addPromptIfExists(input, yellow_mask, yellow_prompt, 'yellow_mask', 'yellow_prompt');
      this.addPromptIfExists(input, red_mask, red_prompt, 'red_mask', 'red_prompt');
      this.addPromptIfExists(input, green_mask, green_prompt, 'green_mask', 'green_prompt');
      this.addPromptIfExists(input, blue_mask, blue_prompt, 'blue_mask', 'blue_prompt');
      this.addPromptIfExists(input, cyan_mask, cyan_prompt, 'cyan_mask', 'cyan_prompt');
      this.addPromptIfExists(input, magenta_mask, magenta_prompt, 'magenta_mask', 'magenta_prompt');
      this.addPromptIfExists(input, orange_mask, orange_prompt, 'orange_mask', 'orange_prompt');
      this.addPromptIfExists(input, purple_mask, purple_prompt, 'purple_mask', 'purple_prompt');
      this.addPromptIfExists(input, pink_mask, pink_prompt, 'pink_mask', 'pink_prompt');
      this.addPromptIfExists(input, lightblue_mask, lightblue_prompt, 'lightblue_mask', 'lightblue_prompt');
      this.addPromptIfExists(input, marron_mask, marron_prompt, 'marron_mask', 'marron_prompt');
      this.addPromptIfExists(input, olive_mask, olive_prompt, 'olive_mask', 'olive_prompt');
      this.addPromptIfExists(input, teal_mask, teal_prompt, 'teal_mask', 'teal_prompt');
      this.addPromptIfExists(input, navy_mask, navy_prompt, 'navy_mask', 'navy_prompt');
      this.addPromptIfExists(input, gold_mask, gold_prompt, 'gold_mask', 'gold_prompt');

      // Fallback: ensure yellow_mask and yellow_prompt always exist
      if (!input.yellow_mask || !input.yellow_prompt) {
        input.yellow_mask = rawImage;
        input.yellow_prompt = basePrompt || '';
        console.log('Applied yellow fallback - using full image and base prompt');
      }

      const requestData = {
        webhook,
        input
      };

      // Get appropriate API URL based on task type
      const apiUrl = this.getApiUrl(task);

      console.log('Sending RunPod generation request:', {
        url: apiUrl,
        jobId,
        uuid,
        task,
        requestData
      });

      const response = await axios.post(apiUrl, requestData, this.axiosConfig);

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

  async generateOutpaint(params) {
    try {
      const {
        webhook,
        image,
        top = 0,
        bottom = 0,
        left = 0,
        right = 0,
        prompt = '',
        seed = 123456777,
        steps = 30,
        cfg = 3.5,
        denoise = 1,
        jobId,
        uuid,
        task = 'outpaint'
      } = params;

      const input = {
        prompt,
        seed,
        steps,
        cfg,
        denoise,
        top: Math.round(top),
        bottom: Math.round(bottom),
        right: Math.round(right),
        left: Math.round(left),
        image,
        job_id: jobId,
        uuid,
        task
      };

      const payload = {
        webhook,
        input
      };

      // Get appropriate API URL for outpaint
      const apiUrl = this.getApiUrl('outpaint');

      console.log('Sending outpaint request to RunPod:', {
        url: apiUrl,
        jobId,
        uuid,
        task,
        bounds: { top, bottom, left, right }
      });

      const response = await axios.post(apiUrl, payload, this.axiosConfig);

      console.log('RunPod outpaint response:', {
        payload,
        jobId,
        runpodId: response.data.id,
        status: response.data.status
      });

      return {
        success: true,
        runpodId: response.data.id,
        status: response.data.status,
        jobId
      };

    } catch (error) {
      console.error('RunPod outpaint error:', {
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

  async generateInpaint(params) {
    try {
      const {
        webhook,
        image,
        mask,
        prompt = '',
        negativePrompt = '',
        seed = 123456777,
        steps = 30,
        cfg = 7.5,
        denoise = 1,
        jobId,
        uuid,
        task = 'inpaint'
      } = params;

      const input = {
        prompt,
        negative_prompt: negativePrompt,
        seed,
        steps,
        cfg,
        denoise,
        image,
        mask,
        job_id: jobId,
        uuid,
        task
      };

      const payload = {
        webhook,
        input
      };

      // Get appropriate API URL for inpaint
      const apiUrl = this.getApiUrl('inpaint');

      console.log('Sending inpaint request to RunPod:', {
        url: apiUrl,
        jobId,
        uuid,
        task
      });

      const response = await axios.post(apiUrl, payload, this.axiosConfig);

      console.log('RunPod inpaint response:', {
        jobId,
        runpodId: response.data.id,
        status: response.data.status
      });

      return {
        success: true,
        runpodId: response.data.id,
        status: response.data.status,
        jobId
      };

    } catch (error) {
      console.error('RunPod inpaint error:', {
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

  addPromptIfExists(obj, mask, prompt, maskKey, promptKey) {
    // Only add both mask and prompt if BOTH exist for the same color
    if (!mask || prompt === undefined || prompt === null) return;
    
    obj[maskKey] = mask;
    obj[promptKey] = prompt;
  }
}

module.exports = new RunPodService();