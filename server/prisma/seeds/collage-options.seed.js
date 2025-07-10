const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedCollageOptions() {
  console.log('🌱 Seeding Collage customization options...');

  try {
    // Find the Collage subcategory under art category
    const collageSubcategory = await prisma.customizationSubCategory.findFirst({
      where: { 
        slug: 'collage',
        category: { slug: 'art' }
      }
    });

    if (!collageSubcategory) {
      console.log('❌ Collage subcategory not found. Please run customization seed first.');
      return;
    }

    // Check if Collage options already exist
    const existingOptions = await prisma.customizationOption.count({
      where: { subCategoryId: collageSubcategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Collage customization options already exist, skipping...');
      return;
    }

    // Create Collage customization options
    const collageOptions = [
      {
        name: 'Klein Collage Style',
        slug: 'klein-collage-style',
        displayName: 'Klein Collage Style',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/collage/klein_replicate-prediction-e53wrnrbqxg3fcab7voupobx2m%20%281%29.webp',
        orderIndex: 1
      },
      {
        name: 'Collage Style 2',
        slug: 'collage-style-2',
        displayName: 'Collage Style 2',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/collage/replicate-prediction-banmi2jbh5wtuzpqpfy3tjb2bi.webp',
        orderIndex: 2
      },
      {
        name: 'Collage Style 3',
        slug: 'collage-style-3',
        displayName: 'Collage Style 3',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/collage/replicate-prediction-teaizczb56emiwcjfcqcwp5i3m.webp',
        orderIndex: 3
      }
    ];

    await prisma.customizationOption.createMany({
      data: collageOptions.map(option => ({
        ...option,
        subCategoryId: collageSubcategory.id,
        isActive: true,
        tags: []
      }))
    });

    console.log('✅ Created Collage customization options');
    console.log('🎉 Collage options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Collage options:', error);
    throw error;
  }
}

module.exports = { seedCollageOptions };