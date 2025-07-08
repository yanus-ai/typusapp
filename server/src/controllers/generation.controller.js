// server/src/controllers/generation.controller.js
const { prisma } = require('../services/prisma.service');
const comfyuiService = require('../services/image/comfyui.service');
const s3Service = require('../services/image/s3.service');

// Enhanced generate image with customization settings
const generateImage = async (req, res) => {
  try {
    const { 
      prompt, 
      inputImageId,
      customizationSettings,
      variations = 1
    } = req.body;

    // Validate input
    if (!inputImageId) {
      return res.status(400).json({ message: 'Input image is required' });
    }

    if (!customizationSettings) {
      return res.status(400).json({ message: 'Customization settings are required' });
    }

    // Check if user has enough credits
    const now = new Date();
    const activeCredits = await prisma.creditTransaction.aggregate({
      where: {
        userId: req.user.id,
        status: 'COMPLETED',
        OR: [
          { expiresAt: { gt: now } },
          { expiresAt: null }
        ]
      },
      _sum: {
        amount: true
      }
    });

    const availableCredits = activeCredits._sum.amount || 0;
    if (availableCredits < variations) {
      return res.status(402).json({ message: 'Not enough credits' });
    }

    // Verify input image belongs to user
    const inputImage = await prisma.inputImage.findFirst({
      where: {
        id: parseInt(inputImageId),
        userId: req.user.id
      }
    });

    if (!inputImage) {
      return res.status(404).json({ message: 'Input image not found' });
    }

    // Create generation batch with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create generation batch
      const batch = await tx.generationBatch.create({
        data: {
          userId: req.user.id,
          inputImageId: parseInt(inputImageId),
          moduleType: 'CREATE',
          prompt,
          totalVariations: variations,
          creditsUsed: variations,
          status: 'PROCESSING'
        }
      });

      // Save create settings
      const createSettings = await tx.createSettings.create({
        data: {
          batchId: batch.id,
          mode: customizationSettings.selectedStyle || 'photorealistic',
          variations,
          creativity: customizationSettings.creativity || 50,
          expressivity: customizationSettings.expressivity || 50,
          resemblance: customizationSettings.resemblance || 50,
          buildingType: customizationSettings.selections?.type,
          category: customizationSettings.selections?.walls?.category,
          context: customizationSettings.selections?.context,
          style: customizationSettings.selections?.style,
          regions: customizationSettings.selections
        }
      });

      // Deduct credits
      await tx.creditTransaction.create({
        data: {
          userId: req.user.id,
          amount: -variations,
          type: 'IMAGE_CREATE',
          status: 'COMPLETED',
          description: `Created ${variations} image variation(s)`,
          batchId: batch.id
        }
      });

      return { batch, createSettings };
    });

    // TODO: Call ComfyUI API here
    // For now, create mock generated images
    const generatedImages = [];
    for (let i = 1; i <= variations; i++) {
      const image = await prisma.image.create({
        data: {
          batchId: result.batch.id,
          userId: req.user.id,
          processedImageUrl: `https://via.placeholder.com/512?text=Generated+${i}`,
          thumbnailUrl: `https://via.placeholder.com/256?text=Generated+${i}`,
          variationNumber: i,
          status: 'COMPLETED'
        }
      });
      generatedImages.push(image);
    }

    // Update batch status
    await prisma.generationBatch.update({
      where: { id: result.batch.id },
      data: { status: 'COMPLETED' }
    });

    res.status(201).json({
      batch: result.batch,
      settings: result.createSettings,
      images: generatedImages.map(img => ({
        ...img,
        id: img.id.toString(),
        batchId: img.batchId.toString()
      }))
    });

  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ message: 'Server error during image generation' });
  }
};

// Get generation batch with settings
const getGenerationBatch = async (req, res) => {
  try {
    const { batchId } = req.params;

    const batch = await prisma.generationBatch.findUnique({
      where: { 
        id: parseInt(batchId),
        userId: req.user.id // Ensure user owns the batch
      },
      include: {
        createSettings: true,
        tweakBatch: true,
        refineSettings: true,
        variations: true,
        inputImage: true
      }
    });

    if (!batch) {
      return res.status(404).json({ message: 'Generation batch not found' });
    }

    res.json({
      ...batch,
      id: batch.id.toString(),
      variations: batch.variations.map(img => ({
        ...img,
        id: img.id.toString(),
        batchId: img.batchId.toString()
      }))
    });

  } catch (error) {
    console.error('Get generation batch error:', error);
    res.status(500).json({ message: 'Server error while fetching generation batch' });
  }
};

module.exports = {
  generateImage,
  getGenerationBatch,
  // ... other existing methods
};