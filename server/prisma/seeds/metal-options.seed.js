const { PrismaClient } = require('@prisma/client');
const { generateThumbnail } = require('../../src/services/image/thumbnail.service');
const prisma = new PrismaClient();

async function seedMetalOptions() {
  console.log('🌱 Seeding Metal material options...');

  try {
    // Find the Metal material category (now global)
    const metalCategory = await prisma.materialCategory.findFirst({
      where: { slug: 'metal' }
    });

    if (!metalCategory) {
      console.log('❌ Metal material category not found. Please run wall materials seed first.');
      return;
    }

    // Check if Metal options already exist
    const existingOptions = await prisma.materialOption.count({
      where: { categoryId: metalCategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Metal material options already exist, skipping...');
      return;
    }

    // Create Metal material options with thumbnail generation
    const metalOptions = [
      {
        name: 'Antiqued Aged metal surfaces',
        slug: 'antiqued-aged-metal-surfaces-1',
        displayName: 'Antiqued Aged metal surfaces',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Antiqued%20Aged%20metal%20surfaces%20.png',
        fileName: 'Antiqued Aged metal surfaces .png',
        orderIndex: 1
      },
      {
        name: 'Anodized Corrosion-resistant metal surfaces',
        slug: 'anodized-corrosion-resistant-metal-surfaces',
        displayName: 'Anodized Corrosion-resistant metal surfaces',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Anodized%20Corrosion-resistant%20metal%20surfaces.png',
        fileName: 'Anodized Corrosion-resistant metal surfaces.png',
        orderIndex: 2
      },
      {
        name: 'Anodized steel surfaces',
        slug: 'anodized-steel-surfaces',
        displayName: 'Anodized steel surfaces',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Anodized%20steel%20surfaces.png',
        fileName: 'Anodized steel surfaces.png',
        orderIndex: 3
      },
      {
        name: 'Antiqued Aged metal surfaces',
        slug: 'antiqued-aged-metal-surfaces-2',
        displayName: 'Antiqued Aged metal surfaces Alt',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Antiqued%20Aged%20metal%20surfaces.png',
        fileName: 'Antiqued Aged metal surfaces.png',
        orderIndex: 4
      },
      {
        name: 'Brushed metal',
        slug: 'brushed-metal',
        displayName: 'Brushed metal',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Brushed%20metal.png',
        fileName: 'Brushed metal.png',
        orderIndex: 5
      },
      {
        name: 'Brushed Textured metal',
        slug: 'brushed-textured-metal',
        displayName: 'Brushed Textured metal',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Brushed%20Textured%20metal.png',
        fileName: 'Brushed Textured metal.png',
        orderIndex: 6
      },
      {
        name: 'Corrugated Ribbed metal',
        slug: 'corrugated-ribbed-metal',
        displayName: 'Corrugated Ribbed metal',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Corrugated%20Ribbed%20metal.png',
        fileName: 'Corrugated Ribbed metal.png',
        orderIndex: 7
      },
      {
        name: 'Etched Decorative metal patterns',
        slug: 'etched-decorative-metal-patterns',
        displayName: 'Etched Decorative metal patterns',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Etched%20Decorative%20metal%20patterns.png',
        fileName: 'Etched Decorative metal patterns.png',
        orderIndex: 8
      },
      {
        name: 'Galvanized Zinc-coated metal surfaces',
        slug: 'galvanized-zinc-coated-metal-surfaces',
        displayName: 'Galvanized Zinc-coated metal surfaces',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Galvanized%20Zinc-coated%20metal%20%20surfaces.png',
        fileName: 'Galvanized Zinc-coated metal  surfaces.png',
        orderIndex: 9
      },
      {
        name: 'Hammered Rough-textured metal',
        slug: 'hammered-rough-textured-metal',
        displayName: 'Hammered Rough-textured metal',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Hammered%20Rough-textured%20metal.png',
        fileName: 'Hammered Rough-textured metal.png',
        orderIndex: 10
      },
      {
        name: 'Perforated Ventilated metal surfaces',
        slug: 'perforated-ventilated-metal-surfaces',
        displayName: 'Perforated Ventilated metal surfaces',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Perforated%20Ventilated%20metal%20surfaces.png',
        fileName: 'Perforated Ventilated metal surfaces.png',
        orderIndex: 11
      },
      {
        name: 'Polished Mirror-like metal finishes',
        slug: 'polished-mirror-like-metal-finishes',
        displayName: 'Polished Mirror-like metal finishes',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Polished%20Mirror-like%20metal%20finishes.png',
        fileName: 'Polished Mirror-like metal finishes.png',
        orderIndex: 12
      }
    ];

    // Generate thumbnails and create options
    const optionsWithThumbnails = [];
    
    for (const option of metalOptions) {
      console.log(`📸 Generating thumbnail for ${option.name}...`);
      
      try {
        // Generate 90x90 thumbnail
        const thumbnailUrl = await generateThumbnail(option.imageUrl, option.fileName, 90, 'customization-options/metal/thumbnails');
        
        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: thumbnailUrl,
          categoryId: metalCategory.id,
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
          categoryId: metalCategory.id,
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

    console.log('✅ Created Metal material options with thumbnails');
    console.log('🎉 Metal options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Metal options:', error);
    throw error;
  }
}

module.exports = { seedMetalOptions };