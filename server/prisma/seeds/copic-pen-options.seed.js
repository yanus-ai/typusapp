const { PrismaClient } = require('@prisma/client');
const { generateThumbnail } = require('../../src/services/image/thumbnail.service');
const prisma = new PrismaClient();

async function seedCopicPenOptions() {
  console.log('🌱 Seeding Copic Pen customization options...');

  try {
    // Find the Copic Pen subcategory under art category
    const copicPenSubcategory = await prisma.customizationSubCategory.findFirst({
      where: { 
        slug: 'copic-pen',
        category: { slug: 'art' }
      }
    });

    if (!copicPenSubcategory) {
      console.log('❌ Copic Pen subcategory not found. Please run customization seed first.');
      return;
    }

    // Check if Copic Pen options already exist
    const existingOptions = await prisma.customizationOption.count({
      where: { subCategoryId: copicPenSubcategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Copic Pen customization options already exist, skipping...');
      return;
    }

    // Create Copic Pen customization options with thumbnail generation
    const copicPenOptions = [
      {
        name: 'Klein Copic Pen Style',
        slug: 'klein-copic-pen-style',
        displayName: 'Klein Copic Pen Style',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/copic-pen/replicate-prediction-glr4vazbbelufij4ojt6wlcwuu.webp',
        fileName: 'replicate-prediction-glr4vazbbelufij4ojt6wlcwuu.webp',
        orderIndex: 1
      },
      {
        name: 'Copic Pen Style 2',
        slug: 'copic-pen-style-2',
        displayName: 'Copic Pen Style 2',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/copic-pen/replicate-prediction-zdxo2ajbdiw6slmq6dxkxycvbq.webp',
        fileName: 'replicate-prediction-zdxo2ajbdiw6slmq6dxkxycvbq.webp',
        orderIndex: 2
      },
    ];

    // Generate thumbnails and create options
    const optionsWithThumbnails = [];

    for (const option of copicPenOptions) {
      console.log(`📸 Generating thumbnail for ${option.name}...`);
      
      try {
        // Generate 90x90 thumbnail
        const thumbnailUrl = await generateThumbnail(option.imageUrl, option.fileName, 90, 'customization-options/copic-pen/thumbnails');
        
        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: thumbnailUrl,
          subCategoryId: copicPenSubcategory.id,
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
          subCategoryId: copicPenSubcategory.id,
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

    console.log('✅ Created Copic Pen customization options with thumbnails');
    console.log('🎉 Copic Pen options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Copic Pen options:', error);
    throw error;
  }
}

module.exports = { seedCopicPenOptions };