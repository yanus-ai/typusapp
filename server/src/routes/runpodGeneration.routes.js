const express = require('express');
const router = express.Router();
const { authenticateJwt } = require('../middleware/auth.middleware');
const { validateRunPodGeneration, validatePagination } = require('../middleware/validation.middleware');
const {
  generateWithRunPod,
  generateWithCurrentState,
  getGenerationStatus,
  getUserGenerations,
  getAllCompletedVariations,
  getBatchSettings,
  getInputImageMaskRegions,
  createInputImageFromBatch
} = require('../controllers/runpodGeneration.controller');
const { handleRunPodWebhook } = require('../webhooks/runpod.webhooks');

// Protected routes (require authentication)
router.post('/generate', authenticateJwt, validateRunPodGeneration, generateWithRunPod);
router.post('/generate-with-state', authenticateJwt, generateWithCurrentState);
router.post('/create-from-batch', authenticateJwt, createInputImageFromBatch);
router.get('/status/:batchId', authenticateJwt, getGenerationStatus);
router.get('/batch/:batchId', authenticateJwt, getBatchSettings);
router.get('/history', authenticateJwt, validatePagination, getUserGenerations);
router.get('/variations', authenticateJwt, validatePagination, getAllCompletedVariations);
router.get('/input-image/:inputImageId/mask-regions', authenticateJwt, getInputImageMaskRegions);

// Webhook route (no authentication required)
router.post('/webhook', handleRunPodWebhook);

module.exports = router;