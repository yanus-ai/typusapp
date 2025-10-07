const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Toggle like/unlike for an image
 */
const toggleLike = async (req, res) => {
  try {
    const { imageId } = req.params;
    const userId = req.user.id;

    if (!imageId) {
      return res.status(400).json({
        success: false,
        message: 'Image ID is required'
      });
    }

    // Check if image exists and is public
    const image = await prisma.image.findUnique({
      where: { 
        id: parseInt(imageId),
        isPublic: true,
        status: 'COMPLETED'
      }
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found or not public'
      });
    }

    // Check if user has already liked this image
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_imageId: {
          userId,
          imageId: parseInt(imageId)
        }
      }
    });

    let action;
    let newLikesCount;

    if (existingLike) {
      // Unlike: Remove the like
      await prisma.like.delete({
        where: {
          userId_imageId: {
            userId,
            imageId: parseInt(imageId)
          }
        }
      });
      action = 'unliked';
    } else {
      // Like: Create a new like
      await prisma.like.create({
        data: {
          userId,
          imageId: parseInt(imageId)
        }
      });
      action = 'liked';
    }

    // Get updated likes count
    const likesCount = await prisma.like.count({
      where: {
        imageId: parseInt(imageId)
      }
    });

    console.log(`👍 User ${userId} ${action} image ${imageId}, new count: ${likesCount}`);

    res.json({
      success: true,
      action,
      likesCount,
      message: `Image ${action} successfully`
    });

  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like',
      error: error.message
    });
  }
};

/**
 * Get user's liked images
 */
const getUserLikedImages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const userLikes = await prisma.like.findMany({
      where: {
        userId
      },
      include: {
        image: {
          include: {
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
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    // Get total count
    const totalCount = await prisma.like.count({
      where: { userId }
    });

    const likedImages = userLikes.map(like => ({
      id: like.image.id,
      imageUrl: like.image.originalImageUrl || like.image.processedImageUrl,
      processedImageUrl: like.image.processedImageUrl,
      thumbnailUrl: like.image.thumbnailUrl,
      title: like.image.title,
      description: like.image.description,
      createdAt: like.image.createdAt,
      prompt: like.image.aiPrompt || like.image.batch?.prompt,
      moduleType: like.image.batch?.moduleType,
      likesCount: like.image._count.likes,
      likedAt: like.createdAt,
      user: {
        id: like.image.user.id,
        name: like.image.user.fullName,
        handle: like.image.user.handle,
        profilePicture: like.image.user.profilePicture
      }
    }));

    res.json({
      success: true,
      images: likedImages,
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
    console.error('Error fetching user liked images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch liked images',
      error: error.message
    });
  }
};

/**
 * Get like status for multiple images (for UI state management)
 */
const getLikeStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageIds } = req.query;

    if (!imageIds) {
      return res.status(400).json({
        success: false,
        message: 'Image IDs are required'
      });
    }

    // Parse imageIds (could be comma-separated string or array)
    const idsArray = Array.isArray(imageIds) 
      ? imageIds.map(id => parseInt(id))
      : imageIds.split(',').map(id => parseInt(id.trim()));

    const userLikes = await prisma.like.findMany({
      where: {
        userId,
        imageId: {
          in: idsArray
        }
      },
      select: {
        imageId: true
      }
    });

    const likedImageIds = userLikes.map(like => like.imageId);

    res.json({
      success: true,
      likedImageIds
    });

  } catch (error) {
    console.error('Error fetching like status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch like status',
      error: error.message
    });
  }
};

module.exports = {
  toggleLike,
  getUserLikedImages,
  getLikeStatus
};
