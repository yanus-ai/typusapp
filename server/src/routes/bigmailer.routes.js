const express = require('express');
const router = express.Router();
const bigMailerService = require('../services/bigmailer.service');
const jwt = require('jsonwebtoken');
const postmark = require('postmark');

const postmarkClient = new postmark.ServerClient(process.env.POSTMARK_API_TOKEN);

// Helper: send email with verification link via Postmark
async function sendVerificationLink(email, link) {
  const fromEmail = process.env.POSTMARK_FROM_EMAIL;
  
  if (!fromEmail) {
    throw new Error('POSTMARK_FROM_EMAIL environment variable is not set');
  }

  try {
    await postmarkClient.sendEmail({
      From: fromEmail,
      To: email,
      Subject: 'Verify your email for BigMailer',
      HtmlBody: `<p>Click the link to verify and add your email to BigMailer: <a href="${link}">${link}</a><br><br>This link will expire in ${(process.env.JWT_EXPIRES_IN || '10m')}.</p>`,
      TextBody: `Your verification link: ${link}\n\nThis link will expire in ${(process.env.JWT_EXPIRES_IN || '10m')}.`
    });
  } catch (error) {
    // Handle Postmark-specific errors
    if (error.code === 400 && error.message?.includes('Sender Signature')) {
      throw new Error(`The 'From' address (${fromEmail}) is not verified in Postmark. Please add and confirm this address as a Sender Signature in your Postmark account.`);
    }
    throw error;
  }
}

// 1. Request verification (sends JWT link)
router.post('/request-verification-jwt', async (req, res) => {
  const { email, fullName, isStudent, universityName } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }
  try {
    // Prepare token payload - never put secrets here
    const payload = {
      email,
      fullName,
      isStudent,
      universityName
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '10m' });
    // Use backend URL for the verification link (backend will redirect to frontend)
    const backendUrl = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:3000';
    const link = `${backendUrl}/api/bigmailer/verify?token=${encodeURIComponent(token)}`;
    await sendVerificationLink(email, link);
    return res.json({ success: true, message: 'Verification link sent.' });
  } catch (err) {
    console.error('Error sending verification link:', err);
    
    // Provide specific error messages for common issues
    let errorMessage = 'Failed to send verification link.';
    
    if (err.message?.includes('Sender Signature')) {
      errorMessage = err.message;
    } else if (err.message?.includes('POSTMARK_FROM_EMAIL')) {
      errorMessage = 'Email service configuration error. Please contact support.';
    } else if (err.response?.data?.Message) {
      errorMessage = err.response.data.Message;
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    return res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

// 2. New verification endpoint to complete addition
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  const frontendUrl = 'https://www.typus.ai';
  
  if (!token) {
    const message = encodeURIComponent('Missing verification token');
    return res.redirect(`${frontendUrl}?status=error&message=${message}`);
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { email, fullName, isStudent, universityName } = decoded;
    
    // Call BigMailer
    const result = await bigMailerService.createContact({ email, fullName, isStudent, universityName });
    
    if (result && result.success) {
      // Success - redirect with success status and message
      const message = encodeURIComponent(`Email ${email} verified and added to BigMailer successfully`);
      return res.redirect(`${frontendUrl}?status=success&message=${message}`);
    } else {
      // BigMailer failed
      const errorMsg = encodeURIComponent(result?.error || 'Failed to add email to BigMailer');
      return res.redirect(`${frontendUrl}?status=error&message=${errorMsg}`);
    }
  } catch (err) {
    let errorMessage = 'Invalid verification token';
    
    if (err.name === 'TokenExpiredError') {
      errorMessage = 'Your verification link has expired. Please request a new one.';
    } else if (err.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid verification token';
    }
    
    const encodedError = encodeURIComponent(errorMessage);
    return res.redirect(`${frontendUrl}?status=error&message=${encodedError}`);
  }
});

module.exports = router;


