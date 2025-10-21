const express = require('express');
const router = express.Router();
const {
  submitOnboardingData,
  checkOnboardingStatus
} = require('../controllers/onboarding.controller');
const { authenticateJwt } = require('../middleware/auth.middleware');

// Submit onboarding questionnaire data
router.post('/submit', authenticateJwt, submitOnboardingData);

// Check if user has completed onboarding
router.get('/status', authenticateJwt, checkOnboardingStatus);

module.exports = router;

