const express = require('express');
const router = express.Router();
const { authenticateJwt } = require('../middleware/auth.middleware');

const {
  toggleLike,
  getUserLikedImages,
  getLikeStatus
} = require('../controllers/likes.controller');

// Toggle like/unlike for an image
router.post('/toggle/:imageId', authenticateJwt, toggleLike);

// Get user's liked images
router.get('/user-likes', authenticateJwt, getUserLikedImages);

// Get like status for multiple images
router.get('/status', authenticateJwt, getLikeStatus);

module.exports = router;
