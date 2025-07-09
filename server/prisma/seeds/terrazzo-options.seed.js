const { PrismaClient } = require('@prisma/client');
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

    // Create Terrazzo material options
    const terrazzoOptions = [
      {
        name: 'Epoxy Highly polished seamless',
        slug: 'epoxy-highly-polished-seamless',
        displayName: 'Epoxy Highly polished seamless',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/Epoxy%20Highly%20polished%20seamless.png',
        orderIndex: 1
      },
      {
        name: 'Standard Smooth glossy finish',
        slug: 'standard-smooth-glossy-finish',
        displayName: 'Standard Smooth glossy finish',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/Standard%20Smooth%20glossy%20finish.png',
        orderIndex: 2
      },
      {
        name: 'terrazo Cementitious Sleek linear details',
        slug: 'terrazo-cementitious-sleek-linear-details',
        displayName: 'terrazo Cementitious Sleek linear details',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/terrazo%20Cementitious%20Sleek%20linear%20details.png',
        orderIndex: 3
      },
      {
        name: 'terrazo Cementitious Smooth polished or matte photorealistic',
        slug: 'terrazo-cementitious-smooth-polished-or-matte-photorealistic',
        displayName: 'terrazo Cementitious Smooth polished or matte photorealistic',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/terrazo%20Cementitious%20Smooth%20polished%20or%20matte%20photorealistic.png',
        orderIndex: 4
      },
      {
        name: 'terrazo Palladiana Smooth  mosaic-like patterns',
        slug: 'terrazo-palladiana-smooth-mosaic-like-patterns',
        displayName: 'terrazo Palladiana Smooth  mosaic-like patterns',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/terrazo%20Palladiana%20Smooth%20%20mosaic-like%20patterns.png',
        orderIndex: 5
      },
      {
        name: 'Terrazzo Composite surfaces',
        slug: 'terrazzo-composite-surfaces',
        displayName: 'Terrazzo Composite surfaces',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/Terrazzo%20Composite%20surfaces.png',
        orderIndex: 6
      },
      {
        name: 'Rustic Textured non-slip',
        slug: 'rustic-textured-non-slip',
        displayName: 'Rustic Textured non-slip',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/Rustic%20Textured%20non-slip.png',
        orderIndex: 7
      }
    ];

    await prisma.materialOption.createMany({
      data: terrazzoOptions.map(option => ({
        ...option,
        categoryId: terrazzoCategory.id,
        isActive: true,
        tags: []
      }))
    });

    console.log('✅ Created Terrazzo material options');
    console.log('🎉 Terrazzo options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Terrazzo options:', error);
    throw error;
  }
}

module.exports = { seedTerrazzoOptions };