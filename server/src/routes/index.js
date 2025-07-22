const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const imageRoutes = require('./image.routes');
const projectRoutes = require('./project.routes');
const generationRoutes = require('./generation.routes');
const customizationRoutes = require('./customization.routes');
const maskRoutes = require('./mask.routes');
const aiPromptRoutes = require('./aiPrompt.routes');

router.use('/auth', authRoutes);
router.use('/images', imageRoutes);
router.use('/project', projectRoutes);
router.use('/generation', generationRoutes);
router.use('/customization', customizationRoutes);
router.use('/masks', maskRoutes);
router.use('/ai-prompt', aiPromptRoutes);

module.exports = router;