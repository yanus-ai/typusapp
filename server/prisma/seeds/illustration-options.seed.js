const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedIllustrationOptions() {
  console.log('🌱 Seeding Illustration customization options...');

  try {
    // Find the Art subcategory under art category
    const artSubcategory = await prisma.customizationSubCategory.findFirst({
      where: { 
        slug: 'illustration',
        category: { slug: 'art' }
      }
    });

    if (!artSubcategory) {
      console.log('❌ Illustration subcategory not found. Please run customization seed first.');
      return;
    }

    // Check if Illustration options already exist
    const existingOptions = await prisma.customizationOption.count({
      where: { subCategoryId: artSubcategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Illustration customization options already exist, skipping...');
      return;
    }

    // Create Illustration customization options
    const illustrationOptions = [
      {
        name: 'Illustration Style 1',
        slug: 'illustration-style-1',
        displayName: 'Illustration Style 1',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/illustration/replicate-prediction-3r7r5fbbq5otymrj6nke5cfc7y.webp',
        orderIndex: 1
      },
      {
        name: 'Illustration Style 2',
        slug: 'illustration-style-2',
        displayName: 'Illustration Style 2',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/illustration/replicate-prediction-duzgxorbvgvwcwrjvwvuapg4fi.webp',
        orderIndex: 2
      },
      {
        name: 'Illustration Style 3',
        slug: 'illustration-style-3',
        displayName: 'Illustration Style 3',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/illustration/replicate-prediction-e53wrnrbqxg3fcab7voupobx2m.webp',
        orderIndex: 3
      },
      {
        name: 'Illustration Style 4',
        slug: 'illustration-style-4',
        displayName: 'Illustration Style 4',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/illustration/replicate-prediction-rmp7kxdbmyy63mhughpvn3stzm.webp',
        orderIndex: 4
      }
    ];

    await prisma.customizationOption.createMany({
      data: illustrationOptions.map(option => ({
        ...option,
        subCategoryId: artSubcategory.id,
        isActive: true,
        tags: []
      }))
    });

    console.log('✅ Created Illustration customization options');
    console.log('🎉 Illustration options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Illustration options:', error);
    throw error;
  }
}

module.exports = { seedIllustrationOptions };