const axios = require('axios');

// ManyChat API configuration
const MANYCHAT_API_URL = 'https://api.manychat.com/fb';
const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY;

/**
 * Check if a subscriber exists in ManyChat by phone number
 * @param {string} phoneNumber - The phone number to search for
 * @returns {Promise<Object|null>} Subscriber data if found, null if not found
 */
async function findSubscriberByPhone(phoneNumber) {
  try {
    if (!MANYCHAT_API_KEY) {
      throw new Error('ManyChat API key is not configured');
    }

    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // Format phone number to ensure consistency (remove spaces, add + if missing)
    const formattedPhone = formatPhoneNumber(phoneNumber);

    console.log(`🔍 Searching for subscriber with phone: ${formattedPhone}`);

    const response = await axios.get(`${MANYCHAT_API_URL}/subscriber/findBySystemField`, {
      headers: {
        'Authorization': `Bearer ${MANYCHAT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        field: 'whatsapp_phone',
        value: formattedPhone
      }
    });

    if (response.data && response.data.data && response.data.data.length > 0) {
      console.log(`✅ Found existing subscriber: ${response.data.data[0].id}`);
      return response.data.data[0];
    }

    console.log(`ℹ️ No subscriber found with phone: ${formattedPhone}`);
    return null;
  } catch (error) {
    if (error.response) {
      console.error(`❌ ManyChat API error finding subscriber:`, {
        status: error.response.status,
        data: error.response.data,
        phone: phoneNumber,
        url: `${MANYCHAT_API_URL}/subscriber/findBySystemField`,
        params: {
          field: 'whatsapp_phone',
        }
      });
      
      // If subscriber not found or validation error, return null instead of throwing
      if (error.response.status === 404 || error.response.status === 400) {
        console.log(`ℹ️ Returning null due to API error (status ${error.response.status})`);
        return null;
      }
    } else {
      console.error(`❌ Error finding subscriber:`, error.message);
    }
    throw error;
  }
}

/**
 * Create a new subscriber in ManyChat
 * @param {Object} subscriberData - Subscriber data
 * @param {string} subscriberData.phone - Phone number
 * @param {string} subscriberData.firstName - First name
 * @param {string} subscriberData.lastName - Last name
 * @param {string} subscriberData.email - Email address (optional)
 * @param {Object} subscriberData.customFields - Custom fields (optional)
 * @returns {Promise<Object>} Created subscriber data
 */
async function createSubscriber(subscriberData) {
  try {
    if (!MANYCHAT_API_KEY) {
      throw new Error('ManyChat API key is not configured');
    }

    if (!subscriberData.phone) {
      throw new Error('Phone number is required');
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(subscriberData.phone);
    console.log('formattedPhone', formattedPhone);
    console.log(`➕ Creating new subscriber with phone: ${formattedPhone}`);

    const payload = {
      phone: formattedPhone,
      whatsapp_phone: formattedPhone,
      has_opt_in_sms: true,
      consent_phrase: "I consent to receive messages.", // Required if opt-in is true
      first_name: subscriberData.firstName || '',
      last_name: subscriberData.lastName || ''
    };

    // Add custom fields if provided
    if (subscriberData.customFields && typeof subscriberData.customFields === 'object') {
      Object.assign(payload, subscriberData.customFields);
    }

    const response = await axios.post(`${MANYCHAT_API_URL}/subscriber/createSubscriber`, payload, {
      headers: {
        'Authorization': `Bearer ${MANYCHAT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Successfully created subscriber: ${response.data.data.id}`);
    return response.data.data;
  } catch (error) {
    if (error.response) {
      console.error(`❌ ManyChat API error creating subscriber:`, {
        status: error.response.status,
        data: JSON.stringify(error.response.data),
      });
      
      // Handle specific error cases
      if (error.response.status === 400) {
        const errorData = error.response.data;
        if (errorData && errorData.details && errorData.details.messages) {
          const messages = errorData.details.messages;
          
          // Check for permission errors
          if (messages.warning && messages.warning.message && 
              messages.warning.message.includes('Permission denied')) {
            console.error(`❌ ManyChat permission error: ${messages.warning.message}`);
            throw new Error('ManyChat permission denied. Please contact ManyChat support to enable phone/WhatsApp import features.');
          }
          
          // Check for channel errors
          const hasChannelError = messages?.some?.(msg => 
            msg.message && msg.message.toLowerCase().includes('channel')
          ) || false;
          
          if (hasChannelError) {
            console.error(`❌ ManyChat channel not enabled. Please enable SMS/Email channels in your ManyChat account.`);
            throw new Error('ManyChat channel not enabled. Please enable SMS/Email channels in your ManyChat account.');
          }
        }
      }
    } else {
      console.error(`❌ Error creating subscriber:`, error.message);
    }
    throw error;
  }
}

/**
 * Add subscriber to ManyChat only if they don't already exist
 * @param {Object} subscriberData - Subscriber data
 * @param {string} subscriberData.phone - Phone number
 * @param {string} subscriberData.firstName - First name
 * @param {string} subscriberData.lastName - Last name
 * @param {string} subscriberData.email - Email address (optional)
 * @param {Object} subscriberData.customFields - Custom fields (optional)
 * @returns {Promise<Object>} Subscriber data (existing or newly created)
 */
async function addSubscriberIfNotExists(subscriberData) {
  try {
    if (!subscriberData.phone) {
      throw new Error('Phone number is required');
    }

    // First, check if subscriber already exists
    const existingSubscriber = await findSubscriberByPhone(subscriberData.phone);

    if (existingSubscriber) {
      console.log(`ℹ️ Subscriber already exists, returning existing data`);
      return {
        subscriber: existingSubscriber,
        isNew: false,
        message: 'Subscriber already exists'
      };
    }

    // Subscriber doesn't exist, create new one
    console.log(`➕ Subscriber not found, creating new subscriber`);
    const newSubscriber = await createSubscriber(subscriberData);

    return {
      subscriber: newSubscriber,
      isNew: true,
      message: 'New subscriber created successfully'
    };
  } catch (error) {
    console.error(`❌ Error in addSubscriberIfNotExists:`, error.message);
    throw error;
  }
}

/**
 * Update an existing subscriber's information
 * @param {string} subscriberId - ManyChat subscriber ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated subscriber data
 */
async function updateSubscriber(subscriberId, updateData) {
  try {
    if (!MANYCHAT_API_KEY) {
      throw new Error('ManyChat API key is not configured');
    }

    if (!subscriberId) {
      throw new Error('Subscriber ID is required');
    }

    console.log(`🔄 Updating subscriber: ${subscriberId}`);

    const response = await axios.post(`${MANYCHAT_API_URL}/subscriber/setInfo`, {
      subscriber_id: subscriberId,
      ...updateData
    }, {
      headers: {
        'Authorization': `Bearer ${MANYCHAT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Successfully updated subscriber: ${subscriberId}`);
    return response.data.data;
  } catch (error) {
    if (error.response) {
      console.error(`❌ ManyChat API error updating subscriber:`, {
        status: error.response.status,
        data: error.response.data,
        subscriberId: subscriberId,
        updateData: updateData
      });
    } else {
      console.error(`❌ Error updating subscriber:`, error.message);
    }
    throw error;
  }
}

/**
 * Send a message to a subscriber
 * @param {string} subscriberId - ManyChat subscriber ID
 * @param {string} message - Message to send
 * @param {string} messageType - Type of message (text, image, etc.)
 * @returns {Promise<Object>} Message send result
 */
async function sendMessageToSubscriber(subscriberId, message, messageType = 'text') {
  try {
    if (!MANYCHAT_API_KEY) {
      throw new Error('ManyChat API key is not configured');
    }

    if (!subscriberId || !message) {
      throw new Error('Subscriber ID and message are required');
    }

    console.log(`📤 Sending message to subscriber: ${subscriberId}`);

    const payload = {
      subscriber_id: subscriberId,
      message: {
        type: messageType,
        text: message
      }
    };

    const response = await axios.post(`${MANYCHAT_API_URL}/subscriber/sendMessage`, payload, {
      headers: {
        'Authorization': `Bearer ${MANYCHAT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Message sent successfully to subscriber: ${subscriberId}`);
    return response.data.data;
  } catch (error) {
    if (error.response) {
      console.error(`❌ ManyChat API error sending message:`, {
        status: error.response.status,
        data: error.response.data,
        subscriberId: subscriberId,
        message: message
      });
    } else {
      console.error(`❌ Error sending message:`, error.message);
    }
    throw error;
  }
}

/**
 * Format phone number for consistency
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} Formatted phone number
 */
function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';

  // Remove all non-digit characters except +
  let formatted = phoneNumber.replace(/[^\d+]/g, '');

  // If it doesn't start with +, add it
  if (!formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }

  return formatted;
}

/**
 * Validate ManyChat API configuration
 * @returns {boolean} True if properly configured
 */
function validateConfiguration() {
  if (!MANYCHAT_API_KEY) {
    console.warn('⚠️ ManyChat API key is not configured. Set MANYCHAT_API_KEY environment variable.');
    return false;
  }
  return true;
}

/**
 * Test ManyChat API connection and configuration
 * @returns {Promise<Object>} Test result with status and message
 */
async function testManyChatConnection() {
  try {
    if (!validateConfiguration()) {
      return {
        success: false,
        message: 'ManyChat API key not configured'
      };
    }

    // Try to get account info to test connection
    const response = await axios.get(`${MANYCHAT_API_URL}/account`, {
      headers: {
        'Authorization': `Bearer ${MANYCHAT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      success: true,
      message: 'ManyChat API connection successful',
      accountInfo: response.data
    };
  } catch (error) {
    if (error.response) {
      return {
        success: false,
        message: `ManyChat API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        status: error.response.status,
        data: error.response.data
      };
    } else {
      return {
        success: false,
        message: `Connection error: ${error.message}`
      };
    }
  }
}

/**
 * Check ManyChat account permissions for phone/WhatsApp import
 * @returns {Promise<Object>} Permission check result
 */
async function checkManyChatPermissions() {
  try {
    if (!validateConfiguration()) {
      return {
        success: false,
        message: 'ManyChat API key not configured',
        hasPhonePermission: false,
        hasWhatsAppPermission: false
      };
    }

    // Try to create a test subscriber to check permissions
    const testPhone = '+1234567890'; // Test phone number
    const testPayload = {
      phone: testPhone,
      whatsapp_phone: testPhone,
      has_opt_in_sms: false,
      first_name: 'Test',
      last_name: 'User'
    };

    try {
      await axios.post(`${MANYCHAT_API_URL}/subscriber/createSubscriber`, testPayload, {
        headers: {
          'Authorization': `Bearer ${MANYCHAT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        message: 'ManyChat permissions are properly configured',
        hasPhonePermission: true,
        hasWhatsAppPermission: true
      };
    } catch (testError) {
      if (testError.response && testError.response.status === 400) {
        const errorData = testError.response.data;
        const hasPermissionError = errorData.details?.messages?.warning?.message?.includes('Permission denied');
        
        return {
          success: false,
          message: hasPermissionError ? 
            'ManyChat permission denied. Contact support to enable phone/WhatsApp import.' :
            'ManyChat configuration issue detected',
          hasPhonePermission: !hasPermissionError,
          hasWhatsAppPermission: !hasPermissionError,
          error: errorData
        };
      }
      throw testError;
    }
  } catch (error) {
    return {
      success: false,
      message: `Permission check failed: ${error.message}`,
      hasPhonePermission: false,
      hasWhatsAppPermission: false
    };
  }
}

module.exports = {
  findSubscriberByPhone,
  createSubscriber,
  addSubscriberIfNotExists,
  updateSubscriber,
  sendMessageToSubscriber,
  formatPhoneNumber,
  validateConfiguration,
  testManyChatConnection,
  checkManyChatPermissions
};
