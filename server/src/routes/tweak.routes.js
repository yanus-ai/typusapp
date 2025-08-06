const express = require('express');
const router = express.Router();
const tweakController = require('../controllers/tweak.controller');
const { handleOutpaintWebhook, handleInpaintWebhook } = require('../webhooks/tweak.webhooks');
const { authenticateJwt } = require('../middleware/auth.middleware');

// Outpaint operation - auto-triggered when canvas bounds change
router.post('/outpaint', authenticateJwt, tweakController.generateOutpaint);

// Outpaint webhook - RunPod callback (no auth needed)
router.post('/outpaint/webhook', handleOutpaintWebhook);

// Inpaint operation - for selected regions with prompt
router.post('/inpaint', authenticateJwt, tweakController.generateInpaint);

// Inpaint webhook - RunPod callback (no auth needed)
router.post('/inpaint/webhook', handleInpaintWebhook);

// Add image to canvas operation
router.post('/add-image', authenticateJwt, tweakController.addImageToCanvas);

// Get tweak operations history
router.get('/operations/:baseImageId', authenticateJwt, tweakController.getTweakOperations);

// Get tweak batch results  
router.get('/batch/:batchId', authenticateJwt, tweakController.getTweakBatch);

// Cancel ongoing tweak operation
router.delete('/operation/:operationId', authenticateJwt, tweakController.cancelTweakOperation);

module.exports = router;