const express = require('express');
const router = express.Router();
const {
  getCurrentSubscription,
  createCheckoutSession,
  updateSubscription,
  createPortalSession,
  getPricingPlans,
} = require('../controllers/subscription.controller');
const { authenticateJwt } = require('../middleware/auth.middleware');

// Get current user's subscription
router.get('/', authenticateJwt, getCurrentSubscription);

// Get pricing plans
router.get('/plans', authenticateJwt, getPricingPlans);

// Create checkout session for upgrade
router.post('/checkout', authenticateJwt, createCheckoutSession);

// Update existing subscription with proration
router.put('/update', authenticateJwt, updateSubscription);

// Create customer portal session
router.post('/portal', authenticateJwt, createPortalSession);

module.exports = router;