const axios = require('axios');
const {
  REPLICATE_IMAGE_TAGGING_TOKEN,
  BASE_URL
} = require('../config/constants');

class ReplicateService {
  constructor() {
    this.apiUrl = 'https://api.replicate.com/v1/predictions';
    this.fluxFillProVersion = "10b45d01bb46cffc8d7893b36d720e369d732bb2e48ca3db469a18929eff359d"; // FLUX Fill Pro model version
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
        originalJobId = null,
        // New parameters for actual dimensions
        originalImageWidth,
        originalImageHeight,
        // User-selected outpaint option
        outpaintOption = null
      } = params;

      // Get actual image dimensions from params
      const originalWidth = originalImageWidth || 512;
      const originalHeight = originalImageHeight || 768;

      // Calculate target dimensions based on extension values
      const targetWidth = originalWidth + Math.max(0, left) + Math.max(0, right);
      const targetHeight = originalHeight + Math.max(0, top) + Math.max(0, bottom);

      console.log('🎯 Direct dimension calculation:', {
        original: { width: originalWidth, height: originalHeight },
        extensions: { left, right, top, bottom },
        target: { width: targetWidth, height: targetHeight }
      });

      // Use the user-selected outpaint option directly
      const outpaintMode = outpaintOption || "Zoom out 1.5x"; // Default fallback

      console.log('🎯 Using outpaint mode:', {
        mode: outpaintMode,
        source: outpaintOption ? 'user-selected' : 'default'
      });

      const input = {
        image: image,
        prompt: prompt || 'extend the image naturally, maintaining style and composition',
        outpaint: outpaintMode,
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
        targetDimensions: { width: targetWidth, height: targetHeight },
        originalDimensions: { width: originalWidth, height: originalHeight },
        calculatedOutpaintMode: outpaintMode,
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
   * Test expansion ratios for different outpaint modes
   * This function helps determine the actual pixel expansion ratios
   */
  async testExpansionRatios(testImageUrl, testImageWidth, testImageHeight) {
    const testModes = [
      'Zoom out 1.5x',
      'Zoom out 2x',
      'Left outpaint',
      'Right outpaint',
      'Top outpaint',
      'Bottom outpaint'
    ];

    const results = [];

    console.log('🧪 Starting expansion ratio tests for image:', {
      url: testImageUrl,
      dimensions: `${testImageWidth}x${testImageHeight}`
    });

    for (const mode of testModes) {
      try {
        console.log(`🔍 Testing outpaint mode: ${mode}`);

        const input = {
          image: testImageUrl,
          prompt: 'extend the image naturally, maintaining style and composition',
          outpaint: mode,
          seed: 12345, // Fixed seed for consistency
          steps: 25,   // Fewer steps for faster testing
          guidance: 3,
          safety_tolerance: 2,
          output_format: "jpg"
        };

        const requestData = {
          version: this.fluxFillProVersion,
          input: input
        };

        const startTime = Date.now();
        const response = await axios.post(this.apiUrl, requestData, {
          headers: this.headers,
          timeout: 30000
        });

        if (response.data && response.data.id) {
          console.log(`⏳ ${mode} request submitted, ID: ${response.data.id}`);

          // Poll for completion (simplified polling)
          let completed = false;
          let attempts = 0;
          const maxAttempts = 30; // 5 minutes max

          while (!completed && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

            const statusResponse = await this.getJobStatus(response.data.id);
            attempts++;

            if (statusResponse.success && statusResponse.data.status === 'succeeded') {
              const outputUrl = statusResponse.data.output;
              console.log(`✅ ${mode} completed: ${outputUrl}`);

              // Try to get image dimensions from the output
              try {
                console.log(`📏 Getting dimensions for ${mode} output...`);

                // Download a small portion to get image metadata
                const imageResponse = await axios({
                  method: 'GET',
                  url: outputUrl,
                  responseType: 'arraybuffer',
                  headers: {
                    'Range': 'bytes=0-2048' // Just first 2KB to get metadata
                  },
                  timeout: 10000
                });

                // Use sharp to get metadata if we have it
                const sharp = require('sharp');
                const buffer = Buffer.from(imageResponse.data);
                const metadata = await sharp(buffer).metadata();

                console.log(`✅ ${mode} dimensions: ${metadata.width}x${metadata.height}`);

                results.push({
                  mode: mode,
                  inputDimensions: `${testImageWidth}x${testImageHeight}`,
                  outputDimensions: `${metadata.width}x${metadata.height}`,
                  outputUrl: outputUrl,
                  completionTime: Date.now() - startTime,
                  expansionRatio: {
                    width: (metadata.width / testImageWidth).toFixed(3),
                    height: (metadata.height / testImageHeight).toFixed(3)
                  },
                  status: 'completed'
                });
              } catch (dimError) {
                console.log(`⚠️ Could not get dimensions for ${mode}:`, dimError.message);

                // Still try to download full image for dimensions
                try {
                  const fullImageResponse = await axios({
                    method: 'GET',
                    url: outputUrl,
                    responseType: 'arraybuffer',
                    timeout: 30000
                  });

                  const sharp = require('sharp');
                  const buffer = Buffer.from(fullImageResponse.data);
                  const metadata = await sharp(buffer).metadata();

                  console.log(`✅ ${mode} dimensions (full download): ${metadata.width}x${metadata.height}`);

                  results.push({
                    mode: mode,
                    inputDimensions: `${testImageWidth}x${testImageHeight}`,
                    outputDimensions: `${metadata.width}x${metadata.height}`,
                    outputUrl: outputUrl,
                    completionTime: Date.now() - startTime,
                    expansionRatio: {
                      width: (metadata.width / testImageWidth).toFixed(3),
                      height: (metadata.height / testImageHeight).toFixed(3)
                    },
                    status: 'completed'
                  });
                } catch (fullError) {
                  console.log(`❌ Failed to get dimensions for ${mode} even with full download:`, fullError.message);
                  results.push({
                    mode: mode,
                    inputDimensions: `${testImageWidth}x${testImageHeight}`,
                    outputUrl: outputUrl,
                    completionTime: Date.now() - startTime,
                    status: 'completed_no_dims',
                    error: fullError.message
                  });
                }
              }

              completed = true;
            } else if (statusResponse.success && statusResponse.data.status === 'failed') {
              console.log(`❌ ${mode} failed:`, statusResponse.data.error);
              results.push({
                mode: mode,
                inputDimensions: `${testImageWidth}x${testImageHeight}`,
                error: statusResponse.data.error,
                status: 'failed'
              });
              completed = true;
            } else {
              console.log(`⏳ ${mode} still processing... (attempt ${attempts}/${maxAttempts})`);
            }
          }

          if (!completed) {
            console.log(`⏰ ${mode} timed out after ${maxAttempts} attempts`);
            results.push({
              mode: mode,
              inputDimensions: `${testImageWidth}x${testImageHeight}`,
              status: 'timeout'
            });
          }
        }

        // Small delay between tests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ Error testing ${mode}:`, error.message);
        results.push({
          mode: mode,
          inputDimensions: `${testImageWidth}x${testImageHeight}`,
          error: error.message,
          status: 'error'
        });
      }
    }

    console.log('🧪 Expansion ratio test results:', JSON.stringify(results, null, 2));
    return results;
  }

  /**
   * Predict output dimensions based on extension bounds and input dimensions
   * Returns exact dimensions that will be generated
   */
  predictOutputDimensions(inputWidth, inputHeight, left = 0, right = 0, top = 0, bottom = 0) {
    const targetWidth = inputWidth + Math.max(0, left) + Math.max(0, right);
    const targetHeight = inputHeight + Math.max(0, top) + Math.max(0, bottom);

    return {
      width: targetWidth,
      height: targetHeight
    };
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