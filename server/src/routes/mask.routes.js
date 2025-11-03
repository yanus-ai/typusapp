// server/src/routes/image.routes.js
const express = require('express');
const router = express.Router();
const { authenticateJwt } = require('../middleware/auth.middleware');

const { 
  generateImageMasks, 
  handleMaskCallback, 
  getMaskRegions, 
  proxyMaskByUuid,
  proxyMaskByUrl,
  updateMaskStyle, 
  updateMaskVisibility,
  clearMaskStyle 
} = require('../controllers/mask.controller');

// Generate masks for an image
router.post('/generate', authenticateJwt, generateImageMasks);

// Callback endpoint for FastAPI
router.post('/callback', handleMaskCallback);

// Proxy a mask image by UUID (no auth; image retrieval)
// IMPORTANT: place before parameterized route to avoid being captured by :inputImageId
router.get('/proxy/:uuid', proxyMaskByUuid);
// Generic proxy by full URL (no auth)
router.get('/proxy-by-url', proxyMaskByUrl);

// Get existing masks for an image
router.get('/:inputImageId', authenticateJwt, getMaskRegions);

// Update mask style (attach material/customization options)
router.put('/:maskId/style', authenticateJwt, updateMaskStyle);

// Update mask visibility
router.put('/:maskId/visibility', authenticateJwt, updateMaskVisibility);

// Clear mask style
router.delete('/:maskId/style', authenticateJwt, clearMaskStyle);

module.exports = router;