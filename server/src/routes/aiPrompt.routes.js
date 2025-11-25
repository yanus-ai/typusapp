const express = require('express');
const router = express.Router();
const {
  addMaterial,
  getMaterials,
  removeMaterial,
  clearMaterials,
  generatePrompt,
  generatePromptStream,
  getSavedPrompt,
  getInputImagePrompt,
  getGeneratedImagePrompt,
  savePrompt,
} = require('../controllers/aiPrompt.controller');
const { authenticateJwt } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(authenticateJwt);

// POST /api/ai-prompt/materials - Add material to AI prompt
router.post('/materials', addMaterial);

// GET /api/ai-prompt/materials/:inputImageId - Get materials for input image
router.get('/materials/:inputImageId', getMaterials);

// DELETE /api/ai-prompt/materials/:materialId - Remove specific material
router.delete('/materials/:materialId', removeMaterial);

// DELETE /api/ai-prompt/materials/clear/:inputImageId - Clear all materials for image
router.delete('/materials/clear/:inputImageId', clearMaterials);

// POST /api/ai-prompt/generate - Generate AI prompt with GPT (non-streaming)
router.post('/generate', generatePrompt);

// POST /api/ai-prompt/generate-stream - Generate AI prompt with GPT (streaming)
router.post('/generate-stream', generatePromptStream);

// NEW SEPARATE ENDPOINTS
// GET /api/ai-prompt/input-image-prompt/:inputImageId - Get prompt from InputImage table ONLY
router.get('/input-image-prompt/:inputImageId', getInputImagePrompt);

// GET /api/ai-prompt/generated-image-prompt/:imageId - Get prompt from Image table ONLY  
router.get('/generated-image-prompt/:imageId', getGeneratedImagePrompt);

// LEGACY ENDPOINTS (deprecated but maintained for backward compatibility)
// GET /api/ai-prompt/prompt/:inputImageId - Get saved AI prompt (searches both tables)
router.get('/prompt/:inputImageId', getSavedPrompt);

// POST /api/ai-prompt/prompt/:inputImageId - Save AI prompt for input image
router.post('/prompt/:inputImageId', savePrompt);

module.exports = router;