const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all customization options structured for the frontend
const getCustomizationOptions = async (req, res) => {
  try {
    console.log('🔄 Fetching customization options...');

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
              slug: option.slug
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
            slug: option.slug
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
          slug: option.slug
        }));
      });
    }

    const response = {
      photorealistic: photorealisticData,
      art: artData
    };

    console.log('✅ Customization options fetched successfully');
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

module.exports = {
  getCustomizationOptions
};