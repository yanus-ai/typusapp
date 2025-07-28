// server/src/controllers/image.controller.js
const { prisma } = require('../services/prisma.service');
const s3Service = require('../services/image/s3.service');
const replicateImageUploader = require('../services/image/replicateImageUploader.service');
const multer = require('multer');
const sharp = require('sharp');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Multer middleware
const handleUpload = upload.single('file');

// Helper function to resize image while maintaining aspect ratio
const resizeImageForUpload = async (imageBuffer, maxWidth = 800, maxHeight = 600) => {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    console.log('Original image dimensions:', {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
    });

    // Calculate new dimensions while maintaining aspect ratio
    let newWidth = metadata.width;
    let newHeight = metadata.height;

    // Check if resizing is needed
    if (newWidth > maxWidth || newHeight > maxHeight) {
      const widthRatio = maxWidth / newWidth;
      const heightRatio = maxHeight / newHeight;
      const ratio = Math.min(widthRatio, heightRatio);

      newWidth = Math.round(newWidth * ratio);
      newHeight = Math.round(newHeight * ratio);

      console.log('Resizing image from', `${metadata.width}x${metadata.height}`, 'to', `${newWidth}x${newHeight}`);
    } else {
      console.log('Image is already within bounds, no resizing needed');
    }

    // Resize the image and convert to JPEG for consistency
    const resizedBuffer = await sharp(imageBuffer)
      .resize(newWidth, newHeight, { 
        fit: 'inside',
        withoutEnlargement: true // Don't enlarge if original is smaller
      })
      .jpeg({ 
        quality: 90, // High quality for main image
        progressive: true 
      })
      .toBuffer();

    console.log('Resized image buffer size:', resizedBuffer.length);

    return {
      buffer: resizedBuffer,
      width: newWidth,
      height: newHeight,
      originalWidth: metadata.width,
      originalHeight: metadata.height
    };
  } catch (error) {
    console.error('Error resizing image:', error);
    throw new Error('Failed to resize image: ' + error.message);
  }
};

// Upload input image (for InputHistoryPanel)
const uploadInputImage = async (req, res) => {
  try {
    // Test S3 connection first
    const s3Connected = await s3Service.testConnection();
    if (!s3Connected) {
      return res.status(500).json({ message: 'S3 service unavailable' });
    }

    await new Promise((resolve, reject) => {
      handleUpload(req, res, (err) => {
        if (err) {
          console.error('Multer error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' 
      });
    }

    // Validate file size (10MB limit)
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ 
        message: 'File too large. Maximum size is 10MB.' 
      });
    }

    // Step 1: Resize the main image to max 800x600 while maintaining aspect ratio
    console.log('Resizing main image...');
    const resizedImage = await resizeImageForUpload(req.file.buffer, 800, 600);

    // Step 2: Create a thumbnail from the resized image
    console.log('Creating thumbnail from resized image...');
    const thumbnailBuffer = await sharp(resizedImage.buffer)
      .resize(300, 300, { 
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    console.log('Thumbnail created, size:', thumbnailBuffer.length);

    // Step 3: Upload the resized image to S3 (not the original)
    console.log('Uploading resized image to S3...');
    const originalUpload = await s3Service.uploadInputImage(
      resizedImage.buffer, // Use resized buffer instead of req.file.buffer
      req.file.originalname,
      'image/jpeg' // Always JPEG after processing
    );

    if (!originalUpload.success) {
      return res.status(500).json({ 
        message: 'Failed to upload resized image: ' + originalUpload.error 
      });
    }

    // Step 4: Upload thumbnail to S3
    console.log('Uploading thumbnail to S3...');
    const thumbnailUpload = await s3Service.uploadThumbnail(
      thumbnailBuffer,
      `thumbnail-${req.file.originalname}`,
      'image/jpeg'
    );

    if (!thumbnailUpload.success) {
      return res.status(500).json({ 
        message: 'Failed to upload thumbnail: ' + thumbnailUpload.error 
      });
    }

    // Step 5: Process the S3 uploaded image with Replicate API (not the original)
    console.log('Processing resized S3 image with Replicate API...');
    let processedUrl = null;
    try {
      // Use the S3 URL of the resized image
      processedUrl = await replicateImageUploader.processImage(originalUpload.url);
      console.log('Replicate processing successful:', processedUrl);
    } catch (replicateError) {
      console.error('Replicate processing failed:', replicateError);
      // Don't fail the entire upload, just log the error
      // We'll use the resized S3 URL as fallback
    }

    // Step 6: Save to InputImage table with both original and final dimensions
    console.log('Saving to database...');
    const inputImage = await prisma.inputImage.create({
      data: {
        userId: req.user.id,
        originalUrl: originalUpload.url, // This is now the resized image URL
        processedUrl: processedUrl, // This will be null if Replicate failed
        thumbnailUrl: thumbnailUpload.url,
        fileName: req.file.originalname,
        fileSize: resizedImage.buffer.length, // Size of resized image
        dimensions: {
          width: resizedImage.width,
          height: resizedImage.height,
          originalWidth: resizedImage.originalWidth, // Store original dimensions for reference
          originalHeight: resizedImage.originalHeight
        },
        uploadSource: 'CREATE_MODULE'
      }
    });

    console.log('Input image created:', inputImage.id);
    console.log('Final dimensions:', `${resizedImage.width}x${resizedImage.height}`);
    console.log('Original dimensions:', `${resizedImage.originalWidth}x${resizedImage.originalHeight}`);

    res.status(201).json({
      id: inputImage.id,
      originalUrl: inputImage.originalUrl,
      processedUrl: inputImage.processedUrl,
      imageUrl: inputImage.processedUrl || inputImage.originalUrl, // Use processed URL if available, fallback to resized
      thumbnailUrl: inputImage.thumbnailUrl,
      fileName: inputImage.fileName,
      createdAt: inputImage.createdAt,
      isProcessed: !!inputImage.processedUrl, // Boolean flag to indicate if processing was successful
      dimensions: {
        width: resizedImage.width,
        height: resizedImage.height,
        wasResized: resizedImage.width !== resizedImage.originalWidth || resizedImage.height !== resizedImage.originalHeight
      }
    });
  } catch (error) {
    console.error('Input image upload error:', error);
    
    // Provide more specific error messages
    if (error.message.includes('credentials')) {
      return res.status(500).json({ message: 'AWS credentials not configured properly' });
    }
    if (error.message.includes('Bucket')) {
      return res.status(500).json({ message: 'S3 bucket not configured properly' });
    }
    if (error.message.includes('sharp') || error.message.includes('resize')) {
      return res.status(500).json({ message: 'Image processing/resizing failed' });
    }
    if (error.message.includes('Replicate API')) {
      // If only Replicate fails, still return success with resized URL
      console.warn('Replicate processing failed, using resized S3 URL');
    }
    
    res.status(500).json({ message: 'Server error during image upload' });
  }
};

// Get user's input images
const getUserInputImages = async (req, res) => {
  try {
    const inputImages = await prisma.inputImage.findMany({
      where: {
        userId: req.user.id,
        isDeleted: false
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        originalUrl: true,
        thumbnailUrl: true,
        processedUrl: true,
        fileName: true,
        dimensions: true, // Include dimensions to show if image was resized
        createdAt: true
      }
    });

    res.json(inputImages);
  } catch (error) {
    console.error('Get input images error:', error);
    res.status(500).json({ message: 'Server error while fetching input images' });
  }
};

// Get a single image by ID (for regular images)
const getImageById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Convert string ID to integer
    const imageId = parseInt(id, 10);
    
    if (isNaN(imageId)) {
      return res.status(400).json({ message: 'Invalid image ID' });
    }

    const image = await prisma.image.findUnique({
      where: { id: imageId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            handle: true,
            profilePicture: true
          }
        }
      }
    });

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.json(image);
  } catch (error) {
    console.error('Get image by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching image' });
  }
};

// Get a single input image by ID
const getInputImageById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Convert string ID to integer
    const imageId = parseInt(id, 10);
    
    if (isNaN(imageId)) {
      return res.status(400).json({ message: 'Invalid image ID' });
    }

    const inputImage = await prisma.inputImage.findUnique({
      where: { 
        id: imageId,
        userId: req.user.id // Ensure user can only access their own images
      }
    });

    if (!inputImage) {
      return res.status(404).json({ message: 'Input image not found' });
    }

    res.json(inputImage);
  } catch (error) {
    console.error('Get input image by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching input image' });
  }
};

// Get user's regular images (generated images)
const getUserImages = async (req, res) => {
  try {
    const images = await prisma.image.findMany({
      where: {
        userId: req.user.id,
        isDeleted: false
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            handle: true,
            profilePicture: true
          }
        }
      }
    });

    res.json(images);
  } catch (error) {
    console.error('Get user images error:', error);
    res.status(500).json({ message: 'Server error while fetching images' });
  }
};

// Delete an input image
const deleteInputImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Convert string ID to integer
    const imageId = parseInt(id, 10);
    
    if (isNaN(imageId)) {
      return res.status(400).json({ message: 'Invalid image ID' });
    }

    // Soft delete the input image
    const inputImage = await prisma.inputImage.update({
      where: { 
        id: imageId,
        userId: req.user.id // Ensure user can only delete their own images
      },
      data: { isDeleted: true }
    });

    res.json({ message: 'Input image deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Input image not found' });
    }
    console.error('Delete input image error:', error);
    res.status(500).json({ message: 'Server error while deleting input image' });
  }
};

// Delete a regular image
const deleteImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Convert string ID to integer
    const imageId = parseInt(id, 10);
    
    if (isNaN(imageId)) {
      return res.status(400).json({ message: 'Invalid image ID' });
    }

    // Soft delete the image
    const image = await prisma.image.update({
      where: { 
        id: imageId,
        userId: req.user.id // Ensure user can only delete their own images
      },
      data: { isDeleted: true }
    });

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Image not found' });
    }
    console.error('Delete image error:', error);
    res.status(500).json({ message: 'Server error while deleting image' });
  }
};

// Convert generated image to input image for mask region creation
const convertGeneratedToInputImage = async (req, res) => {
  try {
    const { generatedImageId, imageUrl, thumbnailUrl } = req.body;

    if (!generatedImageId || !imageUrl) {
      return res.status(400).json({ 
        message: 'Generated image ID and image URL are required' 
      });
    }

    // Test S3 connection first
    const s3Connected = await s3Service.testConnection();
    if (!s3Connected) {
      return res.status(500).json({ message: 'S3 service unavailable' });
    }

    // Verify the generated image exists and belongs to the user
    const generatedImage = await prisma.image.findUnique({
      where: { 
        id: parseInt(generatedImageId, 10),
        userId: req.user.id // Ensure user owns the generated image
      }
    });

    if (!generatedImage) {
      return res.status(404).json({ message: 'Generated image not found' });
    }

    // Download the image from the provided URL
    console.log('Downloading image from URL:', imageUrl);
    const fetch = require('node-fetch');
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      return res.status(400).json({ message: 'Failed to fetch image from URL' });
    }

    const imageBuffer = await response.buffer();
    console.log('Downloaded image buffer size:', imageBuffer.length);

    // Validate the downloaded image
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const contentType = response.headers.get('content-type');
    if (!contentType || !allowedTypes.some(type => contentType.includes(type.split('/')[1]))) {
      return res.status(400).json({ 
        message: 'Invalid image format. Only JPEG, PNG, and WebP are supported.' 
      });
    }

    // Step 1: Resize the image to max 800x600 while maintaining aspect ratio
    console.log('Resizing downloaded image...');
    const resizedImage = await resizeImageForUpload(imageBuffer, 800, 600);

    // Step 2: Create a thumbnail from the resized image
    console.log('Creating thumbnail from resized image...');
    const thumbnailBuffer = await sharp(resizedImage.buffer)
      .resize(300, 300, { 
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    console.log('Thumbnail created, size:', thumbnailBuffer.length);

    // Step 3: Upload the resized image to S3
    console.log('Uploading resized image to S3...');
    const fileName = `converted-from-generated-${generatedImageId}-${Date.now()}.jpg`;
    const originalUpload = await s3Service.uploadInputImage(
      resizedImage.buffer,
      fileName,
      'image/jpeg'
    );

    if (!originalUpload.success) {
      return res.status(500).json({ 
        message: 'Failed to upload resized image: ' + originalUpload.error 
      });
    }

    // Step 4: Upload thumbnail to S3
    console.log('Uploading thumbnail to S3...');
    const thumbnailUpload = await s3Service.uploadThumbnail(
      thumbnailBuffer,
      `thumbnail-${fileName}`,
      'image/jpeg'
    );

    if (!thumbnailUpload.success) {
      return res.status(500).json({ 
        message: 'Failed to upload thumbnail: ' + thumbnailUpload.error 
      });
    }

    // Step 5: Process the S3 uploaded image with Replicate API
    console.log('Processing resized S3 image with Replicate API...');
    let processedUrl = null;
    try {
      processedUrl = await replicateImageUploader.processImage(originalUpload.url);
      console.log('Replicate processing successful:', processedUrl);
    } catch (replicateError) {
      console.error('Replicate processing failed:', replicateError);
      // Don't fail the entire conversion, just log the error
    }

    // Step 6: Save to InputImage table
    console.log('Saving to database...');
    const inputImage = await prisma.inputImage.create({
      data: {
        userId: req.user.id,
        originalUrl: originalUpload.url,
        processedUrl: processedUrl,
        thumbnailUrl: thumbnailUpload.url,
        fileName: fileName,
        fileSize: resizedImage.buffer.length,
        dimensions: {
          width: resizedImage.width,
          height: resizedImage.height,
          originalWidth: resizedImage.originalWidth,
          originalHeight: resizedImage.originalHeight,
          convertedFrom: `generated-${generatedImageId}` // Track conversion source
        },
        uploadSource: 'CONVERTED_FROM_GENERATED'
      }
    });

    console.log('Input image created from conversion:', inputImage.id);

    res.status(201).json({
      id: inputImage.id,
      originalUrl: inputImage.originalUrl,
      processedUrl: inputImage.processedUrl,
      imageUrl: inputImage.processedUrl || inputImage.originalUrl,
      thumbnailUrl: inputImage.thumbnailUrl,
      fileName: inputImage.fileName,
      createdAt: inputImage.createdAt,
      isProcessed: !!inputImage.processedUrl,
      dimensions: {
        width: resizedImage.width,
        height: resizedImage.height,
        wasResized: resizedImage.width !== resizedImage.originalWidth || resizedImage.height !== resizedImage.originalHeight
      }
    });
  } catch (error) {
    console.error('Convert generated to input image error:', error);
    
    // Provide specific error messages
    if (error.message.includes('fetch')) {
      return res.status(400).json({ message: 'Failed to download image from URL' });
    }
    if (error.message.includes('credentials')) {
      return res.status(500).json({ message: 'AWS credentials not configured properly' });
    }
    if (error.message.includes('sharp') || error.message.includes('resize')) {
      return res.status(500).json({ message: 'Image processing/resizing failed' });
    }
    
    res.status(500).json({ message: 'Server error during image conversion' });
  }
};

module.exports = {
  uploadInputImage,
  getUserInputImages,
  getImageById,
  getInputImageById,
  getUserImages,
  deleteInputImage,
  deleteImage,
  convertGeneratedToInputImage,
  resizeImageForUpload // Export helper function for potential reuse
};