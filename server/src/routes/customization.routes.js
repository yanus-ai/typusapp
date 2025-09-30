// server/src/routes/project.routes.js
const express = require('express');
const router = express.Router();
const { authenticateJwt } = require('../middleware/auth.middleware');
  const { getCustomizationOptions, loadBatchSettings, loadImageSettings } = require('../controllers/customization.controller');

// All routes require authentication
router.use(authenticateJwt);

// Routes
router.get('/options', getCustomizationOptions);
router.get('/batch/:batchId/settings', loadBatchSettings);
router.get('/image/:imageId/settings', loadImageSettings);

module.exports = router;