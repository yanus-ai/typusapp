const { PrismaClient } = require('@prisma/client');
const { generateThumbnail } = require('../../src/services/image/thumbnail.service');
const prisma = new PrismaClient();

async function seedIllustrationOptions() {
  console.log('🌱 Seeding Illustration customization options...');

  try {
    // Find the Illustration subcategory under art category
    const illustrationSubcategory = await prisma.customizationSubCategory.findFirst({
      where: { 
        slug: 'illustration',
        category: { slug: 'art' }
      }
    });

    if (!illustrationSubcategory) {
      console.log('❌ Illustration subcategory not found. Please run customization seed first.');
      return;
    }

    // Check if Illustration options already exist
    const existingOptions = await prisma.customizationOption.count({
      where: { subCategoryId: illustrationSubcategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Illustration customization options already exist, skipping...');
      return;
    }

    // Create Illustration customization options with thumbnail generation
    const illustrationOptions = [
      {
        name: 'Illustration Style 1',
        slug: 'illustration-style-1',
        displayName: 'Illustration Style 1',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/illustration/replicate-prediction-3r7r5fbbq5otymrj6nke5cfc7y.webp',
        fileName: 'replicate-prediction-3r7r5fbbq5otymrj6nke5cfc7y.webp',
        orderIndex: 1
      },
      {
        name: 'Illustration Style 2',
        slug: 'illustration-style-2',
        displayName: 'Illustration Style 2',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/illustration/replicate-prediction-duzgxorbvgvwcwrjvwvuapg4fi.webp',
        fileName: 'replicate-prediction-duzgxorbvgvwcwrjvwvuapg4fi.webp',
        orderIndex: 2
      },
      {
        name: 'Illustration Style 3',
        slug: 'illustration-style-3',
        displayName: 'Illustration Style 3',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/illustration/replicate-prediction-e53wrnrbqxg3fcab7voupobx2m.webp',
        fileName: 'replicate-prediction-e53wrnrbqxg3fcab7voupobx2m.webp',
        orderIndex: 3
      },
      {
        name: 'Illustration Style 4',
        slug: 'illustration-style-4',
        displayName: 'Illustration Style 4',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/illustration/replicate-prediction-rmp7kxdbmyy63mhughpvn3stzm.webp',
        fileName: 'replicate-prediction-rmp7kxdbmyy63mhughpvn3stzm.webp',
        orderIndex: 4
      }
    ];

    // Generate thumbnails and create options
    const optionsWithThumbnails = [];
    
    for (const option of illustrationOptions) {
      console.log(`📸 Generating thumbnail for ${option.name}...`);
      
      try {
        // Generate 90x90 thumbnail
        const thumbnailUrl = await generateThumbnail(option.imageUrl, option.fileName, 90, 'customization-options/illustration/thumbnails');
        
        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: thumbnailUrl,
          subCategoryId: illustrationSubcategory.id,
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
          subCategoryId: illustrationSubcategory.id,
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

    console.log('✅ Created Illustration customization options with thumbnails');
    console.log('🎉 Illustration options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Illustration options:', error);
    throw error;
  }
}

module.exports = { seedIllustrationOptions };