const { prisma } = require('./prisma.service');

class AIPromptMaterialService {
  
  /**
   * Add material to AI prompt for an input image
   */
  async addMaterial(inputImageId, {
    materialOptionId,
    customizationOptionId,
    subCategoryId,
    displayName
  }) {
    try {
      // Check if this combination already exists
      const existing = await prisma.aIPromptMaterial.findFirst({
        where: {
          inputImageId,
          subCategoryId,
          materialOptionId: materialOptionId || null,
          customizationOptionId: customizationOptionId || null,
        }
      });

      if (existing) {
        // Update existing record
        return await prisma.aIPromptMaterial.update({
          where: { id: existing.id },
          data: {
            displayName,
            updatedAt: new Date()
          },
          include: {
            materialOption: {
              select: {
                id: true,
                displayName: true,
                thumbnailUrl: true,
                category: {
                  select: { displayName: true }
                }
              }
            },
            customizationOption: {
              select: {
                id: true,
                displayName: true,
                thumbnailUrl: true,
                subCategory: {
                  select: { displayName: true }
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
      } else {
        // Create new record
        return await prisma.aIPromptMaterial.create({
          data: {
            inputImageId,
            materialOptionId,
            customizationOptionId,
            subCategoryId,
            displayName
          },
          include: {
            materialOption: {
              select: {
                id: true,
                displayName: true,
                thumbnailUrl: true,
                category: {
                  select: { displayName: true }
                }
              }
            },
            customizationOption: {
              select: {
                id: true,
                displayName: true,
                thumbnailUrl: true,
                subCategory: {
                  select: { displayName: true }
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
      }
    } catch (error) {
      console.error('❌ Error adding AI prompt material:', error);
      throw error;
    }
  }

  /**
   * Get all AI prompt materials for an input image
   */
  async getMaterials(inputImageId) {
    try {
      const materials = await prisma.aIPromptMaterial.findMany({
        where: { inputImageId },
        include: {
          materialOption: {
            select: {
              id: true,
              displayName: true,
              thumbnailUrl: true,
              category: {
                select: { displayName: true }
              }
            }
          },
          customizationOption: {
            select: {
              id: true,
              displayName: true,
              thumbnailUrl: true,
              subCategory: {
                select: { displayName: true }
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
        orderBy: { createdAt: 'asc' }
      });

      return materials;
    } catch (error) {
      console.error('❌ Error fetching AI prompt materials:', error);
      throw error;
    }
  }

  /**
   * Remove material from AI prompt
   */
  async removeMaterial(materialId) {
    try {
      return await prisma.aIPromptMaterial.delete({
        where: { id: materialId }
      });
    } catch (error) {
      console.error('❌ Error removing AI prompt material:', error);
      throw error;
    }
  }

  /**
   * Clear all materials for an input image
   */
  async clearMaterials(inputImageId) {
    try {
      return await prisma.aIPromptMaterial.deleteMany({
        where: { inputImageId }
      });
    } catch (error) {
      console.error('❌ Error clearing AI prompt materials:', error);
      throw error;
    }
  }

  /**
   * Generate formatted prompt string from materials
   */
  formatMaterialsForPrompt(materials) {
    try {
      const grouped = {};

      materials.forEach(material => {
        const subcategoryName = material.subCategory.displayName.toLowerCase();
        if (!grouped[subcategoryName]) {
          grouped[subcategoryName] = [];
        }
        // Extract just the material name without subcategory prefix
        const cleanName = material.displayName.replace(new RegExp(`^${material.subCategory.displayName}\\s+`, 'i'), '');
        grouped[subcategoryName].push(cleanName);
      });

      // Format as "Walls marble, Style modern"
      const formattedParts = Object.entries(grouped).map(([category, items]) => {
        return `${category} ${items.join(', ')}`;
      });

      return formattedParts.join(', ');
    } catch (error) {
      console.error('❌ Error formatting materials for prompt:', error);
      return '';
    }
  }
}

module.exports = new AIPromptMaterialService();