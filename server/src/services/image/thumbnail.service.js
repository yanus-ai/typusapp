// server/src/services/image/thumbnail.service.js
const sharp = require('sharp');
const axios = require('axios');
const s3Service = require('./s3.service');

const generateThumbnail = async (originalImageUrl, fileName, size = 90, folderName = 'customization-thumbnails') => {
  try {
    console.log(`Generating ${size}x${size} thumbnail for:`, originalImageUrl);
    
    // Download the original image
    const response = await axios.get(originalImageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    // Generate thumbnail
    const thumbnailBuffer = await sharp(response.data)
      .resize(size, size, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85 })
      .toBuffer();
    
    // Upload thumbnail to S3 with 'thumb-' prefix
    const thumbnailFileName = `thumb-${fileName}`;
    const thumbnailUpload = await s3Service.uploadFile(
      thumbnailBuffer,
      thumbnailFileName,
      'image/jpeg',
      folderName
    );
    
    if (thumbnailUpload.success) {
      console.log(`✅ Thumbnail created: ${thumbnailUpload.url}`);
      return thumbnailUpload.url;
    } else {
      throw new Error('Failed to upload thumbnail: ' + thumbnailUpload.error);
    }
    
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw error;
  }
};

module.exports = {
  generateThumbnail
};