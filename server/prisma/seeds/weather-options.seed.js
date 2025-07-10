const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedWeatherOptions() {
  console.log('🌱 Seeding Weather customization options...');

  try {
    // Find the Weather subcategory under photorealistic category
    const weatherSubcategory = await prisma.customizationSubCategory.findFirst({
      where: { 
        slug: 'weather',
        category: { slug: 'photorealistic' }
      }
    });

    if (!weatherSubcategory) {
      console.log('❌ Weather subcategory not found. Please run customization seed first.');
      return;
    }

    // Check if Weather options already exist
    const existingOptions = await prisma.customizationOption.count({
      where: { subCategoryId: weatherSubcategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Weather customization options already exist, skipping...');
      return;
    }

    // Create Weather customization options
    const weatherOptions = [
      {
        name: 'BRIGHT AND CLEAR SKIES',
        slug: 'bright-and-clear-skies',
        displayName: 'BRIGHT AND CLEAR SKIES',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/weather/BRIGHT%20AND%20CLEAR%20SKIES.png',
        orderIndex: 1
      },
      {
        name: 'SUNNY DAY',
        slug: 'sunny-day',
        displayName: 'SUNNY DAY',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/weather/SUNNY%20DAY.png',
        orderIndex: 2
      },
      {
        name: 'BLUE SKY WITH SOME CLOUDS',
        slug: 'blue-sky-with-some-clouds',
        displayName: 'BLUE SKY WITH SOME CLOUDS',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/weather/BLUE%20SKY%20WITH%20SOME%20CLOUDS.png',
        orderIndex: 3
      },
      {
        name: 'OVERCAST SKIES',
        slug: 'overcast-skies',
        displayName: 'OVERCAST SKIES',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/weather/OVERCAST%20SKIES.png',
        orderIndex: 4
      },
      {
        name: 'STRONG WINDS BLOWING LEAVES',
        slug: 'strong-winds-blowing-leaves',
        displayName: 'STRONG WINDS BLOWING LEAVES',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/weather/STRONG%20WINDS%20BLOWING%20LEAVES.png',
        orderIndex: 5
      },
      {
        name: 'LIGHT HAZE',
        slug: 'light-haze',
        displayName: 'LIGHT HAZE',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/weather/LIGHT%20HAZE.png',
        orderIndex: 6
      },
      {
        name: 'FALLING RAIN',
        slug: 'falling-rain-with-wet-surfaces-and-reflections',
        displayName: 'FALLING RAIN',
        description: 'WITH WET SURFACES AND REFLECTIONS',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/weather/FALLING%20RAIN.png',
        orderIndex: 7
      },
      {
        name: 'FALLING SNOW',
        slug: 'falling-snow-with-blanket-of-white-covering-ground',
        displayName: 'FALLING SNOW',
        description: 'WITH A BLANKET OF WHITE COVERING THE GROUND',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/weather/FALLING%20SNOW.png',
        orderIndex: 8
      },
      {
        name: 'FROST AND ICE COVERING SURFACES',
        slug: 'frost-and-ice-covering-surfaces',
        displayName: 'FROST AND ICE COVERING SURFACES',
        description: 'CREATE A COLD AND SLIPPERY ENVIRONMENT',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/weather/FROST%20AND%20ICE%20COVERING%20SURFACES.png',
        orderIndex: 9
      },
      {
        name: 'CLEAR SKIES AFTER A RAINSTORM',
        slug: 'clear-skies-after-rainstorm-with-colorful-sunset',
        displayName: 'CLEAR SKIES AFTER A RAINSTORM',
        description: 'WITH A COLORFUL SUNSET AND WET SURFACES',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/weather/CLEAR%20SKIES%20AFTER%20A%20RAINSTORM.png',
        orderIndex: 10
      },
      {
        name: 'A COLORFUL RAINBOW',
        slug: 'colorful-rainbow-arching-across-sky',
        displayName: 'A COLORFUL RAINBOW',
        description: 'ARCHING ACROSS THE SKY AFTER A RAIN SHOWER',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/weather/A%20COLORFUL%20RAINBOW.png',
        orderIndex: 11
      }
    ];

    await prisma.customizationOption.createMany({
      data: weatherOptions.map(option => ({
        ...option,
        subCategoryId: weatherSubcategory.id,
        isActive: true,
        tags: []
      }))
    });

    console.log('✅ Created Weather customization options');
    console.log('🎉 Weather options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Weather options:', error);
    throw error;
  }
}

module.exports = { seedWeatherOptions };