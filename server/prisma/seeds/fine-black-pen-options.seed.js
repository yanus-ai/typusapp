const { PrismaClient } = require('@prisma/client');
const { generateThumbnail } = require('../../src/services/image/thumbnail.service');
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

    // Create Fine Black Pen customization options with thumbnail generation
    const fineBlackPenOptions = [
      {
        name: 'Fine Black Pen Style 1',
        slug: 'fine-black-pen-style-1',
        displayName: 'Fine Black Pen Style 1',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/fine-black-pen/replicate-prediction-g4q3ezbbpvo3ybqbisihejcafm.webp',
        fileName: 'replicate-prediction-g4q3ezbbpvo3ybqbisihejcafm.webp',
        orderIndex: 1
      },
      {
        name: 'Fine Black Pen Style 2',
        slug: 'fine-black-pen-style-2',
        displayName: 'Fine Black Pen Style 2',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/fine-black-pen/replicate-prediction-kg6znhzbhgyj57ko34zwwjpnsq.webp',
        fileName: 'replicate-prediction-kg6znhzbhgyj57ko34zwwjpnsq.webp',
        orderIndex: 2
      },
      {
        name: 'Fine Black Pen Style 3',
        slug: 'fine-black-pen-style-3',
        displayName: 'Fine Black Pen Style 3',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/fine-black-pen/replicate-prediction-qma9810c6drgg0ceymp8336wvw.webp',
        fileName: 'replicate-prediction-qma9810c6drgg0ceymp8336wvw.webp',
        orderIndex: 3
      },
      {
        name: 'Fine Black Pen Style 4',
        slug: 'fine-black-pen-style-4',
        displayName: 'Fine Black Pen Style 4',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/fine-black-pen/replicate-prediction-sw3hd7jbzfjrp5tny2yfhsvg24.webp',
        fileName: 'replicate-prediction-sw3hd7jbzfjrp5tny2yfhsvg24.webp',
        orderIndex: 4
      }
    ];

    // Generate thumbnails and create options
    const optionsWithThumbnails = [];
    
    for (const option of fineBlackPenOptions) {
      console.log(`📸 Generating thumbnail for ${option.name}...`);
      
      try {
        // Generate 90x90 thumbnail
        const thumbnailUrl = await generateThumbnail(option.imageUrl, option.fileName, 90, 'customization-options/fine-black-pen/thumbnails');
        
        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: thumbnailUrl,
          subCategoryId: fineBlackPenSubcategory.id,
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
          subCategoryId: fineBlackPenSubcategory.id,
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

    console.log('✅ Created Fine Black Pen customization options with thumbnails');
    console.log('🎉 Fine Black Pen options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Fine Black Pen options:', error);
    throw error;
  }
}

module.exports = { seedFineBlackPenOptions };