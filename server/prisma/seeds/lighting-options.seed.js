const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedLightingOptions() {
  console.log('🌱 Seeding Lighting customization options...');

  try {
    // Find the Lighting subcategory under photorealistic category
    const lightingSubcategory = await prisma.customizationSubCategory.findFirst({
      where: { 
        slug: 'lighting',
        category: { slug: 'photorealistic' }
      }
    });

    if (!lightingSubcategory) {
      console.log('❌ Lighting subcategory not found. Please run customization seed first.');
      return;
    }

    // Check if Lighting options already exist
    const existingOptions = await prisma.customizationOption.count({
      where: { subCategoryId: lightingSubcategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Lighting customization options already exist, skipping...');
      return;
    }

    // Create Lighting customization options
    const lightingOptions = [
      {
        name: 'NATURAL LIGHT',
        slug: 'natural-light',
        displayName: 'NATURAL LIGHT',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/lighting/NATURAL%20LIGHT.png',
        orderIndex: 1
      },
      {
        name: 'WARM SUNLIGHT JUST AFTER SUNRISE',
        slug: 'warm-sunlight-just-after-sunrise',
        displayName: 'WARM SUNLIGHT JUST AFTER SUNRISE',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/lighting/WARM%20SUNLIGHT%20JUST%20AFTER%20SUNRISE.png',
        orderIndex: 2
      },
      {
        name: 'PALE LIGHT FROM THE MOON',
        slug: 'pale-light-from-the-moon',
        displayName: 'PALE LIGHT FROM THE MOON',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/lighting/PALE%20LIGHT%20FROM%20THE%20MOON.png',
        orderIndex: 3
      },
      {
        name: 'SOFT STREETLIGHTS',
        slug: 'soft-streetlights',
        displayName: 'SOFT STREETLIGHTS',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/lighting/SOFT%20STREETLIGHTS.png',
        orderIndex: 4
      },
      {
        name: 'SPOTLIGHT FOCUSED',
        slug: 'spotlight-focused',
        displayName: 'SPOTLIGHT FOCUSED',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/lighting/SPOTLIGHT%20FOCUSED.png',
        orderIndex: 5
      },
      {
        name: 'SEPIA MUTED TONES',
        slug: 'sepia-muted-tones',
        displayName: 'SEPIA MUTED TONES',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/lighting/SEPIA%20MUTED%20TONES.png',
        orderIndex: 6
      },
      {
        name: 'GOLDEN HOUR',
        slug: 'golden-hour',
        displayName: 'GOLDEN HOUR',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/lighting/GOLDEN%20HOUR.png',
        orderIndex: 7
      },
      {
        name: 'MORNING LIGHT SUNBEAMS',
        slug: 'morning-light-sunbeams',
        displayName: 'MORNING LIGHT SUNBEAMS',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/lighting/MORNING%20LIGHT%20SUNBEAMS.png',
        orderIndex: 8
      }
    ];

    await prisma.customizationOption.createMany({
      data: lightingOptions.map(option => ({
        ...option,
        subCategoryId: lightingSubcategory.id,
        isActive: true,
        tags: []
      }))
    });

    console.log('✅ Created Lighting customization options');
    console.log('🎉 Lighting options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Lighting options:', error);
    throw error;
  }
}

module.exports = { seedLightingOptions };