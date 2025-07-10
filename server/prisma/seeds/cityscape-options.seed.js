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
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/URBAN%20STREETS.png',
        orderIndex: 1
      },
      {
        name: 'CITY SKYLINE (TALL BUILDINGS, ROOFTOPS, CLOUDS)',
        slug: 'city-skyline-tall-buildings-rooftops-clouds',
        displayName: 'CITY SKYLINE',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/CITY%20SKYLINE.png',
        orderIndex: 2
      },
      {
        name: 'BUSY DOWNTOWN (SHOPS, BILLBOARDS, TRAFFIC)',
        slug: 'busy-downtown-shops-billboards-traffic',
        displayName: 'BUSY DOWNTOWN',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/BUSY%20DOWNTOWN.png',
        orderIndex: 3
      },
      {
        name: 'MODERN ARCHITECTURE (GLASS FACADES, STEEL, URBAN PARKS)',
        slug: 'modern-architecture-glass-facades-steel-urban-parks',
        displayName: 'MODERN ARCHITECTURE',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/MODERN%20ARCHITECTURE.png',
        orderIndex: 4
      },
      {
        name: 'HISTORIC DISTRICT (COBBLESTONE STREETS, OLD BUILDINGS, STATUES)',
        slug: 'historic-district-cobblestone-streets-old-buildings-statues',
        displayName: 'HISTORIC DISTRICT',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/HISTORIC%20DISTRICT.png',
        orderIndex: 5
      },
      {
        name: 'NIGHT CITYSCAPE (NEON LIGHTS, TRAFFIC, REFLECTIONS)',
        slug: 'night-cityscape-neon-lights-traffic-reflections',
        displayName: 'NIGHT CITYSCAPE',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/NIGHT%20CITYSCAPE.png',
        orderIndex: 6
      },
      {
        name: 'WATERFRONT CITY (DOCKS, BOATS, CITY LIGHTS)',
        slug: 'waterfront-city-docks-boats-city-lights',
        displayName: 'WATERFRONT CITY',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/WATERFRONT%20CITY.png',
        orderIndex: 7
      },
      {
        name: 'INDUSTRIAL AREA (FACTORIES, SMOKE STACKS, WAREHOUSES)',
        slug: 'industrial-area-factories-smoke-stacks-warehouses',
        displayName: 'INDUSTRIAL AREA',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/INDUSTRIAL%20AREA.png',
        orderIndex: 8
      },
      {
        name: 'PUBLIC SQUARE (FOUNTAINS, BENCHES, STATUES)',
        slug: 'public-square-fountains-benches-statues',
        displayName: 'PUBLIC SQUARE',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/PUBLIC%20SQUARE.png',
        orderIndex: 9
      },
      {
        name: 'CITY PARK (TREES, BENCHES, WALKWAYS)',
        slug: 'city-park-trees-benches-walkways',
        displayName: 'CITY PARK',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/CITY%20PARK.png',
        orderIndex: 10
      },
      {
        name: 'SUBURBAN STREETS (HOUSES, SIDEWALKS, CARS)',
        slug: 'suburban-streets-houses-sidewalks-cars',
        displayName: 'SUBURBAN STREETS',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/SUBURBAN%20STREETS.png',
        orderIndex: 11
      },
      {
        name: 'SHOPPING DISTRICT (SHOPS, MALLS, PEDESTRIANS)',
        slug: 'shopping-district-shops-malls-pedestrians',
        displayName: 'SHOPPING DISTRICT',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/SHOPPING%20DISTRICT.png',
        orderIndex: 12
      },
      {
        name: 'TRANSPORTATION HUB (TRAINS, BUSES, PLATFORMS)',
        slug: 'transportation-hub-trains-buses-platforms',
        displayName: 'TRANSPORTATION HUB',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/TRANSPORTATION%20HUB.png',
        orderIndex: 13
      },
      {
        name: 'ROOFTOP VIEW (CITYSCAPE, ROOFTOPS, SUNSETS)',
        slug: 'rooftop-view-cityscape-rooftops-sunsets',
        displayName: 'ROOFTOP VIEW',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/ROOFTOP%20VIEW.png',
        orderIndex: 14
      },
      {
        name: 'CULTURAL CENTER (MUSEUMS, GALLERIES, PUBLIC SPACES)',
        slug: 'cultural-center-museums-galleries-public-spaces',
        displayName: 'CULTURAL CENTER',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/CULTURAL%20CENTER.png',
        orderIndex: 15
      },
      {
        name: 'RESIDENTIAL NEIGHBORHOOD (HOUSES, GARDENS, STREETS)',
        slug: 'residential-neighborhood-houses-gardens-streets',
        displayName: 'RESIDENTIAL NEIGHBORHOOD',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/RESIDENTIAL%20NEIGHBORHOOD.png',
        orderIndex: 16
      },
      {
        name: 'MARKET STREET (STALLS, VENDORS, CROWDS)',
        slug: 'market-street-stalls-vendors-crowds',
        displayName: 'MARKET STREET',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/MARKET%20STREET.png',
        orderIndex: 17
      },
      {
        name: 'TECH DISTRICT (MODERN BUILDINGS, DIGITAL DISPLAYS, STARTUPS)',
        slug: 'tech-district-modern-buildings-digital-displays-startups',
        displayName: 'TECH DISTRICT',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/TECH%20DISTRICT.png',
        orderIndex: 18
      },
      {
        name: 'URBAN RIVERWALK (BRIDGES, WALKWAYS, BUILDINGS)',
        slug: 'urban-riverwalk-bridges-walkways-buildings',
        displayName: 'URBAN RIVERWALK',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/URBAN%20RIVERWALK.png',
        orderIndex: 19
      },
      {
        name: 'CAFÉS AND TERRACES (OUTDOOR SEATING, PEOPLE, CITY VIEWS)',
        slug: 'cafes-and-terraces-outdoor-seating-people-city-views',
        displayName: 'CAFÉS AND TERRACES',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/cityscape/CAFÉS%20AND%20TERRACES.png',
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