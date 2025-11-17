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
 * Generate AI prompt using OpenAI service (streaming)
 */
const generatePromptStream = async (req, res) => {
  try {
    const { inputImageId, userPrompt, materialsText, includeSelectedMaterials = false, systemPromptName = 'architectural-visualization' } = req.body;

    if (!inputImageId) {
      return res.status(400).json({
        error: 'Missing required field: inputImageId'
      });
    }

    const imageId = parseInt(inputImageId, 10);
    let finalMaterialsText = '';

    // Use materialsText from frontend if provided
    if (materialsText && typeof materialsText === 'string' && materialsText.trim() !== '') {
      finalMaterialsText = materialsText.trim().toUpperCase();
    } else if (includeSelectedMaterials) {
      const materials = await aiPromptMaterialService.getMaterials(imageId);
      finalMaterialsText = aiPromptMaterialService.formatMaterialsForPrompt(materials);
      if (finalMaterialsText) {
        finalMaterialsText = finalMaterialsText.toUpperCase();
      }
    }

    // Get tags for the image
    try {
      const inputImage = await prisma.inputImage.findUnique({
        where: { id: imageId },
        select: { tags: true }
      });
      if (inputImage?.tags?.length > 0) {
        const tagsText = inputImage.tags.map(tagObj => tagObj.tag).join(', ').toUpperCase();
        finalMaterialsText = finalMaterialsText 
          ? `${finalMaterialsText}, ${tagsText}` 
          : `${tagsText}`;
      }
    } catch (tagError) {
      console.error('❌ Error fetching image tags:', tagError);
    }

    // Stream the prompt generation
    const fullPrompt = await openaiService.generatePromptStream({
      userPrompt: userPrompt || '',
      materialsText: finalMaterialsText,
      systemPromptName,
      res
    });

    // Save the generated prompt after streaming completes
    try {
      const materials = await aiPromptMaterialService.getMaterials(imageId);
      await prisma.inputImage.update({
        where: { id: imageId },
        data: {
          generatedPrompt: fullPrompt,
          aiMaterials: materials,
          updatedAt: new Date()
        }
      });
      console.log('✅ AI prompt saved successfully');
    } catch (saveError) {
      console.error('❌ Error saving prompt:', saveError);
    }

  } catch (error) {
    console.error('❌ Generate AI prompt stream error:', error);
    if (!res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
};

/**
 * Generate AI prompt using OpenAI service (non-streaming)
 */
const generatePrompt = async (req, res) => {
  try {
    const { inputImageId, userPrompt, materialsText, includeSelectedMaterials = false, systemPromptName = 'architectural-visualization' } = req.body;

    // DEBUG: Log the received request body
    console.log('🔍 DEBUG - Received request body:', {
      inputImageId,
      userPrompt: userPrompt ? userPrompt.substring(0, 50) + '...' : 'undefined',
      materialsText: materialsText ? materialsText.substring(0, 100) + '...' : 'undefined',
      includeSelectedMaterials,
      systemPromptName,
      requestBodyKeys: Object.keys(req.body)
    });

    if (!inputImageId) {
      return res.status(400).json({
        error: 'Missing required field: inputImageId'
      });
    }

    console.log('🤖 Generating AI prompt for image:', inputImageId);

    const imageId = parseInt(inputImageId, 10);
    let finalMaterialsText = '';

    // Use materialsText from frontend if provided
    if (materialsText && typeof materialsText === 'string' && materialsText.trim() !== '') {
      finalMaterialsText = materialsText.trim().toUpperCase();
      console.log('🎨 Using materials text from frontend:', finalMaterialsText);
    } else if (includeSelectedMaterials) {
      // Fallback: Get selected materials from database (legacy behavior)
      const materials = await aiPromptMaterialService.getMaterials(imageId);
      console.log('🔍 Fallback: Found materials from database:', materials.length, 'materials');
      
      finalMaterialsText = aiPromptMaterialService.formatMaterialsForPrompt(materials);
      if (finalMaterialsText) {
        finalMaterialsText = finalMaterialsText.toUpperCase();
      }
      console.log('🎨 Fallback: Formatted materials text:', finalMaterialsText);
    }

    // Get tags for the image to include in the prompt
    try {
      const inputImage = await prisma.inputImage.findUnique({
        where: { id: imageId },
        select: { tags: true }
      });
      if (inputImage && inputImage.tags && Array.isArray(inputImage.tags) && inputImage.tags.length > 0) {
        const tagsText = inputImage.tags.map(tagObj => tagObj.tag).join(', ').toUpperCase();
        finalMaterialsText = finalMaterialsText 
          ? `${finalMaterialsText}, ${tagsText}` 
          : `${tagsText}`;
        console.log('🏷️ Included image tags in materials text:', tagsText);
      } else {
        console.log('🏷️ No tags found for image');
      }
    } catch (tagError) {
      console.error('❌ Error fetching image tags:', tagError);
    }

    console.log('✨ Final materials for OpenAI:', finalMaterialsText);
    console.log('📝 User prompt:', userPrompt);
    console.log('🔧 Using system prompt:', systemPromptName);

    // Use the OpenAI service to generate the prompt
    const generatedPrompt = await openaiService.generatePrompt({
      userPrompt: userPrompt || '',
      materialsText: finalMaterialsText,
      systemPromptName
    });

    // Get AI materials from database to save alongside the prompt
    const materials = await aiPromptMaterialService.getMaterials(imageId);
    console.log('🎨 Found AI materials to save:', materials.length, 'items');

    // Save the generated prompt and AI materials to the database
    await prisma.inputImage.update({
      where: { id: imageId },
      data: {
        generatedPrompt,
        aiMaterials: materials, // Save the AI materials alongside the prompt
        updatedAt: new Date()
      }
    });

    console.log('✅ AI prompt generated and saved successfully');

    res.status(200).json({
      success: true,
      data: {
        generatedPrompt,
        materialsUsed: finalMaterialsText,
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
 * Get saved AI prompt from InputImage table ONLY
 */
const getInputImagePrompt = async (req, res) => {
  try {
    const { inputImageId } = req.params;

    const imageId = parseInt(inputImageId, 10);
    if (isNaN(imageId)) {
      return res.status(400).json({
        error: 'Invalid inputImageId: must be a valid number'
      });
    }

    console.log('🔍 Fetching AI prompt from InputImage table for ID:', imageId);

    const inputImage = await prisma.inputImage.findUnique({
      where: { id: imageId },
      select: { 
        id: true,
        generatedPrompt: true,
        aiPrompt: true,
        aiMaterials: true,
        userId: true
      }
    });

    if (!inputImage) {
      return res.status(404).json({
        error: 'InputImage not found',
        message: `No InputImage found with ID ${imageId}`
      });
    }

    console.log('✅ Found InputImage, generatedPrompt:', inputImage.generatedPrompt ? 'Present' : 'NULL');

    res.status(200).json({
      success: true,
      source: 'InputImage',
      data: {
        id: inputImage.id,
        generatedPrompt: inputImage.generatedPrompt,
        aiPrompt: inputImage.aiPrompt,
        aiMaterials: inputImage.aiMaterials
      }
    });

  } catch (error) {
    console.error('❌ Get InputImage prompt error:', error);
    res.status(500).json({
      error: 'Failed to get InputImage prompt',
      message: error.message
    });
  }
};

/**
 * Get saved AI prompt from Image table ONLY  
 */
const getGeneratedImagePrompt = async (req, res) => {
  try {
    const { imageId } = req.params;

    const id = parseInt(imageId, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Invalid imageId: must be a valid number'
      });
    }

    console.log('🔍 Fetching AI prompt from Image table for ID:', id);

    const generatedImage = await prisma.image.findUnique({
      where: { id: id },
      select: { 
        id: true,
        aiPrompt: true,
        generationPrompt: true,
        aiMaterials: true,
        contextSelection: true,
        maskMaterialMappings: true,
        userId: true,
        batchId: true
      }
    });

    if (!generatedImage) {
      return res.status(404).json({
        error: 'Generated Image not found',
        message: `No Image found with ID ${id}`
      });
    }

    console.log('✅ Found Generated Image, aiPrompt:', generatedImage.aiPrompt ? 'Present' : 'NULL');

    res.status(200).json({
      success: true,
      source: 'Image',
      data: {
        id: generatedImage.id,
        aiPrompt: generatedImage.aiPrompt,
        generationPrompt: generatedImage.generationPrompt,
        aiMaterials: generatedImage.aiMaterials,
        contextSelection: generatedImage.contextSelection,
        maskMaterialMappings: generatedImage.maskMaterialMappings,
        batchId: generatedImage.batchId
      }
    });

  } catch (error) {
    console.error('❌ Get Generated Image prompt error:', error);
    res.status(500).json({
      error: 'Failed to get Generated Image prompt',
      message: error.message
    });
  }
};

/**
 * Get saved AI prompt for an image (InputImage or generated Image) - LEGACY ENDPOINT
 * @deprecated Use getInputImagePrompt or getGeneratedImagePrompt instead
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

    console.log('⚠️ LEGACY: Fetching saved AI prompt for image:', imageId);
    console.log('⚠️ Consider using /input-image-prompt/:id or /generated-image-prompt/:id instead');

    // 🔥 FIX: Try to find in InputImage first, then try Image table
    let foundPrompt = null;
    let sourceTable = null;

    // First, try to find in InputImage (for base images)
    const inputImage = await prisma.inputImage.findUnique({
      where: { id: imageId },
      select: { generatedPrompt: true }
    });

    if (inputImage && inputImage.generatedPrompt) {
      foundPrompt = inputImage.generatedPrompt;
      sourceTable = 'InputImage';
      console.log('✅ Found prompt in InputImage');
    } else {
      // If not found in InputImage, try Image table (for generated images)
      const generatedImage = await prisma.image.findUnique({
        where: { id: imageId },
        select: { aiPrompt: true }
      });

      if (generatedImage && generatedImage.aiPrompt) {
        foundPrompt = generatedImage.aiPrompt;
        sourceTable = 'Image';
        console.log('✅ Found prompt in Image');
      }
    }

    if (!foundPrompt) {
      return res.status(404).json({
        error: 'No prompt found for this image'
      });
    }

    res.status(200).json({
      success: true,
      source: sourceTable,
      deprecated: true,
      message: 'This endpoint is deprecated. Use /input-image-prompt/:id or /generated-image-prompt/:id instead',
      data: {
        generatedPrompt: foundPrompt
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
 * Save AI prompt for an image (InputImage or generated Image)
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

    // First, determine which table this image belongs to
    let isInputImage = false;
    let isGeneratedImage = false;
    
    // Check if it's an input image
    try {
      const inputImageCheck = await prisma.inputImage.findUnique({
        where: { id: imageId },
        select: { id: true, uploadSource: true }
      });
      
      if (inputImageCheck) {
        isInputImage = true;
        console.log('📍 Found InputImage:', { id: imageId, uploadSource: inputImageCheck.uploadSource });
      }
    } catch (error) {
      console.log('📍 Not found in InputImage table');
    }
    
    // Check if it's a generated image
    if (!isInputImage) {
      try {
        const generatedImageCheck = await prisma.image.findUnique({
          where: { id: imageId },
          select: { id: true, batchId: true, originalBaseImageId: true }
        });
        
        if (generatedImageCheck) {
          isGeneratedImage = true;
          console.log('📍 Found Generated Image:', { 
            id: imageId, 
            batchId: generatedImageCheck.batchId, 
            originalBaseImageId: generatedImageCheck.originalBaseImageId 
          });
        }
      } catch (error) {
        console.log('📍 Not found in Image table');
      }
    }

    let updatedImage;
    let success = false;

    if (isInputImage) {
      // For input images (CREATE module), save to InputImage table
      try {
        updatedImage = await prisma.inputImage.update({
          where: { id: imageId },
          data: {
            generatedPrompt: prompt.trim(),
            updatedAt: new Date()
          }
        });
        success = true;
        console.log('✅ AI prompt saved to InputImage successfully');
      } catch (error) {
        console.error('❌ Failed to save prompt to InputImage:', error);
        throw error;
      }
    } else if (isGeneratedImage) {
      // For generated images (TWEAK/CREATE results), save to Image table
      // This is specifically for Tweak inpaint operations
      try {
        updatedImage = await prisma.image.update({
          where: { id: imageId },
          data: {
            aiPrompt: prompt.trim(),
            updatedAt: new Date()
          }
        });
        success = true;
        console.log('✅ AI prompt saved to Generated Image successfully (for Tweak inpaint)');
      } catch (error) {
        console.error('❌ Failed to save prompt to Generated Image:', error);
        throw error;
      }
    } else {
      // Image not found in either table
      throw new Error(`Image with ID ${imageId} not found in either InputImage or Image tables`);
    }

    if (success) {
      res.status(200).json({
        success: true,
        data: {
          generatedPrompt: updatedImage.generatedPrompt || updatedImage.aiPrompt
        }
      });
    }

  } catch (error) {
    console.error('❌ Save AI prompt error:', error);
    
    if (error.message.includes('not found in either')) {
      return res.status(404).json({
        error: 'Image not found',
        message: `Image with ID ${imageId} not found in either InputImage or Image tables. Please ensure the image exists and try again.`
      });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Image not found',
        message: 'The specified image could not be found in the database.'
      });
    }

    res.status(500).json({
      error: 'Failed to save AI prompt',
      message: error.message,
      details: 'This may be due to the image being from a different module or workflow. Please try refreshing and selecting the image again.'
    });
  }
};

module.exports = {
  generatePromptStream,
  addMaterial,
  getMaterials,
  removeMaterial,
  generatePrompt,
  getSavedPrompt, // Legacy - deprecated
  getInputImagePrompt, // NEW: InputImage table only
  getGeneratedImagePrompt, // NEW: Image table only  
  savePrompt,
  clearMaterials
};