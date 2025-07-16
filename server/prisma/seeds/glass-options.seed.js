const { PrismaClient } = require('@prisma/client');
const { generateThumbnail } = require('../../src/services/image/thumbnail.service');
const prisma = new PrismaClient();

async function seedGlassOptions() {
  console.log('🌱 Seeding Glass material options...');

  try {
    // Find the Glass material category (now global)
    const glassCategory = await prisma.materialCategory.findFirst({
      where: { slug: 'glass' }
    });

    if (!glassCategory) {
      console.log('❌ Glass material category not found. Please run wall materials seed first.');
      return;
    }

    // Check if Glass options already exist
    const existingOptions = await prisma.materialOption.count({
      where: { categoryId: glassCategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Glass material options already exist, skipping...');
      return;
    }

    // Create Glass material options with thumbnail generation
    const glassOptions = [
      {
        name: 'Acid-Etched Frosted glass',
        slug: 'acid-etched-frosted-glass',
        displayName: 'Acid-Etched Frosted glass',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Acid-Etched%20Frosted%20glass.png',
        fileName: 'Acid-Etched Frosted glass.png',
        orderIndex: 1
      },
      {
        name: 'Clear Transparent glass',
        slug: 'clear-transparent-glass',
        displayName: 'Clear Transparent glass',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Clear%20Transparent%20glass.png',
        fileName: 'Clear Transparent glass.png',
        orderIndex: 2
      },
      {
        name: 'Frosted Translucent glass surfaces',
        slug: 'frosted-translucent-glass-surfaces',
        displayName: 'Frosted Translucent glass surfaces',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Frosted%20Translucent%20glass%20surfaces.png',
        fileName: 'Frosted Translucent glass surfaces.png',
        orderIndex: 3
      },
      {
        name: 'Laminated Layered safety glass',
        slug: 'laminated-layered-safety-glass',
        displayName: 'Laminated Layered safety glass',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Laminated%20Layered%20safety%20glass.png',
        fileName: 'Laminated Layered safety glass.png',
        orderIndex: 4
      },
      {
        name: 'Low-E Energy-efficient glass',
        slug: 'low-e-energy-efficient-glass-1',
        displayName: 'Low-E Energy-efficient glass',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Low-E%20Energy-efficient%20glass%20.png',
        fileName: 'Low-E Energy-efficient glass .png',
        orderIndex: 5
      },
      {
        name: 'Low-E Energy-efficient glass',
        slug: 'low-e-energy-efficient-glass-2',
        displayName: 'Low-E Energy-efficient glass Alt',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Low-E%20Energy-efficient%20glass.png',
        fileName: 'Low-E Energy-efficient glass.png',
        orderIndex: 6
      },
      {
        name: 'Reflective Mirrored glass',
        slug: 'reflective-mirrored-glass',
        displayName: 'Reflective Mirrored glass',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Reflective%20Mirrored%20glass.png',
        fileName: 'Reflective Mirrored glass.png',
        orderIndex: 7
      },
      {
        name: 'Tempered Strong glass',
        slug: 'tempered-strong-glass',
        displayName: 'Tempered Strong glass',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Tempered%20Strong%20glass.png',
        fileName: 'Tempered Strong glass.png',
        orderIndex: 8
      },
      {
        name: 'Textured Etched glass',
        slug: 'textured-etched-glass',
        displayName: 'Textured Etched glass',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Textured%20Etched%20glass.png',
        fileName: 'Textured Etched glass.png',
        orderIndex: 9
      },
      {
        name: 'Tinted Colored panels glass',
        slug: 'tinted-colored-panels-glass',
        displayName: 'Tinted Colored panels glass',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Tinted%20Colored%20panels%20glass.png',
        fileName: 'Tinted Colored panels glass.png',
        orderIndex: 10
      },
      {
        name: 'Double-Skin Insulated glass',
        slug: 'double-skin-insulated-glass',
        displayName: 'Double-Skin Insulated glass',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Double-Skin%20Insulated%20glass.png',
        fileName: 'Double-Skin Insulated glass.png',
        orderIndex: 11
      },
      {
        name: 'Frameless No-frame glass',
        slug: 'frameless-no-frame-glass',
        displayName: 'Frameless No-frame glass',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Frameless%20No-frame%20glass.png',
        fileName: 'Frameless No-frame glass.png',
        orderIndex: 12
      },
      {
        name: 'Modular Easy Assembly glass Systems',
        slug: 'modular-easy-assembly-glass-systems',
        displayName: 'Modular Easy Assembly glass Systems',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Modular%20Easy%20Assembly%20glass%20Systems%20.png',
        fileName: 'Modular Easy Assembly glass Systems .png',
        orderIndex: 13
      },
      {
        name: 'Modular Easy Assembly',
        slug: 'modular-easy-assembly',
        displayName: 'Modular Easy Assembly',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Modular%20Easy%20Assembly.png',
        fileName: 'Modular Easy Assembly.png',
        orderIndex: 14
      },
      {
        name: 'Solar-Control Sun-protective glass',
        slug: 'solar-control-sun-protective-glass',
        displayName: 'Solar-Control Sun-protective glass',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Solar-Control%20Sun-protective%20glass.png',
        fileName: 'Solar-Control Sun-protective glass.png',
        orderIndex: 15
      },
      {
        name: 'tinted sun-shade glass',
        slug: 'tinted-sun-shade-glass',
        displayName: 'tinted sun-shade glass',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/tinted%20sun-shade%20glass.png',
        fileName: 'tinted sun-shade glass.png',
        orderIndex: 16
      },
      {
        name: 'translucent glass',
        slug: 'translucent-glass',
        displayName: 'translucent glass',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/translucent%20glass.png',
        fileName: 'translucent glass.png',
        orderIndex: 17
      }
    ];

    // Generate thumbnails and create options
    const optionsWithThumbnails = [];
    
    for (const option of glassOptions) {
      console.log(`📸 Generating thumbnail for ${option.name}...`);
      
      try {
        // Generate 90x90 thumbnail
        const thumbnailUrl = await generateThumbnail(option.imageUrl, option.fileName, 90, 'customization-options/glass/thumbnails');

        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: thumbnailUrl,
          categoryId: glassCategory.id,
          isActive: true,
          tags: [],
          orderIndex: option.orderIndex
        });
        
        console.log(`✅ Thumbnail created for ${option.name}`);
        
      } catch (error) {
        console.error(`❌ Failed to generate thumbnail for ${option.name}:`, error);
        
        // Continue without thumbnail
        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: null, // No thumbnail if generation failed
          categoryId: glassCategory.id,
          isActive: true,
          tags: [],
          orderIndex: option.orderIndex
        });
      }
    }

    // Create all options with thumbnails
    await prisma.materialOption.createMany({
      data: optionsWithThumbnails
    });

    console.log('✅ Created Glass material options with thumbnails');
    console.log('🎉 Glass options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Glass options:', error);
    throw error;
  }
}

module.exports = { seedGlassOptions };