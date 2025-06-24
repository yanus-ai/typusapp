// server/src/routes/image.routes.js
const express = require('express');
const router = express.Router();
const { authenticateJwt } = require('../middleware/auth.middleware');
const { uploadImage, getUserImages, getImageById, deleteImage } = require('../controllers/image.controller');

// All routes require authentication
router.use(authenticateJwt);

// Routes
router.post('/', uploadImage);
router.get('/', getUserImages);
router.get('/:id', getImageById);
router.delete('/:id', deleteImage);

module.exports = router;