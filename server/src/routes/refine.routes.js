const express = require('express');
const router = express.Router();
const refineController = require('../controllers/refine.controller');
const refineMaterialsController = require('../controllers/refineMaterials.controller');
const { handleRefineWebhook } = require('../webhooks/refine.webhooks');
const { authenticateJwt } = require('../middleware/auth.middleware');
const { validateRefineGeneration } = require('../middleware/validation.middleware');

// Refine operation - for image upscaling with various parameters
router.post('/generate', authenticateJwt, validateRefineGeneration, refineController.generateRefine);

// Refine webhook - RunPod callback (no auth needed)
router.post('/webhook', handleRefineWebhook);

// Get refine operations history for a specific base image
router.get('/operations/:baseImageId', authenticateJwt, refineController.getRefineOperations);

// Get refine batch results  
router.get('/batch/:batchId', authenticateJwt, refineController.getRefineBatch);

// Cancel ongoing refine operation
router.delete('/operation/:operationId', authenticateJwt, refineController.cancelRefineOperation);

// Get refine settings for a specific image
router.get('/settings/:imageId', authenticateJwt, refineController.getRefineSettings);

// Save refine settings for a specific image
router.post('/settings', authenticateJwt, refineController.saveRefineSettings);

// AI Materials management for refine page
router.post('/materials/add', authenticateJwt, refineMaterialsController.addMaterial);
router.post('/materials/remove', authenticateJwt, refineMaterialsController.removeMaterial);
router.get('/materials/:inputImageId', authenticateJwt, refineMaterialsController.getMaterials);
router.delete('/materials/clear/:inputImageId', authenticateJwt, refineMaterialsController.clearMaterials);
router.post('/materials/update', authenticateJwt, refineMaterialsController.updateMaterials);

module.exports = router;
