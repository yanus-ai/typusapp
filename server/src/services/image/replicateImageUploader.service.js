const axios = require('axios');
const FormData = require('form-data');

const { REPLICATE_UPLOAD_IMAGE_URL, REPLICATE_UPLOAD_IMAGE_TOKEN } = require('../../config/constants');

const processImage = async (imageUrl) => {
  try {
    const formData = new FormData();
    formData.append('url', imageUrl);

    const response = await axios.post(REPLICATE_UPLOAD_IMAGE_URL, formData, {
      headers: {
        'Authorization': `Bearer ${REPLICATE_UPLOAD_IMAGE_TOKEN}`,
        ...formData.getHeaders()
      }
    });

    if (response.data && response.data.file_url) {
      console.log('External API processed image:', response.data.file_url);
      return response.data.file_url;
    } else {
      throw new Error('No file_url in external API response');
    }

  } catch (error) {
    console.error('External API error:', error);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      throw new Error(`External API error: ${error.response.status} - ${error.response.data}`);
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error(`External API error: No response received`);
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error(`External API error: ${error.message}`);
    }
  }
};

module.exports = {
  processImage
};