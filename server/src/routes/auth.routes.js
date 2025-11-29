// server/src/routes/auth.routes.js
const express = require('express');
const passport = require('passport');
const router = express.Router();
const { register, login, googleCallback, getCurrentUser, googleLogin, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { authenticateJwt } = require('../middleware/auth.middleware');
const { verifyRecaptcha } = require('../middleware/recaptcha.middleware');

const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = ['en', 'de'];

// Public routes
router.post('/register', verifyRecaptcha, register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Google OAuth routes
router.get('/google', (req, res, next) => {
  // Pass mode parameter as state if present
  const mode = req.query.m;
  let language = req.query.language;
  
  // Validate and normalize language
  if (language && typeof language === "string") {
    language = language.toLowerCase().trim();
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({ message: "Invalid language" });
    }
  } else {
    language = DEFAULT_LANGUAGE;
  }
  
  const options = { scope: ['profile', 'email'], prompt: 'select_account' };
  
  // Encode both mode and language in state as JSON
  const stateData = { language };
  if (mode === 'rhinologin') {
    stateData.mode = 'rhinologin';
    options.state = JSON.stringify(stateData);
  } else if (mode === 'sketchuplogin') {
    stateData.mode = 'sketchuplogin';
    options.state = JSON.stringify(stateData);
  } else if (mode === 'archicadlogin') {
    stateData.mode = 'archicadlogin';
    options.state = JSON.stringify(stateData);
  } else {
    // Still pass language even if no mode
    options.state = JSON.stringify(stateData);
  }
  
  passport.authenticate('google', options)(req, res, next);
});
router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  googleCallback
);

// For client-side Google auth
router.post('/google', googleLogin);

// Protected routes
router.get('/me', authenticateJwt, getCurrentUser);

module.exports = router;