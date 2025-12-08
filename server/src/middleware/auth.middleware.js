const passport = require('passport');
const { getIpAddressInfoFromRequest, getIpAddressInfo } = require('../services/ipaddress.service');
const { prisma } = require('../services/prisma.service');

const authenticateJwt = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, async (err, user, info) => {
    // Handle authentication errors
    if (err) {
      return res.status(500).json({
        message: 'Authentication error occurred',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }

    // Check if user was found (required for this middleware)
    if (!user) {      
      return res.status(401).json({
        message: 'Authentication required',
        error: 'Invalid or missing authentication token'
      });
    }

    if (!user.currency || !user.country_code) {
      const ipAddressInfo = await getIpAddressInfo(await getIpAddressInfoFromRequest(req));
      if (ipAddressInfo) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            country_code: ipAddressInfo.country_code,
            currency: ipAddressInfo.currency.code,
          }
        })
      }
    }

    // Attach user to request
    req.user = user;

    next();
  })(req, res, next);
};

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