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
  deleteImage
} = require('../controllers/image.controller');

// Input images routes (for user uploads)
router.post('/upload-input', authenticateJwt, uploadInputImage);
router.get('/input-images', authenticateJwt, getUserInputImages);
router.get('/input-images/:id', authenticateJwt, getInputImageById);
router.delete('/input-images/:id', authenticateJwt, deleteInputImage);

// Regular images routes (for generated images)
router.get('/images', authenticateJwt, getUserImages);
router.get('/images/:id', authenticateJwt, getImageById);
router.delete('/images/:id', authenticateJwt, deleteImage);

module.exports = router;