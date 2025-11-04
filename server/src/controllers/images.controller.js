const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get input images and create module results for tweak page left panel
 */
const getInputAndCreateImages = async (req, res) => {
  try {
    const { page = 1, limit = 50, uploadSource } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user.id;

    // Build where clause for input images based on upload source filter
    const inputImagesWhere = {
      userId,
      isDeleted: false
    };

    // Add upload source filter if provided
    if (uploadSource) {
      inputImagesWhere.uploadSource = uploadSource;
    }

    console.log('🔍 Fetching input images with filter:', inputImagesWhere);

    // Get input images (user uploads) filtered by upload source
    const inputImages = await prisma.inputImage.findMany({
      where: inputImagesWhere,
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    // Get create module results (generated images from CREATE module)
    const createImages = await prisma.image.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        processedImageUrl: {
          not: null
        },
        batch: {
          moduleType: 'CREATE'
        }
      },
      include: {
        batch: {
          select: {
            id: true,
            prompt: true,
            moduleType: true,
            metaData: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    // Get total counts
    const totalInputImages = await prisma.inputImage.count({
      where: {
        userId,
        isDeleted: false
      }
    });

    const totalCreateImages = await prisma.image.count({
      where: {
        userId,
        status: 'COMPLETED',
        processedImageUrl: {
          not: null
        },
        batch: {
          moduleType: 'CREATE'
        }
      }
    });

    res.json({
      inputImages: inputImages.map(img => ({
        id: img.id,
        imageUrl: img.originalUrl,
        originalUrl: img.originalUrl,
        processedUrl: img.processedUrl,
        thumbnailUrl: img.thumbnailUrl,
        previewUrl: img.previewUrl, // Include preview URL for Edit Inspector
        createdAt: img.createdAt,
        updatedAt: img.updatedAt,
        status: 'COMPLETED',
        moduleType: 'INPUT',
        fileName: img.fileName,
        fileSize: img.fileSize,
        dimensions: img.dimensions,
        uploadSource: img.uploadSource,
        // Include AI prompt related fields for restoration
        aiMaterials: img.aiMaterials || [],
        aiPrompt: img.aiPrompt || null,
        generatedPrompt: img.generatedPrompt || null,
        // Cross-module tracking fields
        createUploadId: img.createUploadId,
        tweakUploadId: img.tweakUploadId,
        refineUploadId: img.refineUploadId
      })),
      createImages: createImages.map(img => ({
        id: img.id,
        imageUrl: img.originalImageUrl || img.processedImageUrl, // Use original URL if available for high-quality canvas display
        processedUrl: img.processedImageUrl, // Keep processed URL available for LoRA training
        thumbnailUrl: img.thumbnailUrl,
        batchId: img.batchId,
        variationNumber: img.variationNumber,
        status: 'COMPLETED',
        moduleType: img.batch.moduleType,
        operationType: img.batch.metaData?.operationType || 'create',
        createdAt: img.createdAt,
        updatedAt: img.updatedAt,
        batch: img.batch
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalInputImages,
        totalCreateImages,
        totalItems: totalInputImages + totalCreateImages
      }
    });

  } catch (error) {
    console.error('Error fetching input and create images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch images',
      error: error.message
    });
  }
};

/**
 * Get input images filtered by upload source (for specific pages)
 */
const getInputImagesBySource = async (req, res) => {
  try {
    const { uploadSource } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user.id;

    // Validate upload source
    const validUploadSources = ['CREATE_MODULE', 'TWEAK_MODULE', 'REFINE_MODULE', 'GALLERY_UPLOAD'];
    if (!validUploadSources.includes(uploadSource)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid upload source. Must be one of: ' + validUploadSources.join(', ')
      });
    }

    console.log(`🔍 Fetching input images for upload source: ${uploadSource}`);

    // Get input images filtered by upload source
    const inputImages = await prisma.inputImage.findMany({
      where: {
        userId,
        isDeleted: false,
        uploadSource: uploadSource
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    // Get total count for pagination
    const totalCount = await prisma.inputImage.count({
      where: {
        userId,
        isDeleted: false,
        uploadSource: uploadSource
      }
    });

    console.log(`📊 Found ${inputImages.length} images for ${uploadSource} (total: ${totalCount})`);

    res.json({
      success: true,
      inputImages: inputImages.map(img => ({
        id: img.id,
        imageUrl: img.originalUrl, // Use original for high-quality canvas display
        originalUrl: img.originalUrl, // Ensure originalUrl exists
        processedUrl: img.processedUrl, // Use processed for generated images
        thumbnailUrl: img.thumbnailUrl,
        previewUrl: img.previewUrl, // Include preview URL for Edit Inspector
        fileName: img.fileName,
        dimensions: img.dimensions,
        uploadSource: img.uploadSource,
        createdAt: img.createdAt,
        status: 'COMPLETED',
        // Include saved AI materials and prompt for restoration
        aiMaterials: img.aiMaterials || [],
        aiPrompt: img.aiPrompt || null,
        generatedPrompt: img.generatedPrompt || null,
        // Cross-module tracking fields
        createUploadId: img.createUploadId,
        tweakUploadId: img.tweakUploadId,
        refineUploadId: img.refineUploadId,
        tags: img.tags || []
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching input images by source:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch input images',
      error: error.message
    });
  }
};

/**
 * Get tweak history for a specific base image
 */
const getTweakHistoryForImage = async (req, res) => {
  try {
    const { baseImageId } = req.params;
    const userId = req.user.id;

    if (!baseImageId) {
      return res.status(400).json({
        success: false,
        message: 'Base image ID is required'
      });
    }

    // First, check if the requested baseImageId is itself a tweak variation
    const requestedImage = await prisma.image.findFirst({
      where: {
        id: parseInt(baseImageId),
        userId
      },
      select: {
        id: true,
        originalBaseImageId: true
      }
    });

    // Determine the actual base image ID to use for fetching variations
    let actualBaseImageId = parseInt(baseImageId);
    if (requestedImage && requestedImage.originalBaseImageId) {
      // If the requested image is a tweak variation, use its original base image
      actualBaseImageId = requestedImage.originalBaseImageId;
    }

    // Get all tweak variations generated from the actual base image (optimized query)
    const tweakVariations = await prisma.image.findMany({
      where: {
        userId,
        originalBaseImageId: actualBaseImageId,
        status: 'COMPLETED',
        processedImageUrl: {
          not: null
        },
        batch: {
          moduleType: 'TWEAK'
        }
      },
      select: {
        id: true,
        processedImageUrl: true,
        thumbnailUrl: true,
        batchId: true,
        variationNumber: true,
        originalBaseImageId: true,
        createdAt: true,
        updatedAt: true,
        runpodStatus: true,
        // 🔥 FIX: Include prompt-related fields
        aiPrompt: true,
        batch: {
          select: {
            id: true,
            prompt: true,
            moduleType: true,
            metaData: true,
            createdAt: true,
            inputImageId: true // Include for mapping to originalInputImageId
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`🔄 Fetched ${tweakVariations.length} tweak variations for base image ${actualBaseImageId}`);

    res.json({
      variations: tweakVariations.map(variation => ({
        id: variation.id,
        imageUrl: variation.processedImageUrl,
        thumbnailUrl: variation.thumbnailUrl,
        batchId: variation.batchId,
        variationNumber: variation.variationNumber,
        status: 'COMPLETED',
        moduleType: variation.batch.moduleType,
        operationType: variation.batch.metaData?.operationType || 'unknown',
        originalBaseImageId: variation.originalBaseImageId,
        // Map batch.inputImageId to originalInputImageId for frontend compatibility
        originalInputImageId: variation.batch.inputImageId,
        createdAt: variation.createdAt,
        updatedAt: variation.updatedAt,
        runpodStatus: variation.runpodStatus,
        // 🔥 FIX: Include prompt data from individual images
        prompt: variation.aiPrompt || variation.batch.prompt, // Use aiPrompt from image, fallback to batch prompt
        aiPrompt: variation.aiPrompt, // Include the specific AI prompt
        settingsSnapshot: variation.settingsSnapshot, // Include settings snapshot
        settings: variation.settingsSnapshot ? {
          operationType: variation.settingsSnapshot.operationType,
          maskKeyword: variation.settingsSnapshot.maskKeyword,
          negativePrompt: variation.settingsSnapshot.negativePrompt,
          variations: variation.settingsSnapshot.variations
        } : (variation.batch.metaData ? {
          operationType: variation.batch.metaData.operationType,
          maskKeyword: variation.batch.metaData.maskKeyword,
          negativePrompt: variation.batch.metaData.negativePrompt,
          variations: variation.batch.metaData.variations
        } : {}),
        batch: variation.batch
      })),
      currentBaseImageId: actualBaseImageId, // Return the resolved original base image ID
      total: tweakVariations.length
    });

  } catch (error) {
    console.error('Error fetching tweak history for image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tweak history',
      error: error.message
    });
  }
};

/**
 * Get all images for a user (combined endpoint for backwards compatibility)
 */
const getAllUserImages = async (req, res) => {
  try {
    const { page = 1, limit = 50, moduleType } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user.id;

    let whereClause = {
      userId,
      OR: [
        // COMPLETED images must have processedImageUrl
        {
          status: 'COMPLETED',
          processedImageUrl: {
            not: null
          }
        },
        // PROCESSING images can have null processedImageUrl
        {
          status: 'PROCESSING'
        }
      ]
    };

    // Add module type filter if specified
    if (moduleType) {
      whereClause.batch = {
        moduleType: moduleType.toUpperCase()
      };
    }

    const images = await prisma.image.findMany({
      where: whereClause,
      select: {
        id: true,
        originalImageUrl: true,
        processedImageUrl: true,
        thumbnailUrl: true,
        previewUrl: true, // Include preview URL
        batchId: true,
        variationNumber: true,
        status: true,
        originalBaseImageId: true,
        runpodStatus: true,
        createdAt: true,
        updatedAt: true,
        // Include generation-specific fields for restoration
        aiPrompt: true,
        maskMaterialMappings: true,
        aiMaterials: true,
        contextSelection: true,
        batch: {
          select: {
            id: true,
            prompt: true,
            moduleType: true,
            metaData: true,
            createdAt: true,
            inputImageId: true // Include for mapping to originalInputImageId
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.image.count({
      where: whereClause
    });

    res.json({
      images: images.map(img => ({
        id: img.id,
        imageUrl: img.originalImageUrl || img.processedImageUrl || '', // Use original URL if available, fallback to empty for PROCESSING
        processedUrl: img.processedImageUrl, // Keep processed URL available for LoRA training
        thumbnailUrl: img.thumbnailUrl,
        previewUrl: img.previewUrl, // Include preview URL for Edit Inspector
        batchId: img.batchId,
        variationNumber: img.variationNumber,
        status: img.status,
        moduleType: img.batch.moduleType,
        operationType: img.batch.metaData?.operationType || 'unknown',
        originalBaseImageId: img.originalBaseImageId,
        // Map batch.inputImageId to originalInputImageId for frontend compatibility
        originalInputImageId: img.batch.inputImageId,
        runpodStatus: img.runpodStatus,
        createdAt: img.createdAt,
        updatedAt: img.updatedAt,
        // 🔥 FIX: Include prompt-related fields for gallery sidebar
        aiPrompt: img.aiPrompt,
        settingsSnapshot: img.settingsSnapshot,
        maskMaterialMappings: img.maskMaterialMappings,
        aiMaterials: img.aiMaterials,
        contextSelection: img.contextSelection,
        batch: img.batch
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching user images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch images',
      error: error.message
    });
  }
};

/**
 * Get all public images from all users for the Explore section
 * Optionally includes user's like status if authenticated
 */
const getPublicImages = async (req, res) => {
  try {
    const { page = 1, limit = 24 } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user?.id; // Optional - may be undefined if not authenticated

    // Get public generated images
    const publicGeneratedImages = await prisma.image.findMany({
      where: {
        isPublic: true,
        status: 'COMPLETED',
        processedImageUrl: {
          not: null
        }
      },
      select: {
        id: true,
        originalImageUrl: true,
        processedImageUrl: true,
        thumbnailUrl: true,
        title: true,
        description: true,
        createdAt: true,
        aiPrompt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            handle: true,
            profilePicture: true
          }
        },
        batch: {
          select: {
            moduleType: true,
            prompt: true
          }
        },
        _count: {
          select: {
            likes: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get public input images
    const publicInputImages = await prisma.inputImage.findMany({
      where: {
        isPublic: true,
        isDeleted: false
      },
      select: {
        id: true,
        originalUrl: true,
        processedUrl: true,
        thumbnailUrl: true,
        fileName: true,
        createdAt: true,
        aiPrompt: true,
        generatedPrompt: true,
        uploadSource: true,
        user: {
          select: {
            id: true,
            fullName: true,
            handle: true,
            profilePicture: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Combine and format all images consistently
    const allImages = [
      // Format generated images
      ...publicGeneratedImages.map(img => ({
        id: `generated_${img.id}`, // Prefix to distinguish from input images
        originalId: img.id,
        type: 'generated',
        imageUrl: img.originalImageUrl || img.processedImageUrl,
        processedImageUrl: img.processedImageUrl,
        thumbnailUrl: img.thumbnailUrl,
        title: img.title,
        description: img.description,
        createdAt: img.createdAt,
        prompt: img.aiPrompt || img.batch?.prompt,
        moduleType: img.batch?.moduleType || 'UNKNOWN',
        likesCount: img._count.likes,
        user: {
          id: img.user.id,
          name: img.user.fullName,
          handle: img.user.handle,
          profilePicture: img.user.profilePicture
        }
      })),
      // Format input images
      ...publicInputImages.map(img => ({
        id: `input_${img.id}`, // Prefix to distinguish from generated images
        originalId: img.id,
        type: 'input',
        imageUrl: img.originalUrl,
        processedImageUrl: img.processedUrl,
        thumbnailUrl: img.thumbnailUrl,
        title: img.fileName || 'Input Image',
        description: null,
        createdAt: img.createdAt,
        prompt: img.aiPrompt || img.generatedPrompt,
        moduleType: img.uploadSource || 'INPUT',
        likesCount: 0, // Input images don't have likes yet
        user: {
          id: img.user.id,
          name: img.user.fullName,
          handle: img.user.handle,
          profilePicture: img.user.profilePicture
        }
      }))
    ];

    // Sort all images by creation date (newest first)
    const sortedImages = allImages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const paginatedImages = sortedImages.slice(skip, skip + parseInt(limit));

    // If user is authenticated, get their like status for generated images
    let userLikes = [];
    if (userId) {
      const generatedImageIds = publicGeneratedImages.map(img => img.id);
      if (generatedImageIds.length > 0) {
        userLikes = await prisma.like.findMany({
          where: {
            userId,
            imageId: {
              in: generatedImageIds
            }
          },
          select: {
            imageId: true
          }
        });
      }
    }

    const likedImageIds = new Set(userLikes.map(like => like.imageId));

    // Add like status to the results
    const imagesWithLikeStatus = paginatedImages.map(img => ({
      ...img,
      isLikedByUser: img.type === 'generated' && userId ? likedImageIds.has(img.originalId) : false
    }));

    const totalCount = sortedImages.length;

    console.log(`📸 Found ${paginatedImages.length} public images (${publicGeneratedImages.length} generated + ${publicInputImages.length} input, total: ${totalCount}), user: ${userId || 'anonymous'}`);

    res.json({
      success: true,
      images: imagesWithLikeStatus,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < Math.ceil(totalCount / limit),
        hasPreviousPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching public images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch public images',
      error: error.message
    });
  }
};

/**
 * Get latest stored attachments for a base input image from generated images snapshots
 */
const getLatestAttachmentsForBase = async (req, res) => {
  try {
    const { inputImageId } = req.params;
    const userId = req.user.id;

    const latest = await prisma.image.findFirst({
      where: {
        userId,
        originalBaseImageId: parseInt(inputImageId, 10),
        status: 'COMPLETED'
      },
      orderBy: { createdAt: 'desc' },
      select: { settingsSnapshot: true, metadata: true }
    });

    if (!latest) {
      return res.json({ success: true, data: { attachments: null } });
    }

    const snapshot = latest.settingsSnapshot || {};
    const meta = latest.metadata?.tweakSettings || latest.metadata || {};
    const attachments = snapshot.attachments || meta.attachments || null;
    return res.json({ success: true, data: { attachments } });
  } catch (err) {
    console.error('Failed to fetch latest attachments for base:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch attachments' });
  }
};

module.exports = {
  getInputAndCreateImages,
  getTweakHistoryForImage,
  getAllUserImages,
  getInputImagesBySource,
  getPublicImages
  ,getLatestAttachmentsForBase
};