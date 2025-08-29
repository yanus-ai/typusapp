const express = require('express');
const router = express.Router();
const { createInputImageFromWebhook, handleRevitMasksCallback } = require('../controllers/webhook.controller');
const { authenticateJwt } = require('../middleware/auth.middleware');
const {handleWebhook} = require('../webhooks/stripe.webhooks');

// Increase payload limit specifically for webhook routes
const webhookJsonParser = express.json({ limit: '100mb' });

// Raw body parser for Stripe webhooks (required for signature verification)
const stripeRawParser = express.raw({ 
  type: 'application/json',
  verify: (req, res, buf) => {
    req.rawBody = buf; // Preserve raw body for Stripe signature verification
  }
});

// POST /api/webhooks/create-input-image - Create input image from webhook (requires authentication)
router.post('/create-input-image', webhookJsonParser, authenticateJwt, createInputImageFromWebhook);

// POST /api/webhooks/revit-masks-callback - Handle Revit masks callback (no authentication needed for external service)
router.post('/revit-masks-callback', webhookJsonParser, handleRevitMasksCallback);

// POST /api/webhooks/stripe - Handle Stripe webhook events (requires raw body for signature verification)
router.post('/stripe', stripeRawParser, handleWebhook);

// GET /api/webhooks/stripe - Test endpoint to verify route is working
router.get('/stripe', (req, res) => {
  res.json({ 
    message: 'Stripe webhook endpoint is active', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
