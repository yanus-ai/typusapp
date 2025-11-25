// server/src/routes/image.routes.js
const express = require('express');
const router = express.Router();
const { authenticateJwt, authenticateJwtOptional } = require('../middleware/auth.middleware');

const {
  uploadInputImage,
  getUserInputImages,
  getImageById,
  getInputImageById,
  getUserImages,
  deleteInputImage,
  deleteImage,
  convertGeneratedToInputImage,
  createInputImageFromGenerated,
  createTweakInputImageFromExisting,
  updateInputImageAIMaterials,
  downloadImage,
  createInputImageFromPublic,
  toggleImageShare,
  toggleInputImageShare
} = require('../controllers/image.controller');

const {
  getInputAndCreateImages,
  getTweakHistoryForImage,
  getAllUserImages,
  getInputImagesBySource,
  getPublicImages,
  getLatestAttachmentsForBase
} = require('../controllers/images.controller');

// Input images routes (for user uploads)
router.post('/upload-input', authenticateJwt, uploadInputImage);
// Get all non-deleted input images for the user
router.get('/input-images', authenticateJwt, getUserInputImages);
router.get('/input-images/:id', authenticateJwt, getInputImageById);
router.patch('/input-images/:id/ai-materials', authenticateJwt, updateInputImageAIMaterials);
router.delete('/input-images/:id', authenticateJwt, deleteInputImage);

// Regular images routes (for generated images)
// Get all non-deleted images for the user
router.get('/images', authenticateJwt, getUserImages);
router.get('/images/:id', authenticateJwt, getImageById);
router.delete('/images/:id', authenticateJwt, deleteImage);

// Convert generated image to input image for mask region creation
router.post('/convert-to-input', authenticateJwt, convertGeneratedToInputImage);

// Create new InputImage from generated image with masks copied from original InputImage
router.post('/create-input-from-generated', authenticateJwt, createInputImageFromGenerated);

// Create new TWEAK InputImage from existing image (for Create -> Edit flow)
router.post('/create-tweak-input-from-existing', authenticateJwt, createTweakInputImageFromExisting);

// New endpoints for tweak page separated panels
router.get('/input-and-create', authenticateJwt, getInputAndCreateImages);
router.get('/tweak-history/:baseImageId', authenticateJwt, getTweakHistoryForImage);
router.get('/all-user-images', authenticateJwt, getAllUserImages);

// Get input images filtered by upload source (for specific pages)
router.get('/input-images-by-source/:uploadSource', authenticateJwt, getInputImagesBySource);

// Download image (proxy for S3 images to force download)
router.get('/download', authenticateJwt, downloadImage);

// Get public images for Explore section (optional authentication for like status)
router.get('/public', authenticateJwtOptional, getPublicImages);

// Latest attachments for a base image (for Create hydration)
router.get('/attachments/latest/:inputImageId', authenticateJwt, getLatestAttachmentsForBase);

// Create input image from public explore image (requires authentication)
router.post('/create-input-from-public', authenticateJwt, createInputImageFromPublic);

// Toggle image share status (make public/private for community)
router.post('/share/:imageId', authenticateJwt, toggleImageShare);

// Toggle input image share status (make public/private for community)
router.post('/input-images/share/:inputImageId', authenticateJwt, toggleInputImageShare);

module.exports = router;