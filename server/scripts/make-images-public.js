const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeImagesPublic() {
  try {
    console.log('🔄 Making some recent COMPLETED images public for testing...');
    
    // Get the 20 most recent COMPLETED images with processed URLs
    const recentImages = await prisma.image.findMany({
      where: {
        status: 'COMPLETED',
        processedImageUrl: {
          not: null
        },
        isPublic: false
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20,
      include: {
        user: {
          select: {
            id: true,
            fullName: true
          }
        },
        batch: {
          select: {
            prompt: true,
            moduleType: true
          }
        }
      }
    });

    console.log(`📸 Found ${recentImages.length} images to make public`);

    if (recentImages.length === 0) {
      console.log('❌ No completed images found to make public');
      return;
    }

    // Update these images to be public
    const updateResult = await prisma.image.updateMany({
      where: {
        id: {
          in: recentImages.map(img => img.id)
        }
      },
      data: {
        isPublic: true,
        title: 'Community Creation',
        description: 'Amazing AI-generated artwork from our community'
      }
    });

    console.log(`✅ Successfully made ${updateResult.count} images public`);

    // Display some info about the updated images
    console.log('\n📋 Updated images:');
    recentImages.forEach((img, index) => {
      console.log(`${index + 1}. Image ${img.id} by ${img.user.fullName} (${img.batch?.moduleType || 'UNKNOWN'})`);
      if (img.batch?.prompt) {
        console.log(`   Prompt: ${img.batch.prompt.substring(0, 50)}...`);
      }
    });

  } catch (error) {
    console.error('❌ Error making images public:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeImagesPublic();
