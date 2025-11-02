// server/src/controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { prisma } = require('../services/prisma.service');
// const { createStripeCustomer } = require('../services/subscriptions.service'); // Only used during subscription creation
const { checkUniversityEmail } = require('../services/universityService');
const verifyGoogleToken = require('../utils/verifyGoogleToken');
const { generateVerificationToken, generatePasswordResetToken, sendVerificationEmail, sendGoogleSignupWelcomeEmail, sendEducationSignupWelcomeEmail, sendPasswordResetEmail } = require('../services/email.service');
const bigMailerService = require('../services/bigmailer.service');
const gtmTrackingService = new (require('../services/gtmTracking.service'))(prisma);
const manyChatService = require('../services/manychat.service');

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
    const { email, password, acceptTerms, acceptMarketing, recaptchaToken } = req.body;

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

    // Validate required terms acceptance
    if (!acceptTerms) {
      return res.status(400).json({ message: 'You must accept the terms and conditions to create an account' });
    }

    // Create user only (no subscription - user must purchase plan)
    const now = new Date();
    const user = await prisma.user.create({
      data: {
        fullName: '',
        email: normalizedEmail, // Store normalized email
        password: hashedPassword,
        emailVerified: false, // Set to false initially
        isStudent,
        universityName,
        verificationToken,
        verificationTokenExpiry: verificationExpiry,
        lastLogin: now,
        acceptedTerms: acceptTerms || false,
        acceptedTermsAt: acceptTerms ? now : null,
        acceptedMarketing: acceptMarketing || false,
        acceptedMarketingAt: acceptMarketing ? now : null
      }
    });

    // Create Stripe customer only (no subscription yet)
    try {
      // await createStripeCustomer(user.id);
    } catch (customerError) {
      console.error('Stripe customer creation failed:', customerError);
      // User still exists, customer can be created later
    }

    // Send verification email
    try {
      await sendVerificationEmail(normalizedEmail, verificationToken, 'Anonymous');
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email sending fails
    }

    // Send education welcome email for students
    if (isStudent) {
      try {
        await sendEducationSignupWelcomeEmail(normalizedEmail, 'Anonymous');
        console.log('Education signup welcome email sent successfully for student:', normalizedEmail);
      } catch (emailError) {
        console.error('Failed to send education signup welcome email:', emailError);
        // Don't fail registration if email sending fails
      }
    }

    // track login GTM event
    try {
      await gtmTrackingService.saveUserData(user.id, req);
    } catch (gtmTrackingError) {
      console.error('Failed to track GTM event:', gtmTrackingError);
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
    const { email, password, mode } = req.body;

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
    const activeCredits = user.remainingCredits

    const availableCredits = activeCredits || 0;

    // track login GTM event
    try {
      await gtmTrackingService.saveUserData(user.id, req);
      await gtmTrackingService.trackEvents(user.id, [{
        name: "login",
      }]);
    } catch (gtmTrackingError) {
      console.error('Failed to track GTM event:', gtmTrackingError);
    }

    // Create token
    const token = generateToken(user.id);

    // Check if mode=rhinologin and redirect to external URL
    if (mode === 'rhinologin' || mode === 'sketchuplogin' || mode === 'archicadlogin') {
      return res.json({
        user: sanitizeUser(user),
        subscription: subscription || null,
        credits: availableCredits,
        token,
        redirect: `http://localhost:52572/?token=${token}`
      });
    }

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

    // Check if email is from a university
    let isStudent = false;
    let universityName = null;

    try {
      const universityCheck = await checkUniversityEmail(normalizedEmail);
      if (universityCheck.isUniversity) {
        isStudent = true;
        universityName = universityCheck.universityName;
        console.log(`🎓 Google user from university detected: ${universityCheck.universityName}`);
      }
    } catch (universityError) {
      console.warn('University email verification failed for Google user:', universityError);
      // Continue with registration even if university check fails
    }

    // Check if user exists in database
    let existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    console.log(`🔍 Google OAuth user lookup for email: ${normalizedEmail}, found:`, existingUser ? { id: existingUser.id, email: existingUser.email, googleId: existingUser.googleId, createdAt: existingUser.createdAt } : 'null');

    // If user doesn't exist, create a new one (sign up)
    if (!existingUser) {
      console.log('Creating new user for email:', normalizedEmail);

      // Create the new user with proper validation (no subscription)
      const now = new Date();
      const userData = {
        fullName: googleUser.displayName || googleUser.name || 'Google User',
        email: normalizedEmail,
        googleId: googleUser.id?.toString(), // Ensure it's a string
        profilePicture: googleUser.photos?.[0]?.value || null,
        emailVerified: true, // Google emails are verified
        isStudent,
        universityName,
        lastLogin: now,
        acceptedTerms: true, // Google users implicitly accept terms by signing in
        acceptedTermsAt: now,
        acceptedMarketing: true, // Google users default to marketing consent
        acceptedMarketingAt: now
      };

      console.log('🔍 Creating Google user with data:', JSON.stringify({
        email: userData.email,
        acceptedTerms: userData.acceptedTerms,
        acceptedMarketing: userData.acceptedMarketing,
        acceptedTermsAt: userData.acceptedTermsAt,
        acceptedMarketingAt: userData.acceptedMarketingAt
      }, null, 2));

      existingUser = await prisma.user.create({
        data: userData
      });

      console.log('✅ Google user created with consent fields:', {
        id: existingUser.id,
        email: existingUser.email,
        acceptedTerms: existingUser.acceptedTerms,
        acceptedMarketing: existingUser.acceptedMarketing,
        acceptedTermsAt: existingUser.acceptedTermsAt,
        acceptedMarketingAt: existingUser.acceptedMarketingAt
      });

      console.log('New user created:', existingUser.id);
      
      // Send Google signup welcome email for new users
      try {
        await sendGoogleSignupWelcomeEmail(normalizedEmail, existingUser.fullName);
      } catch (emailError) {
        console.error('Failed to send Google signup welcome email:', emailError);
        // Don't fail the auth process if email sending fails
      }

      // Create contact in BigMailer for new Google users (they don't need email verification)
      // Only create if user has consented to marketing emails
      if (existingUser.acceptedMarketing) {
        try {
          await bigMailerService.createContact({
            email: normalizedEmail,
            fullName: existingUser.fullName,
            isStudent: existingUser.isStudent,
            universityName: existingUser.universityName
          });
        } catch (bigMailerError) {
          console.error('Failed to create BigMailer contact for Google signup:', bigMailerError);
          // Don't fail the auth process if BigMailer contact creation fails
        }
      }
    } else {
      console.log('Existing user found:', existingUser.id);
      // Update last login and Google ID if not set
      existingUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          lastLogin: new Date(),
          googleId: existingUser.googleId || googleUser.id?.toString(),
          emailVerified: true,
          isStudent,
          universityName
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

      // For existing users, ensure BigMailer contact exists (upsert operation)
      // Only create if user has consented to marketing emails
      if (existingUser.acceptedMarketing) {
        try {
          await bigMailerService.createContact({
            email: normalizedEmail,
            fullName: existingUser.fullName,
            isStudent: existingUser.isStudent,
            universityName: existingUser.universityName
          });
          console.log(`✅ Ensured BigMailer contact exists for existing Google user: ${existingUser.email}`);
        } catch (bigMailerError) {
          console.error('Failed to ensure BigMailer contact for existing Google user:', bigMailerError);
          // Don't fail the auth process if BigMailer contact creation fails
        }
      }
    }

    // track login GTM event
    try {
      await gtmTrackingService.saveUserData(existingUser.id, req);
      await gtmTrackingService.trackEvents(existingUser.id, [{
        name: "sign_up",
        params: {
          event_id: ['sign_up', existingUser.id].join('-')
        }
      }]);
    } catch (gtmTrackingError) {
      console.error('Failed to track GTM event:', gtmTrackingError);
    }

    // Generate JWT token
    const token = generateToken(existingUser.id);
    
    // Check if mode=rhinologin was passed in the state parameter
    const mode = req.query.state;
    
    if (mode === 'rhinologin' || mode === 'sketchuplogin' || mode === 'archicadlogin') {
      // Redirect to external URL with token
      return res.redirect(`http://localhost:52572/?token=${token}`);
    }
    
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
    const userId = req.user.id;
    console.log(`🔍 getCurrentUser called for user ${userId}`);

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.log(`❌ User ${userId} not found in database`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch subscription details
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id }
    });

    console.log(`🔍 getCurrentUser subscription data for user ${userId}:`, {
      found: !!subscription,
      status: subscription?.status,
      planType: subscription?.planType,
      stripeSubscriptionId: subscription?.stripeSubscriptionId,
      billingCycle: subscription?.billingCycle
    });

    // Use direct user credit field (consistent with subscription service)
    const availableCredits = user.remainingCredits || 0;
    console.log(`🔍 getCurrentUser credits for user ${userId}: ${availableCredits}`);

    const responseData = {
      user: sanitizeUser(user),
      subscription: subscription || null,
      credits: availableCredits
    };

    console.log(`✅ getCurrentUser returning data for user ${userId}:`, responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error while fetching user profile' });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { token, mode } = req.body;
    
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
      const now = new Date();
      const userData = {
        fullName,
        email: normalizedEmail, // Store normalized email
        googleId,
        profilePicture,
        emailVerified: true, // Google emails are verified
        lastLogin: now,
        isStudent: universityCheck.isUniversity,
        acceptedTerms: true, // Google users implicitly accept terms by signing in
        acceptedTermsAt: now,
        acceptedMarketing: true, // Google users default to marketing consent
        acceptedMarketingAt: now
      };

      // Add university name if detected
      if (universityCheck.isUniversity && universityCheck.universityName) {
        userData.universityName = universityCheck.universityName;
      }

      console.log('🔍 Creating Google user (client-side) with data:', JSON.stringify({
        email: userData.email,
        acceptedTerms: userData.acceptedTerms,
        acceptedMarketing: userData.acceptedMarketing,
        acceptedTermsAt: userData.acceptedTermsAt,
        acceptedMarketingAt: userData.acceptedMarketingAt
      }, null, 2));

      user = await prisma.user.create({
        data: userData
      });

      console.log('✅ Google user (client-side) created with consent fields:', {
        id: user.id,
        email: user.email,
        acceptedTerms: user.acceptedTerms,
        acceptedMarketing: user.acceptedMarketing,
        acceptedTermsAt: user.acceptedTermsAt,
        acceptedMarketingAt: user.acceptedMarketingAt
      });

      console.log(`✅ Created new Google user ${user.id} with student status: ${user.isStudent}${universityCheck.isUniversity ? ` (${universityCheck.universityName})` : ''}`);
      
      // Create Stripe customer only when subscription is created
      // try {
      //   await createStripeCustomer(user.id);
      // } catch (customerError) {
      //   console.error('Stripe customer creation failed:', customerError);
      // }
      
      subscription = null;
      availableCredits = 0; // No credits without subscription
      
      // Send Google signup welcome email for new users
      try {
        if (user.isStudent) {
          await sendEducationSignupWelcomeEmail(normalizedEmail, user.fullName);
          console.log('Education signup welcome email sent successfully for Google student:', normalizedEmail);
        } else {
          await sendGoogleSignupWelcomeEmail(normalizedEmail, user.fullName);
        }
      } catch (emailError) {
        console.error('Failed to send Google signup welcome email:', emailError);
        // Don't fail the auth process if email sending fails
      }

      // Create contact in BigMailer for new Google users (they don't need email verification)
      // Only create if user has consented to marketing emails
      if (user.acceptedMarketing) {
        try {
          await bigMailerService.createContact({
            email: normalizedEmail,
            fullName: user.fullName,
            isStudent: universityCheck.isUniversity,
            universityName: universityCheck.universityName
          });
        } catch (bigMailerError) {
          console.error('Failed to create BigMailer contact for Google login:', bigMailerError);
          // Don't fail the auth process if BigMailer contact creation fails
        }
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
      const activeCredits = user.remainingCredits || 0;

      availableCredits = activeCredits || 0;

      // Check if this is a Google user who hasn't received welcome email yet
      // (users created before Google welcome email feature was added)
      if (user.googleId && user.createdAt < new Date('2025-08-28')) {
        try {
          if (user.isStudent) {
            await sendEducationSignupWelcomeEmail(normalizedEmail, user.fullName);
            console.log('Sent education welcome email to existing Google student user:', user.id);
          } else {
            await sendGoogleSignupWelcomeEmail(normalizedEmail, user.fullName);
            console.log('Sent welcome email to existing Google user:', user.id);
          }
        } catch (emailError) {
          console.error('Failed to send welcome email to existing Google user:', emailError);
        }
      }
    }
    
    // track login GTM event
    try {
      await gtmTrackingService.saveUserData(user.id, req);
      await gtmTrackingService.trackEvents(user.id, [{
        name: "login",
      }]);
      
    } catch (gtmTrackingError) {
      console.error('Failed to track GTM event:', gtmTrackingError);
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    // Check if mode=rhinologin and include redirect URL
    if (mode === 'rhinologin' || mode === 'sketchuplogin' || mode === 'archicadlogin') {
      return res.json({
        user: { ...user, password: undefined },
        subscription,
        credits: availableCredits,
        token: jwtToken,
        redirect: `http://localhost:52572/?token=${jwtToken}`
      });
    }
    
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
    
    // Create contact in BigMailer after successful verification
    // Only create if user has consented to marketing emails
    if (user.acceptedMarketing) {
      try {
        await bigMailerService.createContact({
          email: user.email,
          fullName: user.fullName,
          isStudent: user.isStudent,
          universityName: user.universityName
        });
      } catch (bigMailerError) {
        console.error('Failed to create BigMailer contact:', bigMailerError);
        // Don't fail verification if BigMailer contact creation fails
      }
    }

    // Add to ManyChat if onboarding is completed and has phone number
    try {
      const onboarding = await prisma.onboarding.findUnique({
        where: { userId: user.id }
      });

      if (onboarding && onboarding.phoneNumber) {
        console.log(`📱 Adding user to ManyChat after email verification with phone: ${onboarding.phoneNumber}`);
        
        const firstName = user.fullName?.split(' ')[0] || '';
        const lastName = user.fullName?.split(' ').slice(1).join(' ') || '';
        
        const manychatResult = await manyChatService.addSubscriberIfNotExists({
          phone: onboarding.phoneNumber,
          firstName: firstName,
          lastName: lastName,
          email: user.email,
          customFields: {
            company_name: onboarding.companyName || '',
            software: onboarding.software || '',
            status: onboarding.status || '',
            time_on_renderings: onboarding.timeOnRenderings || '',
            money_spent_for_one_image: onboarding.moneySpentForOneImage || '',
            street_and_number: onboarding.streetAndNumber || '',
            city: onboarding.city || '',
            postcode: onboarding.postcode || '',
            state: onboarding.state || '',
            country: onboarding.country || '',
            user_id: user.id.toString()
          }
        });

        if (manychatResult.isNew) {
          console.log(`✅ New subscriber added to ManyChat after email verification: ${manychatResult.subscriber.id}`);
        } else {
          console.log(`ℹ️ Subscriber already exists in ManyChat: ${manychatResult.subscriber.id}`);
        }
      }
    } catch (manychatError) {
      // Log error but don't fail the verification process
      console.error('❌ Error adding user to ManyChat after email verification:', manychatError.message);
      console.error('Email verification will continue without ManyChat integration');
    }

    // track sign_up GTM event
    try {
      await gtmTrackingService.saveUserData(user.id, req);
      await gtmTrackingService.trackEvents(user.id, [{
        name: "sign_up",
        params: {
          event_id: ['sign_up', user.id].join('-')
        }
      }]);
    } catch (gtmTrackingError) {
      console.error('Failed to track GTM event:', gtmTrackingError);
    }

    // Generate JWT token for automatic login
    const jwtToken = generateToken(user.id);

    // Fetch subscription and credits for the response
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id }
    });
    
    const activeCredits = user.remainingCredits || 0;

    const availableCredits = activeCredits || 0; // No credits without subscription

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

// Request password reset
const forgotPassword = async (req, res) => {
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

    // Check if email exists
    if (!user) {
      return res.status(404).json({
        message: 'No account found with this email address. Please check your email or sign up for a new account.',
        emailSent: false
      });
    }

    // Check if user is a Google OAuth user (has googleId but no password)
    if (user.googleId && !user.password) {
      return res.status(400).json({
        message: 'This account was created with Google. Please sign in using the "Continue with Google" button instead.',
        emailSent: false,
        useGoogleAuth: true
      });
    }

    // Generate password reset token
    const resetToken = generatePasswordResetToken();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetTokenExpiry: resetTokenExpiry
      }
    });

    // Send password reset email
    try {
      await sendPasswordResetEmail(normalizedEmail, resetToken, user.fullName);
      res.json({
        message: 'Password reset email sent successfully! Check your email for the reset link.',
        emailSent: true
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      res.status(500).json({
        message: 'We found your account but had trouble sending the email. Please try again later or contact support.',
        emailSent: false
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    // Find user with this reset token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetTokenExpiry: {
          gt: new Date() // Token should not be expired
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired password reset token. Please request a new password reset.'
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password and clear reset token
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpiry: null
      }
    });

    // Generate JWT token for automatic login
    const jwtToken = generateToken(user.id);

    // Fetch subscription and credits for the response
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id }
    });

    const availableCredits = user.remainingCredits || 0;

    res.json({
      message: 'Password has been reset successfully! You are now logged in.',
      user: sanitizeUser(updatedUser),
      subscription: subscription || null,
      credits: availableCredits,
      token: jwtToken
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

module.exports = {
  register,
  login,
  googleCallback,
  getCurrentUser,
  googleLogin,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword
};