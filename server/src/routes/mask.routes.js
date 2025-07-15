// server/src/routes/image.routes.js
const express = require('express');
const { generateImageMasks, handleMaskCallback } = require('../controllers/mask.controller');

const router = express.Router();

// Generate masks
router.post('/generate', generateImageMasks);

// Callback endpoint for mask API
router.post('/callback', handleMaskCallback);

module.exports = router;