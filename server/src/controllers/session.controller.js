const sessionService = require('../services/session.service');
const { prisma } = require('../services/prisma.service');

/**
 * Create a new session
 */
const createSession = async (req, res) => {
  try {
    const { prompt } = req.body;
    const userId = req.user.id;

    const session = await sessionService.createSession(userId, prompt);

    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('❌ Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create session',
      error: error.message
    });
  }
};

/**
 * Get session by ID with all batches
 */
const getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = await sessionService.getSessionById(sessionId, userId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('❌ Get session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session',
      error: error.message
    });
  }
};

/**
 * Get all sessions for the current user
 */
const getUserSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;

    const sessions = await sessionService.getUserSessions(userId, limit);

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('❌ Get user sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sessions',
      error: error.message
    });
  }
};

/**
 * Update session name
 */
const updateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Session name is required'
      });
    }

    const updated = await sessionService.updateSessionName(sessionId, userId, name.trim());

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      message: 'Session updated successfully'
    });
  } catch (error) {
    console.error('❌ Update session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update session',
      error: error.message
    });
  }
};

/**
 * Delete session
 */
const deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const deleted = await sessionService.deleteSession(sessionId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete session',
      error: error.message
    });
  }
};

/**
 * Migrate existing batches to sessions (admin/utility endpoint)
 */
const migrateBatches = async (req, res) => {
  try {
    const userId = req.user.id;
    const { allUsers } = req.query; // Optional: migrate all users' batches

    const result = await sessionService.migrateExistingBatchesToSessions(
      allUsers === 'true' ? null : userId
    );

    res.json({
      success: true,
      message: 'Migration completed',
      data: result
    });
  } catch (error) {
    console.error('❌ Migrate batches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to migrate batches',
      error: error.message
    });
  }
};

module.exports = {
  createSession,
  getSession,
  getUserSessions,
  updateSession,
  deleteSession,
  migrateBatches
};

