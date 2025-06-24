// server/src/routes/project.routes.js
const express = require('express');
const router = express.Router();
const { authenticateJwt } = require('../middleware/auth.middleware');
const { createProject, getUserProjects, getProjectById, updateProject, deleteProject } = require('../controllers/project.controller');

// All routes require authentication
router.use(authenticateJwt);

// Routes
router.post('/', createProject);
router.get('/', getUserProjects);
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

module.exports = router;