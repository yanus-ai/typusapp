const axios = require('axios');
const {
  REPLICATE_IMAGE_TAGGING_TOKEN,
  BASE_URL
} = require('../config/constants');

class ReplicateService {
  constructor() {
    this.apiUrl = 'https://api.replicate.com/v1/predictions';
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Token ${REPLICATE_IMAGE_TAGGING_TOKEN}`
    };
    this.fluxFillProVersion = 'black-forest-labs/flux-fill-pro';
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
   * Generate outpaint using Replicate's FLUX Fill Pro model
   */
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
        seed = Math.floor(Math.random() * 1000000),
        steps = 50,
        cfg: guidance = 3,
        jobId,
        uuid,
        task = 'outpaint',
        // Retry metadata
        isRetry = false,
        retryAttempt = 0,
        originalJobId = null
      } = params;

      // Calculate outpaint direction/type based on extension bounds
      const leftExtension = Math.max(0, left);
      const rightExtension = Math.max(0, right);
      const topExtension = Math.max(0, top);
      const bottomExtension = Math.max(0, bottom);
      const maxExtension = Math.max(leftExtension, rightExtension, topExtension, bottomExtension);
      const totalExtension = leftExtension + rightExtension + topExtension + bottomExtension;

      let outpaintValue = "Zoom out 1.5x"; // Default for small expansions

      // For small expansions (less than 100px total), always use zoom
      if (totalExtension < 100) {
        if (maxExtension > 50) {
          outpaintValue = "Zoom out 1.5x";
        } else {
          outpaintValue = "Zoom out 1.5x"; // Even for tiny expansions
        }
      } else {
        // For larger expansions, check if one direction is significantly dominant
        const threshold = totalExtension * 0.6; // One direction must be 60% of total

        if (leftExtension > threshold && leftExtension > 50) {
          outpaintValue = "Left outpaint";
        } else if (rightExtension > threshold && rightExtension > 50) {
          outpaintValue = "Right outpaint";
        } else if (topExtension > threshold && topExtension > 50) {
          outpaintValue = "Top outpaint";
        } else if (bottomExtension > threshold && bottomExtension > 50) {
          outpaintValue = "Bottom outpaint";
        } else if (maxExtension > 200) {
          // Large balanced extensions
          outpaintValue = "Zoom out 2x";
        } else {
          // Medium balanced extensions
          outpaintValue = "Zoom out 1.5x";
        }
      }

      const input = {
        image: image,
        prompt: prompt || 'extend the image naturally, maintaining style and composition',
        outpaint: outpaintValue,
        seed: seed,
        steps: steps,
        guidance: guidance,
        safety_tolerance: 2,
        output_format: "jpg"
      };

      const requestData = {
        version: this.fluxFillProVersion,
        input: input,
        webhook: webhook ? `${webhook}?jobId=${jobId}&uuid=${uuid}&task=${task}&isRetry=${isRetry}&retryAttempt=${retryAttempt}&originalJobId=${originalJobId}` : undefined
      };

      console.log('Sending Replicate outpaint request:', {
        modelVersion: this.fluxFillProVersion,
        jobId,
        uuid,
        task,
        bounds: { top, bottom, left, right },
        outpaintValue,
        prompt: prompt || 'default prompt'
      });

      const response = await axios.post(this.apiUrl, requestData, {
        headers: this.headers,
        timeout: 30000
      });

      if (response.data && response.data.id) {
        console.log('Replicate outpaint request successful:', {
          replicateId: response.data.id,
          status: response.data.status,
          jobId
        });

        return {
          success: true,
          runpodId: response.data.id, // Keep same field name for compatibility
          status: response.data.status,
          jobId
        };
      } else {
        throw new Error('Invalid response from Replicate API');
      }

    } catch (error) {
      console.error('Replicate outpaint error:', {
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

  /**
   * Generate inpaint using Replicate's FLUX Fill Pro model
   */
  async generateInpaint(params) {
    try {
      const {
        webhook,
        image,
        mask,
        prompt = '',
        negativePrompt = '',
        maskKeyword = '',
        seed = Math.floor(Math.random() * 1000000),
        steps = 50,
        cfg: guidance = 3,
        jobId,
        uuid,
        task = 'inpaint',
        // Retry metadata
        isRetry = false,
        retryAttempt = 0,
        originalJobId = null
      } = params;

      const input = {
        image: image,
        mask: mask,
        prompt: prompt,
        seed: seed,
        steps: steps,
        guidance: guidance,
        prompt_upsampling: true,
        safety_tolerance: 2,
        output_format: "jpg"
      };

      const requestData = {
        version: this.fluxFillProVersion,
        input: input,
        webhook: webhook ? `${webhook}?jobId=${jobId}&uuid=${uuid}&task=${task}&isRetry=${isRetry}&retryAttempt=${retryAttempt}&originalJobId=${originalJobId}` : undefined
      };

      console.log('Sending Replicate inpaint request:', {
        modelVersion: this.fluxFillProVersion,
        jobId,
        uuid,
        task,
        hasPrompt: !!prompt,
        hasMask: !!mask,
        maskKeyword
      });

      const response = await axios.post(this.apiUrl, requestData, {
        headers: this.headers,
        timeout: 30000
      });

      if (response.data && response.data.id) {
        console.log('Replicate inpaint request successful:', {
          replicateId: response.data.id,
          status: response.data.status,
          jobId
        });

        return {
          success: true,
          runpodId: response.data.id, // Keep same field name for compatibility
          status: response.data.status,
          jobId
        };
      } else {
        throw new Error('Invalid response from Replicate API');
      }

    } catch (error) {
      console.error('Replicate inpaint error:', {
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

  /**
   * Retry generation for outpaint/inpaint
   */
  async retryGeneration(originalParams, retryAttempt = 1) {
    try {
      console.log('🔄 Retrying Replicate generation with attempt:', retryAttempt, 'Original params:', {
        operationType: originalParams.operationType,
        jobId: originalParams.jobId,
        originalJobId: originalParams.originalJobId
      });

      // Add retry metadata to the original parameters
      const retryParams = {
        ...originalParams,
        isRetry: true,
        retryAttempt: retryAttempt,
        originalJobId: originalParams.originalJobId || originalParams.jobId
      };

      // Determine which method to call based on operation type
      switch (originalParams.operationType) {
        case 'outpaint':
          return await this.generateOutpaint(retryParams);
        case 'inpaint':
          return await this.generateInpaint(retryParams);
        default:
          throw new Error(`Unsupported operation type for retry: ${originalParams.operationType}`);
      }
    } catch (error) {
      console.error('Error retrying Replicate generation:', {
        message: error.message,
        retryAttempt,
        originalParams: originalParams
      });

      return {
        success: false,
        error: error.message,
        isRetry: true,
        retryAttempt
      };
    }
  }

  /**
   * Map Replicate status to RunPod status for compatibility
   */
  mapReplicateStatus(replicateStatus) {
    const statusMap = {
      'starting': 'IN_QUEUE',
      'processing': 'IN_PROGRESS',
      'succeeded': 'COMPLETED',
      'failed': 'FAILED',
      'canceled': 'CANCELLED'
    };

    return statusMap[replicateStatus] || replicateStatus;
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    const errors = [];

    if (!REPLICATE_IMAGE_TAGGING_TOKEN) {
      errors.push('REPLICATE_IMAGE_TAGGING_TOKEN environment variable is required');
    }

    if (errors.length > 0) {
      throw new Error(`Replicate configuration errors: ${errors.join(', ')}`);
    }

    return true;
  }
}

module.exports = new ReplicateService();