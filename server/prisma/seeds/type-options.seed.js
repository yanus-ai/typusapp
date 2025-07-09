const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTypeOptions() {
  console.log('🌱 Seeding Type options...');

  try {
    // Find the Type subcategory under Photorealistic
    const typeSubcategory = await prisma.customizationSubCategory.findFirst({
      where: {
        slug: 'type',
        category: {
          slug: 'photorealistic'
        }
      }
    });

    if (!typeSubcategory) {
      console.log('❌ Type subcategory not found. Please run customization seed first.');
      return;
    }

    // Check if Type options already exist
    const existingOptions = await prisma.customizationOption.count({
      where: {
        subCategoryId: typeSubcategory.id
      }
    });

    if (existingOptions > 0) {
      console.log('✅ Type options already exist, skipping...');
      return;
    }

    // Create Type options
    const typeOptions = [
      {
        name: 'RESIDENTIAL BUILDINGS',
        slug: 'residential-buildings',
        displayName: 'Residential Buildings',
        orderIndex: 1
      },
      {
        name: 'COMMERCIAL BUILDINGS',
        slug: 'commercial-buildings',
        displayName: 'Commercial Buildings',
        orderIndex: 2
      },
      {
        name: 'INDUSTRIAL BUILDINGS',
        slug: 'industrial-buildings',
        displayName: 'Industrial Buildings',
        orderIndex: 3
      },
      {
        name: 'INSTITUTIONAL BUILDINGS',
        slug: 'institutional-buildings',
        displayName: 'Institutional Buildings',
        orderIndex: 4
      },
      {
        name: 'RECREATIONAL BUILDINGS',
        slug: 'recreational-buildings',
        displayName: 'Recreational Buildings',
        orderIndex: 5
      },
      {
        name: 'AGRICULTURAL BUILDINGS',
        slug: 'agricultural-buildings',
        displayName: 'Agricultural Buildings',
        orderIndex: 6
      },
      {
        name: 'GOVERNMENT BUILDINGS',
        slug: 'government-buildings',
        displayName: 'Government Buildings',
        orderIndex: 7
      },
      {
        name: 'RELIGIOUS BUILDINGS',
        slug: 'religious-buildings',
        displayName: 'Religious Buildings',
        orderIndex: 8
      },
      {
        name: 'TRANSPORTATION BUILDINGS',
        slug: 'transportation-buildings',
        displayName: 'Transportation Buildings',
        orderIndex: 9
      },
      {
        name: 'MULTISTORY OFFICE BUILDING',
        slug: 'multistory-office-building',
        displayName: 'Multistory Office Building',
        orderIndex: 10
      }
    ];

    await prisma.customizationOption.createMany({
      data: typeOptions.map(option => ({
        ...option,
        subCategoryId: typeSubcategory.id,
        isActive: true
      }))
    });

    console.log('✅ Created Type options');
    console.log('🎉 Type options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Type options:', error);
    throw error;
  }
}

module.exports = { seedTypeOptions };