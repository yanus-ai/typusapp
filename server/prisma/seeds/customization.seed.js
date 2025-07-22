const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedCustomizationData() {
  console.log('🌱 Seeding customization data...');

  try {
    // Check if data already exists
    const existingCategories = await prisma.customizationCategory.count();
    if (existingCategories > 0) {
      console.log('✅ Customization data already exists, skipping...');
      return;
    }

    // Create main categories
    const photorealisticCategory = await prisma.customizationCategory.create({
      data: {
        name: 'photorealistic',
        slug: 'photorealistic',
        displayName: 'Photorealistic',
        description: 'Create photorealistic architectural images',
        orderIndex: 1,
        isActive: true
      }
    });

    const artCategory = await prisma.customizationCategory.create({
      data: {
        name: 'art',
        slug: 'art',
        displayName: 'Art',
        description: 'Create artistic architectural illustrations',
        orderIndex: 2,
        isActive: true
      }
    });

    console.log('✅ Created main categories');

    // Create subcategories for Photorealistic
    const photorealisticSubcategories = [
      {
        name: 'type',
        slug: 'type',
        displayName: 'Type',
        description: 'Building types and classifications',
        hasSubItems: false,
        orderIndex: 1
      },
      {
        name: 'walls',
        slug: 'walls',
        displayName: 'Walls',
        description: 'Wall materials and finishes',
        hasSubItems: true,
        orderIndex: 2
      },
      {
        name: 'floors',
        slug: 'floors',
        displayName: 'Floors',
        description: 'Floor materials and finishes',
        hasSubItems: true,
        orderIndex: 3
      },
      {
        name: 'context',
        slug: 'context',
        displayName: 'Context',
        description: 'Environmental context and settings',
        hasSubItems: true,
        orderIndex: 4
      },
      {
        name: 'style',
        slug: 'style',
        displayName: 'Style',
        description: 'Architectural styles and aesthetics',
        hasSubItems: false,
        orderIndex: 5
      },
      {
        name: 'weather',
        slug: 'weather',
        displayName: 'Weather',
        description: 'Weather conditions and atmosphere',
        hasSubItems: false,
        orderIndex: 6
      },
      {
        name: 'lighting',
        slug: 'lighting',
        displayName: 'Lighting',
        description: 'Lighting conditions and effects',
        hasSubItems: false,
        orderIndex: 7
      }
    ];

    await prisma.customizationSubCategory.createMany({
      data: photorealisticSubcategories.map(sub => ({
        ...sub,
        categoryId: photorealisticCategory.id,
        isActive: true
      }))
    });

    console.log('✅ Created Photorealistic subcategories');

    // Create subcategories for Art
    const artSubcategories = [
      {
        name: 'illustration',
        slug: 'illustration',
        displayName: 'Illustration',
        description: 'Traditional illustration style',
        hasSubItems: false,
        orderIndex: 1
      },
      {
        name: 'pen_and_ink',
        slug: 'pen-and-ink',
        displayName: 'Pen and Ink',
        description: 'Black and white pen and ink drawings',
        hasSubItems: false,
        orderIndex: 2
      },
      {
        name: 'aquarelle',
        slug: 'aquarelle',
        displayName: 'Aquarelle',
        description: 'Watercolor painting style',
        hasSubItems: false,
        orderIndex: 3
      },
      {
        name: 'linocut',
        slug: 'linocut',
        displayName: 'Linocut',
        description: 'Linoleum block printing style',
        hasSubItems: false,
        orderIndex: 4
      },
      {
        name: 'collage',
        slug: 'collage',
        displayName: 'Collage',
        description: 'Mixed media collage style',
        hasSubItems: false,
        orderIndex: 5
      },
      {
        name: 'fine_black_pen',
        slug: 'fine-black-pen',
        displayName: 'Fine Black Pen',
        description: 'Detailed fine line pen drawings',
        hasSubItems: false,
        orderIndex: 6
      },
      {
        name: 'minimalist',
        slug: 'minimalist',
        displayName: 'Minimalist',
        description: 'Clean, minimal artistic style',
        hasSubItems: false,
        orderIndex: 7
      },
      {
        name: 'avantgarde',
        slug: 'avantgarde',
        displayName: 'Avantgarde',
        description: 'Experimental and innovative artistic style',
        hasSubItems: false,
        orderIndex: 8
      },
      {
        name: 'copic_pen',
        slug: 'copic-pen',
        displayName: 'Copic Pen',
        description: 'Copic marker illustrations',
        hasSubItems: false,
        orderIndex: 9
      }
    ];

    await prisma.customizationSubCategory.createMany({
      data: artSubcategories.map(sub => ({
        ...sub,
        categoryId: artCategory.id,
        isActive: true
      }))
    });

    console.log('✅ Created Art subcategories');
    console.log('🎉 Customization data seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding customization data:', error);
    throw error;
  }
}

async function main() {
  await seedCustomizationData();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

module.exports = { seedCustomizationData };