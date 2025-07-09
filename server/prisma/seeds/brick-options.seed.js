const { PrismaClient } = require('@prisma/client');
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

    // Create Brick material options
    const brickOptions = [
      {
        name: 'White Brick Clean white appearance',
        slug: 'white-brick-clean',
        displayName: 'White Brick Clean white appearance',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/White+Brick+Clean+white+appearance.png',
        orderIndex: 1
      },
      {
        name: 'Blue Brick Distinctive blue shades',
        slug: 'blue-brick-distinctive',
        displayName: 'Blue Brick Distinctive blue shades',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Blue+Brick+Distinctive+blue+shades.png',
        orderIndex: 2
      },
      {
        name: 'brick surface in Stretcher Bond',
        slug: 'brick-surface-stretcher-bond',
        displayName: 'brick surface in Stretcher Bond',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/brick+surface+in+Stretcher+Bond.png',
        orderIndex: 3
      },
      {
        name: 'Brown Brick Earthy brown tones',
        slug: 'brown-brick-earthy',
        displayName: 'Brown Brick Earthy brown tones',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Brown+Brick+Earthy+brown+tones.png',
        orderIndex: 4
      },
      {
        name: 'Cream Brick Soft',
        slug: 'cream-brick-soft',
        displayName: 'Cream Brick Soft',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Cream+Brick+Soft.png',
        orderIndex: 5
      },
      {
        name: 'Gray Brick Neutral gray hue',
        slug: 'gray-brick-neutral',
        displayName: 'Gray Brick Neutral gray hue',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Gray+Brick+Neutral+gray+hue.png',
        orderIndex: 6
      },
      {
        name: 'Green Brick Natural green tones with grey joints',
        slug: 'green-brick-natural',
        displayName: 'Green Brick Natural green tones with grey joints',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Green+Brick+Natural+green+tones+with+grey+joints.png',
        orderIndex: 7
      },
      {
        name: 'Rustic Charm brick with grey joints',
        slug: 'rustic-charm-brick',
        displayName: 'Rustic Charm brick with grey joints',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Rustic+Charm+brick+with+grey+joints.png',
        orderIndex: 8
      },
      {
        name: 'Simple thinlayered exteriors brick_',
        slug: 'simple-thinlayered-exteriors-brick-1',
        displayName: 'Simple thinlayered exteriors brick',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Simple+thinlayered+exteriors+brick_+.png',
        orderIndex: 9
      },
      {
        name: 'Simple thinlayered exteriors brick',
        slug: 'simple-thinlayered-exteriors-brick-2',
        displayName: 'Simple thinlayered exteriors brick',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Simple+thinlayered+exteriors+brick.png',
        orderIndex: 10
      },
      {
        name: 'Tan Brick Light tan hue',
        slug: 'tan-brick-light',
        displayName: 'Tan Brick Light tan hue',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Tan+Brick+Light+tan+hue.png',
        orderIndex: 11
      }
    ];

    await prisma.materialOption.createMany({
      data: brickOptions.map(option => ({
        ...option,
        categoryId: brickCategory.id,
        isActive: true,
        tags: [] // Empty tags array for now
      }))
    });

    console.log('✅ Created Brick material options');
    console.log('🎉 Brick options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Brick options:', error);
    throw error;
  }
}

module.exports = { seedBrickOptions };