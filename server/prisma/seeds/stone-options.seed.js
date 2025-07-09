const { PrismaClient } = require('@prisma/client');
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

    // Create Stone material options
    const stoneOptions = [
      {
        name: 'Alabaster Translucent',
        slug: 'alabaster-translucent',
        displayName: 'Alabaster Translucent',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Alabaster%20Translucent.png',
        orderIndex: 1
      },
      {
        name: 'Artificial Engineered stone tiles',
        slug: 'artificial-engineered-stone-tiles',
        displayName: 'Artificial Engineered stone tiles',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Artificial%20Engineered%20stone%20tiles.png',
        orderIndex: 2
      },
      {
        name: 'Basalt Dark surfaces',
        slug: 'basalt-dark-surfaces',
        displayName: 'Basalt Dark surfaces',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Basalt%20Dark%20surfaces.png',
        orderIndex: 3
      },
      {
        name: 'Bluestone Blue-gray materials',
        slug: 'bluestone-blue-gray-materials',
        displayName: 'Bluestone Blue-gray materials',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Bluestone%20Blue-gray%20materials.png',
        orderIndex: 4
      },
      {
        name: 'Carrara  polished Cast Stone Molded stone Facades tiles',
        slug: 'carrara-polished-cast-stone-molded-stone-facades-tiles',
        displayName: 'Carrara  polished Cast Stone Molded stone Facades tiles',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Carrara%20%20polished%20Cast%20Stone%20Molded%20stone%20Facades%20tiles.png',
        orderIndex: 5
      },
      {
        name: 'Cast Stone Molded stone Facades tiles',
        slug: 'cast-stone-molded-stone-facades-tiles',
        displayName: 'Cast Stone Molded stone Facades tiles',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Cast%20Stone%20Molded%20stone%20Facades%20tiles.png',
        orderIndex: 6
      },
      {
        name: 'Coralstone Lightweight stone materials',
        slug: 'coralstone-lightweight-stone-materials',
        displayName: 'Coralstone Lightweight stone materials',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Coralstone%20Lightweight%20stone%20materials.png',
        orderIndex: 7
      },
      {
        name: 'Coralstone Lightweight',
        slug: 'coralstone-lightweight',
        displayName: 'Coralstone Lightweight',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Coralstone%20Lightweight.png',
        orderIndex: 8
      },
      {
        name: 'flat polished natural Stone tiles',
        slug: 'flat-polished-natural-stone-tiles',
        displayName: 'flat polished natural Stone tiles',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/flat%20polished%20natural%20Stone%20tiles.png',
        orderIndex: 9
      },
      {
        name: 'Gneiss Banded stone',
        slug: 'gneiss-banded-stone',
        displayName: 'Gneiss Banded stone',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Gneiss%20Banded%20stone.png',
        orderIndex: 10
      },
      {
        name: 'Granite Polished',
        slug: 'granite-polished',
        displayName: 'Granite Polished',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Granite%20Polished.png',
        orderIndex: 11
      },
      {
        name: 'Labradorite Iridescent stone',
        slug: 'labradorite-iridescent-stone',
        displayName: 'Labradorite Iridescent stone',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Labradorite%20Iridescent%20stone.png',
        orderIndex: 12
      },
      {
        name: 'Limestone Natural flat surface',
        slug: 'limestone-natural-flat-surface',
        displayName: 'Limestone Natural flat surface',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Limestone%20Natural%20flat%20surface.png',
        orderIndex: 13
      },
      {
        name: 'Onyx Translucent finishes',
        slug: 'onyx-translucent-finishes',
        displayName: 'Onyx Translucent finishes',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Onyx%20Translucent%20finishes.png',
        orderIndex: 14
      },
      {
        name: 'Petrified Wood Fossilized',
        slug: 'petrified-wood-fossilized',
        displayName: 'Petrified Wood Fossilized',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Petrified%20Wood%20Fossilized.png',
        orderIndex: 15
      },
      {
        name: 'Prefab Stone Components ',
        slug: 'prefab-stone-components',
        displayName: 'Prefab Stone Components ',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Prefab%20Stone%20Components%20.png',
        orderIndex: 16
      },
      {
        name: 'Quartz stone Durable finishes',
        slug: 'quartz-stone-durable-finishes',
        displayName: 'Quartz stone Durable finishes',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Quartz%20stone%20Durable%20finishes.png',
        orderIndex: 17
      },
      {
        name: 'Quartzite Hard materials',
        slug: 'quartzite-hard-materials',
        displayName: 'Quartzite Hard materials',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Quartzite%20Hard%20materials.png',
        orderIndex: 18
      },
      {
        name: 'Sandstone',
        slug: 'sandstone',
        displayName: 'Sandstone',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Sandstone.png',
        orderIndex: 19
      },
      {
        name: 'Schist Shiny tiles',
        slug: 'schist-shiny-tiles',
        displayName: 'Schist Shiny tiles',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Schist%20Shiny%20tiles.png',
        orderIndex: 20
      }
    ];

    await prisma.materialOption.createMany({
      data: stoneOptions.map(option => ({
        ...option,
        categoryId: stoneCategory.id,
        isActive: true,
        tags: []
      }))
    });

    console.log('✅ Created Stone material options');
    console.log('🎉 Stone options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Stone options:', error);
    throw error;
  }
}

module.exports = { seedStoneOptions };