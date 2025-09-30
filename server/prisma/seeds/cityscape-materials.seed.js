const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedCityscapeMaterials() {
  console.log('🌱 Seeding Cityscape materials...');

  try {
    // Find the Context subcategory under photorealistic category
    const contextSubcategory = await prisma.customizationSubCategory.findFirst({
      where: { 
        slug: 'context',
        category: { slug: 'photorealistic' }
      }
    });

    if (!contextSubcategory) {
      console.log('❌ Context subcategory not found. Please run customization seed first.');
      return;
    }

    // Check if Cityscape material category already exists
    let cityscapeCategory = await prisma.materialCategory.findFirst({
      where: { slug: 'cityscape' }
    });

    if (!cityscapeCategory) {
      // Create global Cityscape material category
      cityscapeCategory = await prisma.materialCategory.create({
        data: {
          name: 'Cityscape',
          slug: 'cityscape',
          displayName: 'Cityscape',
          orderIndex: 12,
          isActive: true,
          tags: []
        }
      });
      console.log('✅ Created global Cityscape material category');
    }

    // Check if junction already exists
    const existingJunction = await prisma.materialCategorySubCategory.findFirst({
      where: {
        subCategoryId: contextSubcategory.id,
        materialCategoryId: cityscapeCategory.id
      }
    });

    if (!existingJunction) {
      // Create junction table entry
      await prisma.materialCategorySubCategory.create({
        data: {
          subCategoryId: contextSubcategory.id,
          materialCategoryId: cityscapeCategory.id,
          orderIndex: 1
        }
      });
      console.log('✅ Created Context -> Cityscape junction');
    }

    console.log('🎉 Cityscape materials seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Cityscape materials:', error);
    throw error;
  }
}

module.exports = { seedCityscapeMaterials };