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
        // Extract user information from Google profile
        const { id: googleId, displayName: fullName, emails, photos } = profile;
        const email = emails[0].value;
        const profilePicture = photos?.[0]?.value;
        
        // Check if user exists
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { email },
              { googleId }
            ]
          }
        });
        
        if (!user) {
          // Create new user if doesn't exist
          const result = await prisma.$transaction(async (tx) => {
            // Create the new user
            const user = await tx.user.create({
              data: {
                fullName,
                email,
                googleId,
                profilePicture,
                lastLogin: new Date()
              }
            });
            
            // Create free subscription
            const subscription = await createFreeSubscription(user.id, tx);
            
            return { user };
          });
          
          user = result.user;
        } else {
          // Update existing user
          user = await prisma.user.update({
            where: { id: user.id },
            data: { 
              lastLogin: new Date(),
              googleId: googleId || user.googleId,
              fullName: user.fullName || fullName,
              profilePicture: user.profilePicture || profilePicture
            }
          });
        }
        
        // Pass user to done callback
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