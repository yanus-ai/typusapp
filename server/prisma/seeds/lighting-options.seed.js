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
        orderIndex: 1
      },
      {
        name: 'WARM SUNLIGHT JUST AFTER SUNRISE',
        slug: 'warm-sunlight-just-after-sunrise',
        displayName: 'WARM SUNLIGHT JUST AFTER SUNRISE',
        orderIndex: 2
      },
      {
        name: 'PALE LIGHT FROM THE MOON',
        slug: 'pale-light-from-the-moon',
        displayName: 'PALE LIGHT FROM THE MOON',
        orderIndex: 3
      },
      {
        name: 'SOFT STREETLIGHTS',
        slug: 'soft-streetlights',
        displayName: 'SOFT STREETLIGHTS',
        orderIndex: 4
      },
      {
        name: 'SPOTLIGHT FOCUSED',
        slug: 'spotlight-focused',
        displayName: 'SPOTLIGHT FOCUSED',
        orderIndex: 5
      },
      {
        name: 'SEPIA MUTED TONES',
        slug: 'sepia-muted-tones',
        displayName: 'SEPIA MUTED TONES',
        orderIndex: 6
      },
      {
        name: 'GOLDEN HOUR',
        slug: 'golden-hour',
        displayName: 'GOLDEN HOUR',
        orderIndex: 7
      },
      {
        name: 'MORNING LIGHT SUNBEAMS',
        slug: 'morning-light-sunbeams',
        displayName: 'MORNING LIGHT SUNBEAMS',
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