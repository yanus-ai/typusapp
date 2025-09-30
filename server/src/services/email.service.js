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

    const result = await client.sendEmailWithTemplate({
      From: process.env.POSTMARK_FROM_EMAIL,
      To: email,
      TemplateAlias: process.env.POSTMARK_PASSWORD_RESET_TEMPLATE_ALIAS || 'password-reset',
      TemplateModel: {
        action_url: resetUrl,
        login_url: `${process.env.FRONTEND_URL}/login`,
        username: email,
        support_email: process.env.SUPPORT_EMAIL || 'support@yourdomain.com',
        help_url: `${process.env.FRONTEND_URL}/help`,
        product_name: 'Typus',
        product_url: process.env.FRONTEND_URL,
        name: fullName,
        sender_name: 'Typus Team',
        company_name: 'Typus',
        company_address: process.env.COMPANY_ADDRESS || '',
        reset_url: resetUrl
      }
    });

    console.log('Password reset email sent successfully:', result.MessageID);
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