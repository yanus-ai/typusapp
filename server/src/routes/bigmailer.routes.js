const express = require('express');
const router = express.Router();
const bigMailerService = require('../services/bigmailer.service');

// Create or update a BigMailer contact
router.post('/contacts', async (req, res) => {
  try {
    console.log('req.body', req.body);
    const { email, fullName, isStudent, universityName } = req.body || {};

    console.log('email', email);

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    console.log('done', email);

    const result = await bigMailerService.createContact({
      email: email.trim(),
      fullName,
      isStudent,
      universityName
    });

    if (result && result.success) {
      return res.status(200).json({
        success: true,
        contactId: result.contactId,
        data: result.data
      });
    }

    return res.status(502).json({
      success: false,
      error: result?.error || 'Failed to create contact',
      status: result?.status,
      data: result?.data
    });
  } catch (error) {
    console.error('BigMailer contact creation endpoint error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;


