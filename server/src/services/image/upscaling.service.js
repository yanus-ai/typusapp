// server/src/services/image/upscaling.service.js
const sharp = require('sharp');

/**
 * High-quality image upscaling service using Sharp
 * Upscales images to any target resolution using advanced algorithms
 */

/**
 * Upscales an image to 2000px if smaller, otherwise keeps original size
 * while maintaining aspect ratio and optimizing for quality
 * @param {Buffer} imageBuffer - The image buffer to upscale
 * @param {number} targetSize - Target size for the longer side (default: 2000px)
 */
const upscaleImage = async (imageBuffer, targetSize = 2000) => {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    console.log('📊 Original image dimensions:', {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: `${Math.round(imageBuffer.length / 1024)}KB`
    });

    const longerSide = Math.max(metadata.width, metadata.height);

    // Upscale to 2000px if image is smaller, otherwise keep original size
    if (longerSide < targetSize) {
      const scaleFactor = targetSize / longerSide;
      const newWidth = Math.round(metadata.width * scaleFactor);
      const newHeight = Math.round(metadata.height * scaleFactor);

      console.log('🚀 Upscaling image:', {
        from: `${metadata.width}x${metadata.height}`,
        to: `${newWidth}x${newHeight}`,
        scaleFactor: `${scaleFactor.toFixed(2)}x`
      });

      // High-quality upscaling with Sharp
      const upscaledBuffer = await sharp(imageBuffer)
        .resize(newWidth, newHeight, {
          kernel: 'lanczos3',        // High-quality resampling kernel
          fit: 'fill'                // Allow upscaling
        })
        .sharpen({ sigma: 1, flat: 1, jagged: 0.5 })  // Add subtle sharpening to enhance details
        .png()
        .toBuffer();

      console.log('✅ Image successfully upscaled:', {
        originalSize: `${Math.round(imageBuffer.length / 1024)}KB`,
        upscaledSize: `${Math.round(upscaledBuffer.length / 1024)}KB`,
        dimensions: `${newWidth}x${newHeight}`
      });

      return {
        buffer: upscaledBuffer,
        width: newWidth,
        height: newHeight,
        wasUpscaled: true,
        originalDimensions: { width: metadata.width, height: metadata.height },
        scaleFactor
      };
    } else {
      console.log('✓ Image is 2000px or larger, keeping original size with high quality processing');

      // Image is already 2000px or larger, process with high quality settings
      const processedBuffer = await sharp(imageBuffer)
        .png()
        .toBuffer();

      return {
        buffer: processedBuffer,
        width: metadata.width,
        height: metadata.height,
        wasUpscaled: false,
        originalDimensions: { width: metadata.width, height: metadata.height },
        scaleFactor: 1
      };
    }
  } catch (error) {
    console.error('❌ Error in upscaleImage:', error);
    throw new Error(`Failed to process image: ${error.message}`);
  }
};

/**
 * Creates a high-quality thumbnail while preserving the main image quality
 */
const createHighQualityThumbnail = async (imageBuffer, size = 300) => {
  try {
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(size, size, {
        fit: 'cover',
        position: 'center',
        kernel: 'lanczos3'
      })
      .jpeg({
        quality: 90,
        progressive: true
      })
      .toBuffer();

    return thumbnailBuffer;
  } catch (error) {
    console.error('❌ Error creating high-quality thumbnail:', error);
    throw error;
  }
};

/**
 * Validates image dimensions and format before processing
 */
const validateImageForUpscaling = async (imageBuffer) => {
  try {
    const metadata = await sharp(imageBuffer).metadata();

    // Check if image format is supported
    const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'tiff'];
    if (!supportedFormats.includes(metadata.format?.toLowerCase())) {
      throw new Error(`Unsupported image format: ${metadata.format}`);
    }

    // Check minimum dimensions (avoid upscaling very small images)
    if (metadata.width < 50 || metadata.height < 50) {
      throw new Error('Image too small for upscaling (minimum 50x50)');
    }

    // Check maximum dimensions to prevent memory issues
    if (metadata.width > 10000 || metadata.height > 10000) {
      throw new Error('Image too large (maximum 10000x10000)');
    }

    return {
      isValid: true,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        channels: metadata.channels,
        density: metadata.density
      }
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message
    };
  }
};

module.exports = {
  upscaleImage,
  upscaleImageTo2K: upscaleImage, // Backward compatibility alias
  createHighQualityThumbnail,
  validateImageForUpscaling
};