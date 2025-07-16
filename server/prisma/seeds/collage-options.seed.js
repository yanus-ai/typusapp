const { PrismaClient } = require('@prisma/client');
const { generateThumbnail } = require('../../src/services/image/thumbnail.service');
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

    // Create Collage customization options with thumbnail generation
    const collageOptions = [
      {
        name: 'Klein Collage Style',
        slug: 'klein-collage-style',
        displayName: 'Klein Collage Style',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/collage/klein_replicate-prediction-e53wrnrbqxg3fcab7voupobx2m%20%281%29%20%281%29.webp',
        fileName: 'klein_replicate-prediction-e53wrnrbqxg3fcab7voupobx2m (1) (1).webp',
        orderIndex: 1
      },
      {
        name: 'Collage Style 2',
        slug: 'collage-style-2',
        displayName: 'Collage Style 2',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/collage/replicate-prediction-banmi2jbh5wtuzpqpfy3tjb2bi.webp',
        fileName: 'replicate-prediction-banmi2jbh5wtuzpqpfy3tjb2bi.webp',
        orderIndex: 2
      },
      {
        name: 'Collage Style 3',
        slug: 'collage-style-3',
        displayName: 'Collage Style 3',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/collage/replicate-prediction-teaizczb56emiwcjfcqcwp5i3m.webp',
        fileName: 'replicate-prediction-teaizczb56emiwcjfcqcwp5i3m.webp',
        orderIndex: 3
      }
    ];

    // Generate thumbnails and create options
    const optionsWithThumbnails = [];
    
    for (const option of collageOptions) {
      console.log(`📸 Generating thumbnail for ${option.name}...`);
      
      try {
        // Generate 90x90 thumbnail
        const thumbnailUrl = await generateThumbnail(option.imageUrl, option.fileName, 90, 'customization-options/collage/thumbnails');
        
        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: thumbnailUrl,
          subCategoryId: collageSubcategory.id,
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
          subCategoryId: collageSubcategory.id,
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

    console.log('✅ Created Collage customization options with thumbnails');
    console.log('🎉 Collage options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Collage options:', error);
    throw error;
  }
}

module.exports = { seedCollageOptions };