// server/src/routes/project.routes.js
const express = require('express');
const router = express.Router();
const { authenticateJwt } = require('../middleware/auth.middleware');
const { getCustomizationOptions } = require('../controllers/customization.controller');

// All routes require authentication
router.use(authenticateJwt);

// Routes
router.get('/options', getCustomizationOptions);

module.exports = router;