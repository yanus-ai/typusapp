const axios = require('axios');

class BigMailerService {
  constructor() {
    this.apiKey = process.env.BIGMAILER_API_KEY;
    this.brandId = process.env.BIGMAILER_BRAND_ID;
    this.listId = process.env.BIGMAILER_LIST_ID; // Optional: for adding to specific lists
    this.deListId = process.env.BIGMAILER_DE_LIST_ID; // German List ID
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
   * @param {string} contactData.language - Contact language
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

      const { email, language, fullName, isStudent, universityName } = contactData;

      if (language?.toLowerCase().trim() === 'de') {
        this.listId = this.deListId;
      } else {
        this.listId = this.listId;
      }

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

  /**
   * Add contact to a specific list with custom fields
   * @param {Object} contactData - Contact information
   * @param {string} contactData.email - Contact email
   * @param {string} contactData.fullName - Contact full name
   * @param {string} listId - BigMailer list ID
   * @param {Object} customFields - Custom fields to add (e.g., plan details)
   * @returns {Promise<Object>} BigMailer API response
   */
  async addContactToList(contactData, listId, customFields = {}) {
    // Declare bigMailerContact at function scope so it's accessible in catch block
    let bigMailerContact = null;
    
    try {
      if (!this.apiKey || !this.brandId) {
        return { success: false, error: 'BigMailer not configured' };
      }

      if (!listId) {
        return { success: false, error: 'List ID is required' };
      }

      const { email, fullName } = contactData;

      // First, get available fields for this brand
      const fieldsResult = await this.getBrandFields();
      let availableFields = [];
      const fieldDefinitions = {}; // Store field definitions with types

      if (fieldsResult.success && fieldsResult.fields && fieldsResult.fields.data) {
        fieldsResult.fields.data.forEach(field => {
          const fieldKey = field.merge_tag_name || field.name || field.key || field.id;
          availableFields.push(fieldKey);
          // Store field definition with type information
          const fieldType = field.type || field.field_type || field.data_type || 'string';
          fieldDefinitions[fieldKey.toUpperCase()] = {
            type: fieldType,
            name: fieldKey,
            rawField: field // Store raw field for debugging
          };
        });
        
        // Log field types for debugging (especially for custom fields we're using)
        const customFieldNames = ['PLAN_TYPE', 'BILLING_CYCLE', 'IS_EDUCATIONAL', 'CHECKOUT_SESSION_ID', 'CHECKOUT_CREATED_AT', 'INTENDED_PLAN'];
        customFieldNames.forEach(customField => {
          const fieldDef = fieldDefinitions[customField];
          if (fieldDef) {
            console.log(`📋 Field ${customField}: type=${fieldDef.type}, raw=${JSON.stringify(fieldDef.rawField).substring(0, 150)}`);
          } else {
            console.log(`⚠️ Field ${customField} not found in BigMailer`);
          }
        });
      }

      // Prepare contact data for BigMailer
      bigMailerContact = {
        email: email,
        list_ids: [listId]
      };

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

      // Add custom fields with proper type conversion
      if (Object.keys(customFields).length > 0 && availableFields.length > 0) {
        for (const [fieldName, fieldValue] of Object.entries(customFields)) {
          // Check if field exists in available fields (case-insensitive)
          const matchingField = availableFields.find(
            field => field.toUpperCase() === fieldName.toUpperCase()
          );
          
          if (matchingField) {
            try {
              const fieldDef = fieldDefinitions[matchingField.toUpperCase()] || {};
              const fieldType = (fieldDef.type || 'string').toLowerCase();
              
              // Skip if value is null or undefined
              if (fieldValue === null || fieldValue === undefined) {
                console.log(`ℹ️ Skipping field ${matchingField} - value is null/undefined`);
                continue;
              }
              
              // Build field value object based on type
              const fieldValueObj = { name: matchingField };
              
              // Convert value to appropriate type based on BigMailer field type
              // Check field name for hints if type detection fails
              const fieldNameLower = matchingField.toLowerCase();
              const isDateField = fieldNameLower.includes('date') || fieldNameLower.includes('created') || fieldNameLower.includes('updated') || fieldNameLower.includes('time');
              
              if (fieldType === 'boolean' || fieldType === 'bool') {
                // Convert string 'true'/'false' to boolean
                const boolValue = fieldValue === 'true' || fieldValue === true || fieldValue === 'True';
                fieldValueObj.boolean = boolValue;
              } else if (fieldType === 'number' || fieldType === 'integer' || fieldType === 'int' || fieldType === 'float' || fieldType === 'numeric') {
                // Convert to number
                const numValue = Number(fieldValue);
                if (!isNaN(numValue) && isFinite(numValue)) {
                  fieldValueObj.number = numValue;
                } else {
                  // If conversion fails, skip this field rather than sending wrong type
                  console.warn(`⚠️ Skipping field ${matchingField} - cannot convert "${fieldValue}" to number`);
                  continue;
                }
              } else if (fieldType === 'date' || fieldType === 'datetime' || fieldType === 'timestamp' || fieldType === 'date_time' || fieldType === 'date_time_iso' || isDateField) {
                // For date fields, BigMailer expects a 'date' property, not 'string'
                // The value should be in ISO 8601 format
                const dateValue = String(fieldValue || '');
                fieldValueObj.date = dateValue;
                console.log(`📅 Sending date field ${matchingField} as date type with value: ${dateValue}`);
              } else {
                // Default to string for text, email, url, etc.
                // This covers: 'string', 'text', 'email', 'url', 'phone', etc.
                fieldValueObj.string = String(fieldValue || '');
              }
              
              fieldValues.push(fieldValueObj);
            } catch (fieldError) {
              // Skip this field if there's an error converting it
              console.warn(`⚠️ Skipping field ${matchingField} due to conversion error:`, fieldError.message);
            }
          } else {
            // Field doesn't exist in BigMailer, skip it
            console.log(`ℹ️ Field ${fieldName} not found in BigMailer, skipping`);
          }
        }
      }

      // Add field_values array if we have any fields
      if (fieldValues.length > 0) {
        bigMailerContact.field_values = fieldValues;
        
        // Log field values for debugging (first few only)
        console.log(`📋 Adding ${fieldValues.length} field values to BigMailer:`, 
          fieldValues.slice(0, 5).map(fv => `${fv.name} (${Object.keys(fv).filter(k => k !== 'name').join(', ')})`).join(', '),
          fieldValues.length > 5 ? '...' : ''
        );
      }

      // Make API call to BigMailer using upsert endpoint
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
      // Enhanced error logging to identify problematic field
      const errorData = error.response?.data || {};
      const paramError = errorData.param; // e.g., 'field_values.7'
      
      let problematicField = null;
      // Check if bigMailerContact exists and has field_values before accessing it
      if (bigMailerContact && paramError && paramError.startsWith('field_values.')) {
        const fieldIndex = parseInt(paramError.split('.')[1]);
        if (!isNaN(fieldIndex) && bigMailerContact.field_values && bigMailerContact.field_values[fieldIndex]) {
          problematicField = bigMailerContact.field_values[fieldIndex];
        }
      }
      
      console.error('Failed to add contact to BigMailer list:', {
        email: contactData?.email || 'unknown',
        listId: listId,
        error: error.message,
        status: error.response?.status,
        data: errorData,
        problematicField: problematicField ? {
          name: problematicField.name,
          type: Object.keys(problematicField).filter(k => k !== 'name').join(', '),
          value: problematicField[Object.keys(problematicField).find(k => k !== 'name')]
        } : null
      });

      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
    }
  }

}

// Export singleton instance
module.exports = new BigMailerService();