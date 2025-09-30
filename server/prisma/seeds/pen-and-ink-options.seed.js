const { PrismaClient } = require('@prisma/client');
const { generateThumbnail } = require('../../src/services/image/thumbnail.service');
const prisma = new PrismaClient();

async function seedPenAndInkOptions() {
  console.log('🌱 Seeding Pen and Ink customization options...');

  try {
    // Find the Pen and Ink subcategory under art category
    const penAndInkSubcategory = await prisma.customizationSubCategory.findFirst({
      where: { 
        slug: 'pen-and-ink',
        category: { slug: 'art' }
      }
    });

    if (!penAndInkSubcategory) {
      console.log('❌ Pen and Ink subcategory not found. Please run customization seed first.');
      return;
    }

    // Check if Pen and Ink options already exist
    const existingOptions = await prisma.customizationOption.count({
      where: { subCategoryId: penAndInkSubcategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Pen and Ink customization options already exist, skipping...');
      return;
    }

    // Create Pen and Ink customization options with thumbnail generation
    const penAndInkOptions = [
      {
        name: 'Pen and Ink Style 1',
        slug: 'pen-and-ink-style-1',
        displayName: 'Pen and Ink Style 1',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/pen-and-ink/cut_replicate-prediction-e53wrnrbqxg3fcab7voupobx2m.webp',
        fileName: 'cut_replicate-prediction-e53wrnrbqxg3fcab7voupobx2m.webp',
        orderIndex: 1
      },
      {
        name: 'Pen Sketch',
        slug: 'pen-sketch',
        displayName: 'Pen Sketch',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/pen-and-ink/pensketch.webp',
        fileName: 'pensketch.webp',
        orderIndex: 2
      },
      {
        name: 'Pen and Ink Style 3',
        slug: 'pen-and-ink-style-3',
        displayName: 'Pen and Ink Style 3',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/pen-and-ink/replicate-prediction-hmpotubbeycg7ry553itaa5kky.webp',
        fileName: 'replicate-prediction-hmpotubbeycg7ry553itaa5kky.webp',
        orderIndex: 3
      }
    ];

    // Generate thumbnails and create options
    const optionsWithThumbnails = [];
    
    for (const option of penAndInkOptions) {
      console.log(`📸 Generating thumbnail for ${option.name}...`);
      
      try {
        // Generate 90x90 thumbnail
        const thumbnailUrl = await generateThumbnail(option.imageUrl, option.fileName, 90, 'customization-options/pen-and-ink/thumbnails');
        
        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: thumbnailUrl,
          subCategoryId: penAndInkSubcategory.id,
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
          subCategoryId: penAndInkSubcategory.id,
          isActive: true,
          tags: [],
          orderIndex: option.orderIndex
        });
      }
    }

    // Create all options with thumbnails
    await prisma.customizationOption.createMany({
      data: optionsWithThumbnails
    });

    console.log('✅ Created Pen and Ink customization options with thumbnails');
    console.log('🎉 Pen and Ink options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Pen and Ink options:', error);
    throw error;
  }
}

module.exports = { seedPenAndInkOptions };