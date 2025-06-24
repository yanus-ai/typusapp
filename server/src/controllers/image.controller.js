// server/src/controllers/image.controller.js
const { prisma } = require('../services/prisma.service');
const s3Service = require('../services/image/s3.service');
const multer = require('multer');
const sharp = require('sharp');

// Multer storage configuration (memory storage for processing before S3 upload)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('image');

// Helper to handle file upload with multer
const handleUpload = (req, res) => {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Upload a new image
const uploadImage = async (req, res) => {
  try {
    await handleUpload(req, res);

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Process the image to create a thumbnail
    const thumbnailBuffer = await sharp(req.file.buffer)
      .resize(300, 300, { fit: 'inside' })
      .toBuffer();

    // Upload original image to S3
    const originalUpload = await s3Service.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Upload thumbnail to S3
    const thumbnailUpload = await s3Service.uploadFile(
      thumbnailBuffer,
      `thumbnail-${req.file.originalname}`,
      'image/jpeg'
    );

    // Get image dimensions
    const metadata = await sharp(req.file.buffer).metadata();

    // Save image metadata to database
    const image = await prisma.image.create({
      data: {
        userId: req.user.id,
        s3Key: originalUpload.key,
        url: originalUpload.url,
        thumbnail: thumbnailUpload.url,
        type: req.body.type || 'original',
        prompt: req.body.prompt,
        negativePrompt: req.body.negativePrompt,
        width: metadata.width,
        height: metadata.height,
        projectId: req.body.projectId || null
      }
    });

    res.status(201).json(image);
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ message: 'Server error during image upload' });
  }
};

// Get all images for a user
const getUserImages = async (req, res) => {
  try {
    const images = await prisma.image.findMany({
      where: {
        userId: req.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(images);
  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({ message: 'Server error while fetching images' });
  }
};

// Get a single image by ID
const getImageById = async (req, res) => {
  try {
    const image = await prisma.image.findUnique({
      where: {
        id: req.params.id
      }
    });

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Check if user owns the image
    if (image.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this image' });
    }

    res.json(image);
  } catch (error) {
    console.error('Get image error:', error);
    res.status(500).json({ message: 'Server error while fetching image' });
  }
};

// Delete an image
const deleteImage = async (req, res) => {
  try {
    const image = await prisma.image.findUnique({
      where: {
        id: req.params.id
      }
    });

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Check if user owns the image
    if (image.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this image' });
    }

    // Delete from S3
    await s3Service.deleteFile(image.s3Key);
    
    // If there's a thumbnail, delete it too
    if (image.thumbnail) {
      // Extract key from URL
      const thumbnailKey = image.thumbnail.split('/').pop();
      await s3Service.deleteFile(`uploads/${thumbnailKey}`);
    }

    // Delete from database
    await prisma.image.delete({
      where: {
        id: req.params.id
      }
    });

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ message: 'Server error while deleting image' });
  }
};

module.exports = {
  uploadImage,
  getUserImages,
  getImageById,
  deleteImage
};