const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Cache for customization options (24 hour TTL)
let customizationOptionsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Get all customization options structured for the frontend
const getCustomizationOptions = async (req, res) => {
  try {
    // Check cache first
    const now = Date.now();
    if (customizationOptionsCache && (now - cacheTimestamp) < CACHE_TTL) {
      console.log('⚡ Returning cached customization options (avoiding 20s query)');
      return res.json(customizationOptionsCache);
    }

    console.log('🔄 Fetching customization options from database...');

    // Get photorealistic options
    const photorealisticCategory = await prisma.customizationCategory.findFirst({
      where: { slug: 'photorealistic' },
      include: {
        subCategories: {
          include: {
            options: {
              where: { isActive: true },
              orderBy: { orderIndex: 'asc' }
            },
            materialCategories: {
              include: {
                materialCategory: {
                  include: {
                    options: {
                      where: { isActive: true },
                      orderBy: { orderIndex: 'asc' }
                    }
                  }
                }
              },
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    // Get illustration (art) options
    const artCategory = await prisma.customizationCategory.findFirst({
      where: { slug: 'art' },
      include: {
        subCategories: {
          include: {
            options: {
              where: { isActive: true },
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    // Structure photorealistic data
    const photorealisticData = {};
    
    if (photorealisticCategory) {
      photorealisticCategory.subCategories.forEach(subCategory => {
        if (subCategory.slug === 'walls' || subCategory.slug === 'floors' || subCategory.slug === 'context') {
          // Handle material-based subcategories
          photorealisticData[subCategory.slug] = {};
          
          subCategory.materialCategories.forEach(materialCategoryJunction => {
            const materialCategory = materialCategoryJunction.materialCategory;
            photorealisticData[subCategory.slug][materialCategory.slug] = materialCategory.options.map(option => ({
              id: option.id,
              name: option.name,
              displayName: option.displayName,
              description: option.description,
              imageUrl: option.imageUrl,
              thumbnailUrl: option.thumbnailUrl,
              slug: option.slug,
              subCategory: {
                id: subCategory.id
              }
            }));
          });
        } else {
          // Handle regular customization options (type, style, weather, lighting)
          photorealisticData[subCategory.slug] = subCategory.options.map(option => ({
            id: option.id,
            name: option.name,
            displayName: option.displayName,
            description: option.description,
            imageUrl: option.imageUrl,
            thumbnailUrl: option.thumbnailUrl,
            slug: option.slug,
            subCategory: {
              id: subCategory.id
            }
          }));
        }
      });
    }

    // Structure illustration (art) data
    const artData = {};
    
    if (artCategory) {
      artCategory.subCategories.forEach(subCategory => {
        artData[subCategory.name] = subCategory.options.map(option => ({
          id: option.id,
          name: option.name,
          displayName: option.displayName,
          description: option.description,
          imageUrl: option.imageUrl,
          thumbnailUrl: option.thumbnailUrl,
          slug: option.slug,
          subCategory: {
            id: subCategory.id
          }
        }));
      });
    }

    const response = {
      photorealistic: photorealisticData,
      art: artData
    };

    // Cache the response for future requests
    customizationOptionsCache = response;
    cacheTimestamp = now;

    console.log('✅ Customization options fetched and cached successfully');
    console.log('📊 Photorealistic categories:', Object.keys(photorealisticData));
    console.log('🎨 Art categories:', Object.keys(artData));
    
    res.json(response);
  } catch (error) {
    console.error('❌ Error fetching customization options:', error);
    res.status(500).json({ 
      error: 'Failed to fetch customization options',
      message: error.message 
    });
  }
};

// Load complete settings from a generated image (Image record)
const loadBatchSettings = async (req, res) => {
  try {
    const { batchId } = req.params;
    const userId = req.user.id;

    console.log(`🔍 Loading batch settings for batchId: ${batchId}, userId: ${userId}`);

    // Get the batch and its settings
    const batch = await prisma.generationBatch.findFirst({
      where: {
        id: parseInt(batchId),
        userId: userId
      },
      include: {
        createSettings: true,
        variations: {
          where: { status: 'COMPLETED' },
          take: 1, // Get one completed image for settings reference
          include: {
            batch: true
          }
        }
      }
    });

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    // Get the first completed image for detailed settings
    const referenceImage = batch.variations[0];
    let completeSettings = {};

    if (referenceImage && referenceImage.settingsSnapshot) {
      // Use the comprehensive settings from the Image record
      completeSettings = {
        // UI Settings
        selectedStyle: referenceImage.settingsSnapshot.mode || 'photorealistic',
        variations: referenceImage.settingsSnapshot.variations || 1,
        creativity: referenceImage.settingsSnapshot.creativity || 50,
        expressivity: referenceImage.settingsSnapshot.expressivity || 50,
        resemblance: referenceImage.settingsSnapshot.resemblance || 50,
        
        // Selections from regions
        selections: {
          type: referenceImage.settingsSnapshot.buildingType,
          walls: {
            category: referenceImage.settingsSnapshot.category,
            option: null // Will be populated from regions data
          },
          floors: null,
          context: referenceImage.settingsSnapshot.context,
          style: referenceImage.settingsSnapshot.styleSelection,
          weather: null,
          lighting: null,
          ...referenceImage.settingsSnapshot.regions
        },

        // Input Image Context
        inputImageId: referenceImage.settingsSnapshot.inputImageId,
        
        // Generated prompt and AI materials
        generatedPrompt: referenceImage.aiPrompt,
        aiMaterials: referenceImage.aiMaterials || [],
        maskMaterialMappings: referenceImage.maskMaterialMappings || {},
        
        // Technical settings
        runpodSettings: {
          seed: referenceImage.settingsSnapshot.seed,
          model: referenceImage.settingsSnapshot.model,
          upscale: referenceImage.settingsSnapshot.upscale,
          cfgKsampler1: referenceImage.settingsSnapshot.cfgKsampler1,
          cannyStrength: referenceImage.settingsSnapshot.cannyStrength,
          loraStrength: referenceImage.settingsSnapshot.loraStrength
        }
      };
    } else if (batch.createSettings) {
      // Fallback to CreateSettings if Image settings are not available
      completeSettings = {
        selectedStyle: batch.createSettings.mode || 'photorealistic',
        variations: batch.createSettings.variations || 1,
        creativity: batch.createSettings.creativity || 50,
        expressivity: batch.createSettings.expressivity || 50,
        resemblance: batch.createSettings.resemblance || 50,
        selections: {
          type: batch.createSettings.buildingType,
          walls: { category: batch.createSettings.category },
          context: batch.createSettings.context,
          style: batch.createSettings.style,
          ...batch.createSettings.regions
        },
        inputImageId: batch.inputImageId,
        generatedPrompt: batch.prompt
      };
    }

    console.log('✅ Batch settings loaded successfully:', {
      batchId,
      hasImageSettings: !!referenceImage?.settingsSnapshot,
      hasCreateSettings: !!batch.createSettings,
      settingsKeys: Object.keys(completeSettings)
    });

    res.json({
      success: true,
      batchId: batch.id,
      inputImageId: batch.inputImageId,
      settings: completeSettings,
      metadata: {
        createdAt: batch.createdAt,
        totalVariations: batch.totalVariations,
        moduleType: batch.moduleType,
        status: batch.status
      }
    });

  } catch (error) {
    console.error('❌ Error loading batch settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load batch settings',
      error: error.message
    });
  }
};

// Load settings from a specific generated image
const loadImageSettings = async (req, res) => {
  try {
    const { imageId } = req.params;
    const userId = req.user.id;

    console.log(`🔍 Loading image settings for imageId: ${imageId}, userId: ${userId}`);

    // Get the specific image with all its settings
    const image = await prisma.image.findFirst({
      where: {
        id: parseInt(imageId),
        userId: userId
      },
      include: {
        batch: {
          include: {
            createSettings: true
          }
        }
      }
    });

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Extract complete settings from the image
    let completeSettings = {};

    if (image.settingsSnapshot) {
      completeSettings = {
        // UI Settings
        selectedStyle: image.settingsSnapshot.mode || 'photorealistic',
        variations: image.settingsSnapshot.variations || 1,
        creativity: image.settingsSnapshot.creativity || 50,
        expressivity: image.settingsSnapshot.expressivity || 50,
        resemblance: image.settingsSnapshot.resemblance || 50,
        
        // Selections
        selections: {
          type: image.settingsSnapshot.buildingType,
          walls: {
            category: image.settingsSnapshot.category
          },
          context: image.settingsSnapshot.context,
          style: image.settingsSnapshot.styleSelection,
          ...image.settingsSnapshot.regions
        },

        // Input Image Context
        inputImageId: image.settingsSnapshot.inputImageId,
        
        // Generated image specific data (NEW SCHEMA FIELDS)
        maskMaterialMappings: image.maskMaterialMappings || {},
        contextSelection: image.contextSelection,
        generatedPrompt: image.generationPrompt || image.aiPrompt,
        aiMaterials: image.aiMaterials || []
      };
    }

    console.log('✅ Image settings loaded successfully:', {
      imageId,
      hasSettings: !!image.settingsSnapshot,
      settingsKeys: Object.keys(completeSettings)
    });

    res.json({
      success: true,
      imageId: image.id,
      batchId: image.batchId,
      inputImageId: completeSettings.inputImageId || image.batch.inputImageId,
      settings: completeSettings,
      metadata: {
        createdAt: image.createdAt,
        variationNumber: image.variationNumber,
        status: image.status
      }
    });

  } catch (error) {
    console.error('❌ Error loading image settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load image settings',
      error: error.message
    });
  }
};

module.exports = {
  getCustomizationOptions,
  loadBatchSettings,
  loadImageSettings
};