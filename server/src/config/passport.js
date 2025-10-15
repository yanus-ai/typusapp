const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const { prisma } = require('../services/prisma.service');
const { createStripeCustomer } = require('../services/subscriptions.service');
const { checkUniversityEmail } = require('../services/universityService');
const { sendGoogleSignupWelcomeEmail } = require('../services/email.service');

// Configure JWT strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

passport.use(
  new JwtStrategy(jwtOptions, async (jwt_payload, done) => {
    try {
      // Find the user by id from JWT payload
      const user = await prisma.user.findUnique({
        where: { id: jwt_payload.id }
      });

      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (error) {
      return done(error, false);
    }
  })
);

// Helper function to normalize email
const normalizeEmail = (email) => {
  return email.toLowerCase().trim();
};

// Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const normalizedEmail = normalizeEmail(email);
        
        // Check if email is from a university
        console.log(`🔍 Checking university status for email: ${normalizedEmail}`);
        const universityCheck = await checkUniversityEmail(normalizedEmail);
        console.log(`📚 University check result:`, universityCheck);
        
        // Check if user exists with normalized email
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: normalizedEmail },
              { googleId: profile.id }
            ]
          }
        });

        if (!user) {
          // Create new user with normalized email and university status
          const now = new Date();
          const userData = {
            googleId: profile.id,
            email: normalizedEmail, // Store normalized email
            fullName: profile.displayName,
            profilePicture: profile.photos[0].value,
            emailVerified: true,
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

          console.log('🔍 Creating Google user (Passport) with data:', JSON.stringify({
            email: userData.email,
            acceptedTerms: userData.acceptedTerms,
            acceptedMarketing: userData.acceptedMarketing,
            acceptedTermsAt: userData.acceptedTermsAt,
            acceptedMarketingAt: userData.acceptedMarketingAt
          }, null, 2));

          user = await prisma.user.create({
            data: userData
          });

          console.log('✅ Google user (Passport) created with consent fields:', {
            id: user.id,
            email: user.email,
            acceptedTerms: user.acceptedTerms,
            acceptedMarketing: user.acceptedMarketing,
            acceptedTermsAt: user.acceptedTermsAt,
            acceptedMarketingAt: user.acceptedMarketingAt
          });
          
          console.log(`✅ Created new user ${user.id} with student status: ${user.isStudent}${universityCheck.isUniversity ? ` (${universityCheck.universityName})` : ''}`);

          // Send welcome email for new Google signups
          try {
            console.log(`📧 Sending Google signup welcome email to: ${user.email}`);
            await sendGoogleSignupWelcomeEmail(user.email, user.fullName);
            console.log(`✅ Welcome email sent successfully to: ${user.email}`);
          } catch (emailError) {
            console.error(`❌ Failed to send welcome email to ${user.email}:`, emailError.message);
            // Don't fail the authentication process if email fails
          }

          // Create Stripe customer only (no subscription yet)
          // await createStripeCustomer(user.id);
        } else {
          // Update existing user with university status
          const updateData = {
            lastLogin: new Date(),
            googleId: profile.id,
            email: normalizedEmail, // Update to normalized email if needed
            fullName: user.fullName || profile.displayName,
            profilePicture: user.profilePicture || profile.photos[0].value,
            emailVerified: user.emailVerified || true,
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
          
          console.log(`🔄 Updated user ${user.id} with student status: ${user.isStudent}${universityCheck.isUniversity ? ` (${universityCheck.universityName})` : ''}`);
        }

        return done(null, user);
      } catch (error) {
        console.error('Google strategy error:', error);
        return done(error, null);
      }
    }
  )
);

// User serialization for sessions
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id }
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;