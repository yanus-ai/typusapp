const { PrismaClient } = require('@prisma/client');
const { generateThumbnail } = require('../../src/services/image/thumbnail.service');
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

    // Create Avantgarde customization options with thumbnail generation
    const avantGardeOptions = [
      {
        name: 'Klein Avantgarde Style',
        slug: 'klein-avantgarde-style',
        displayName: 'Klein Avantgarde Style',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/avantgrade/klein_replicate-prediction-e53wrnrbqxg3fcab7voupobx2m%20%281%29%20%282%29.webp',
        fileName: 'klein_replicate-prediction-e53wrnrbqxg3fcab7voupobx2m (1) (2).webp',
        orderIndex: 1
      },
      {
        name: 'Avantgarde Style 2',
        slug: 'avantgarde-style-2',
        displayName: 'Avantgarde Style 2',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/avantgrade/replicate-prediction-47unr6jb34pixe7qxudt42jprm.webp',
        fileName: 'replicate-prediction-47unr6jb34pixe7qxudt42jprm.webp',
        orderIndex: 2
      },
      {
        name: 'Avantgarde Style 3',
        slug: 'avantgarde-style-3',
        displayName: 'Avantgarde Style 3',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/avantgrade/replicate-prediction-kfxto5rbbpy7md6tikscglaclu.webp',
        fileName: 'replicate-prediction-kfxto5rbbpy7md6tikscglaclu.webp',
        orderIndex: 3
      },
      {
        name: 'Avantgarde Style 4',
        slug: 'avantgarde-style-4',
        displayName: 'Avantgarde Style 4',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/avantgrade/replicate-prediction-krwhdcbbkxcebftxrvkucwfh64.webp',
        fileName: 'replicate-prediction-krwhdcbbkxcebftxrvkucwfh64.webp',
        orderIndex: 4
      },
      {
        name: 'Avantgarde Style 5',
        slug: 'avantgarde-style-5',
        displayName: 'Avantgarde Style 5',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/avantgrade/replicate-prediction-lctgqqrbrzlseobwsqahy5oipm.webp',
        fileName: 'replicate-prediction-lctgqqrbrzlseobwsqahy5oipm.webp',
        orderIndex: 5
      }
    ];

    // Generate thumbnails and create options
    const optionsWithThumbnails = [];
    
    for (const option of avantGardeOptions) {
      console.log(`📸 Generating thumbnail for ${option.name}...`);
      
      try {
        // Generate 90x90 thumbnail
        const thumbnailUrl = await generateThumbnail(option.imageUrl, option.fileName, 90, 'customization-options/avantgrade/thumbnails');
        
        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: thumbnailUrl,
          subCategoryId: avantGardeSubcategory.id,
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
          subCategoryId: avantGardeSubcategory.id,
          isActive: true,
          tags: [],
          orderIndex: option.orderIndex
        });
      }
    }

    // Create all options with thumbnails
    await prisma.customizationOption.createMany({
      data: optionsWithThumbnails
    });

    console.log('✅ Created Avantgarde customization options with thumbnails');
    console.log('🎉 Avantgarde options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Avantgarde options:', error);
    throw error;
  }
}

module.exports = { seedAvantGardeOptions };