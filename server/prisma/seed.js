const { PrismaClient } = require('@prisma/client');
const { seedCustomizationData } = require('./seeds/customization.seed');
const { seedTypeOptions } = require('./seeds/type-options.seed');
const { seedStyleOptions } = require('./seeds/style-options.seed');
const { seedWeatherOptions } = require('./seeds/weather-options.seed');
const { seedLightingOptions } = require('./seeds/lighting-options.seed');
const { seedIllustrationOptions } = require('./seeds/illustration-options.seed');
const { seedPenAndInkOptions } = require('./seeds/pen-and-ink-options.seed');
const { seedAquarelleOptions } = require('./seeds/aquarelle-options.seed');
const { seedLinocutOptions } = require('./seeds/linocut-options.seed');
const { seedCollageOptions } = require('./seeds/collage-options.seed');
const { seedFineBlackPenOptions } = require('./seeds/fine-black-pen-options.seed');
const { seedMinimalistOptions } = require('./seeds/minimalist-options.seed');
const { seedAvantGardeOptions } = require('./seeds/avantgarde-options.seed');
const { seedWallMaterials } = require('./seeds/wall-materials.seed');
const { seedCityscapeMaterials } = require('./seeds/cityscape-materials.seed');
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
const { seedCityscapeOptions } = require('./seeds/cityscape-options.seed');
const { seedCopicPenOptions } = require('./seeds/copic-pen-options.seed');
const { seedPlans } = require('./seeds/plans.seed');
const { seedSixMonthlyPlans } = require('./seeds/six-monthly-plans.seed');

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
    await seedIllustrationOptions();
    await seedPenAndInkOptions();
    await seedAquarelleOptions();
    await seedLinocutOptions();
    await seedCollageOptions();
    await seedFineBlackPenOptions();
    await seedMinimalistOptions();
    await seedAvantGardeOptions();
    await seedCopicPenOptions();
    
    // Seed Wall materials (now creates global materials + junction table entries)
    await seedWallMaterials();
    await seedCityscapeMaterials();
    
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
    await seedCityscapeOptions();
    
    // Seed subscription plans
    await seedPlans();
    await seedSixMonthlyPlans();
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