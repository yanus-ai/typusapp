const axios = require('axios');

class BigMailerService {
  constructor() {
    this.apiKey = process.env.BIGMAILER_API_KEY;
    this.brandId = process.env.BIGMAILER_BRAND_ID;
    this.listId = process.env.BIGMAILER_LIST_ID; // Optional: for adding to specific lists
    this.baseURL = 'https://api.bigmailer.io/v1';

  }

  /**
   * Get available fields for the brand
   * @returns {Promise<Object>} Available fields
   */
  async getBrandFields() {
    try {
      if (!this.apiKey || !this.brandId) {
        return { success: false, error: 'BigMailer not configured' };
      }

      let allFields = [];
      let cursor = null;
      let hasMore = true;

      // Fetch all fields (handle pagination)
      while (hasMore) {
        const url = cursor
          ? `${this.baseURL}/brands/${this.brandId}/fields?cursor=${cursor}`
          : `${this.baseURL}/brands/${this.brandId}/fields`;

        const response = await axios.get(url, {
          headers: {
            'X-API-Key': this.apiKey,
            'Accept': 'application/json'
          },
          timeout: 10000
        });

        allFields = allFields.concat(response.data.data || []);
        cursor = response.data.cursor;
        hasMore = response.data.has_more || false;
      }

      return {
        success: true,
        fields: { data: allFields }
      };

    } catch (error) {
      console.error('Failed to get BigMailer fields:', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  /**
   * Create or update a contact in BigMailer (upsert operation)
   * If contact exists, it will be updated. If not, it will be created.
   * @param {Object} contactData - Contact information
   * @param {string} contactData.email - Contact email
   * @param {string} contactData.fullName - Contact full name
   * @param {boolean} contactData.isStudent - Whether the contact is a student
   * @param {string} contactData.universityName - University name if student
   * @returns {Promise<Object>} BigMailer API response
   */
  async createContact(contactData) {
    try {
      // Check if BigMailer is properly configured
      if (!this.apiKey || !this.brandId) {
        return { success: false, error: 'BigMailer not configured' };
      }

      const { email, fullName, isStudent, universityName } = contactData;

      // First, get available fields for this brand
      const fieldsResult = await this.getBrandFields();
      let availableFields = [];

      if (fieldsResult.success && fieldsResult.fields && fieldsResult.fields.data) {
        availableFields = fieldsResult.fields.data.map(field => field.merge_tag_name || field.name || field.key || field.id);
      }

      // Prepare contact data for BigMailer
      const bigMailerContact = {
        email: email
      };

      // Add to specific list if configured
      if (this.listId) {
        bigMailerContact.list_ids = [this.listId];
      }

      // Use BigMailer's field_values array format
      const fieldValues = [];

      if (fullName && availableFields.length > 0) {
        const nameParts = fullName.split(' ');

        if (availableFields.includes('FIRST_NAME')) {
          fieldValues.push({
            name: 'FIRST_NAME',
            string: nameParts[0] || ''
          });
        }
        if (availableFields.includes('LAST_NAME')) {
          fieldValues.push({
            name: 'LAST_NAME',
            string: nameParts.slice(1).join(' ') || ''
          });
        }
        if (availableFields.includes('NAME')) {
          fieldValues.push({
            name: 'NAME',
            string: fullName
          });
        }

      }

      // Add other custom fields
      if (availableFields.length > 0) {
        if (isStudent !== undefined && availableFields.includes('IS_STUDENT')) {
          fieldValues.push({
            name: 'IS_STUDENT',
            string: isStudent ? 'true' : 'false'
          });
        }
        if (universityName && availableFields.includes('UNIVERSITY')) {
          fieldValues.push({
            name: 'UNIVERSITY',
            string: universityName
          });
        }
        if (availableFields.includes('SIGNUP_DATE')) {
          fieldValues.push({
            name: 'SIGNUP_DATE',
            string: new Date().toISOString()
          });
        }
        if (availableFields.includes('SOURCE')) {
          fieldValues.push({
            name: 'SOURCE',
            string: 'website_registration'
          });
        }
      }

      // Add field_values array if we have any fields
      if (fieldValues.length > 0) {
        bigMailerContact.field_values = fieldValues;
      }


      // Make API call to BigMailer using upsert endpoint to handle duplicates
      const response = await axios.post(
        `${this.baseURL}/brands/${this.brandId}/contacts/upsert`,
        bigMailerContact,
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      return {
        success: true,
        data: response.data,
        contactId: response.data?.id
      };

    } catch (error) {
      console.error('Failed to create/update BigMailer contact:', {
        email: contactData.email,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      // Don't throw error to prevent registration failure
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
    }
  }

  /**
   * Update an existing contact in BigMailer
   * @param {string} email - Contact email
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} BigMailer API response
   */
  async updateContact(email, updateData) {
    try {
      if (!this.apiKey || !this.brandId) {
        return { success: false, error: 'BigMailer not configured' };
      }

      const response = await axios.patch(
        `${this.baseURL}/brands/${this.brandId}/contacts`,
        {
          email: email,
          fields: updateData
        },
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('Failed to update BigMailer contact:', {
        email: email,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
    }
  }

  /**
   * Add contact to a specific tag/segment
   * @param {string} email - Contact email
   * @param {string} tagName - Tag to add
   * @returns {Promise<Object>} BigMailer API response
   */
  async addContactTag(email, tagName) {
    try {
      if (!this.apiKey || !this.brandId) {
        return { success: false, error: 'BigMailer not configured' };
      }

      // Note: This would depend on BigMailer's actual tagging API
      // This is a placeholder implementation
      const response = await this.updateContact(email, {
        tags: tagName
      });

      return response;

    } catch (error) {
      console.error('Failed to add BigMailer contact tag:', {
        email: email,
        tag: tagName,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

}

// Export singleton instance
module.exports = new BigMailerService();