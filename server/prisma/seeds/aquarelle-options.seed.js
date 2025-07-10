const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAquarelleOptions() {
  console.log('🌱 Seeding Aquarelle customization options...');

  try {
    // Find the Aquarelle subcategory under art category
    const aquarelleSubcategory = await prisma.customizationSubCategory.findFirst({
      where: { 
        slug: 'aquarelle',
        category: { slug: 'art' }
      }
    });

    if (!aquarelleSubcategory) {
      console.log('❌ Aquarelle subcategory not found. Please run customization seed first.');
      return;
    }

    // Check if Aquarelle options already exist
    const existingOptions = await prisma.customizationOption.count({
      where: { subCategoryId: aquarelleSubcategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Aquarelle customization options already exist, skipping...');
      return;
    }

    // Create Aquarelle customization options
    const aquarelleOptions = [
      {
        name: 'Klein Aquarelle Style',
        slug: 'klein-aquarelle-style',
        displayName: 'Klein Aquarelle Style',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/aquarelle/klein_replicate-prediction-e53wrnrbqxg3fcab7voupobx2m.webp',
        orderIndex: 1
      },
      {
        name: 'Aquarelle Style 2',
        slug: 'aquarelle-style-2',
        displayName: 'Aquarelle Style 2',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/aquarelle/replicate-prediction-2srfbwrbadrhegu4karcfndfr4.webp',
        orderIndex: 2
      },
      {
        name: 'Aquarelle Style 3',
        slug: 'aquarelle-style-3',
        displayName: 'Aquarelle Style 3',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/aquarelle/replicate-prediction-mszv6hjbbeo6o42hirdnrt3muq.webp',
        orderIndex: 3
      },
      {
        name: 'Aquarelle Style 4',
        slug: 'aquarelle-style-4',
        displayName: 'Aquarelle Style 4',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/aquarelle/replicate-prediction-wd76nbrbmvowsaizcx2xp6glbq.webp',
        orderIndex: 4
      },
      {
        name: 'Aquarelle Style 5',
        slug: 'aquarelle-style-5',
        displayName: 'Aquarelle Style 5',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/aquarelle/replicate-prediction-wn3xwmzb4fysun3lathatkddaq.webp',
        orderIndex: 5
      }
    ];

    await prisma.customizationOption.createMany({
      data: aquarelleOptions.map(option => ({
        ...option,
        subCategoryId: aquarelleSubcategory.id,
        isActive: true,
        tags: []
      }))
    });

    console.log('✅ Created Aquarelle customization options');
    console.log('🎉 Aquarelle options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Aquarelle options:', error);
    throw error;
  }
}

module.exports = { seedAquarelleOptions };