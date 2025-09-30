const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedCityscapeOptions() {
  console.log('🌱 Seeding Cityscape customization options...');

  try {
    // Find the Cityscape material category
    const cityscapeCategory = await prisma.materialCategory.findFirst({
      where: { slug: 'cityscape' }
    });

    if (!cityscapeCategory) {
      console.log('❌ Cityscape material category not found. Please run cityscape materials seed first.');
      return;
    }

    // Check if Cityscape options already exist
    const existingOptions = await prisma.materialOption.count({
      where: { categoryId: cityscapeCategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Cityscape material options already exist, skipping...');
      return;
    }

    // Create Cityscape material options
    const cityscapeOptions = [
      {
        name: 'URBAN STREETS (SKYSCRAPERS, STREETLIGHTS, PAVEMENT)',
        slug: 'urban-streets-skyscrapers-streetlights-pavement',
        displayName: 'URBAN STREETS',
        orderIndex: 1
      },
      {
        name: 'CITY SKYLINE (TALL BUILDINGS, ROOFTOPS, CLOUDS)',
        slug: 'city-skyline-tall-buildings-rooftops-clouds',
        displayName: 'CITY SKYLINE',
        orderIndex: 2
      },
      {
        name: 'BUSY DOWNTOWN (SHOPS, BILLBOARDS, TRAFFIC)',
        slug: 'busy-downtown-shops-billboards-traffic',
        displayName: 'BUSY DOWNTOWN',
        orderIndex: 3
      },
      {
        name: 'MODERN ARCHITECTURE (GLASS FACADES, STEEL, URBAN PARKS)',
        slug: 'modern-architecture-glass-facades-steel-urban-parks',
        displayName: 'MODERN ARCHITECTURE',
        orderIndex: 4
      },
      {
        name: 'HISTORIC DISTRICT (COBBLESTONE STREETS, OLD BUILDINGS, STATUES)',
        slug: 'historic-district-cobblestone-streets-old-buildings-statues',
        displayName: 'HISTORIC DISTRICT',
        orderIndex: 5
      },
      {
        name: 'NIGHT CITYSCAPE (NEON LIGHTS, TRAFFIC, REFLECTIONS)',
        slug: 'night-cityscape-neon-lights-traffic-reflections',
        displayName: 'NIGHT CITYSCAPE',
        orderIndex: 6
      },
      {
        name: 'WATERFRONT CITY (DOCKS, BOATS, CITY LIGHTS)',
        slug: 'waterfront-city-docks-boats-city-lights',
        displayName: 'WATERFRONT CITY',
        orderIndex: 7
      },
      {
        name: 'INDUSTRIAL AREA (FACTORIES, SMOKE STACKS, WAREHOUSES)',
        slug: 'industrial-area-factories-smoke-stacks-warehouses',
        displayName: 'INDUSTRIAL AREA',
        orderIndex: 8
      },
      {
        name: 'PUBLIC SQUARE (FOUNTAINS, BENCHES, STATUES)',
        slug: 'public-square-fountains-benches-statues',
        displayName: 'PUBLIC SQUARE',
        orderIndex: 9
      },
      {
        name: 'CITY PARK (TREES, BENCHES, WALKWAYS)',
        slug: 'city-park-trees-benches-walkways',
        displayName: 'CITY PARK',
        orderIndex: 10
      },
      {
        name: 'SUBURBAN STREETS (HOUSES, SIDEWALKS, CARS)',
        slug: 'suburban-streets-houses-sidewalks-cars',
        displayName: 'SUBURBAN STREETS',
        orderIndex: 11
      },
      {
        name: 'SHOPPING DISTRICT (SHOPS, MALLS, PEDESTRIANS)',
        slug: 'shopping-district-shops-malls-pedestrians',
        displayName: 'SHOPPING DISTRICT',
        orderIndex: 12
      },
      {
        name: 'TRANSPORTATION HUB (TRAINS, BUSES, PLATFORMS)',
        slug: 'transportation-hub-trains-buses-platforms',
        displayName: 'TRANSPORTATION HUB',
        orderIndex: 13
      },
      {
        name: 'ROOFTOP VIEW (CITYSCAPE, ROOFTOPS, SUNSETS)',
        slug: 'rooftop-view-cityscape-rooftops-sunsets',
        displayName: 'ROOFTOP VIEW',
        orderIndex: 14
      },
      {
        name: 'CULTURAL CENTER (MUSEUMS, GALLERIES, PUBLIC SPACES)',
        slug: 'cultural-center-museums-galleries-public-spaces',
        displayName: 'CULTURAL CENTER',
        orderIndex: 15
      },
      {
        name: 'RESIDENTIAL NEIGHBORHOOD (HOUSES, GARDENS, STREETS)',
        slug: 'residential-neighborhood-houses-gardens-streets',
        displayName: 'RESIDENTIAL NEIGHBORHOOD',
        orderIndex: 16
      },
      {
        name: 'MARKET STREET (STALLS, VENDORS, CROWDS)',
        slug: 'market-street-stalls-vendors-crowds',
        displayName: 'MARKET STREET',
        orderIndex: 17
      },
      {
        name: 'TECH DISTRICT (MODERN BUILDINGS, DIGITAL DISPLAYS, STARTUPS)',
        slug: 'tech-district-modern-buildings-digital-displays-startups',
        displayName: 'TECH DISTRICT',
        orderIndex: 18
      },
      {
        name: 'URBAN RIVERWALK (BRIDGES, WALKWAYS, BUILDINGS)',
        slug: 'urban-riverwalk-bridges-walkways-buildings',
        displayName: 'URBAN RIVERWALK',
        orderIndex: 19
      },
      {
        name: 'CAFÉS AND TERRACES (OUTDOOR SEATING, PEOPLE, CITY VIEWS)',
        slug: 'cafes-and-terraces-outdoor-seating-people-city-views',
        displayName: 'CAFÉS AND TERRACES',
        orderIndex: 20
      }
    ];

    await prisma.materialOption.createMany({
      data: cityscapeOptions.map(option => ({
        ...option,
        categoryId: cityscapeCategory.id,
        isActive: true,
        tags: []
      }))
    });

    console.log('✅ Created Cityscape material options');
    console.log('🎉 Cityscape options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Cityscape options:', error);
    throw error;
  }
}

module.exports = { seedCityscapeOptions };