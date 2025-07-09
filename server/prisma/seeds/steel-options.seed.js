const { PrismaClient } = require('@prisma/client');
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

    // Create Steel material options
    const steelOptions = [
      {
        name: 'Anodized Treated steel',
        slug: 'anodized-treated-steel',
        displayName: 'Anodized Treated steel',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/Anodized%20Treated%20steel.png',
        orderIndex: 1
      },
      {
        name: 'Brushed Textured steel',
        slug: 'brushed-textured-steel',
        displayName: 'Brushed Textured steel',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/Brushed%20Textured%20steel.png',
        orderIndex: 2
      },
      {
        name: 'corten steel',
        slug: 'corten-steel',
        displayName: 'corten steel',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/corten%20steel.png',
        orderIndex: 3
      },
      {
        name: 'Matte Non-reflectiv stee',
        slug: 'matte-non-reflective-steel',
        displayName: 'Matte Non-reflectiv stee',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/Matte%20Non-reflectiv%20stee.png',
        orderIndex: 4
      },
      {
        name: 'Oxidized Patina-covered steel',
        slug: 'oxidized-patina-covered-steel',
        displayName: 'Oxidized Patina-covered steel',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/Oxidized%20Patina-covered%20steel.png',
        orderIndex: 5
      },
      {
        name: 'Polished Smooth steel finishes',
        slug: 'polished-smooth-steel-finishes',
        displayName: 'Polished Smooth steel finishes',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/Polished%20Smooth%20steel%20finishes.png',
        orderIndex: 6
      },
      {
        name: 'Powder-coated Colored finishesd steel surfaces',
        slug: 'powder-coated-colored-finished-steel-surfaces',
        displayName: 'Powder-coated Colored finishesd steel surfaces',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/Powder-coated%20Colored%20finishesd%20steel%20surfaces.png',
        orderIndex: 7
      },
      {
        name: 'Reflective Shiny steel',
        slug: 'reflective-shiny-steel',
        displayName: 'Reflective Shiny steel',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/Reflective%20Shiny%20steel.png',
        orderIndex: 8
      }
    ];

    await prisma.materialOption.createMany({
      data: steelOptions.map(option => ({
        ...option,
        categoryId: steelCategory.id,
        isActive: true,
        tags: []
      }))
    });

    console.log('✅ Created Steel material options');
    console.log('🎉 Steel options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Steel options:', error);
    throw error;
  }
}

module.exports = { seedSteelOptions };