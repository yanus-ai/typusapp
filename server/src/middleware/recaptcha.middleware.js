const axios = require('axios');

const verifyRecaptcha = async (req, res, next) => {
  try {
    const { recaptchaToken } = req.body;

    // Skip reCAPTCHA verification in development if token is missing or environment variable is not set
    if (!recaptchaToken || !process.env.RECAPTCHA_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY === 'your_secret_key_here') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Skipping reCAPTCHA verification in development mode');
        return next();
      } else {
        return res.status(400).json({ message: 'reCAPTCHA verification required' });
      }
    }

    // Verify the reCAPTCHA token with Google
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: recaptchaToken,
        remoteip: req.ip
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { success, score, action, hostname } = response.data;

    console.log('reCAPTCHA verification result:', {
      success,
      score,
      action,
      hostname,
      errors: response.data['error-codes']
    });

    if (!success) {
      return res.status(400).json({
        message: 'reCAPTCHA verification failed. Please try again.',
        errors: response.data['error-codes']
      });
    }

    // For reCAPTCHA v3, check the score (0.0 to 1.0, higher is better)
    // Scores below 0.5 are typically considered suspicious
    if (score && score < 0.5) {
      console.warn(`Low reCAPTCHA score: ${score} for action: ${action}`);
      return res.status(400).json({
        message: 'reCAPTCHA verification failed. Please try again.'
      });
    }

    // Verify the action is one of the expected actions
    const validActions = ['register', 'login', 'submit'];
    if (action && !validActions.includes(action)) {
      console.warn(`Unexpected reCAPTCHA action: ${action}, expected one of: ${validActions.join(', ')}`);
      return res.status(400).json({
        message: 'reCAPTCHA verification failed. Invalid action.'
      });
    }

    console.log('✅ reCAPTCHA verification successful');
    next();
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);

    // In development, continue without blocking
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ reCAPTCHA verification failed in development mode, continuing...');
      return next();
    }

    res.status(500).json({ message: 'reCAPTCHA verification failed due to server error' });
  }
};

module.exports = { verifyRecaptcha };