// server/src/routes/auth.routes.js
const express = require('express');
const passport = require('passport');
const router = express.Router();
const { register, login, googleCallback, getCurrentUser, googleLogin, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { authenticateJwt } = require('../middleware/auth.middleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Google OAuth routes
router.get('/google', (req, res, next) => {
  // Pass mode parameter as state if present
  const mode = req.query.m;
  const options = { scope: ['profile', 'email'] };
  
  if (mode === 'rhinologin') {
    options.state = 'rhinologin';
  } else if (mode === 'sketchuplogin') {
    options.state = 'sketchuplogin';
  } else if (mode === 'archicadlogin') {
    options.state = 'archicadlogin';
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