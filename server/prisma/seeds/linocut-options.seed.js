const { PrismaClient } = require('@prisma/client');
const { generateThumbnail } = require('../../src/services/image/thumbnail.service');
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

    // Create Linocut customization options with thumbnail generation
    const linocutOptions = [
      {
        name: 'Klein Linocut Style',
        slug: 'klein-linocut-style',
        displayName: 'Klein Linocut Style',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/linocut/klein_replicate-prediction-e53wrnrbqxg3fcab7voupobx2m%20%281%29.webp',
        fileName: 'klein_replicate-prediction-e53wrnrbqxg3fcab7voupobx2m (1).webp',
        orderIndex: 1
      },
      {
        name: 'Linocut Style 2',
        slug: 'linocut-style-2',
        displayName: 'Linocut Style 2',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/linocut/replicate-prediction-46esmirbcehq74whrjxxdvjapq.webp',
        fileName: 'replicate-prediction-46esmirbcehq74whrjxxdvjapq.webp',
        orderIndex: 2
      },
      {
        name: 'Linocut Style 3',
        slug: 'linocut-style-3',
        displayName: 'Linocut Style 3',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/linocut/replicate-prediction-hnfisbrbem3ii6wengpzjcctn4.webp',
        fileName: 'replicate-prediction-hnfisbrbem3ii6wengpzjcctn4.webp',
        orderIndex: 3
      }
    ];

    // Generate thumbnails and create options
    const optionsWithThumbnails = [];
    
    for (const option of linocutOptions) {
      console.log(`📸 Generating thumbnail for ${option.name}...`);
      
      try {
        // Generate 90x90 thumbnail
        const thumbnailUrl = await generateThumbnail(option.imageUrl, option.fileName, 90, 'customization-options/linocut/thumbnails');
        
        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: thumbnailUrl,
          subCategoryId: linocutSubcategory.id,
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
          subCategoryId: linocutSubcategory.id,
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

    console.log('✅ Created Linocut customization options with thumbnails');
    console.log('🎉 Linocut options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Linocut options:', error);
    throw error;
  }
}

module.exports = { seedLinocutOptions };