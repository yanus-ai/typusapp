// server/src/controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { prisma } = require('../services/prisma.service');
const { createStripeCustomer } = require('../services/subscriptions.service');
const { checkUniversityEmail } = require('../services/universityService');
const verifyGoogleToken = require('../utils/verifyGoogleToken');
const { generateVerificationToken, sendVerificationEmail, sendWelcomeEmail, sendGoogleSignupWelcomeEmail } = require('../services/email.service');

// Helper function to normalize email (convert to lowercase and trim)
const normalizeEmail = (email) => {
  return email.toLowerCase().trim();
};

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

    // Normalize email to lowercase
    const normalizedEmail = normalizeEmail(email);

    // Check if user already exists with normalized email
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate email verification token
    const verificationToken = generateVerificationToken();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Check if email is from a university
    let isStudent = false;
    let universityName = null;
    
    try {
      const universityCheck = await checkUniversityEmail(normalizedEmail);
      if (universityCheck.isUniversity) {
        isStudent = true;
        universityName = universityCheck.universityName;
        console.log(`🎓 Student registration detected: ${universityCheck.universityName}`);
      }
    } catch (universityError) {
      console.warn('University email verification failed:', universityError);
      // Continue with registration even if university check fails
    }

    // Create user only (no subscription - user must purchase plan)
    const user = await prisma.user.create({
      data: {
        fullName,
        email: normalizedEmail, // Store normalized email
        password: hashedPassword,
        emailVerified: false, // Set to false initially
        isStudent,
        universityName,
        verificationToken,
        verificationTokenExpiry: verificationExpiry,
        lastLogin: new Date()
      }
    });

    // Create Stripe customer only (no subscription yet)
    try {
      await createStripeCustomer(user.id);
    } catch (customerError) {
      console.error('Stripe customer creation failed:', customerError);
      // User still exists, customer can be created later
    }

    // Send verification email
    try {
      await sendVerificationEmail(normalizedEmail, verificationToken, fullName);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email sending fails
    }

    // Return success response indicating email verification is required
    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      emailSent: true,
      email: normalizedEmail,
      isStudent,
      universityName: isStudent ? universityName : undefined
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

    // Normalize email to lowercase
    const normalizedEmail = normalizeEmail(email);

    // Find the user with normalized email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user || !user.password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json({ 
        message: 'Please verify your email address before logging in. Check your email for the verification link.',
        emailVerificationRequired: true,
        email: normalizedEmail
      });
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
const googleCallback = async (req, res) => {
  try {
    // The authenticated user is available in req.user thanks to passport
    const googleUser = req.user;
    
    if (!googleUser) {
      console.error('No user data from Google OAuth');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
    }
    
    // Log the Google user data to debug
    console.log('Google user data:', JSON.stringify(googleUser, null, 2));
    
    // Validate required fields
    if (!googleUser.email) {
      console.error('No email from Google OAuth');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_email`);
    }
    
    // Normalize email
    const normalizedEmail = normalizeEmail(googleUser.email);
    
    // Check if user exists in database
    let existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    
    // If user doesn't exist, create a new one (sign up)
    if (!existingUser) {
      console.log('Creating new user for email:', normalizedEmail);
      
      const result = await prisma.$transaction(async (tx) => {
        // Create the new user with proper validation
        const newUser = await tx.user.create({
          data: {
            fullName: googleUser.displayName || googleUser.name || 'Google User',
            email: normalizedEmail,
            googleId: googleUser.id?.toString(), // Ensure it's a string
            profilePicture: googleUser.photos?.[0]?.value || null,
            emailVerified: true, // Google emails are verified
            lastLogin: new Date()
          }
        });

        // Create free subscription for new user
        const subscription = await createFreeSubscription(newUser.id, tx);

        return { user: newUser, subscription };
      });
      
      existingUser = result.user;
      console.log('New user created:', existingUser.id);
      
      // Send Google signup welcome email for new users
      try {
        await sendGoogleSignupWelcomeEmail(normalizedEmail, existingUser.fullName);
      } catch (emailError) {
        console.error('Failed to send Google signup welcome email:', emailError);
        // Don't fail the auth process if email sending fails
      }
    } else {
      console.log('Existing user found:', existingUser.id);
      // Update last login and Google ID if not set
      existingUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: { 
          lastLogin: new Date(),
          googleId: existingUser.googleId || googleUser.id?.toString(),
          emailVerified: true
        }
      });
      
      // Check if this is a Google user who hasn't received welcome email yet
      // (users created before Google welcome email feature was added)
      if (existingUser.googleId && existingUser.createdAt < new Date('2025-08-28')) {
        try {
          await sendGoogleSignupWelcomeEmail(normalizedEmail, existingUser.fullName);
          console.log('Sent welcome email to existing Google user:', existingUser.id);
        } catch (emailError) {
          console.error('Failed to send welcome email to existing Google user:', emailError);
        }
      }
    }
    
    // Fetch subscription details
    const subscription = await prisma.subscription.findUnique({
      where: { userId: existingUser.id }
    });
    
    // Fetch active credit transactions
    const now = new Date();
    const activeCredits = await prisma.creditTransaction.aggregate({
      where: {
        userId: existingUser.id,
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
    
    // Generate JWT token
    const token = generateToken(existingUser.id);
    
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('Google callback error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      console.error('Unique constraint violation');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=duplicate_user`);
    }
    
    if (error.message && error.message.includes('Validation error')) {
      console.error('Prisma validation error');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=validation_error`);
    }
    
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
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

const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify the token with Google
    const ticket = await verifyGoogleToken(token);
    const payload = ticket.getPayload();
    
    // Extract user information from Google payload
    const { sub: googleId, name: fullName, email, picture: profilePicture } = payload;
    
    // Normalize email from Google
    const normalizedEmail = normalizeEmail(email);
    
    // Check if email is from a university
    console.log(`🔍 Checking university status for Google login email: ${normalizedEmail}`);
    const universityCheck = await checkUniversityEmail(normalizedEmail);
    console.log(`📚 University check result:`, universityCheck);
    
    // Check if user exists in your database with normalized email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { googleId }
        ]
      }
    });
    
    let subscription, availableCredits;
    
    if (!user) {
      // Create new user if doesn't exist with university status
      const userData = {
        fullName,
        email: normalizedEmail, // Store normalized email
        googleId,
        profilePicture,
        emailVerified: true, // Google emails are verified
        lastLogin: new Date(),
        isStudent: universityCheck.isUniversity,
      };
      
      // Add university name if detected
      if (universityCheck.isUniversity && universityCheck.universityName) {
        userData.universityName = universityCheck.universityName;
      }
      
      user = await prisma.user.create({
        data: userData
      });
      
      console.log(`✅ Created new Google user ${user.id} with student status: ${user.isStudent}${universityCheck.isUniversity ? ` (${universityCheck.universityName})` : ''}`);
      
      // Create Stripe customer only (no subscription yet)
      try {
        await createStripeCustomer(user.id);
      } catch (customerError) {
        console.error('Stripe customer creation failed:', customerError);
      }
      
      subscription = null;
      availableCredits = 0; // No credits without subscription
      
      // Send Google signup welcome email for new users
      try {
        await sendGoogleSignupWelcomeEmail(normalizedEmail, user.fullName);
      } catch (emailError) {
        console.error('Failed to send Google signup welcome email:', emailError);
        // Don't fail the auth process if email sending fails
      }
    } else {
      // Update existing user with university status
      const updateData = {
        lastLogin: new Date(),
        googleId: googleId || user.googleId,
        fullName: user.fullName || fullName,
        profilePicture: user.profilePicture || profilePicture,
        email: normalizedEmail, // Update email to normalized version if needed
        isStudent: universityCheck.isUniversity,
      };
      
      // Add university name if detected
      if (universityCheck.isUniversity && universityCheck.universityName) {
        updateData.universityName = universityCheck.universityName;
      }
      
      user = await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });
      
      console.log(`🔄 Updated Google user ${user.id} with student status: ${user.isStudent}${universityCheck.isUniversity ? ` (${universityCheck.universityName})` : ''}`);
      
      // Get subscription and credits
      subscription = await prisma.subscription.findUnique({
        where: { userId: user.id }
      });
      
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
      
      availableCredits = activeCredits._sum.amount || 0;
      
      // Check if this is a Google user who hasn't received welcome email yet
      // (users created before Google welcome email feature was added)
      if (user.googleId && user.createdAt < new Date('2025-08-28')) {
        try {
          await sendGoogleSignupWelcomeEmail(normalizedEmail, user.fullName);
          console.log('Sent welcome email to existing Google user:', user.id);
        } catch (emailError) {
          console.error('Failed to send welcome email to existing Google user:', emailError);
        }
      }
    }
    
    // Generate JWT token
    const jwtToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    // Return user data and token
    res.json({
      user: { ...user, password: undefined },
      subscription,
      credits: availableCredits,
      token: jwtToken
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ message: 'Google authentication failed' });
  }
};

// Verify email with token
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    // Find user with this verification token
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: {
          gt: new Date() // Token should not be expired
        }
      }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired verification token. Please request a new verification email.'
      });
    }

    // Update user to mark email as verified
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null
      }
    });

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.fullName);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    // Generate JWT token for automatic login
    const jwtToken = generateToken(user.id);

    // Fetch subscription and credits for the response
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id }
    });
    
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
    
    const availableCredits = activeCredits._sum.amount || 0; // No credits without subscription

    res.json({
      message: 'Email verified successfully! You can now access your account.',
      user: sanitizeUser(updatedUser),
      subscription: subscription || null,
      credits: availableCredits,
      token: jwtToken
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error during email verification' });
  }
};

// Resend verification email
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Normalize email
    const normalizedEmail = normalizeEmail(email);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiry: verificationExpiry
      }
    });

    // Send verification email
    try {
      await sendVerificationEmail(normalizedEmail, verificationToken, user.fullName);
      res.json({ 
        message: 'Verification email sent successfully. Please check your email.',
        emailSent: true 
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      res.status(500).json({ message: 'Failed to send verification email' });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error while resending verification email' });
  }
};

module.exports = {
  register,
  login,
  googleCallback,
  getCurrentUser,
  googleLogin,
  verifyEmail,
  resendVerificationEmail
};