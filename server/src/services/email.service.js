const postmark = require('postmark');
const crypto = require('crypto');

const client = new postmark.ServerClient(process.env.POSTMARK_API_TOKEN);

const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const generatePasswordResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const sendVerificationEmail = async (email, token, fullName) => {
  try {
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;
    
    const result = await client.sendEmailWithTemplate({
      From: process.env.POSTMARK_FROM_EMAIL,
      To: email,
      TemplateAlias: process.env.POSTMARK_VERIFICATION_TEMPLATE_ALIAS || 'welcome',
      TemplateModel: {
        action_url: verificationUrl,
        login_url: `${process.env.FRONTEND_URL}/login`,
        username: email,
        support_email: process.env.SUPPORT_EMAIL || 'support@yourdomain.com',
        help_url: `${process.env.FRONTEND_URL}/help`,
        product_name: 'Typus',
        product_url: process.env.FRONTEND_URL,
        name: fullName,
        sender_name: 'Typus Team',
        company_name: 'Typus',
        company_address: process.env.COMPANY_ADDRESS || ''
      }
    });
    
    console.log('Verification email sent successfully:', result.MessageID);
    return result;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

const sendWelcomeEmail = async (email, fullName) => {
  try {
    const result = await client.sendEmailWithTemplate({
      From: process.env.POSTMARK_FROM_EMAIL || 'noreply@yourdomain.com',
      To: email,
      TemplateAlias: process.env.POSTMARK_WELCOME_TEMPLATE_ALIAS || 'welcome-6',
      TemplateModel: {
        action_url: `${process.env.FRONTEND_URL}/create`,
        support_email: process.env.SUPPORT_EMAIL || 'support@yourdomain.com',
        live_chat_url: process.env.LIVE_CHAT_URL || `${process.env.FRONTEND_URL}/support`,
        list_url: `${process.env.FRONTEND_URL}/gallery`,
        product_name: 'Typus',
        product_url: process.env.FRONTEND_URL,
        name: fullName,
        login_url: `${process.env.FRONTEND_URL}/auth/login`,
        username: email,
        trial_length: process.env.TRIAL_LENGTH || '7 days',
        trial_start_date: new Date().toLocaleDateString(),
        trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        sender_name: 'Typus Team',
        help_url: `${process.env.FRONTEND_URL}/help`,
        company_name: 'Typus',
        company_address: process.env.COMPANY_ADDRESS || ''
      }
    });
    
    console.log('Welcome email sent successfully:', result.MessageID);
    return result;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error for welcome email as it's not critical
  }
};

const sendGoogleSignupWelcomeEmail = async (email, fullName) => {
  try {
    const result = await client.sendEmailWithTemplate({
      From: process.env.POSTMARK_FROM_EMAIL || 'noreply@yourdomain.com',
      To: email,
      TemplateAlias: process.env.POSTMARK_GOOGLE_WELCOME_TEMPLATE_ALIAS || 'welcome-7',
      TemplateModel: {
        login_url: `${process.env.FRONTEND_URL}/login`,
        username: email,
        support_email: process.env.SUPPORT_EMAIL || 'support@yourdomain.com',
        live_chat_url: process.env.LIVE_CHAT_URL || `${process.env.FRONTEND_URL}/support`,
        help_url: `${process.env.FRONTEND_URL}/help`,
        product_name: 'Typus',
        product_url: process.env.FRONTEND_URL,
        name: fullName,
        action_url: `${process.env.FRONTEND_URL}/create`,
        trial_length: process.env.TRIAL_LENGTH || '7 days',
        trial_start_date: new Date().toLocaleDateString(),
        trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        sender_name: 'Typus Team',
        company_name: 'Typus',
        company_address: process.env.COMPANY_ADDRESS || ''
      }
    });
    
    console.log('Google signup welcome email sent successfully:', result.MessageID);
    return result;
  } catch (error) {
    console.error('Error sending Google signup welcome email:', error);
    // Don't throw error for welcome email as it's not critical
  }
};

const sendPasswordResetEmail = async (email, token, fullName) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;

    const result = await client.sendEmail({
        From: process.env.POSTMARK_FROM_EMAIL,
        To: email,
        Subject: 'Reset Your Password - Typus.ai',
        HtmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Reset Your Password</h2>
            <p>Hello ${fullName || 'there'},</p>
            <p>We received a request to reset your password for your Typus.ai account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              This email was sent by Typus.ai. If you need help, contact us at hello@typus.ai.
            </p>
          </div>
        `,
        TextBody: `
Reset Your Password - Typus.ai

Hello ${fullName || 'there'},

We received a request to reset your password for your Typus.ai account.

To reset your password, visit this link:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email.

---
This email was sent by Typus.ai. If you need help, contact us at hello@typus.ai.
        `
    });

    console.log('Password reset email sent successfully (plain email):', result.MessageID);
    return result;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

module.exports = {
  generateVerificationToken,
  generatePasswordResetToken,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendGoogleSignupWelcomeEmail,
  sendPasswordResetEmail
};