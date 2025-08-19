const express = require('express');
const router = express.Router();
const {
  addMaterial,
  getMaterials,
  removeMaterial,
  clearMaterials,
  generatePrompt,
  getSavedPrompt,
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

// POST /api/ai-prompt/generate - Generate AI prompt with GPT
router.post('/generate', generatePrompt);

// GET /api/ai-prompt/prompt/:inputImageId - Get saved AI prompt for input image
router.get('/prompt/:inputImageId', getSavedPrompt);

// POST /api/ai-prompt/prompt/:inputImageId - Save AI prompt for input image
router.post('/prompt/:inputImageId', savePrompt);

module.exports = router;