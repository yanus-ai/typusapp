const express = require('express');
const router = express.Router();
const tweakController = require('../controllers/tweak.controller');
const { authenticateJwt } = require('../middleware/auth.middleware');

// Apply authentication to all routes
router.use(authenticateJwt);

// Outpaint operation - auto-triggered when canvas bounds change  
router.post('/outpaint', tweakController.generateOutpaint);

// Inpaint operation - for selected regions with prompt
router.post('/inpaint', tweakController.generateInpaint);

// Add image to canvas operation
router.post('/add-image', tweakController.addImageToCanvas);

// Get tweak operations history
router.get('/operations/:baseImageId', tweakController.getTweakOperations);

// Get tweak batch results  
router.get('/batch/:batchId', tweakController.getTweakBatch);

// Cancel ongoing tweak operation
router.delete('/operation/:operationId', tweakController.cancelTweakOperation);

module.exports = router;