const { PrismaClient } = require('@prisma/client');
const { generateThumbnail } = require('../../src/services/image/thumbnail.service');
const prisma = new PrismaClient();

async function seedStoneOptions() {
  console.log('🌱 Seeding Stone material options...');

  try {
    // Find the Stone material category (now global)
    const stoneCategory = await prisma.materialCategory.findFirst({
      where: { slug: 'stone' }
    });

    if (!stoneCategory) {
      console.log('❌ Stone material category not found. Please run wall materials seed first.');
      return;
    }

    // Check if Stone options already exist
    const existingOptions = await prisma.materialOption.count({
      where: { categoryId: stoneCategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Stone material options already exist, skipping...');
      return;
    }

    // Create Stone material options with thumbnail generation
    const stoneOptions = [
      {
        name: 'Alabaster Translucent',
        slug: 'alabaster-translucent',
        displayName: 'Alabaster Translucent',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Alabaster%20Translucent.png',
        fileName: 'Alabaster Translucent.png',
        orderIndex: 1
      },
      {
        name: 'Artificial Engineered stone tiles',
        slug: 'artificial-engineered-stone-tiles',
        displayName: 'Artificial Engineered stone tiles',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Artificial%20Engineered%20stone%20tiles.png',
        fileName: 'Artificial Engineered stone tiles.png',
        orderIndex: 2
      },
      {
        name: 'Basalt Dark surfaces',
        slug: 'basalt-dark-surfaces',
        displayName: 'Basalt Dark surfaces',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Basalt%20Dark%20surfaces.png',
        fileName: 'Basalt Dark surfaces.png',
        orderIndex: 3
      },
      {
        name: 'Bluestone Blue-gray materials',
        slug: 'bluestone-blue-gray-materials',
        displayName: 'Bluestone Blue-gray materials',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Bluestone%20Blue-gray%20materials.png',
        fileName: 'Bluestone Blue-gray materials.png',
        orderIndex: 4
      },
      {
        name: 'Carrara  polished Cast Stone Molded stone Facades tiles',
        slug: 'carrara-polished-cast-stone-molded-stone-facades-tiles',
        displayName: 'Carrara  polished Cast Stone Molded stone Facades tiles',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Carrara%20%20polished%20Cast%20Stone%20Molded%20stone%20Facades%20tiles.png',
        fileName: 'Carrara  polished Cast Stone Molded stone Facades tiles.png',
        orderIndex: 5
      },
      {
        name: 'Cast Stone Molded stone Facades tiles',
        slug: 'cast-stone-molded-stone-facades-tiles',
        displayName: 'Cast Stone Molded stone Facades tiles',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Cast%20Stone%20Molded%20stone%20Facades%20tiles.png',
        fileName: 'Cast Stone Molded stone Facades tiles.png',
        orderIndex: 6
      },
      {
        name: 'Coralstone Lightweight stone materials',
        slug: 'coralstone-lightweight-stone-materials',
        displayName: 'Coralstone Lightweight stone materials',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Coralstone%20Lightweight%20stone%20materials.png',
        fileName: 'Coralstone Lightweight stone materials.png',
        orderIndex: 7
      },
      {
        name: 'Coralstone Lightweight',
        slug: 'coralstone-lightweight',
        displayName: 'Coralstone Lightweight',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Coralstone%20Lightweight.png',
        fileName: 'Coralstone Lightweight.png',
        orderIndex: 8
      },
      {
        name: 'flat polished natural Stone tiles',
        slug: 'flat-polished-natural-stone-tiles',
        displayName: 'flat polished natural Stone tiles',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/flat%20polished%20natural%20Stone%20tiles.png',
        fileName: 'flat polished natural Stone tiles.png',
        orderIndex: 9
      },
      {
        name: 'Gneiss Banded stone',
        slug: 'gneiss-banded-stone',
        displayName: 'Gneiss Banded stone',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Gneiss%20Banded%20stone.png',
        fileName: 'Gneiss Banded stone.png',
        orderIndex: 10
      },
      {
        name: 'Granite Polished',
        slug: 'granite-polished',
        displayName: 'Granite Polished',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Granite%20Polished.png',
        fileName: 'Granite Polished.png',
        orderIndex: 11
      },
      {
        name: 'Labradorite Iridescent stone',
        slug: 'labradorite-iridescent-stone',
        displayName: 'Labradorite Iridescent stone',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Labradorite%20Iridescent%20stone.png',
        fileName: 'Labradorite Iridescent stone.png',
        orderIndex: 12
      },
      {
        name: 'Limestone Natural flat surface',
        slug: 'limestone-natural-flat-surface',
        displayName: 'Limestone Natural flat surface',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Limestone%20Natural%20flat%20surface.png',
        fileName: 'Limestone Natural flat surface.png',
        orderIndex: 13
      },
      {
        name: 'Onyx Translucent finishes',
        slug: 'onyx-translucent-finishes',
        displayName: 'Onyx Translucent finishes',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Onyx%20Translucent%20finishes.png',
        fileName: 'Onyx Translucent finishes.png',
        orderIndex: 14
      },
      {
        name: 'Petrified Wood Fossilized',
        slug: 'petrified-wood-fossilized',
        displayName: 'Petrified Wood Fossilized',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Petrified%20Wood%20Fossilized.png',
        fileName: 'Petrified Wood Fossilized.png',
        orderIndex: 15
      },
      {
        name: 'Prefab Stone Components ',
        slug: 'prefab-stone-components',
        displayName: 'Prefab Stone Components ',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Prefab%20Stone%20Components%20.png',
        fileName: 'Prefab Stone Components .png',
        orderIndex: 16
      },
      {
        name: 'Quartz stone Durable finishes',
        slug: 'quartz-stone-durable-finishes',
        displayName: 'Quartz stone Durable finishes',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Quartz%20stone%20Durable%20finishes.png',
        fileName: 'Quartz stone Durable finishes.png',
        orderIndex: 17
      },
      {
        name: 'Quartzite Hard materials',
        slug: 'quartzite-hard-materials',
        displayName: 'Quartzite Hard materials',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Quartzite%20Hard%20materials.png',
        fileName: 'Quartzite Hard materials.png',
        orderIndex: 18
      },
      {
        name: 'Sandstone',
        slug: 'sandstone',
        displayName: 'Sandstone',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Sandstone.png',
        fileName: 'Sandstone.png',
        orderIndex: 19
      },
      {
        name: 'Schist Shiny tiles',
        slug: 'schist-shiny-tiles',
        displayName: 'Schist Shiny tiles',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Schist%20Shiny%20tiles.png',
        fileName: 'Schist Shiny tiles.png',
        orderIndex: 20
      }
    ];

    // Generate thumbnails and create options
    const optionsWithThumbnails = [];
    
    for (const option of stoneOptions) {
      console.log(`📸 Generating thumbnail for ${option.name}...`);
      
      try {
        // Generate 90x90 thumbnail
        const thumbnailUrl = await generateThumbnail(option.imageUrl, option.fileName, 90, 'customization-options/stone/thumbnails');
        
        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: thumbnailUrl,
          categoryId: stoneCategory.id,
          isActive: true,
          tags: [],
          orderIndex: option.orderIndex
        });
        
        console.log(`✅ Thumbnail created for ${option.name}`);
        
      } catch (error) {
        console.error(`❌ Failed to generate thumbnail for ${option.name}:`, error);
        
        // Continue without thumbnail
        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: null, // No thumbnail if generation failed
          categoryId: stoneCategory.id,
          isActive: true,
          tags: [],
          orderIndex: option.orderIndex
        });
      }
    }

    // Create all options with thumbnails
    await prisma.materialOption.createMany({
      data: optionsWithThumbnails
    });

    console.log('✅ Created Stone material options with thumbnails');
    console.log('🎉 Stone options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Stone options:', error);
    throw error;
  }
}

module.exports = { seedStoneOptions };