const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedWallMaterials() {
  console.log('🌱 Seeding Wall material categories...');

  try {
    // Find the Walls and Floors subcategories
    const wallsSubcategory = await prisma.customizationSubCategory.findFirst({
      where: { slug: 'walls', category: { slug: 'photorealistic' } }
    });

    const floorsSubcategory = await prisma.customizationSubCategory.findFirst({
      where: { slug: 'floors', category: { slug: 'photorealistic' } }
    });

    if (!wallsSubcategory || !floorsSubcategory) {
      console.log('❌ Walls or Floors subcategory not found. Please run customization seed first.');
      return;
    }

    // Check if material categories already exist
    const existingMaterials = await prisma.materialCategory.count();
    if (existingMaterials > 0) {
      console.log('✅ Material categories already exist, skipping...');
      return;
    }

    // Define materials that can be used for both walls and floors
    const sharedMaterials = [
      { name: 'brick', displayName: 'Brick', description: 'Traditional brick materials and finishes' },
      { name: 'ceramics', displayName: 'Ceramics', description: 'Ceramic tiles and ceramic finishes' },
      { name: 'concrete', displayName: 'Concrete', description: 'Concrete surfaces and finishes' },
      { name: 'marble', displayName: 'Marble', description: 'Natural marble and marble finishes' },
      { name: 'metal', displayName: 'Metal', description: 'Metal cladding and finishes' },
      { name: 'steel', displayName: 'Steel', description: 'Steel panels and finishes' },
      { name: 'stone', displayName: 'Stone', description: 'Natural stone and stone finishes' },
      { name: 'terrazzo', displayName: 'Terrazzo', description: 'Terrazzo finishes and panels' },
      { name: 'wood', displayName: 'Wood', description: 'Wood cladding and finishes' },
      { name: 'glass', displayName: 'Glass', description: 'Glass panels and wall systems' },
      { name: 'plaster', displayName: 'Plaster', description: 'Plaster walls and finishes' }
    ];

    // Materials only for floors
    const floorOnlyMaterials = [
      { name: 'exterior', displayName: 'Exterior', description: 'Outdoor flooring materials' }
    ];

    // Materials only for walls
    const wallOnlyMaterials = [];

    // Create shared materials and link to both walls and floors
    for (const [index, material] of sharedMaterials.entries()) {
      const materialCategory = await prisma.materialCategory.create({
        data: {
          name: material.name,
          slug: material.name,
          displayName: material.displayName,
          description: material.description,
          orderIndex: index + 1,
          isActive: true,
          tags: []
        }
      });

      // Link to walls subcategory
      await prisma.materialCategorySubCategory.create({
        data: {
          materialCategoryId: materialCategory.id,
          subCategoryId: wallsSubcategory.id,
          orderIndex: index + 1
        }
      });

      // Link to floors subcategory
      await prisma.materialCategorySubCategory.create({
        data: {
          materialCategoryId: materialCategory.id,
          subCategoryId: floorsSubcategory.id,
          orderIndex: index + 1
        }
      });
    }

    // Create wall-only materials
    for (const [index, material] of wallOnlyMaterials.entries()) {
      const materialCategory = await prisma.materialCategory.create({
        data: {
          name: material.name,
          slug: material.name,
          displayName: material.displayName,
          description: material.description,
          orderIndex: sharedMaterials.length + index + 1,
          isActive: true,
          tags: []
        }
      });

      // Link only to walls subcategory
      await prisma.materialCategorySubCategory.create({
        data: {
          materialCategoryId: materialCategory.id,
          subCategoryId: wallsSubcategory.id,
          orderIndex: sharedMaterials.length + index + 1
        }
      });
    }

    // Create floor-only materials
    for (const [index, material] of floorOnlyMaterials.entries()) {
      const materialCategory = await prisma.materialCategory.create({
        data: {
          name: material.name,
          slug: material.name,
          displayName: material.displayName,
          description: material.description,
          orderIndex: sharedMaterials.length + wallOnlyMaterials.length + index + 1,
          isActive: true,
          tags: []
        }
      });

      // Link only to floors subcategory
      await prisma.materialCategorySubCategory.create({
        data: {
          materialCategoryId: materialCategory.id,
          subCategoryId: floorsSubcategory.id,
          orderIndex: sharedMaterials.length + wallOnlyMaterials.length + index + 1
        }
      });
    }

    console.log('✅ Created material categories and linked to subcategories');
    console.log('🎉 Wall materials seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Wall materials:', error);
    throw error;
  }
}

module.exports = { seedWallMaterials };