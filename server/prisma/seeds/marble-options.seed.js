const { PrismaClient } = require('@prisma/client');
const { generateThumbnail } = require('../../src/services/image/thumbnail.service');
const prisma = new PrismaClient();

async function seedMarbleOptions() {
  console.log('🌱 Seeding Marble material options...');

  try {
    // Find the Marble material category (now global)
    const marbleCategory = await prisma.materialCategory.findFirst({
      where: { slug: 'marble' }
    });

    if (!marbleCategory) {
      console.log('❌ Marble material category not found. Please run wall materials seed first.');
      return;
    }

    // Check if Marble options already exist
    const existingOptions = await prisma.materialOption.count({
      where: { categoryId: marbleCategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Marble material options already exist, skipping...');
      return;
    }

    // Create Marble material options with thumbnail generation
    const marbleOptions = [
      {
        name: 'Arabescato Marble Grey patterns',
        slug: 'arabescato-marble-grey-patterns',
        displayName: 'Arabescato Marble Grey patterns',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/marble/Arabescato%20Marble%20Grey%20patterns.png',
        fileName: 'Arabescato Marble Grey patterns.png',
        orderIndex: 1
      },
      {
        name: 'Blue Marble Blue hues',
        slug: 'blue-marble-blue-hues',
        displayName: 'Blue Marble Blue hues',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/marble/Blue%20Marble%20Blue%20hues.png',
        fileName: 'Blue Marble Blue hues.png',
        orderIndex: 2
      },
      {
        name: 'Carrara Calacatta Marble Bold veining',
        slug: 'carrara-calacatta-marble-bold-veining',
        displayName: 'Carrara Calacatta Marble Bold veining',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/marble/Carrara%20Calacatta%20Marble%20Bold%20veining.png',
        fileName: 'Carrara Calacatta Marble Bold veining.png',
        orderIndex: 3
      },
      {
        name: 'Carrara Marble White veins',
        slug: 'carrara-marble-white-veins',
        displayName: 'Carrara Marble White veins',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/marble/Carrara%20Marble%20White%20veins.png',
        fileName: 'Carrara Marble White veins.png',
        orderIndex: 4
      },
      {
        name: 'Crema Marfil Marble Cream-colored',
        slug: 'crema-marfil-marble-cream-colored',
        displayName: 'Crema Marfil Marble Cream-colored',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/marble/Crema%20Marfil%20Marble%20Cream-colored.png',
        fileName: 'Crema Marfil Marble Cream-colored.png',
        orderIndex: 5
      },
      {
        name: 'Emperador Marble Rich brown',
        slug: 'emperador-marble-rich-brown',
        displayName: 'Emperador Marble Rich brown',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/marble/Emperador%20Marble%20Rich%20brown.png',
        fileName: 'Emperador Marble Rich brown.png',
        orderIndex: 6
      },
      {
        name: 'Nero Marquina Marble Black veins',
        slug: 'nero-marquina-marble-black-veins',
        displayName: 'Nero Marquina Marble Black veins',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/marble/Nero%20Marquina%20Marble%20Black%20veins.png',
        fileName: 'Nero Marquina Marble Black veins.png',
        orderIndex: 7
      },
      {
        name: 'Rosso Levanto Marble Reddish-brown',
        slug: 'rosso-levanto-marble-reddish-brown',
        displayName: 'Rosso Levanto Marble Reddish-brown',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/marble/Rosso%20Levanto%20Marble%20Reddish-brown.png',
        fileName: 'Rosso Levanto Marble Reddish-brown.png',
        orderIndex: 8
      },
      {
        name: 'Statuario Marble Subtle',
        slug: 'statuario-marble-subtle',
        displayName: 'Statuario Marble Subtle',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/marble/Statuario%20Marble%20Subtle.png',
        fileName: 'Statuario Marble Subtle.png',
        orderIndex: 9
      }
    ];

    // Generate thumbnails and create options
    const optionsWithThumbnails = [];
    
    for (const option of marbleOptions) {
      console.log(`📸 Generating thumbnail for ${option.name}...`);
      
      try {
        // Generate 90x90 thumbnail
        const thumbnailUrl = await generateThumbnail(option.imageUrl, option.fileName, 90, 'customization-options/marble/thumbnails');
        
        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: thumbnailUrl,
          categoryId: marbleCategory.id,
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
          categoryId: marbleCategory.id,
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

    console.log('✅ Created Marble material options with thumbnails');
    console.log('🎉 Marble options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Marble options:', error);
    throw error;
  }
}

module.exports = { seedMarbleOptions };