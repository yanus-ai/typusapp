// server/src/middleware/auth.middleware.js
const passport = require('passport');

const authenticateJwt = passport.authenticate('jwt', { session: false });

module.exports = {
  authenticateJwt
};