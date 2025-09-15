const refineMaterialsService = require('../services/refineMaterials.service');

/**
 * Add a material to input image's AI materials array
 */
const addMaterial = async (req, res) => {
  try {
    const { inputImageId, material } = req.body;

    // Validate required fields
    if (!inputImageId || !material) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: inputImageId and material are required'
      });
    }

    console.log('🎨 Adding material to refine AI materials:', {
      inputImageId: parseInt(inputImageId, 10),
      material
    });

    const materials = await refineMaterialsService.addMaterial(
      parseInt(inputImageId, 10),
      material
    );

    res.status(200).json({
      success: true,
      message: 'Material added successfully',
      data: {
        inputImageId: parseInt(inputImageId, 10),
        materials,
        formattedPrompt: refineMaterialsService.formatMaterialsForPrompt(materials)
      }
    });

  } catch (error) {
    console.error('❌ Add refine material error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'InputImage not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to add material',
      message: error.message
    });
  }
};

/**
 * Remove a material from input image's AI materials array
 */
const removeMaterial = async (req, res) => {
  try {
    const { inputImageId, material } = req.body;

    // Validate required fields
    if (!inputImageId || !material) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: inputImageId and material are required'
      });
    }

    console.log('🗑️ Removing material from refine AI materials:', {
      inputImageId: parseInt(inputImageId, 10),
      material,
      materialType: typeof material,
      materialKeys: typeof material === 'object' ? Object.keys(material) : 'N/A'
    });

    const materials = await refineMaterialsService.removeMaterial(
      parseInt(inputImageId, 10),
      material
    );

    res.status(200).json({
      success: true,
      message: 'Material removed successfully',
      data: {
        inputImageId: parseInt(inputImageId, 10),
        materials,
        formattedPrompt: refineMaterialsService.formatMaterialsForPrompt(materials)
      }
    });

  } catch (error) {
    console.error('❌ Remove refine material error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'InputImage not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to remove material',
      message: error.message
    });
  }
};

/**
 * Get all materials for an input image
 */
const getMaterials = async (req, res) => {
  try {
    const { inputImageId } = req.params;

    const imageId = parseInt(inputImageId, 10);
    if (isNaN(imageId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid inputImageId: must be a valid number'
      });
    }

    console.log('🔍 Fetching refine materials for image:', imageId);

    const materials = await refineMaterialsService.getMaterials(imageId);

    res.status(200).json({
      success: true,
      data: {
        inputImageId: imageId,
        materials,
        formattedPrompt: refineMaterialsService.formatMaterialsForPrompt(materials)
      }
    });

  } catch (error) {
    console.error('❌ Get refine materials error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'InputImage not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch materials',
      message: error.message
    });
  }
};

/**
 * Clear all materials for an input image
 */
const clearMaterials = async (req, res) => {
  try {
    const { inputImageId } = req.params;

    const imageId = parseInt(inputImageId, 10);
    if (isNaN(imageId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid inputImageId: must be a valid number'
      });
    }

    console.log('🧹 Clearing refine materials for image:', imageId);

    const materials = await refineMaterialsService.clearMaterials(imageId);

    res.status(200).json({
      success: true,
      message: 'Materials cleared successfully',
      data: {
        inputImageId: imageId,
        materials,
        formattedPrompt: ''
      }
    });

  } catch (error) {
    console.error('❌ Clear refine materials error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'InputImage not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to clear materials',
      message: error.message
    });
  }
};

/**
 * Update entire materials array for an input image
 */
const updateMaterials = async (req, res) => {
  try {
    const { inputImageId, materials } = req.body;

    // Validate required fields
    if (!inputImageId || !Array.isArray(materials)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: inputImageId and materials array are required'
      });
    }

    console.log('🔄 Updating refine materials for image:', {
      inputImageId: parseInt(inputImageId, 10),
      materialsCount: materials.length
    });

    const updatedMaterials = await refineMaterialsService.updateMaterials(
      parseInt(inputImageId, 10),
      materials
    );

    res.status(200).json({
      success: true,
      message: 'Materials updated successfully',
      data: {
        inputImageId: parseInt(inputImageId, 10),
        materials: updatedMaterials,
        formattedPrompt: refineMaterialsService.formatMaterialsForPrompt(updatedMaterials)
      }
    });

  } catch (error) {
    console.error('❌ Update refine materials error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'InputImage not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update materials',
      message: error.message
    });
  }
};

module.exports = {
  addMaterial,
  removeMaterial,
  getMaterials,
  clearMaterials,
  updateMaterials
};