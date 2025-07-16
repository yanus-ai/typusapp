const { PrismaClient } = require('@prisma/client');
const { generateThumbnail } = require('../../src/services/image/thumbnail.service');
const prisma = new PrismaClient();

async function seedTerrazzoOptions() {
  console.log('🌱 Seeding Terrazzo material options...');

  try {
    // Find the Terrazzo material category (now global)
    const terrazzoCategory = await prisma.materialCategory.findFirst({
      where: { slug: 'terrazzo' }
    });

    if (!terrazzoCategory) {
      console.log('❌ Terrazzo material category not found. Please run wall materials seed first.');
      return;
    }

    // Check if Terrazzo options already exist
    const existingOptions = await prisma.materialOption.count({
      where: { categoryId: terrazzoCategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Terrazzo material options already exist, skipping...');
      return;
    }

    // Create Terrazzo material options with thumbnail generation
    const terrazzoOptions = [
      {
        name: 'Epoxy Highly polished seamless',
        slug: 'epoxy-highly-polished-seamless',
        displayName: 'Epoxy Highly polished seamless',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/Epoxy%20Highly%20polished%20seamless.png',
        fileName: 'Epoxy Highly polished seamless.png',
        orderIndex: 1
      },
      {
        name: 'Standard Smooth glossy finish',
        slug: 'standard-smooth-glossy-finish',
        displayName: 'Standard Smooth glossy finish',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/Standard%20Smooth%20glossy%20finish.png',
        fileName: 'Standard Smooth glossy finish.png',
        orderIndex: 2
      },
      {
        name: 'terrazo Cementitious Sleek linear details',
        slug: 'terrazo-cementitious-sleek-linear-details',
        displayName: 'terrazo Cementitious Sleek linear details',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/terrazo%20Cementitious%20Sleek%20linear%20details.png',
        fileName: 'terrazo Cementitious Sleek linear details.png',
        orderIndex: 3
      },
      {
        name: 'terrazo Cementitious Smooth polished or matte photorealistic',
        slug: 'terrazo-cementitious-smooth-polished-or-matte-photorealistic',
        displayName: 'terrazo Cementitious Smooth polished or matte photorealistic',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/terrazo%20Cementitious%20Smooth%20polished%20or%20matte%20photorealistic.png',
        fileName: 'terrazo Cementitious Smooth polished or matte photorealistic.png',
        orderIndex: 4
      },
      {
        name: 'terrazo Palladiana Smooth  mosaic-like patterns',
        slug: 'terrazo-palladiana-smooth-mosaic-like-patterns',
        displayName: 'terrazo Palladiana Smooth  mosaic-like patterns',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/terrazo%20Palladiana%20Smooth%20%20mosaic-like%20patterns.png',
        fileName: 'terrazo Palladiana Smooth  mosaic-like patterns.png',
        orderIndex: 5
      },
      {
        name: 'Terrazzo Composite surfaces',
        slug: 'terrazzo-composite-surfaces',
        displayName: 'Terrazzo Composite surfaces',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/Terrazzo%20Composite%20surfaces.png',
        fileName: 'Terrazzo Composite surfaces.png',
        orderIndex: 6
      },
      {
        name: 'Rustic Textured non-slip',
        slug: 'rustic-textured-non-slip',
        displayName: 'Rustic Textured non-slip',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/Rustic%20Textured%20non-slip.png',
        fileName: 'Rustic Textured non-slip.png',
        orderIndex: 7
      }
    ];

    // Generate thumbnails and create options
    const optionsWithThumbnails = [];
    
    for (const option of terrazzoOptions) {
      console.log(`📸 Generating thumbnail for ${option.name}...`);
      
      try {
        // Generate 90x90 thumbnail
        const thumbnailUrl = await generateThumbnail(option.imageUrl, option.fileName, 90, 'customization-options/terrazzo/thumbnails');
        
        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: thumbnailUrl,
          categoryId: terrazzoCategory.id,
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
          categoryId: terrazzoCategory.id,
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

    console.log('✅ Created Terrazzo material options with thumbnails');
    console.log('🎉 Terrazzo options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Terrazzo options:', error);
    throw error;
  }
}

module.exports = { seedTerrazzoOptions };