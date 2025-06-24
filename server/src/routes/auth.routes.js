// server/src/routes/auth.routes.js
const express = require('express');
const passport = require('passport');
const router = express.Router();
const { register, login, googleCallback, getCurrentUser } = require('../controllers/auth.controller');
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

// For client-side Google auth (mock implementation)
router.post('/google', (req, res) => {
  // Mock implementation of Google token verification
  const { token } = req.body;
  
  // This would normally verify the token with Google
  // For now, we'll just create a mock user
  const mockUser = {
    id: 'google-user-123',
    fullName: 'Google User',
    email: 'google-user@example.com',
    credits: 10,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const jwtToken = jwt.sign(
    { id: mockUser.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  
  res.json({
    user: mockUser,
    token: jwtToken
  });
});

// Protected routes
router.get('/me', authenticateJwt, getCurrentUser);

module.exports = router;