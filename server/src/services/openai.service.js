const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { OPENAI_API_KEY } = require("../config/constants");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

/**
 * Load system prompt from markdown file
 * @param {string} promptName - Name of the prompt file (without .md extension)
 * @returns {string} - System prompt content
 */
const loadSystemPrompt = (promptName) => {
  try {
    const promptPath = path.join(__dirname, '../prompts', `${promptName}.md`);
    return fs.readFileSync(promptPath, 'utf8').trim();
  } catch (error) {
    console.error(`Failed to load system prompt: ${promptName}`, error);
    throw new Error(`System prompt file not found: ${promptName}.md`);
  }
};

/**
 * Generate AI prompt using OpenAI Chat Completions API
 * @param {Object} options - Generation options
 * @param {string} options.userPrompt - User input prompt
 * @param {string} options.materialsText - Formatted materials text
 * @param {string} options.systemPromptName - Name of system prompt file to use
 * @returns {Promise<string>} - Generated prompt
 */
const generatePrompt = async ({ 
  userPrompt = 'CREATE AN ARCHITECTURAL VISUALIZATION',
  materialsText = '',
  systemPromptName = 'architectural-visualization'
}) => {
  try {
    // Load system prompt from markdown file
    const systemPrompt = loadSystemPrompt(systemPromptName);

    // Prepare user input based on system prompt type
    let userInput = userPrompt;
    
    if (systemPromptName === 'image-refinement') {
      // Special handling for image refinement prompts
      const baseRefinementPrompt = 'Refine the image with ultra-realistic details, clear contours, and crisp lines, resembling a high-quality photograph taken with a Canon 5D. Octane rendering enhances the realism, with a view in 8K resolution for the highest level of detail, best quality, (ultra realistic 1.4), canon 5d, high detail, photography.';
      
      if (materialsText) {
        userInput = `Based on the tags and the initial prompt I selected, please craft a detailed refinement prompt that incorporates these tags: ${materialsText} and enhances this initial description:\n\n${baseRefinementPrompt}\n\nPlease generate just two sentences that vividly describe the refinements, clearly highlighting the integration of the tags and the enhanced features of the image.`;
      } else {
        userInput = `Based on the initial prompt, please craft a detailed refinement prompt that enhances this initial description:\n\n${baseRefinementPrompt}\n\nPlease generate just two sentences that vividly describe the refinements and enhanced features of the image.`;
      }
    } else {
      // Original logic for create/architectural visualization prompts
      if (materialsText) {
        userInput = `\n\nBased on the materials and the initial prompt I selected, please craft a detailed prompt that includes these materials: ${materialsText}. Please generate just two sentences that clearly highlight these features in a vivid description.`;
      } else {
        userInput = `\n\nBased on the materials and the initial prompt I selected, please craft a detailed prompt that includes these materials: USE ANY 2 OR 3 RANDOM MATERIALS FROM THIS LIST [ WOOD, CONCRETE, METAL, GLASS, STONE, MARBLE, STEEL, BRICK, PLASTER, CERAMICS, TERRAZZO, LIGHTING] Focus solely on the real estate itself without specifying the surrounding context, view type (interior, exterior, elevation, or aerial). Please generate just two sentences that clearly highlight these features in a vivid description.`;
      }
    }

    console.log('🤖 Calling OpenAI with system prompt:', systemPromptName);
    console.log('🤖 User input length:', userInput.length);
    console.log('🤖 Materials included:', materialsText ? 'YES' : 'NO');
    if (materialsText) {
      console.log('🤖 Materials text:', materialsText);
    }

    // Call OpenAI API
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
    
    console.log('✅ OpenAI prompt generated successfully');
    console.log('Generated prompt length:', generatedPrompt.length);

    return generatedPrompt;

  } catch (error) {
    console.error('❌ OpenAI generation error:', error);

    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI quota exceeded. Please check your billing.');
    }

    if (error.code === 'invalid_api_key') {
      throw new Error('Invalid OpenAI API key. Please configure valid credentials.');
    }

    if (error.code === 'rate_limit_exceeded') {
      throw new Error('OpenAI rate limit exceeded. Please try again later.');
    }

    if (error.code === 'model_not_found') {
      throw new Error('OpenAI model not found. Please check the model name.');
    }

    // Generic error
    throw new Error(`OpenAI API error: ${error.message}`);
  }
};

/**
 * Validate OpenAI configuration
 * @returns {Promise<boolean>} - True if configuration is valid
 */
const validateConfiguration = async () => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    // Test API call with minimal request
    await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "test" }],
      max_tokens: 5
    });

    console.log('✅ OpenAI configuration is valid');
    return true;

  } catch (error) {
    console.error('❌ OpenAI configuration validation failed:', error.message);
    return false;
  }
};

/**
 * Translate text to English using OpenAI Chat Completions API
 * @param {string} text - Text to translate
 * @returns {Promise<string>} - Translated text
 */
const translateText = async (text) => {
  try {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return text; // Return original if empty or invalid
    }

    // Load translation system prompt
    const systemPrompt = loadSystemPrompt('text-translation');

    console.log('🌐 Translating text with OpenAI...');
    console.log('Original text:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));

    // Call OpenAI API for translation
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: systemPrompt
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: text
            }
          ]
        }
      ],
      response_format: {
        type: "text"
      },
      temperature: 1,
      max_tokens: 2048,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    const translatedText = completion.choices[0].message.content.trim();
    
    console.log('✅ Text translation successful');
    console.log('Translated text:', translatedText.substring(0, 100) + (translatedText.length > 100 ? '...' : ''));

    return translatedText;

  } catch (error) {
    console.error('❌ Translation error:', error);

    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI quota exceeded. Please check your billing.');
    }

    if (error.code === 'invalid_api_key') {
      throw new Error('Invalid OpenAI API key. Please configure valid credentials.');
    }

    if (error.code === 'rate_limit_exceeded') {
      throw new Error('OpenAI rate limit exceeded. Please try again later.');
    }

    throw new Error(`Failed to translate text: ${error.message}`);
  }
};

/**
 * List available system prompts
 * @returns {string[]} - Array of available prompt names
 */
const listSystemPrompts = () => {
  try {
    const promptsDir = path.join(__dirname, '../prompts');
    const files = fs.readdirSync(promptsDir);
    return files
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace('.md', ''));
  } catch (error) {
    console.error('❌ Failed to list system prompts:', error);
    return [];
  }
};

module.exports = {
  generatePrompt,
  translateText,
  loadSystemPrompt,
  validateConfiguration,
  listSystemPrompts
};