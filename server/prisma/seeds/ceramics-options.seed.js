const { PrismaClient } = require('@prisma/client');
const { generateThumbnail } = require('../../src/services/image/thumbnail.service');
const prisma = new PrismaClient();

async function seedCeramicsOptions() {
  console.log('🌱 Seeding Ceramics material options...');

  try {
    // Find the Ceramics material category (now global)
    const ceramicsCategory = await prisma.materialCategory.findFirst({
      where: { slug: 'ceramics' }
    });

    if (!ceramicsCategory) {
      console.log('❌ Ceramics material category not found. Please run wall materials seed first.');
      return;
    }

    // Check if Ceramics options already exist
    const existingOptions = await prisma.materialOption.count({
      where: { categoryId: ceramicsCategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Ceramics material options already exist, skipping...');
      return;
    }

    // Create Ceramics material options with thumbnail generation
    const ceramicsOptions = [
      {
        name: 'Crackled Aged cracked ceramics',
        slug: 'crackled-aged-ceramics',
        displayName: 'Crackled Aged cracked ceramics',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/ceramics/Crackled%20Aged%20cracked%20ceramics.png',
        fileName: 'Crackled Aged cracked ceramics.png',
        orderIndex: 1
      },
      {
        name: 'Earthenware Traditional rustic ceramics tiling',
        slug: 'earthenware-traditional-rustic',
        displayName: 'Earthenware Traditional rustic ceramics tiling',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/ceramics/Earthenware%20Traditional%20rustic%20ceramics%20tiling.png',
        fileName: 'Earthenware Traditional rustic ceramics tiling.png',
        orderIndex: 2
      },
      {
        name: 'Glazed Shiny ceramics tiling',
        slug: 'glazed-shiny-ceramics',
        displayName: 'Glazed Shiny ceramics tiling',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/ceramics/Glazed%20Shiny%20ceramics%20tiling.png',
        fileName: 'Glazed Shiny ceramics tiling.png',
        orderIndex: 3
      },
      {
        name: 'Handcrafted Artisan-made ceramics tiling',
        slug: 'handcrafted-artisan-made',
        displayName: 'Handcrafted Artisan-made ceramics tiling',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/ceramics/Handcrafted%20Artisan-made%20ceramics%20tiling.png',
        fileName: 'Handcrafted Artisan-made ceramics tiling.png',
        orderIndex: 4
      },
      {
        name: 'Matte Non-glossy ceramics tiling',
        slug: 'matte-non-glossy-ceramics',
        displayName: 'Matte Non-glossy ceramics tiling',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/ceramics/Matte%20Non-glossy%20ceramics%20tiling.png',
        fileName: 'Matte Non-glossy ceramics tiling.png',
        orderIndex: 5
      },
      {
        name: 'Polished Smooth glossy ceramics tiling',
        slug: 'polished-smooth-glossy',
        displayName: 'Polished Smooth glossy ceramics tiling',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/ceramics/Polished%20Smooth%20glossy%20ceramics%20tiling.png',
        fileName: 'Polished Smooth glossy ceramics tiling.png',
        orderIndex: 6
      },
      {
        name: 'Porcelain Elegant refined ceramics tiling',
        slug: 'porcelain-elegant-refined',
        displayName: 'Porcelain Elegant refined ceramics tiling',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/ceramics/Porcelain%20Elegant%20refined%20ceramics%20tiling.png',
        fileName: 'Porcelain Elegant refined ceramics tiling.png',
        orderIndex: 7
      },
      {
        name: 'Raku Colorful unique ceramicstiling',
        slug: 'raku-colorful-unique',
        displayName: 'Raku Colorful unique ceramicstiling',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/ceramics/Raku%20Colorful%20unique%20ceramicstiling.png',
        fileName: 'Raku Colorful unique ceramicstiling.png',
        orderIndex: 8
      },
      {
        name: 'Terra Cotta Earthy natural ceramics tiling',
        slug: 'terra-cotta-earthy-natural',
        displayName: 'Terra Cotta Earthy natural ceramics tiling',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/ceramics/Terra%20Cotta%20Earthy%20natural%20ceramics%20tiling.png',
        fileName: 'Terra Cotta Earthy natural ceramics tiling.png',
        orderIndex: 9
      }
    ];

    // Generate thumbnails and create options
    const optionsWithThumbnails = [];
    
    for (const option of ceramicsOptions) {
      console.log(`📸 Generating thumbnail for ${option.name}...`);
      
      try {
        // Generate 90x90 thumbnail
        const thumbnailUrl = await generateThumbnail(option.imageUrl, option.fileName, 90, 'customization-options/ceramics/thumbnails');
        
        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: thumbnailUrl,
          categoryId: ceramicsCategory.id,
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
          categoryId: ceramicsCategory.id,
          isActive: true,
          tags: [],
          orderIndex: option.orderIndex
        });
      }
    }

    // Create all options with thumbnails
    await prisma.materialOption.createMany({
      data: optionsWithThumbnails
    });

    console.log('✅ Created Ceramics material options with thumbnails');
    console.log('🎉 Ceramics options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Ceramics options:', error);
    throw error;
  }
}

module.exports = { seedCeramicsOptions };