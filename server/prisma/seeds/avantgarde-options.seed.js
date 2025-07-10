const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAvantGardeOptions() {
  console.log('🌱 Seeding Avantgarde customization options...');

  try {
    // Find the Avantgarde subcategory under art category
    const avantGardeSubcategory = await prisma.customizationSubCategory.findFirst({
      where: { 
        slug: 'avantgarde',
        category: { slug: 'art' }
      }
    });

    if (!avantGardeSubcategory) {
      console.log('❌ Avantgarde subcategory not found. Please run customization seed first.');
      return;
    }

    // Check if Avantgarde options already exist
    const existingOptions = await prisma.customizationOption.count({
      where: { subCategoryId: avantGardeSubcategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Avantgarde customization options already exist, skipping...');
      return;
    }

    // Create Avantgarde customization options
    const avantGardeOptions = [
      {
        name: 'Klein Avantgarde Style',
        slug: 'klein-avantgarde-style',
        displayName: 'Klein Avantgarde Style',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/avantgarde/klein_replicate-prediction-e53wrnrbqxg3fcab7voupobx2m%20%281%29.webp',
        orderIndex: 1
      },
      {
        name: 'Avantgarde Style 2',
        slug: 'avantgarde-style-2',
        displayName: 'Avantgarde Style 2',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/avantgarde/replicate-prediction-47unr6jb34pixe7qxudt42jprm.webp',
        orderIndex: 2
      },
      {
        name: 'Avantgarde Style 3',
        slug: 'avantgarde-style-3',
        displayName: 'Avantgarde Style 3',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/avantgarde/replicate-prediction-kfxto5rbbpy7md6tikscglaclu.webp',
        orderIndex: 3
      },
      {
        name: 'Avantgarde Style 4',
        slug: 'avantgarde-style-4',
        displayName: 'Avantgarde Style 4',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/avantgarde/replicate-prediction-krwhdcbbkxcebftxrvkucwfh64.webp',
        orderIndex: 4
      },
      {
        name: 'Avantgarde Style 5',
        slug: 'avantgarde-style-5',
        displayName: 'Avantgarde Style 5',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/avantgarde/replicate-prediction-lctgqqrbrzlseobwsqahy5oipm.webp',
        orderIndex: 5
      }
    ];

    await prisma.customizationOption.createMany({
      data: avantGardeOptions.map(option => ({
        ...option,
        subCategoryId: avantGardeSubcategory.id,
        isActive: true,
        tags: []
      }))
    });

    console.log('✅ Created Avantgarde customization options');
    console.log('🎉 Avantgarde options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Avantgarde options:', error);
    throw error;
  }
}

module.exports = { seedAvantGardeOptions };