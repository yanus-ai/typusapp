const axios = require('axios');

/**
 * Check if an email domain belongs to a university
 * @param {string} email - The email address to check
 * @returns {Promise<{isUniversity: boolean, universityName?: string, country?: string}>}
 */
async function checkUniversityEmail(email) {
  try {
    // Extract domain from email
    const emailParts = email.split('@');
    if (emailParts.length !== 2) {
      return { isUniversity: false };
    }
    
    const domain = emailParts[1].toLowerCase();
    
    // Call the university API
    const response = await axios.get(`http://universities.hipolabs.com/search?domain=${domain}`, {
      timeout: 5000, // 5 second timeout
      headers: {
        'User-Agent': 'Praii-University-Verification/1.0'
      }
    });
    
    const universities = response.data;
    
    if (Array.isArray(universities) && universities.length > 0) {
      const university = universities[0]; // Take the first match
      
      return {
        isUniversity: true,
        universityName: university.name,
        country: university.country,
        domain: domain
      };
    }
    
    return { isUniversity: false };
    
  } catch (error) {
    console.warn(`Failed to verify university email for domain ${email.split('@')[1]}:`, error.message);
    
    return {
      isUniversity: false,
      universityName: undefined,
      fallback: true
    };
  }
}

module.exports = {
  checkUniversityEmail
};
