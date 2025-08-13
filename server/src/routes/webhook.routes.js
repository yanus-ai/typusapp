const express = require('express');
const router = express.Router();
const { createInputImageFromWebhook, handleRevitMasksCallback } = require('../controllers/webhook.controller');
const { authenticateJwt } = require('../middleware/auth.middleware');

// Increase payload limit specifically for webhook routes
const webhookJsonParser = express.json({ limit: '100mb' });

// POST /api/webhooks/create-input-image - Create input image from webhook (requires authentication)
router.post('/create-input-image', webhookJsonParser, authenticateJwt, createInputImageFromWebhook);

// POST /api/webhooks/revit-masks-callback - Handle Revit masks callback (no authentication needed for external service)
router.post('/revit-masks-callback', webhookJsonParser, handleRevitMasksCallback);

module.exports = router;
