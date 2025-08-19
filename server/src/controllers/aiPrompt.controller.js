const aiPromptMaterialService = require('../services/aiPromptMaterial.service');
const openaiService = require('../services/openai.service');
const { prisma } = require('../services/prisma.service');

/**
 * Add material to AI prompt materials
 */
const addMaterial = async (req, res) => {
  try {
    const { inputImageId, materialOptionId, customizationOptionId, subCategoryId, displayName } = req.body;

    // Validate required fields
    if (!inputImageId || !subCategoryId || !displayName) {
      return res.status(400).json({
        error: 'Missing required fields: inputImageId, subCategoryId, and displayName are required'
      });
    }

    // Validate that at least one option ID is provided
    if (!materialOptionId && !customizationOptionId) {
      return res.status(400).json({
        error: 'At least one option must be provided: materialOptionId or customizationOptionId'
      });
    }

    console.log('🎨 Adding AI prompt material:', { 
      inputImageId, 
      materialOptionId, 
      customizationOptionId,
      subCategoryId,
      displayName
    });

    const material = await aiPromptMaterialService.addMaterial(
      parseInt(inputImageId, 10),
      {
        materialOptionId: materialOptionId ? parseInt(materialOptionId, 10) : null,
        customizationOptionId: customizationOptionId ? parseInt(customizationOptionId, 10) : null,
        subCategoryId: parseInt(subCategoryId, 10),
        displayName
      }
    );

    console.log('✅ AI prompt material added successfully');

    res.status(200).json({
      success: true,
      message: 'Material added to AI prompt',
      data: material
    });

  } catch (error) {
    console.error('❌ Add AI prompt material error:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Referenced record not found',
        message: 'The specified inputImage, material, or customization option does not exist'
      });
    }

    res.status(500).json({
      error: 'Failed to add material to AI prompt',
      message: error.message
    });
  }
};

/**
 * Get all AI prompt materials for an input image
 */
const getMaterials = async (req, res) => {
  try {
    const { inputImageId } = req.params;
    
    const imageId = parseInt(inputImageId, 10);
    if (isNaN(imageId)) {
      return res.status(400).json({ 
        error: 'Invalid inputImageId: must be a valid number' 
      });
    }

    console.log('🔍 Fetching AI prompt materials for image:', imageId);

    const materials = await aiPromptMaterialService.getMaterials(imageId);
    
    res.status(200).json({
      success: true,
      data: {
        inputImageId: imageId,
        materials,
        formattedPrompt: aiPromptMaterialService.formatMaterialsForPrompt(materials)
      }
    });

  } catch (error) {
    console.error('❌ Get AI prompt materials error:', error);
    res.status(500).json({
      error: 'Failed to fetch AI prompt materials',
      message: error.message
    });
  }
};

/**
 * Remove material from AI prompt
 */
const removeMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;

    const materialIdInt = parseInt(materialId, 10);
    if (isNaN(materialIdInt)) {
      return res.status(400).json({
        error: 'Invalid materialId: must be a valid number'
      });
    }

    console.log('🗑️ Removing AI prompt material:', materialIdInt);

    await aiPromptMaterialService.removeMaterial(materialIdInt);

    console.log('✅ AI prompt material removed successfully');

    res.status(200).json({
      success: true,
      message: 'Material removed from AI prompt'
    });

  } catch (error) {
    console.error('❌ Remove AI prompt material error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Material not found',
        message: 'The specified material does not exist'
      });
    }

    res.status(500).json({
      error: 'Failed to remove material from AI prompt',
      message: error.message
    });
  }
};

/**
 * Generate AI prompt using OpenAI service
 */
const generatePrompt = async (req, res) => {
  try {
    const { inputImageId, userPrompt, includeSelectedMaterials = true, systemPromptName = 'architectural-visualization' } = req.body;

    if (!inputImageId) {
      return res.status(400).json({
        error: 'Missing required field: inputImageId'
      });
    }

    console.log('🤖 Generating AI prompt for image:', inputImageId);

    const imageId = parseInt(inputImageId, 10);
    let materialsText = '';

    if (includeSelectedMaterials) {
      // Get selected materials
      const materials = await aiPromptMaterialService.getMaterials(imageId);
      materialsText = aiPromptMaterialService.formatMaterialsForPrompt(materials).toUpperCase();
    }

    console.log('Using materials for prompt:', materialsText);
    console.log('Using system prompt:', systemPromptName);

    // Use the OpenAI service to generate the prompt
    const generatedPrompt = await openaiService.generatePrompt({
      userPrompt: userPrompt || 'CREATE AN ARCHITECTURAL VISUALIZATION',
      materialsText,
      systemPromptName
    });

    // Save the generated prompt to the database
    await prisma.inputImage.update({
      where: { id: imageId },
      data: {
        generatedPrompt,
        updatedAt: new Date()
      }
    });

    console.log('✅ AI prompt generated and saved successfully');

    res.status(200).json({
      success: true,
      data: {
        generatedPrompt,
        materialsUsed: materialsText,
        originalPrompt: userPrompt,
        systemPromptUsed: systemPromptName
      }
    });

  } catch (error) {
    console.error('❌ Generate AI prompt error:', error);

    // Handle specific service errors
    if (error.message.includes('OpenAI quota exceeded')) {
      return res.status(402).json({
        error: 'OpenAI quota exceeded',
        message: 'Please check your OpenAI billing'
      });
    }

    if (error.message.includes('Invalid OpenAI API key')) {
      return res.status(401).json({
        error: 'Invalid OpenAI API key',
        message: 'Please configure valid OpenAI credentials'
      });
    }

    if (error.message.includes('System prompt file not found')) {
      return res.status(400).json({
        error: 'Invalid system prompt',
        message: 'The specified system prompt template does not exist'
      });
    }

    res.status(500).json({
      error: 'Failed to generate AI prompt',
      message: error.message
    });
  }
};

/**
 * Get saved AI prompt for an input image
 */
const getSavedPrompt = async (req, res) => {
  try {
    const { inputImageId } = req.params;

    const imageId = parseInt(inputImageId, 10);
    if (isNaN(imageId)) {
      return res.status(400).json({
        error: 'Invalid inputImageId: must be a valid number'
      });
    }

    console.log('🔍 Fetching saved AI prompt for image:', imageId);

    const inputImage = await prisma.inputImage.findUnique({
      where: { id: imageId },
      select: { generatedPrompt: true }
    });

    if (!inputImage) {
      return res.status(404).json({
        error: 'Input image not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        generatedPrompt: inputImage.generatedPrompt
      }
    });

  } catch (error) {
    console.error('❌ Get saved AI prompt error:', error);
    res.status(500).json({
      error: 'Failed to get saved AI prompt',
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
        error: 'Invalid inputImageId: must be a valid number'
      });
    }

    console.log('🧹 Clearing all AI prompt materials for image:', imageId);

    await aiPromptMaterialService.clearMaterials(imageId);

    console.log('✅ AI prompt materials cleared successfully');

    res.status(200).json({
      success: true,
      message: 'All materials cleared from AI prompt'
    });

  } catch (error) {
    console.error('❌ Clear AI prompt materials error:', error);
    
    res.status(500).json({
      error: 'Failed to clear AI prompt materials',
      message: error.message
    });
  }
};

/**
 * Save AI prompt for an input image
 */
const savePrompt = async (req, res) => {
  try {
    const { inputImageId } = req.params;
    const { prompt } = req.body;

    const imageId = parseInt(inputImageId, 10);
    if (isNaN(imageId)) {
      return res.status(400).json({
        error: 'Invalid inputImageId: must be a valid number'
      });
    }

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'Missing required field: prompt must be a non-empty string'
      });
    }

    console.log('💾 Saving AI prompt for image:', imageId);

    const updatedImage = await prisma.inputImage.update({
      where: { id: imageId },
      data: {
        generatedPrompt: prompt.trim(),
        updatedAt: new Date()
      }
    });

    console.log('✅ AI prompt saved successfully');

    res.status(200).json({
      success: true,
      data: {
        generatedPrompt: updatedImage.generatedPrompt
      }
    });

  } catch (error) {
    console.error('❌ Save AI prompt error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Input image not found'
      });
    }

    res.status(500).json({
      error: 'Failed to save AI prompt',
      message: error.message
    });
  }
};

module.exports = {
  addMaterial,
  getMaterials,
  removeMaterial,
  generatePrompt,
  getSavedPrompt,
  savePrompt,
  clearMaterials
};