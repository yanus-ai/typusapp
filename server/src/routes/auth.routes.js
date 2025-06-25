// server/src/routes/auth.routes.js
const express = require('express');
const passport = require('passport');
const router = express.Router();
const { register, login, googleCallback, getCurrentUser, googleLogin } = require('../controllers/auth.controller');
const { authenticateJwt } = require('../middleware/auth.middleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  googleCallback
);

// For client-side Google auth
router.post('/google', googleLogin);

// Protected routes
router.get('/me', authenticateJwt, getCurrentUser);

module.exports = router;