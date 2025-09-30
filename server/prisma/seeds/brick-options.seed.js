const { PrismaClient } = require('@prisma/client');
const { generateThumbnail } = require('../../src/services/image/thumbnail.service');
const prisma = new PrismaClient();

async function seedBrickOptions() {
  console.log('🌱 Seeding Brick material options...');

  try {
    // Find the Brick material category (now global)
    const brickCategory = await prisma.materialCategory.findFirst({
      where: { slug: 'brick' }
    });

    if (!brickCategory) {
      console.log('❌ Brick material category not found. Please run wall materials seed first.');
      return;
    }

    // Check if Brick options already exist
    const existingOptions = await prisma.materialOption.count({
      where: { categoryId: brickCategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Brick material options already exist, skipping...');
      return;
    }

    // Create Brick material options with thumbnail generation
    const brickOptions = [
      {
        name: 'White Brick Clean white appearance',
        slug: 'white-brick-clean',
        displayName: 'White Brick Clean white appearance',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/White+Brick+Clean+white+appearance.png',
        fileName: 'White+Brick+Clean+white+appearance.png',
        orderIndex: 1
      },
      {
        name: 'Blue Brick Distinctive blue shades',
        slug: 'blue-brick-distinctive',
        displayName: 'Blue Brick Distinctive blue shades',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Blue+Brick+Distinctive+blue+shades.png',
        fileName: 'Blue+Brick+Distinctive+blue+shades.png',
        orderIndex: 2
      },
      {
        name: 'brick surface in Stretcher Bond',
        slug: 'brick-surface-stretcher-bond',
        displayName: 'brick surface in Stretcher Bond',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/brick+surface+in+Stretcher+Bond.png',
        fileName: 'brick+surface+in+Stretcher+Bond.png',
        orderIndex: 3
      },
      {
        name: 'Brown Brick Earthy brown tones',
        slug: 'brown-brick-earthy',
        displayName: 'Brown Brick Earthy brown tones',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Brown+Brick+Earthy+brown+tones.png',
        fileName: 'Brown+Brick+Earthy+brown+tones.png',
        orderIndex: 4
      },
      {
        name: 'Cream Brick Soft',
        slug: 'cream-brick-soft',
        displayName: 'Cream Brick Soft',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Cream+Brick+Soft.png',
        fileName: 'Cream+Brick+Soft.png',
        orderIndex: 5
      },
      {
        name: 'Gray Brick Neutral gray hue',
        slug: 'gray-brick-neutral',
        displayName: 'Gray Brick Neutral gray hue',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Gray+Brick+Neutral+gray+hue.png',
        fileName: 'Gray+Brick+Neutral+gray+hue.png',
        orderIndex: 6
      },
      {
        name: 'Green Brick Natural green tones with grey joints',
        slug: 'green-brick-natural',
        displayName: 'Green Brick Natural green tones with grey joints',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Green+Brick+Natural+green+tones+with+grey+joints.png',
        fileName: 'Green+Brick+Natural+green+tones+with+grey+joints.png',
        orderIndex: 7
      },
      {
        name: 'Rustic Charm brick with grey joints',
        slug: 'rustic-charm-brick',
        displayName: 'Rustic Charm brick with grey joints',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Rustic+Charm+brick+with+grey+joints.png',
        fileName: 'Rustic+Charm+brick+with+grey+joints.png',
        orderIndex: 8
      },
      {
        name: 'Simple thinlayered exteriors brick_',
        slug: 'simple-thinlayered-exteriors-brick-1',
        displayName: 'Simple thinlayered exteriors brick',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Simple+thinlayered+exteriors+brick_+.png',
        fileName: 'Simple+thinlayered+exteriors+brick_+.png',
        orderIndex: 9
      },
      {
        name: 'Simple thinlayered exteriors brick',
        slug: 'simple-thinlayered-exteriors-brick-2',
        displayName: 'Simple thinlayered exteriors brick',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Simple+thinlayered+exteriors+brick.png',
        fileName: 'Simple+thinlayered+exteriors+brick.png',
        orderIndex: 10
      },
      {
        name: 'Tan Brick Light tan hue',
        slug: 'tan-brick-light',
        displayName: 'Tan Brick Light tan hue',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Tan+Brick+Light+tan+hue.png',
        fileName: 'Tan+Brick+Light+tan+hue.png',
        orderIndex: 11
      }
    ];

    // Generate thumbnails and create options
    const optionsWithThumbnails = [];
    
    for (const option of brickOptions) {
      console.log(`📸 Generating thumbnail for ${option.name}...`);
      
      try {
        // Generate 90x90 thumbnail
        const thumbnailUrl = await generateThumbnail(option.imageUrl, option.fileName, 90, 'customization-options/brick/thumbnails');
        
        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: thumbnailUrl,
          categoryId: brickCategory.id,
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
          categoryId: brickCategory.id,
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

    console.log('✅ Created Brick material options with thumbnails');
    console.log('🎉 Brick options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Brick options:', error);
    throw error;
  }
}

module.exports = { seedBrickOptions };