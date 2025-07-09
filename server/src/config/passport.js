const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const { prisma } = require('../services/prisma.service');
const { createFreeSubscription } = require('../services/subscriptions.service');

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
          // Create new user with normalized email
          const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
              data: {
                googleId: profile.id,
                email: normalizedEmail, // Store normalized email
                fullName: profile.displayName,
                profilePicture: profile.photos[0].value,
                emailVerified: true,
                lastLogin: new Date()
              }
            });
            
            // Create free subscription
            const subscription = await createFreeSubscription(user.id, tx);
            
            return { user, subscription };
          });
          
          user = result.user;
        } else {
          // Update existing user
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              lastLogin: new Date(),
              googleId: profile.id,
              email: normalizedEmail, // Update to normalized email if needed
              fullName: user.fullName || profile.displayName,
              profilePicture: user.profilePicture || profile.photos[0].value,
              emailVerified: user.emailVerified || true
            }
          });
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