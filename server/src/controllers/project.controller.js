// server/src/controllers/project.controller.js
const { prisma } = require('../services/prisma.service');

// Create a new project
const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId: req.user.id
      }
    });
    
    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error during project creation' });
  }
};

// Get all projects for a user
const getUserProjects = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        userId: req.user.id
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error while fetching projects' });
  }
};

// Get a single project by ID with its images
const getProjectById = async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: {
        id: req.params.id
      },
      include: {
        images: true
      }
    });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if user owns the project
    if (project.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this project' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error while fetching project' });
  }
};

// Update a project
const updateProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findUnique({
      where: {
        id: req.params.id
      }
    });
    
    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    if (existingProject.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this project' });
    }
    
    // Update project
    const project = await prisma.project.update({
      where: {
        id: req.params.id
      },
      data: {
        name,
        description
      }
    });
    
    res.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error during project update' });
  }
};

// Delete a project
const deleteProject = async (req, res) => {
  try {
    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findUnique({
      where: {
        id: req.params.id
      }
    });
    
    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    if (existingProject.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this project' });
    }
    
    // Delete project
    await prisma.project.delete({
      where: {
        id: req.params.id
      }
    });
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error during project deletion' });
  }
};

module.exports = {
  createProject,
  getUserProjects,
  getProjectById,
  updateProject,
  deleteProject
};