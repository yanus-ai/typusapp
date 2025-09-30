const { PrismaClient } = require('@prisma/client');
const { generateThumbnail } = require('../../src/services/image/thumbnail.service');
const prisma = new PrismaClient();

async function seedMinimalistOptions() {
  console.log('🌱 Seeding Minimalist customization options...');

  try {
    // Find the Minimalist subcategory under art category
    const minimalistSubcategory = await prisma.customizationSubCategory.findFirst({
      where: { 
        slug: 'minimalist',
        category: { slug: 'art' }
      }
    });

    if (!minimalistSubcategory) {
      console.log('❌ Minimalist subcategory not found. Please run customization seed first.');
      return;
    }

    // Check if Minimalist options already exist
    const existingOptions = await prisma.customizationOption.count({
      where: { subCategoryId: minimalistSubcategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Minimalist customization options already exist, skipping...');
      return;
    }

    // Create Minimalist customization options with thumbnail generation
    const minimalistOptions = [
      {
        name: 'Klein Minimalist Style',
        slug: 'klein-minimalist-style',
        displayName: 'Klein Minimalist Style',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/minimalist/klein_replicate-prediction-e53wrnrbqxg3fcab7voupobx2m%20%282%29.webp',
        fileName: 'klein_replicate-prediction-e53wrnrbqxg3fcab7voupobx2m (2).webp',
        orderIndex: 1
      },
      {
        name: 'Pen and Ink Minimalist',
        slug: 'pen-and-ink-minimalist',
        displayName: 'Pen and Ink Minimalist',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/minimalist/penandink.webp',
        fileName: 'penandink.webp',
        orderIndex: 2
      },
      {
        name: 'Minimalist Style 3',
        slug: 'minimalist-style-3',
        displayName: 'Minimalist Style 3',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/minimalist/replicate-prediction-fm4jx5rbb6w6swbf5kediqvhx4.webp',
        fileName: 'replicate-prediction-fm4jx5rbb6w6swbf5kediqvhx4.webp',
        orderIndex: 3
      },
      {
        name: 'Minimalist Style 4',
        slug: 'minimalist-style-4',
        displayName: 'Minimalist Style 4',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/minimalist/replicate-prediction-h5pmmzzb55xrgvnqecq6nj43xm.webp',
        fileName: 'replicate-prediction-h5pmmzzb55xrgvnqecq6nj43xm.webp',
        orderIndex: 4
      },
      {
        name: 'Minimalist Style 5',
        slug: 'minimalist-style-5',
        displayName: 'Minimalist Style 5',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/minimalist/replicate-prediction-naxrmozb624ktixgo25ypndvve.webp',
        fileName: 'replicate-prediction-naxrmozb624ktixgo25ypndvve.webp',
        orderIndex: 5
      },
      {
        name: 'Minimalist Style 6',
        slug: 'minimalist-style-6',
        displayName: 'Minimalist Style 6',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/minimalist/replicate-prediction-o5rd34zbmwnamg23wul6hdouhe.webp',
        fileName: 'replicate-prediction-o5rd34zbmwnamg23wul6hdouhe.webp',
        orderIndex: 6
      },
      {
        name: 'Minimalist Style 7',
        slug: 'minimalist-style-7',
        displayName: 'Minimalist Style 7',
        imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/minimalist/replicate-prediction-soa5hqrb4nau66ycdtgowwvvpi.webp',
        fileName: 'replicate-prediction-soa5hqrb4nau66ycdtgowwvvpi.webp',
        orderIndex: 7
      }
    ];

    // Generate thumbnails and create options
    const optionsWithThumbnails = [];
    
    for (const option of minimalistOptions) {
      console.log(`📸 Generating thumbnail for ${option.name}...`);
      
      try {
        // Generate 90x90 thumbnail
        const thumbnailUrl = await generateThumbnail(option.imageUrl, option.fileName, 90, 'customization-options/minimalist/thumbnails');
        
        optionsWithThumbnails.push({
          name: option.name,
          slug: option.slug,
          displayName: option.displayName,
          imageUrl: option.imageUrl,
          thumbnailUrl: thumbnailUrl,
          subCategoryId: minimalistSubcategory.id,
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
          subCategoryId: minimalistSubcategory.id,
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

    console.log('✅ Created Minimalist customization options with thumbnails');
    console.log('🎉 Minimalist options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Minimalist options:', error);
    throw error;
  }
}

module.exports = { seedMinimalistOptions };