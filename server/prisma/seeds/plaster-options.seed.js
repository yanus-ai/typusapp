const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedPlasterOptions() {
  console.log('🌱 Seeding Plaster material options...');

  try {
    // Find the Plaster material category (now global)
    const plasterCategory = await prisma.materialCategory.findFirst({
      where: { slug: 'plaster' }
    });

    if (!plasterCategory) {
      console.log('❌ Plaster material category not found. Please run wall materials seed first.');
      return;
    }

    // Check if Plaster options already exist
    const existingOptions = await prisma.materialOption.count({
      where: { categoryId: plasterCategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Plaster material options already exist, skipping...');
      return;
    }

    // Create Plaster material options
    const plasterOptions = [
      {
        name: 'Distressed Weathered plaster surface',
        slug: 'distressed-weathered-plaster-surface',
        displayName: 'Distressed Weathered plaster surface',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/plaster/Distressed%20Weathered%20plaster%20surface.png',
        orderIndex: 1
      },
      {
        name: 'Lime Natural breathable plaster',
        slug: 'lime-natural-breathable-plaster',
        displayName: 'Lime Natural breathable plaster',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/plaster/Lime%20Natural%20breathable%20plaster.png',
        orderIndex: 2
      },
      {
        name: 'Satin Soft plaster',
        slug: 'satin-soft-plaster',
        displayName: 'Satin Soft plaster',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/plaster/Satin%20Soft%20plaster.png',
        orderIndex: 3
      },
      {
        name: 'Smooth Sleek plaster',
        slug: 'smooth-sleek-plaster',
        displayName: 'Smooth Sleek plaster',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/plaster/Smooth%20Sleek%20plaster.png',
        orderIndex: 4
      },
      {
        name: 'Troweled Hand-applied textures',
        slug: 'troweled-hand-applied-textures',
        displayName: 'Troweled Hand-applied textures',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/plaster/Troweled%20Hand-applied%20textures.png',
        orderIndex: 5
      },
      {
        name: 'Venetian Polished glossy plaster',
        slug: 'venetian-polished-glossy-plaster',
        displayName: 'Venetian Polished glossy plaster',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/plaster/Venetian%20Polished%20glossy%20plaster.png',
        orderIndex: 6
      },
      {
        name: 'Marmorino Marble-like finishes',
        slug: 'marmorino-marble-like-finishes',
        displayName: 'Marmorino Marble-like finishes',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/plaster/Marmorino%20Marble-like%20finishes.png',
        orderIndex: 7
      },
      {
        name: 'Stucco Textured plaster',
        slug: 'stucco-textured-plaster',
        displayName: 'Stucco Textured plaster',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/plaster/Stucco%20Textured%20plaster.png',
        orderIndex: 8
      },
      {
        name: 'Textured Rough-hewn finishes',
        slug: 'textured-rough-hewn-finishes',
        displayName: 'Textured Rough-hewn finishes',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/plaster/Textured%20Rough-hewn%20finishes.png',
        orderIndex: 9
      }
    ];

    await prisma.materialOption.createMany({
      data: plasterOptions.map(option => ({
        ...option,
        categoryId: plasterCategory.id,
        isActive: true,
        tags: []
      }))
    });

    console.log('✅ Created Plaster material options');
    console.log('🎉 Plaster options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Plaster options:', error);
    throw error;
  }
}

module.exports = { seedPlasterOptions };