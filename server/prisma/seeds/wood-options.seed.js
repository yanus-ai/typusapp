const { PrismaClient } = require('@prisma/client');
const { generateThumbnail } = require('../../src/services/image/thumbnail.service');
const prisma = new PrismaClient();

async function seedWoodOptions() {
  console.log('🌱 Seeding Wood material options...');

  try {
    // Find the Wood material category (now global)
    const woodCategory = await prisma.materialCategory.findFirst({
      where: { slug: 'wood' }
    });

    if (!woodCategory) {
      console.log('❌ Wood material category not found. Please run wall materials seed first.');
      return;
    }

    // Check if Wood options already exist
    const existingOptions = await prisma.materialOption.count({
      where: { categoryId: woodCategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Wood material options already exist, skipping...');
      return;
    }

    // Create Wood material options with thumbnail generation
    const woodOptions = [
      {
        name: 'Brushed Textured wood grains',
        slug: 'brushed-textured-wood-grains',
        displayName: 'Brushed Textured wood grains',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Brushed%20Textured%20wood%20grains.png',
        fileName: 'Brushed Textured wood grains.png',
        orderIndex: 1
      },
      {
        name: 'Carved Detailed wooden trim',
        slug: 'carved-detailed-wooden-trim',
        displayName: 'Carved Detailed wooden trim',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Carved%20Detailed%20wooden%20trim.png',
        fileName: 'Carved Detailed wooden trim.png',
        orderIndex: 2
      },
      {
        name: 'Charred Burnt wood siding',
        slug: 'charred-burnt-wood-siding',
        displayName: 'Charred Burnt wood siding',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Charred%20Burnt%20wood%20siding.png',
        fileName: 'Charred Burnt wood siding.png',
        orderIndex: 3
      },
      {
        name: 'Distressed Rough wood textures',
        slug: 'distressed-rough-wood-textures',
        displayName: 'Distressed Rough wood textures',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Distressed%20Rough%20wood%20textures.png',
        fileName: 'Distressed Rough wood textures.png',
        orderIndex: 4
      },
      {
        name: 'Fine-grained wood veneer',
        slug: 'fine-grained-wood-veneer',
        displayName: 'Fine-grained wood veneer',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Fine-grained%20wood%20veneer.png',
        fileName: 'Fine-grained wood veneer.png',
        orderIndex: 5
      },
      {
        name: 'Hand-rubbed Polished wood surfaces',
        slug: 'hand-rubbed-polished-wood-surfaces',
        displayName: 'Hand-rubbed Polished wood surfaces',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Hand-rubbed%20Polished%20wood%20surfaces.png',
        fileName: 'Hand-rubbed Polished wood surfaces.png',
        orderIndex: 6
      },
      {
        name: 'Horizontally arranged wood planks',
        slug: 'horizontally-arranged-wood-planks',
        displayName: 'Horizontally arranged wood planks',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Horizontally%20arranged%20wood%20planks.png',
        fileName: 'Horizontally arranged wood planks.png',
        orderIndex: 7
      },
      {
        name: 'Industrial Exposed timber facades',
        slug: 'industrial-exposed-timber-facades',
        displayName: 'Industrial Exposed timber facades',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Industrial%20Exposed%20timber%20facades.png',
        fileName: 'Industrial Exposed timber facades.png',
        orderIndex: 8
      },
      {
        name: 'Lacquered Durable wood coatings',
        slug: 'lacquered-durable-wood-coatings',
        displayName: 'Lacquered Durable wood coatings',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Lacquered%20Durable%20wood%20coatings.png',
        fileName: 'Lacquered Durable wood coatings.png',
        orderIndex: 9
      },
      {
        name: 'Lightly painted wood surfaces',
        slug: 'lightly-painted-wood-surfaces',
        displayName: 'Lightly painted wood surfaces',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Lightly%20painted%20wood%20surfaces.png',
        fileName: 'Lightly painted wood surfaces.png',
        orderIndex: 10
      },
      {
        name: 'Matte-finished Non-glossy wood surfaces',
        slug: 'matte-finished-non-glossy-wood-surfaces',
        displayName: 'Matte-finished Non-glossy wood surfaces',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Matte-finished%20Non-glossy%20wood%20surfaces.png',
        fileName: 'Matte-finished Non-glossy wood surfaces.png',
        orderIndex: 11
      },
      {
        name: 'Modern Clean-lined wood panels',
        slug: 'modern-clean-lined-wood-panels',
        displayName: 'Modern Clean-lined wood panels',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Modern%20Clean-lined%20wood%20panels.png',
        fileName: 'Modern Clean-lined wood panels.png',
        orderIndex: 12
      },
      {
        name: 'modern minimal clean wood rafters',
        slug: 'modern-minimal-clean-wood-rafters',
        displayName: 'modern minimal clean wood rafters',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/modern%20minimal%20clean%20wood%20rafters.png',
        fileName: 'modern minimal clean wood rafters.png',
        orderIndex: 13
      },
      {
        name: 'Natural Unfinished wood',
        slug: 'natural-unfinished-wood',
        displayName: 'Natural Unfinished wood',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Natural%20Unfinished%20wood.png',
        fileName: 'Natural Unfinished wood.png',
        orderIndex: 14
      },
      {
        name: 'Organic Flowing wood elements',
        slug: 'organic-flowing-wood-elements',
        displayName: 'Organic Flowing wood elements',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Organic%20Flowing%20wood%20elements.png',
        fileName: 'Organic Flowing wood elements.png',
        orderIndex: 15
      },
      {
        name: 'Reclaimed wood Recycled accents',
        slug: 'reclaimed-wood-recycled-accents',
        displayName: 'Reclaimed wood Recycled accents',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Reclaimed%20wood%20Recycled%20accents.png',
        fileName: 'Reclaimed wood Recycled accents.png',
        orderIndex: 16
      },
      {
        name: 'Rustic Weathered wood beams',
        slug: 'rustic-weathered-wood-beams',
        displayName: 'Rustic Weathered wood beams',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Rustic%20Weathered%20wood%20beams.png',
        fileName: 'Rustic Weathered wood beams.png',
        orderIndex: 17
      },
      {
        name: 'Satin-finished Low-sheen wood surfaces',
        slug: 'satin-finished-low-sheen-wood-surfaces',
        displayName: 'Satin-finished Low-sheen wood surfaces',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Satin-finished%20Low-sheen%20wood%20surfaces.png',
        fileName: 'Satin-finished Low-sheen wood surfaces.png',
        orderIndex: 18
      },
      {
        name: 'Stained Richly paneled wood',
        slug: 'stained-richly-paneled-wood',
        displayName: 'Stained Richly paneled wood',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Stained%20Richly%20paneled%20wood.png',
        fileName: 'Stained Richly paneled wood.png',
        orderIndex: 19
      },
      {
        name: 'Varnished Glossy wood',
        slug: 'varnished-glossy-wood',
        displayName: 'Varnished Glossy wood',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Varnished%20Glossy%20wood.png',
        fileName: 'Varnished Glossy wood.png',
        orderIndex: 20
      },
      {
        name: 'Vertically oriented wood slats',
        slug: 'vertically-oriented-wood-slats',
        displayName: 'Vertically oriented wood slats',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Vertically%20oriented%20wood%20slats.png',
        fileName: 'Vertically oriented wood slats.png',
        orderIndex: 21
      },
      {
        name: 'Weathered Aged wood siding',
        slug: 'weathered-aged-wood-siding',
        displayName: 'Weathered Aged wood siding',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Weathered%20Aged%20wood%20siding.png',
        fileName: 'Weathered Aged wood siding.png',
        orderIndex: 22
      }
    ];

    // Generate thumbnails and create options
    const optionsWithThumbnails = [];
    
    for (const option of woodOptions) {
      console.log(`📸 Generating thumbnail for ${option.name}...`);
      
      try {
        // Generate 90x90 thumbnail
        const thumbnailUrl = await generateThumbnail(option.imageUrl, option.fileName, 90);
        
        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: thumbnailUrl,
          categoryId: woodCategory.id,
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
          categoryId: woodCategory.id,
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

    console.log('✅ Created Wood material options with thumbnails');
    console.log('🎉 Wood options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Wood options:', error);
    throw error;
  }
}

module.exports = { seedWoodOptions };