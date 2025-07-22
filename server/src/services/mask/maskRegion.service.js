const { prisma } = require('../prisma.service');

class MaskRegionService {
  async updateImageMaskStatus(inputImageId, status, maskData = null) {
    try {
      const updateData = {
        maskStatus: status,
        updatedAt: new Date()
      };

      if (maskData) {
        updateData.maskData = maskData;
      }

      return await prisma.inputImage.update({
        where: { id: inputImageId },
        data: updateData
      });
    } catch (error) {
      console.error('❌ Error updating mask status:', error);
      throw error;
    }
  }

  async saveMaskRegions(inputImageId, uuids, fullMaskData) {
    try {
      console.log(`🔄 Processing ${uuids?.length || 0} mask regions for image ${inputImageId}`);
      
      // Prepare mask region data for batch creation
      const maskRegionsData = [];
      
      if (uuids && Array.isArray(uuids)) {
        for (const maskItem of uuids) {
          const maskKey = Object.keys(maskItem)[0]; // e.g., "mask1", "mask2"
          const maskDetails = maskItem[maskKey];
          
          if (maskDetails && maskDetails.mask_url && maskDetails.color) {
            maskRegionsData.push({
              inputImageId: inputImageId,
              maskUrl: maskDetails.mask_url,
              color: maskDetails.color
            });
          }
        }
      }

      console.log(`📦 Prepared ${maskRegionsData.length} mask regions for batch insert`);

      // Use a single transaction with batch operations
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update the input image record with mask data and status
        const updatedImage = await tx.inputImage.update({
          where: { id: inputImageId },
          data: {
            maskData: fullMaskData,
            maskStatus: 'completed',
            updatedAt: new Date()
          }
        });

        // 2. Batch create all mask regions at once
        let createdMaskRegions = [];
        if (maskRegionsData.length > 0) {
          // Use createMany for better performance
          await tx.maskRegion.createMany({
            data: maskRegionsData
          });

          // Get the created regions (createMany doesn't return the created records)
          createdMaskRegions = await tx.maskRegion.findMany({
            where: { 
              inputImageId: inputImageId 
            },
            orderBy: { createdAt: 'desc' },
            take: maskRegionsData.length
          });
        }

        return {
          updatedImage,
          maskRegions: createdMaskRegions
        };
      }, {
        maxWait: 10000, // 10 seconds
        timeout: 30000, // 30 seconds
      });

      console.log(`✅ Successfully saved ${result.maskRegions.length} mask regions`);
      return result.maskRegions;

    } catch (error) {
      console.error('❌ Error saving mask regions:', error);
      throw error;
    }
  }

  async getMaskRegions(inputImageId) {
    try {
      const inputImage = await prisma.inputImage.findUnique({
        where: { id: inputImageId },
        include: {
          maskRegions: {
            include: {
              materialOption: {
                select: {
                  id: true,
                  displayName: true,
                  imageUrl: true,
                  thumbnailUrl: true,
                  category: {  // Include the parent category (MaterialCategory)
                    select: {
                      displayName: true
                    }
                  }
                }
              },
              customizationOption: {
                select: {
                  id: true,
                  displayName: true,
                  imageUrl: true,
                  thumbnailUrl: true,
                  subCategory: {  // Only include the subCategory here
                    select: {
                      displayName: true
                    }
                  }
                }
              },
              subCategory: {
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                  slug: true
                }
              }
            },
            orderBy: { id: 'asc' }
          }
        }
      });

      return {
        maskStatus: inputImage?.maskStatus || 'none',
        maskData: inputImage?.maskData,
        maskRegions: inputImage?.maskRegions || []
      };
    } catch (error) {
      console.error('❌ Error getting mask regions:', error);
      throw error;
    }
  }

  async updateMaskStyle(maskId, materialOptionId = null, customizationOptionId = null, customText = null, subCategoryId = null) {
    try {
      // Convert maskId to integer since it's now Int in schema
      const maskIdInt = parseInt(maskId, 10);
      if (isNaN(maskIdInt)) {
        throw new Error('Invalid maskId: must be a valid number');
      }

      return await prisma.maskRegion.update({
        where: { id: maskIdInt }, // Use integer ID
        data: {
          materialOptionId,
          customizationOptionId,
          subCategoryId,
          customText,
          updatedAt: new Date()
        },
        include: {
          materialOption: {
            select: {
              id: true,
              displayName: true,
              imageUrl: true,
              thumbnailUrl: true,
              category: {  // Include the parent category (MaterialCategory)
                select: {
                  displayName: true
                }
              }
            }
          },
          customizationOption: {
            select: {
              id: true,
              displayName: true,
              imageUrl: true,
              thumbnailUrl: true,
              subCategory: {  // Include the parent category (CustomizationCategory)
                select: {
                  displayName: true
                }
              }
            }
          },
          subCategory: {
            select: {
              id: true,
              name: true,
              displayName: true,
              slug: true
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ Error updating mask style:', error);
      throw error;
    }
  }

  async checkExistingMasks(inputImageId) {
    try {
      const inputImage = await prisma.inputImage.findUnique({
        where: { id: inputImageId },
        include: {
          maskRegions: {
            select: { id: true }
          }
        }
      });

      const hasCompletedMasks = inputImage?.maskStatus === 'completed' && 
                               inputImage?.maskRegions?.length > 0;

      return {
        exists: hasCompletedMasks,
        maskStatus: inputImage?.maskStatus || 'none',
        maskCount: inputImage?.maskRegions?.length || 0
      };
    } catch (error) {
      console.error('❌ Error checking existing masks:', error);
      throw error;
    }
  }

  async clearAllMaskRegions(inputImageId) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Delete all mask regions for this image
        await tx.maskRegion.deleteMany({
          where: { inputImageId }
        });

        // Reset image mask status
        const updatedImage = await tx.inputImage.update({
          where: { id: inputImageId },
          data: {
            maskStatus: 'none',
            maskData: null,
            updatedAt: new Date()
          }
        });

        return updatedImage;
      });
    } catch (error) {
      console.error('❌ Error clearing mask regions:', error);
      throw error;
    }
  }
}

module.exports = new MaskRegionService();