const express = require('express');
const router = express.Router();
const { authenticateJwt } = require('../middleware/auth.middleware');
const { validateRunPodGeneration, validatePagination } = require('../middleware/validation.middleware');
const {
  generateWithRunPod,
  getGenerationStatus,
  getUserGenerations,
  getInputImageMaskRegions
} = require('../controllers/runpodGeneration.controller');
const { handleRunPodWebhook } = require('../webhooks/runpod.webhooks');

// Protected routes (require authentication)
router.post('/generate', authenticateJwt, validateRunPodGeneration, generateWithRunPod);
router.get('/status/:batchId', authenticateJwt, getGenerationStatus);
router.get('/history', authenticateJwt, validatePagination, getUserGenerations);
router.get('/input-image/:inputImageId/mask-regions', authenticateJwt, getInputImageMaskRegions);

// Webhook route (no authentication required)
router.post('/webhook', handleRunPodWebhook);

module.exports = router;