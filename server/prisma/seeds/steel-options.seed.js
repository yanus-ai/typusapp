const { PrismaClient } = require('@prisma/client');
const { generateThumbnail } = require('../../src/services/image/thumbnail.service');
const prisma = new PrismaClient();

async function seedSteelOptions() {
  console.log('🌱 Seeding Steel material options...');

  try {
    // Find the Steel material category (now global)
    const steelCategory = await prisma.materialCategory.findFirst({
      where: { slug: 'steel' }
    });

    if (!steelCategory) {
      console.log('❌ Steel material category not found. Please run wall materials seed first.');
      return;
    }

    // Check if Steel options already exist
    const existingOptions = await prisma.materialOption.count({
      where: { categoryId: steelCategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Steel material options already exist, skipping...');
      return;
    }

    // Create Steel material options with thumbnail generation
    const steelOptions = [
      {
        name: 'Anodized Treated steel',
        slug: 'anodized-treated-steel',
        displayName: 'Anodized Treated steel',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/Anodized%20Treated%20steel.png',
        fileName: 'Anodized Treated steel.png',
        orderIndex: 1
      },
      {
        name: 'Brushed Textured steel',
        slug: 'brushed-textured-steel',
        displayName: 'Brushed Textured steel',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/Brushed%20Textured%20steel.png',
        fileName: 'Brushed Textured steel.png',
        orderIndex: 2
      },
      {
        name: 'corten steel',
        slug: 'corten-steel',
        displayName: 'corten steel',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/corten%20steel.png',
        fileName: 'corten steel.png',
        orderIndex: 3
      },
      {
        name: 'Matte Non-reflectiv stee',
        slug: 'matte-non-reflective-steel',
        displayName: 'Matte Non-reflectiv stee',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/Matte%20Non-reflectiv%20steel.png',
        fileName: 'Matte Non-reflectiv steel.png',
        orderIndex: 4
      },
      {
        name: 'Oxidized Patina-covered steel',
        slug: 'oxidized-patina-covered-steel',
        displayName: 'Oxidized Patina-covered steel',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/Oxidized%20Patina-covered%20steel.png',
        fileName: 'Oxidized Patina-covered steel.png',
        orderIndex: 5
      },
      {
        name: 'Polished Smooth steel finishes',
        slug: 'polished-smooth-steel-finishes',
        displayName: 'Polished Smooth steel finishes',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/Polished%20Smooth%20steel%20finishes.png',
        fileName: 'Polished Smooth steel finishes.png',
        orderIndex: 6
      },
      {
        name: 'Powder-coated Colored finishesd steel surfaces',
        slug: 'powder-coated-colored-finished-steel-surfaces',
        displayName: 'Powder-coated Colored finishesd steel surfaces',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/Powder-coated%20Colored%20finishesd%20steel%20surfaces.png',
        fileName: 'Powder-coated Colored finishesd steel surfaces.png',
        orderIndex: 7
      },
      {
        name: 'Reflective Shiny steel',
        slug: 'reflective-shiny-steel',
        displayName: 'Reflective Shiny steel',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/Reflective%20Shiny%20steel.png',
        fileName: 'Reflective Shiny steel.png',
        orderIndex: 8
      }
    ];

    // Generate thumbnails and create options
    const optionsWithThumbnails = [];
    
    for (const option of steelOptions) {
      console.log(`📸 Generating thumbnail for ${option.name}...`);
      
      try {
        // Generate 90x90 thumbnail
        const thumbnailUrl = await generateThumbnail(option.imageUrl, option.fileName, 90, 'customization-options/steel/thumbnails');
        
        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: thumbnailUrl,
          categoryId: steelCategory.id,
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
          categoryId: steelCategory.id,
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

    console.log('✅ Created Steel material options with thumbnails');
    console.log('🎉 Steel options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Steel options:', error);
    throw error;
  }
}

module.exports = { seedSteelOptions };