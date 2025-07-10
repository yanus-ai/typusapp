const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedLinocutOptions() {
  console.log('🌱 Seeding Linocut customization options...');

  try {
    // Find the Linocut subcategory under art category
    const linocutSubcategory = await prisma.customizationSubCategory.findFirst({
      where: { 
        slug: 'linocut',
        category: { slug: 'art' }
      }
    });

    if (!linocutSubcategory) {
      console.log('❌ Linocut subcategory not found. Please run customization seed first.');
      return;
    }

    // Check if Linocut options already exist
    const existingOptions = await prisma.customizationOption.count({
      where: { subCategoryId: linocutSubcategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Linocut customization options already exist, skipping...');
      return;
    }

    // Create Linocut customization options
    const linocutOptions = [
      {
        name: 'Klein Linocut Style',
        slug: 'klein-linocut-style',
        displayName: 'Klein Linocut Style',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/linocut/klein_replicate-prediction-e53wrnrbqxg3fcab7voupobx2m%20%281%29.webp',
        orderIndex: 1
      },
      {
        name: 'Linocut Style 2',
        slug: 'linocut-style-2',
        displayName: 'Linocut Style 2',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/linocut/replicate-prediction-46esmirbcehq74whrjxxdvjapq.webp',
        orderIndex: 2
      },
      {
        name: 'Linocut Style 3',
        slug: 'linocut-style-3',
        displayName: 'Linocut Style 3',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/linocut/replicate-prediction-hnfisbrbem3ii6wengpzjcctn4.webp',
        orderIndex: 3
      }
    ];

    await prisma.customizationOption.createMany({
      data: linocutOptions.map(option => ({
        ...option,
        subCategoryId: linocutSubcategory.id,
        isActive: true,
        tags: []
      }))
    });

    console.log('✅ Created Linocut customization options');
    console.log('🎉 Linocut options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Linocut options:', error);
    throw error;
  }
}

module.exports = { seedLinocutOptions };