const { prisma } = require('./prisma.service');

/**
 * Simple AI materials service for Refine page
 * Stores materials as an array of text strings in InputImage.aiMaterials
 */
class RefineMaterialsService {

  /**
   * Add a material to the input image's AI materials array
   * @param {number} inputImageId - ID of the input image
   * @param {string} materialText - The material text to add
   * @returns {Promise<Array<string>>} Updated materials array
   */
  async addMaterial(inputImageId, materialText) {
    try {
      if (!materialText || typeof materialText !== 'string' || materialText.trim() === '') {
        throw new Error('Material text is required and must be a non-empty string');
      }

      const cleanText = materialText.trim();

      // Get current materials
      const inputImage = await prisma.inputImage.findUnique({
        where: { id: inputImageId },
        select: { aiMaterials: true }
      });

      if (!inputImage) {
        throw new Error(`InputImage with ID ${inputImageId} not found`);
      }

      // Initialize or get existing materials array
      let materials = [];
      if (inputImage.aiMaterials && Array.isArray(inputImage.aiMaterials)) {
        materials = inputImage.aiMaterials;
      }

      // Check if material already exists (case insensitive, handle both string and object materials)
      const existingIndex = materials.findIndex(material => {
        // Handle string materials (intended behavior)
        if (typeof material === 'string') {
          return material.toLowerCase() === cleanText.toLowerCase();
        }
        // Handle object materials (fallback for existing data)
        else if (typeof material === 'object' && material) {
          const materialName = material.displayName || material.name || material.title || String(material);
          return materialName.toLowerCase() === cleanText.toLowerCase();
        }
        return false;
      });

      if (existingIndex === -1) {
        // Add new material
        materials.push(cleanText);
      } else {
        // Update existing material (in case of different casing)
        materials[existingIndex] = cleanText;
      }

      // Sanitize the materials array to ensure all items are strings
      materials = materials.map(material => {
        if (typeof material === 'string') {
          return material;
        } else if (typeof material === 'object' && material) {
          return material.displayName || material.name || material.title || String(material);
        }
        return String(material);
      }).filter(material => material && material.trim().length > 0);

      // Update database
      await prisma.inputImage.update({
        where: { id: inputImageId },
        data: {
          aiMaterials: materials,
          updatedAt: new Date()
        }
      });

      console.log('✅ Added material to InputImage:', {
        inputImageId,
        material: cleanText,
        totalMaterials: materials.length
      });

      return materials;
    } catch (error) {
      console.error('❌ Error adding material:', error);
      throw error;
    }
  }

  /**
   * Remove a material from the input image's AI materials array
   * @param {number} inputImageId - ID of the input image
   * @param {string} materialText - The material text to remove
   * @returns {Promise<Array<string>>} Updated materials array
   */
  async removeMaterial(inputImageId, materialText) {
    try {
      if (!materialText || typeof materialText !== 'string') {
        throw new Error('Material text is required');
      }

      const cleanText = materialText.trim();

      // Get current materials
      const inputImage = await prisma.inputImage.findUnique({
        where: { id: inputImageId },
        select: { aiMaterials: true }
      });

      if (!inputImage) {
        throw new Error(`InputImage with ID ${inputImageId} not found`);
      }

      let materials = [];
      if (inputImage.aiMaterials && Array.isArray(inputImage.aiMaterials)) {
        materials = inputImage.aiMaterials;
      }

      console.log('🔍 Current materials in database:', {
        totalMaterials: materials.length,
        materialsTypes: materials.map(m => typeof m),
        firstMaterial: materials[0],
        lookingFor: cleanText
      });

      // Remove material (case insensitive, handle both string and object materials)
      const updatedMaterials = materials.filter(material => {
        // Handle string materials (intended behavior)
        if (typeof material === 'string') {
          return material.toLowerCase() !== cleanText.toLowerCase();
        }
        // Handle object materials (fallback for existing data)
        else if (typeof material === 'object' && material) {
          // Check common object properties that might contain the material name
          const materialName = material.displayName || material.name || material.title || String(material);
          return materialName.toLowerCase() !== cleanText.toLowerCase();
        }
        // Remove invalid materials
        return false;
      });

      // Sanitize the remaining materials to ensure all items are strings
      const sanitizedMaterials = updatedMaterials.map(material => {
        if (typeof material === 'string') {
          return material;
        } else if (typeof material === 'object' && material) {
          return material.displayName || material.name || material.title || String(material);
        }
        return String(material);
      }).filter(material => material && material.trim().length > 0);

      // Update database
      await prisma.inputImage.update({
        where: { id: inputImageId },
        data: {
          aiMaterials: sanitizedMaterials,
          updatedAt: new Date()
        }
      });

      console.log('✅ Removed material from InputImage:', {
        inputImageId,
        material: cleanText,
        totalMaterials: sanitizedMaterials.length
      });

      return sanitizedMaterials;
    } catch (error) {
      console.error('❌ Error removing material:', error);
      throw error;
    }
  }

  /**
   * Get all materials for an input image
   * @param {number} inputImageId - ID of the input image
   * @returns {Promise<Array<string>>} Array of material texts
   */
  async getMaterials(inputImageId) {
    try {
      const inputImage = await prisma.inputImage.findUnique({
        where: { id: inputImageId },
        select: { aiMaterials: true }
      });

      if (!inputImage) {
        throw new Error(`InputImage with ID ${inputImageId} not found`);
      }

      // Return materials array or empty array if none, ensure all are strings
      let materials = inputImage.aiMaterials && Array.isArray(inputImage.aiMaterials)
        ? inputImage.aiMaterials
        : [];

      // Sanitize materials to ensure all items are strings
      materials = materials.map(material => {
        if (typeof material === 'string') {
          return material;
        } else if (typeof material === 'object' && material) {
          return material.displayName || material.name || material.title || String(material);
        }
        return String(material);
      }).filter(material => material && material.trim().length > 0);

      console.log('🔍 Retrieved materials for InputImage:', {
        inputImageId,
        totalMaterials: materials.length,
        materials: materials.slice(0, 5) // Log first 5 for debugging
      });

      return materials;
    } catch (error) {
      console.error('❌ Error getting materials:', error);
      throw error;
    }
  }

  /**
   * Clear all materials for an input image
   * @param {number} inputImageId - ID of the input image
   * @returns {Promise<Array<string>>} Empty array
   */
  async clearMaterials(inputImageId) {
    try {
      await prisma.inputImage.update({
        where: { id: inputImageId },
        data: {
          aiMaterials: [],
          updatedAt: new Date()
        }
      });

      console.log('🧹 Cleared all materials for InputImage:', inputImageId);

      return [];
    } catch (error) {
      console.error('❌ Error clearing materials:', error);
      throw error;
    }
  }

  /**
   * Update entire materials array for an input image
   * @param {number} inputImageId - ID of the input image
   * @param {Array<string>} materials - Array of material texts
   * @returns {Promise<Array<string>>} Updated materials array
   */
  async updateMaterials(inputImageId, materials) {
    try {
      if (!Array.isArray(materials)) {
        throw new Error('Materials must be an array');
      }

      // Clean and validate materials
      const cleanMaterials = materials
        .filter(material => typeof material === 'string' && material.trim() !== '')
        .map(material => material.trim());

      // Remove duplicates (case insensitive)
      const uniqueMaterials = cleanMaterials.filter((material, index) =>
        cleanMaterials.findIndex(m => m.toLowerCase() === material.toLowerCase()) === index
      );

      await prisma.inputImage.update({
        where: { id: inputImageId },
        data: {
          aiMaterials: uniqueMaterials,
          updatedAt: new Date()
        }
      });

      console.log('🔄 Updated materials for InputImage:', {
        inputImageId,
        totalMaterials: uniqueMaterials.length
      });

      return uniqueMaterials;
    } catch (error) {
      console.error('❌ Error updating materials:', error);
      throw error;
    }
  }

  /**
   * Format materials array for AI prompt
   * @param {Array<string>} materials - Array of material texts
   * @returns {string} Formatted prompt text
   */
  formatMaterialsForPrompt(materials) {
    if (!Array.isArray(materials) || materials.length === 0) {
      return '';
    }

    // Join materials with commas
    const formattedMaterials = materials
      .filter(material => typeof material === 'string' && material.trim() !== '')
      .map(material => material.trim())
      .join(', ');

    return formattedMaterials;
  }
}

module.exports = new RefineMaterialsService();