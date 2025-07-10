const { PrismaClient } = require('@prisma/client');
const { seedCustomizationData } = require('./seeds/customization.seed');
const { seedTypeOptions } = require('./seeds/type-options.seed');
const { seedStyleOptions } = require('./seeds/style-options.seed');
const { seedWeatherOptions } = require('./seeds/weather-options.seed');
const { seedLightingOptions } = require('./seeds/lighting-options.seed');
const { seedWallMaterials } = require('./seeds/wall-materials.seed');
const { seedBrickOptions } = require('./seeds/brick-options.seed');
const { seedCeramicsOptions } = require('./seeds/ceramics-options.seed');
const { seedConcreteOptions } = require('./seeds/concrete-options.seed');
const { seedGlassOptions } = require('./seeds/glass-options.seed');
const { seedMarbleOptions } = require('./seeds/marble-options.seed');
const { seedMetalOptions } = require('./seeds/metal-options.seed');
const { seedPlasterOptions } = require('./seeds/plaster-options.seed');
const { seedSteelOptions } = require('./seeds/steel-options.seed');
const { seedStoneOptions } = require('./seeds/stone-options.seed');
const { seedTerrazzoOptions } = require('./seeds/terrazzo-options.seed');
const { seedWoodOptions } = require('./seeds/wood-options.seed');
const { seedExteriorOptions } = require('./seeds/exterior-options.seed');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Seed customization data first
    await seedCustomizationData();
    
    // Seed non-material customization options
    await seedTypeOptions();
    await seedStyleOptions();
    await seedWeatherOptions();
    await seedLightingOptions();
    
    // Seed Wall materials (now creates global materials + junction table entries)
    await seedWallMaterials();
    
    // Seed material options (now finds materials by slug only)
    await seedBrickOptions();
    await seedCeramicsOptions();
    await seedConcreteOptions();
    await seedGlassOptions();
    await seedMarbleOptions();
    await seedMetalOptions();
    await seedPlasterOptions();
    await seedSteelOptions();
    await seedStoneOptions();
    await seedTerrazzoOptions();
    await seedWoodOptions();
    await seedExteriorOptions();
    
    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });