const aiPromptMaterialService = require('../services/aiPromptMaterial.service');
const { prisma } = require('../services/prisma.service');
const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
 * Generate AI prompt using GPT
 */
const generatePrompt = async (req, res) => {
  try {
    const { inputImageId, userPrompt, includeSelectedMaterials = true } = req.body;

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

    // Prepare GPT prompt with your specific system configuration
    let systemPrompt = `You are generating prompts for an architectural visualization app. Your output will be sent directly to users and must be in plain text format.

                        Important rules:
                        - Your response must be plain text, not inside quotes.
                        - Do not wrap the prompt in quotation marks.
                        - Do not escape the entire response as a string.
                        - Only use \\n for line breaks where appropriate.
                        - Ensure the text is readable and user-friendly.
                        - The output should be directly usable as a JSON field value for 'content' in the OpenAI Chat API.
                        - Do not include any formatting like Markdown, code blocks, or special characters that would break JSON.
                        - Do not include the word "sculpture" in your response. You may use terms like "building" or "real estate" instead where relevant.

                        Prompt logic:
                        1. If the user input contains any of these styles:
                          "01_Pen and ink, illustrated by hergé, studio ghibli, stunning color scheme, masterpiece"
                          "02_Extremely realistic and detailed of a museum building in the style of Tadao ando postmodern concrete with windows, some people, and artworks on the roof, exhibition, in the woods, 8k, Beautiful pen and ink sketch of, minimalist, colored"
                          "03_building (interior space furnitures tables and chairs:3), trees, shrub and hedges, many many people, dessin, aquarelle, aquarelles"
                          "04_Black and white cartoon linocut outline digital drawing on a plain white background"
                          "05_Sun profile + halftone pattern + editorial illustration of a home + higly textured, genre defining mixed media collage painting + fringe absurdism + award winning halftone pattern illustration + simple flowing shapes + subtle shadows + paper texture + minimalist color scheme + inspired by zdzisław beksiński."
                          "06_collage in the style of alex katz"
                          "07_insanely detailed architectural fine black pen sketch, in the style of Hans doellgast"
                          "08__Beautiful pen and ink sketch, minimalist, colored"
                          "09_Avantgarde poster of constructivism, quarry, arctic, illustration, brutalism, high quality, desaturated color palette"
                          "10_fine copic pen and ink sketch, subtle aquarelle color palette"

                        Then IGNORE the default prompt and generate a prompt using the specific style instead.

                        2. If the user does not select a special style, start the prompt with:
                        "Create an architectural visualization with ultra-realistic details, clear contours, resembling a high-quality photograph taken with a Canon 5D. Octane rendering enhances the realism, with a view in 8K resolution for the highest level of detail, best quality, clear contour, (ultra realistic 1.4), canon 5d, high detail, photography, octane rendering, best quality, clear contours, (ultra realistic 1.4), canon 5d, high detail, photography, octane rendering, canon 5d, 8k."

                        3. Blend any material selections provided by the user into the description naturally (e.g., wood floors, metal tables, fabric curtains).

                        The final output should be a natural, cohesive paragraph in plain text. It must NOT include quotation marks or code formatting. It should be JSON-safe and suitable for direct display to users.`;

    let userInput = userPrompt || 'CREATE AN ARCHITECTURAL VISUALIZATION';
    
    if (materialsText) {
      userInput = `\n\nBased on the materials and the initial prompt I selected, please craft a detailed prompt that includes these materials: ${materialsText}. Please generate just two sentences that clearly highlight these features in a vivid description.`;
    } else {
      userInput = `\n\nBased on the materials and the initial prompt I selected, please craft a detailed prompt that includes these materials: USE ANY 2 OR 3 RANDOM MATERIALS FROM THIS LIST [ WOOD, CONCRETE, METAL, GLASS, STONE, MARBLE, STEEL, BRICK, PLASTER, CERAMICS, TERRAZZO, LIGHTING] Focus solely on the real estate itself without specifying the surrounding context, view type (interior, exterior, elevation, or aerial). Please generate just two sentences that clearly highlight these features in a vivid description.`;
    }

    // Call OpenAI API with your specific configuration
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user", 
          content: userInput
        }
      ],
      temperature: 1,
      max_tokens: 4095,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    const generatedPrompt = completion.choices[0].message.content.trim();

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
        originalPrompt: userPrompt
      }
    });

  } catch (error) {
    console.error('❌ Generate AI prompt error:', error);

    // Handle OpenAI specific errors
    if (error.code === 'insufficient_quota') {
      return res.status(402).json({
        error: 'OpenAI quota exceeded',
        message: 'Please check your OpenAI billing'
      });
    }

    if (error.code === 'invalid_api_key') {
      return res.status(401).json({
        error: 'Invalid OpenAI API key',
        message: 'Please configure valid OpenAI credentials'
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

module.exports = {
  addMaterial,
  getMaterials,
  removeMaterial,
  generatePrompt,
  getSavedPrompt,
  clearMaterials
};