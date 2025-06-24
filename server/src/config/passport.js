const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { prisma } = require('../services/prisma.service');

module.exports = () => {
  // JWT Strategy for API protection
  const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET
  };

  passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.id }
      });

      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }));

  // Google Strategy for OAuth login
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // For mock implementation, we'll use hardcoded data
      // In production, you'd use the actual profile data
      const mockProfile = {
        id: profile.id || 'google123456',
        email: profile.emails?.[0]?.value || 'mock@example.com',
        name: profile.displayName || 'Mock User'
      };

      // Check if user exists
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: mockProfile.email },
            { googleId: mockProfile.id }
          ]
        }
      });

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            fullName: mockProfile.name,
            email: mockProfile.email,
            googleId: mockProfile.id,
            lastLogin: new Date()
          }
        });
      } else {
        // Update user if needed
        if (!user.googleId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId: mockProfile.id,
              lastLogin: new Date()
            }
          });
        } else {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          });
        }
      }

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }));
};