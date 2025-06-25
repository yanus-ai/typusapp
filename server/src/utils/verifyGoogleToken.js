const { OAuth2Client } = require('google-auth-library');
const { GOOGLE_CLIENT_ID } = require('../config/constants');

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

async function verifyGoogleToken(token) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID
    });
    return ticket;
  } catch (error) {
    console.error('Error verifying Google token:', error);
    throw new Error('Invalid Google token');
  }
}

module.exports = { verifyGoogleToken };