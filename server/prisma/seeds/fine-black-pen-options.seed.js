const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedFineBlackPenOptions() {
  console.log('🌱 Seeding Fine Black Pen customization options...');

  try {
    // Find the Fine Black Pen subcategory under art category
    const fineBlackPenSubcategory = await prisma.customizationSubCategory.findFirst({
      where: { 
        slug: 'fine-black-pen',
        category: { slug: 'art' }
      }
    });

    if (!fineBlackPenSubcategory) {
      console.log('❌ Fine Black Pen subcategory not found. Please run customization seed first.');
      return;
    }

    // Check if Fine Black Pen options already exist
    const existingOptions = await prisma.customizationOption.count({
      where: { subCategoryId: fineBlackPenSubcategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Fine Black Pen customization options already exist, skipping...');
      return;
    }

    // Create Fine Black Pen customization options
    const fineBlackPenOptions = [
      {
        name: 'Fine Black Pen Style 1',
        slug: 'fine-black-pen-style-1',
        displayName: 'Fine Black Pen Style 1',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/fine-black-pen/replicate-prediction-g4q3ezbbpvo3ybqbisihejcafm.webp',
        orderIndex: 1
      },
      {
        name: 'Fine Black Pen Style 2',
        slug: 'fine-black-pen-style-2',
        displayName: 'Fine Black Pen Style 2',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/fine-black-pen/replicate-prediction-kg6znhzbhgyj57ko34zwwjpnsq.webp',
        orderIndex: 2
      },
      {
        name: 'Fine Black Pen Style 3',
        slug: 'fine-black-pen-style-3',
        displayName: 'Fine Black Pen Style 3',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/fine-black-pen/replicate-prediction-qma9810c6drgg0ceymp8336wvw.webp',
        orderIndex: 3
      },
      {
        name: 'Fine Black Pen Style 4',
        slug: 'fine-black-pen-style-4',
        displayName: 'Fine Black Pen Style 4',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/fine-black-pen/replicate-prediction-sw3hd7jbzfjrp5tny2yfhsvg24.webp',
        orderIndex: 4
      }
    ];

    await prisma.customizationOption.createMany({
      data: fineBlackPenOptions.map(option => ({
        ...option,
        subCategoryId: fineBlackPenSubcategory.id,
        isActive: true,
        tags: []
      }))
    });

    console.log('✅ Created Fine Black Pen customization options');
    console.log('🎉 Fine Black Pen options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Fine Black Pen options:', error);
    throw error;
  }
}

module.exports = { seedFineBlackPenOptions };