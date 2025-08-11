const express = require('express');
const router = express.Router();
const tweakController = require('../controllers/tweak.controller');
const { handleOutpaintWebhook, handleInpaintWebhook } = require('../webhooks/tweak.webhooks');
const { authenticateJwt } = require('../middleware/auth.middleware');
const multer = require('multer');
const s3Service = require('../services/image/s3.service');

// Configure multer for mask uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for masks
  }
});

// Upload mask image endpoint
router.post('/upload/mask', authenticateJwt, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file provided' 
      });
    }

    // Upload mask to S3
    const uploadResult = await s3Service.uploadGeneratedImage(
      req.file.buffer,
      `mask-${Date.now()}.png`,
      'image/png'
    );

    if (!uploadResult.success) {
      throw new Error(uploadResult.error);
    }

    res.json({
      success: true,
      url: uploadResult.url
    });

  } catch (error) {
    console.error('Error uploading mask:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload mask',
      error: error.message 
    });
  }
});

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