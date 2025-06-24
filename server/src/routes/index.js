const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const imageRoutes = require('./image.routes');
const projectRoutes = require('./project.routes');
const generationRoutes = require('./generation.routes');

router.use('/auth', authRoutes);
router.use('/image', imageRoutes);
router.use('/project', projectRoutes);
router.use('/generation', generationRoutes);

module.exports = router;