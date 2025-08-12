const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const imageRoutes = require('./image.routes');
const projectRoutes = require('./project.routes');
const customizationRoutes = require('./customization.routes');
const maskRoutes = require('./mask.routes');
const aiPromptRoutes = require('./aiPrompt.routes');
const runpodGenerationRoutes = require('./runpodGeneration.routes');
const tweakRoutes = require('./tweak.routes');
const refineRoutes = require('./refine.routes');
const subscriptionRoutes = require('./subscription.routes');

router.use('/auth', authRoutes);
router.use('/images', imageRoutes);
router.use('/project', projectRoutes);
router.use('/customization', customizationRoutes);
router.use('/masks', maskRoutes);
router.use('/ai-prompt', aiPromptRoutes);
router.use('/runpod', runpodGenerationRoutes);
router.use('/tweak', tweakRoutes);
router.use('/refine', refineRoutes);
router.use('/subscription', subscriptionRoutes);

module.exports = router;