// server/src/routes/image.routes.js
const express = require('express');
const router = express.Router();
const { authenticateJwt } = require('../middleware/auth.middleware');

const {
  uploadInputImage,
  getUserInputImages,
  getImageById,
  getInputImageById,
  getUserImages,
  deleteInputImage,
  deleteImage,
  convertGeneratedToInputImage
} = require('../controllers/image.controller');

const {
  getInputAndCreateImages,
  getTweakHistoryForImage,
  getAllUserImages,
  getInputImagesBySource
} = require('../controllers/images.controller');

// Input images routes (for user uploads)
router.post('/upload-input', authenticateJwt, uploadInputImage);
router.get('/input-images', authenticateJwt, getUserInputImages);
router.get('/input-images/:id', authenticateJwt, getInputImageById);
router.delete('/input-images/:id', authenticateJwt, deleteInputImage);

// Regular images routes (for generated images)
router.get('/images', authenticateJwt, getUserImages);
router.get('/images/:id', authenticateJwt, getImageById);
router.delete('/images/:id', authenticateJwt, deleteImage);

// Convert generated image to input image for mask region creation
router.post('/convert-to-input', authenticateJwt, convertGeneratedToInputImage);

// New endpoints for tweak page separated panels
router.get('/input-and-create', authenticateJwt, getInputAndCreateImages);
router.get('/tweak-history/:baseImageId', authenticateJwt, getTweakHistoryForImage);
router.get('/all-user-images', authenticateJwt, getAllUserImages);

// Get input images filtered by upload source (for specific pages)
router.get('/input-images-by-source/:uploadSource', authenticateJwt, getInputImagesBySource);

module.exports = router;