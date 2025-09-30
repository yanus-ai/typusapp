const axios = require('axios');
const { BASE_URL, REPLICATE_IMAGE_TAGGER_URL, REPLICATE_IMAGE_TAGGING_TOKEN } = require('../config/constants');

/**
 * Service for generating image tags using Replicate API
 */
class ImageTaggingService {
  constructor() {
    this.replicateApiUrl = REPLICATE_IMAGE_TAGGER_URL;
    this.apiToken = REPLICATE_IMAGE_TAGGING_TOKEN;
    this.modelVersion = "5a3e65f223fe2291679a6c3c812ddb278aa6d43bbcf118c09530b4309aaac00e";
    this.webhookBaseUrl = BASE_URL;
  }

  /**
   * Generate tags for an image using Replicate API
   * @param {Object} params - Parameters for image tagging
   * @param {string} params.imageUrl - URL of the image to tag
   * @param {string} params.inputImageId - ID of the InputImage record to update
   * @param {string} [params.uuid] - Optional UUID for tracking (defaults to inputImageId)
   * @returns {Promise<Object>} Replicate API response
   */
  async generateImageTags({ imageUrl, inputImageId }) {
    try {
      const webhookUrl = `${this.webhookBaseUrl}/api/webhooks/image-tags`;
      const trackingUuid = inputImageId.toString();

      const requestData = {
        version: this.modelVersion,
        input: {
          image: imageUrl,
          uuid: trackingUuid
        },
        webhook: webhookUrl
      };

      console.log('🏷️ Sending image tagging request to Replicate:', {
        imageUrl: imageUrl.substring(0, 100) + '...',
        inputImageId,
        uuid: trackingUuid,
        webhookUrl
      });

      const response = await axios({
        method: 'post',
        url: this.replicateApiUrl,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`
        },
        data: requestData,
        timeout: 30000,
        maxBodyLength: Infinity
      });

      console.log('✅ Image tagging request successful:', {
        predictionId: response.data.id,
        status: response.data.status,
        inputImageId
      });

      return {
        success: true,
        predictionId: response.data.id,
        status: response.data.status,
        inputImageId,
        uuid: trackingUuid
      };

    } catch (error) {
      console.error('❌ Image tagging request failed:', {
        inputImageId,
        imageUrl: imageUrl?.substring(0, 100) + '...',
        error: error.message,
        status: error.response?.status,
        responseData: error.response?.data
      });

      return {
        success: false,
        error: error.message,
        inputImageId
      };
    }
  }

  /**
   * Process webhook response from Replicate image tagging
   * @param {Object} webhookData - Webhook data from Replicate
   * @returns {Promise<Object>} Processed webhook response
   */
  async processWebhookResponse(webhookData) {
    try {
      console.log('🏷️ [IMAGE TAGGER] Processing webhook response:', JSON.stringify(webhookData, null, 2));
      
      const { input, output, status, id: predictionId } = webhookData;
      const uuid = input?.uuid;

      if (!uuid) {
        throw new Error('No UUID found in webhook data');
      }

      // Extract inputImageId from UUID
      // UUID is just the inputImageId directly (e.g., 208)
      const inputImageId = parseInt(uuid);

      if (isNaN(inputImageId)) {
        throw new Error(`Invalid inputImageId extracted from UUID: ${uuid}`);
      }

      console.log('🏷️ Processing image tagging webhook:', {
        predictionId,
        status,
        inputImageId,
        uuid,
        hasOutput: !!output
      });

      if (status === 'succeeded' && output) {
        // Extract tags from output - output is an array of objects with tag and confidence
        let tags = [];

        if (Array.isArray(output)) {
          // Each item in output is an object like: { "confidence": 0.9184, "tag": "outdoors" }
          tags = output
            .map(item => {
              if (typeof item === 'object' && item.tag) {
                return {
                  tag: item.tag.trim(),
                  confidence: item.confidence || 0
                };
              } else if (typeof item === 'string') {
                return {
                  tag: item.trim(),
                  confidence: 1.0 // Default confidence for string tags
                };
              }
              return null;
            })
            .filter(item => item && item.tag.length > 0);
        } else if (typeof output === 'string') {
          // Fallback: If output is a string, try to parse as comma-separated or JSON
          try {
            const parsed = JSON.parse(output);
            if (Array.isArray(parsed)) {
              tags = parsed
                .map(item => {
                  if (typeof item === 'object' && item.tag) {
                    return {
                      tag: item.tag.trim(),
                      confidence: item.confidence || 0
                    };
                  } else if (typeof item === 'string') {
                    return {
                      tag: item.trim(),
                      confidence: 1.0
                    };
                  }
                  return null;
                })
                .filter(item => item && item.tag.length > 0);
            }
          } catch {
            // If not JSON, treat as comma-separated string
            tags = output.split(',')
              .map(tag => ({
                tag: tag.trim(),
                confidence: 1.0
              }))
              .filter(item => item.tag.length > 0);
          }
        }

        console.log('🏷️ Extracted tags:', {
          inputImageId,
          tagCount: tags.length,
          tags: tags.slice(0, 10), // Log first 10 tags with confidence
          sampleTags: tags.slice(0, 5).map(t => `${t.tag} (${t.confidence})`)
        });

        return {
          success: true,
          inputImageId,
          tags,
          predictionId,
          status
        };
      } else if (status === 'failed') {
        console.error('❌ Image tagging failed:', {
          inputImageId,
          predictionId,
          status,
          error: output?.error || 'Unknown error'
        });

        return {
          success: false,
          inputImageId,
          error: output?.error || 'Image tagging failed',
          predictionId,
          status
        };
      } else {
        // Still processing or other status
        console.log('🔄 Image tagging in progress:', {
          inputImageId,
          predictionId,
          status
        });

        return {
          success: false,
          inputImageId,
          status,
          predictionId,
          inProgress: true
        };
      }

    } catch (error) {
      console.error('❌ Error processing image tagging webhook:', {
        error: error.message,
        webhookData: JSON.stringify(webhookData, null, 2)
      });

      return {
        success: false,
        error: error.message,
        webhookData
      };
    }
  }
}

module.exports = new ImageTaggingService();