const { PrismaClient } = require('@prisma/client');
const { generateThumbnail } = require('../../src/services/image/thumbnail.service');
const prisma = new PrismaClient();

async function seedStyleOptions() {
  console.log('🌱 Seeding Style customization options...');

  try {
    // Find the Style subcategory under photorealistic category
    const styleSubcategory = await prisma.customizationSubCategory.findFirst({
      where: { 
        slug: 'style',
        category: { slug: 'photorealistic' }
      }
    });

    if (!styleSubcategory) {
      console.log('❌ Style subcategory not found. Please run customization seed first.');
      return;
    }

    // Check if Style options already exist
    const existingOptions = await prisma.customizationOption.count({
      where: { subCategoryId: styleSubcategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Style customization options already exist, skipping...');
      return;
    }

    // Create Style customization options with thumbnail generation
    const styleOptions = [
      {
        name: 'Architectural Sculptural',
        slug: 'architectural-sculptural',
        displayName: 'Architectural Sculptural',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/style/Architectural%20Sculptural.png',
        fileName: 'Architectural Sculptural.png',
        orderIndex: 1
      },
      {
        name: 'Avant-garde Innovative',
        slug: 'avant-garde-innovative',
        displayName: 'Avant-garde Innovative',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/style/Avant-garde%20Innovative.png',
        fileName: 'Avant-garde Innovative.png',
        orderIndex: 2
      },
      {
        name: 'Brutalist Massive structures',
        slug: 'brutalist-massive-structures',
        displayName: 'Brutalist Massive structures',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/style/Brutalist%20Massive%20structures.png',
        fileName: 'Brutalist Massive structures.png',
        orderIndex: 3
      },
      {
        name: 'Innovative Cutting-edge applications facade components',
        slug: 'innovative-cutting-edge-applications-facade-components',
        displayName: 'Innovative Cutting-edge applications facade components',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/style/Innovative%20Cutting-edge%20applications%20facade%20components.png',
        fileName: 'Innovative Cutting-edge applications facade components.png',
        orderIndex: 4
      },
      {
        name: 'Minimalist Clean-lined designs',
        slug: 'minimalist-clean-lined-designs',
        displayName: 'Minimalist Clean-lined designs',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/style/Minimalist%20Clean-lined%20designs.png',
        fileName: 'Minimalist Clean-lined designs.png',
        orderIndex: 5
      },
      {
        name: 'Monolithic urban clad',
        slug: 'monolithic-urban-clad',
        displayName: 'Monolithic urban clad',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/style/Monolithic%20urban%20clad.png',
        fileName: 'Monolithic urban clad.png',
        orderIndex: 6
      },
      {
        name: 'Seismic-resistant Reinforced concrete structure',
        slug: 'seismic-resistant-reinforced-concrete-structure',
        displayName: 'Seismic-resistant Reinforced concrete structure',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/style/Seismic-resistant%20Reinforced%20concrete%20structure.png',
        fileName: 'Seismic-resistant Reinforced concrete structure.png',
        orderIndex: 7
      },
      {
        name: 'Sleek Smooth  clean walls',
        slug: 'sleek-smooth-clean-walls',
        displayName: 'Sleek Smooth  clean walls',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/style/Sleek%20Smooth%20%20clean%20walls.png',
        fileName: 'Sleek Smooth  clean walls.png',
        orderIndex: 8
      },
      {
        name: 'Sustainable Eco-friendly facade construction',
        slug: 'sustainable-eco-friendly-facade-construction',
        displayName: 'Sustainable Eco-friendly facade construction',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/style/Sustainable%20Eco-friendly%20facade%20construction.png',
        fileName: 'Sustainable Eco-friendly facade construction.png',
        orderIndex: 9
      },
      {
        name: 'Sustainable Low-carbon construction',
        slug: 'sustainable-low-carbon-construction',
        displayName: 'Sustainable Low-carbon construction',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/style/Sustainable%20Low-carbon%20construction.png',
        fileName: 'Sustainable Low-carbon construction.png',
        orderIndex: 10
      }
    ];

    // Generate thumbnails and create options
    const optionsWithThumbnails = [];
    
    for (const option of styleOptions) {
      console.log(`📸 Generating thumbnail for ${option.name}...`);
      
      try {
        // Generate 90x90 thumbnail
        const thumbnailUrl = await generateThumbnail(option.imageUrl, option.fileName, 90, 'customization-options/style/thumbnails');
        
        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: thumbnailUrl,
          subCategoryId: styleSubcategory.id,
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
          subCategoryId: styleSubcategory.id,
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

    console.log('✅ Created Style customization options with thumbnails');
    console.log('🎉 Style options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Style options:', error);
    throw error;
  }
}

module.exports = { seedStyleOptions };