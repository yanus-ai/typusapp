// server/src/middleware/auth.middleware.js
const passport = require('passport');

const authenticateJwt = passport.authenticate('jwt', { session: false });

// Optional authentication - doesn't fail if no token provided
const authenticateJwtOptional = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    // If there's an error, pass it along
    if (err) {
      return next(err);
    }

    // If user is found, attach to request
    if (user) {
      req.user = user;
    }

    // Always proceed to next middleware, regardless of authentication status
    next();
  })(req, res, next);
};

module.exports = {
  authenticateJwt,
  authenticateJwtOptional
};