const express = require('express');
const router = express.Router();
const { authenticateJwt } = require('../middleware/auth.middleware');
const { createInputImageFromWebhook } = require('../controllers/webhook.controller');

// Webhook endpoint for creating input images from external JSON payload
// Uses authentication middleware to validate the token from header
router.post('/create-input-image', authenticateJwt, createInputImageFromWebhook);

module.exports = router;
