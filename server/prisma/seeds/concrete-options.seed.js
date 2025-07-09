const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedConcreteOptions() {
  console.log('🌱 Seeding Concrete material options...');

  try {
    // Find the Concrete material category (now global)
    const concreteCategory = await prisma.materialCategory.findFirst({
      where: { slug: 'concrete' }
    });

    if (!concreteCategory) {
      console.log('❌ Concrete material category not found. Please run wall materials seed first.');
      return;
    }

    // Check if Concrete options already exist
    const existingOptions = await prisma.materialOption.count({
      where: { categoryId: concreteCategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Concrete material options already exist, skipping...');
      return;
    }

    // Create Concrete material options
    const concreteOptions = [
      {
        name: 'Brushed concrete',
        slug: 'brushed-concrete',
        displayName: 'Brushed concrete',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Brushed%20concrete.png',
        orderIndex: 1
      },
      {
        name: 'Contemporary Polished concrete floors',
        slug: 'contemporary-polished-concrete-floors',
        displayName: 'Contemporary Polished concrete floors',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Contemporary%20Polished%20concrete%20floors.png',
        orderIndex: 2
      },
      {
        name: 'Corroded Weathered concrete components',
        slug: 'corroded-weathered-concrete-components',
        displayName: 'Corroded Weathered concrete components',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Corroded%20Weathered%20concrete%20components.png',
        orderIndex: 3
      },
      {
        name: 'Etched Acid-treated concrete',
        slug: 'etched-acid-treated-concrete',
        displayName: 'Etched Acid-treated concrete',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Etched%20Acid-treated%20concrete.png',
        orderIndex: 4
      },
      {
        name: 'Glossy Shiny concrete surfaces',
        slug: 'glossy-shiny-concrete-surfaces',
        displayName: 'Glossy Shiny concrete surfaces',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Glossy%20Shiny%20concrete%20surfaces.png',
        orderIndex: 5
      },
      {
        name: 'Matte Non-reflective concrete finishes',
        slug: 'matte-non-reflective-concrete-finishes',
        displayName: 'Matte Non-reflective concrete finishes',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Matte%20Non-reflective%20concrete%20finishes.png',
        orderIndex: 6
      },
      {
        name: 'Modular Prefabricated concrete panels',
        slug: 'modular-prefabricated-concrete-panels',
        displayName: 'Modular Prefabricated concrete panels',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Modular%20Prefabricated%20concrete%20panels.png',
        orderIndex: 7
      },
      {
        name: 'Polished Reflective concrete surfaces',
        slug: 'polished-reflective-concrete-surfaces',
        displayName: 'Polished Reflective concrete surfaces',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Polished%20Reflective%20concrete%20surfaces.png',
        orderIndex: 8
      },
      {
        name: 'Soundproof Noise-reducing concrete walls',
        slug: 'soundproof-noise-reducing-concrete-walls',
        displayName: 'Soundproof Noise-reducing concrete walls',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Soundproof%20Noise-reducing%20concrete%20walls.png',
        orderIndex: 9
      },
      {
        name: 'Weathered Aged concrete finishes',
        slug: 'weathered-aged-concrete-finishes',
        displayName: 'Weathered Aged concrete finishes',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Weathered%20Aged%20concrete%20finishes.png',
        orderIndex: 10
      },
      {
        name: 'Industrial Exposed concrete walls',
        slug: 'industrial-exposed-concrete-walls',
        displayName: 'Industrial Exposed concrete walls',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Industrial%20Exposed%20concrete%20walls.png',
        orderIndex: 11
      },
      {
        name: 'Patinated Aged concrete finishes',
        slug: 'patinated-aged-concrete-finishes',
        displayName: 'Patinated Aged concrete finishes',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Patinated%20Aged%20concrete%20finishes.png',
        orderIndex: 12
      },
      {
        name: 'Porous Permeable concrete surfaces',
        slug: 'porous-permeable-concrete-surfaces',
        displayName: 'Porous Permeable concrete surfaces',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Porous%20Permeable%20concrete%20surfaces.png',
        orderIndex: 13
      }
    ];

    await prisma.materialOption.createMany({
      data: concreteOptions.map(option => ({
        ...option,
        categoryId: concreteCategory.id,
        isActive: true,
        tags: [] // Empty tags array for now
      }))
    });

    console.log('✅ Created Concrete material options');
    console.log('🎉 Concrete options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Concrete options:', error);
    throw error;
  }
}

module.exports = { seedConcreteOptions };