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

    // Get image dimensions
    const metadata = await sharp(req.file.buffer).metadata();

    // Process the image to create a thumbnail
    const thumbnailBuffer = await sharp(req.file.buffer)
      .resize(300, 300, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();

    console.log('Thumbnail created, size:', thumbnailBuffer.length);

    // Upload original image to uploads/input-images folder
    console.log('Uploading original image to S3...');
    const originalUpload = await s3Service.uploadInputImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    if (!originalUpload.success) {
      return res.status(500).json({ 
        message: 'Failed to upload original image: ' + originalUpload.error 
      });
    }

    // Upload thumbnail to uploads/thumbnails folder
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

    // Process image with Replicate API
    console.log('Processing image with Replicate API...');
    let processedUrl = null;
    try {
      processedUrl = await replicateImageUploader.processImage(originalUpload.url);
      console.log('Replicate processing successful:', processedUrl);
    } catch (replicateError) {
      console.error('Replicate processing failed:', replicateError);
      // Don't fail the entire upload, just log the error
      // We'll use the original URL as fallback
    }

    // Save to InputImage table
    console.log('Saving to database...');
    const inputImage = await prisma.inputImage.create({
      data: {
        userId: req.user.id,
        originalUrl: originalUpload.url,
        processedUrl: processedUrl, // This will be null if Replicate failed
        thumbnailUrl: thumbnailUpload.url,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        dimensions: {
          width: metadata.width,
          height: metadata.height
        },
        uploadSource: 'CREATE_MODULE'
      }
    });

    console.log('Input image created:', inputImage.id);

    res.status(201).json({
      id: inputImage.id.toString(),
      originalUrl: inputImage.originalUrl,
      processedUrl: inputImage.processedUrl,
      imageUrl: inputImage.processedUrl || inputImage.originalUrl, // Use processed URL if available, fallback to original
      thumbnailUrl: inputImage.thumbnailUrl,
      fileName: inputImage.fileName,
      createdAt: inputImage.createdAt,
      isProcessed: !!inputImage.processedUrl // Boolean flag to indicate if processing was successful
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
    if (error.message.includes('sharp')) {
      return res.status(500).json({ message: 'Image processing failed' });
    }
    if (error.message.includes('Replicate API')) {
      // If only Replicate fails, still return success with original URL
      console.warn('Replicate processing failed, using original URL');
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
        createdAt: true
      }
    });

    // Convert IDs to strings for frontend consistency
    const formattedImages = inputImages.map(img => ({
      ...img,
      id: img.id.toString()
    }));

    res.json(formattedImages);
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

    res.json({
      ...inputImage,
      id: inputImage.id.toString()
    });
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

    // Convert IDs to strings for frontend consistency
    const formattedImages = images.map(img => ({
      ...img,
      id: img.id.toString()
    }));

    res.json(formattedImages);
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

module.exports = {
  uploadInputImage,
  getUserInputImages,
  getImageById,
  getInputImageById,
  getUserImages,
  deleteInputImage,
  deleteImage
};