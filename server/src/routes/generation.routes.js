// server/src/routes/generation.routes.js
const express = require('express');
const router = express.Router();
const { authenticateJwt } = require('../middleware/auth.middleware');
const { generateImage, tweakImage, refineImage } = require('../controllers/generation.controller');

// All routes require authentication
router.use(authenticateJwt);

// Routes
router.post('/create', generateImage);
router.post('/tweak', tweakImage);
router.post('/refine', refineImage);

module.exports = router;