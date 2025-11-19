const express = require('express');
const router = express.Router();
const { authenticateJwt } = require('../middleware/auth.middleware');
const {
  createSession,
  getSession,
  getUserSessions,
  updateSession,
  deleteSession,
  migrateBatches
} = require('../controllers/session.controller');

// All routes require authentication
router.post('/', authenticateJwt, createSession);
router.get('/', authenticateJwt, getUserSessions);
router.get('/:sessionId', authenticateJwt, getSession);
router.put('/:sessionId', authenticateJwt, updateSession);
router.delete('/:sessionId', authenticateJwt, deleteSession);
router.post('/migrate', authenticateJwt, migrateBatches); // Utility endpoint for migration

module.exports = router;

