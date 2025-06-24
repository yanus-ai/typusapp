// server/src/controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { prisma } = require('../services/prisma.service');
const { createFreeSubscription } = require('../services/subscriptions.service');

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Helper to sanitize user object
const sanitizeUser = (user) => {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

// Register a new user
const register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Use a transaction to create both user and subscription
    const result = await prisma.$transaction(async (tx) => {
      // Create the new user within transaction
      const user = await tx.user.create({
        data: {
          fullName,
          email,
          password: hashedPassword,
          lastLogin: new Date()
        }
      });

      // Create free subscription within the same transaction
      // If this fails, the user creation will be rolled back
      const subscription = await createFreeSubscription(user.id, tx);

      return { user, subscription };
    });

    // At this point, both operations succeeded
    const token = generateToken(result.user.id);

    // For a new user, available credits will be exactly the free plan allocation (100)
    // We're using the constant from the subscription service to be consistent
    const availableCredits = 100;

    res.status(201).json({
      user: sanitizeUser(result.user),
      subscription: result.subscription,
      credits: availableCredits,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Fetch subscription details
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id }
    });
    
    // Fetch active credit transactions (not expired)
    const now = new Date();
    const activeCredits = await prisma.creditTransaction.aggregate({
      where: {
        userId: user.id,
        status: 'COMPLETED',
        OR: [
          { expiresAt: { gt: now } },
          { expiresAt: null }
        ]
      },
      _sum: {
        amount: true
      }
    });
    
    const availableCredits = activeCredits._sum.amount || 0;

    // Create token
    const token = generateToken(user.id);

    res.json({
      user: sanitizeUser(user),
      subscription: subscription || null,
      credits: availableCredits,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Handle Google OAuth callback
const googleCallback = (req, res) => {
  // In a real implementation, this would use the authenticated user from req.user
  // For the mock implementation, we'll create a dummy user
  
  const mockUser = {
    id: 'google-user-123',
    fullName: 'Google User',
    email: 'google-user@example.com',
    credits: 10,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const token = generateToken(mockUser.id);
  
  // In a real implementation, you'd redirect to the frontend with the token
  // For now, we'll just return the user and token
  res.json({
    user: mockUser,
    token
  });
};

// Get current user profile
const getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch subscription details
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id }
    });
    
    // Fetch active credit transactions (not expired)
    const now = new Date();
    const activeCredits = await prisma.creditTransaction.aggregate({
      where: {
        userId: user.id,
        status: 'COMPLETED',
        OR: [
          { expiresAt: { gt: now } },
          { expiresAt: null }
        ]
      },
      _sum: {
        amount: true
      }
    });
    
    const availableCredits = activeCredits._sum.amount || 0;

    res.json({
      user: sanitizeUser(user),
      subscription: subscription || null,
      credits: availableCredits
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error while fetching user profile' });
  }
};

module.exports = {
  register,
  login,
  googleCallback,
  getCurrentUser
};