const express = require('express');
const router = express.Router();
const upscaleController = require('../controllers/upscale.controller');
const { handleUpscaleWebhook } = require('../webhooks/upscale.webhooks');
const { authenticateJwt } = require('../middleware/auth.middleware');

// Upscale operation - for image upscaling using Replicate API
router.post('/generate', authenticateJwt, upscaleController.generateUpscale);

// Upscale webhook - Replicate callback (no auth needed)
router.post('/webhook', handleUpscaleWebhook);

// Get upscale operations history for a specific base image
router.get('/operations/:baseImageId', authenticateJwt, upscaleController.getUpscaleOperations);

module.exports = router;