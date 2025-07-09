const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const getCustomizationOptions = async (req, res) => {
  try {
    const { style = 'photorealistic' } = req.query;

    // Fetch material categories and options
    const materialCategories = await prisma.materialCategory.findMany({
      where: { isActive: true },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: { orderIndex: 'asc' }
    });

    // Fetch customization categories and options based on style
    const styleFilter = style === 'both' ? undefined : { 
      OR: [
        { styleType: style },
        { styleType: 'both' }
      ]
    };

    const customizationCategories = await prisma.customizationCategory.findMany({
      where: {
        isActive: true,
        ...styleFilter
      },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: { orderIndex: 'asc' }
    });

    // Structure the response
    const response = {
      photorealistic: {},
      art: {}
    };

    // Process materials for walls and floors
    const wallMaterials = {};
    const floorMaterials = {};

    materialCategories.forEach(category => {
      const options = category.options.map(option => ({
        id: option.slug,
        name: option.name,
        imageUrl: option.imageUrl,
        thumbnailUrl: option.thumbnailUrl,
        description: option.description,
        tags: option.tags
      }));

      if (category.surfaceType === 'walls' || category.surfaceType === 'both') {
        wallMaterials[category.slug] = options;
      }
      if (category.surfaceType === 'floors' || category.surfaceType === 'both') {
        floorMaterials[category.slug] = options;
      }
    });

    // Process customization options
    customizationCategories.forEach(category => {
      const options = category.options.map(option => ({
        id: option.slug,
        name: option.name,
        description: option.description,
        imageUrl: option.imageUrl,
        tags: option.tags
      }));

      if (category.styleType === 'photorealistic' || category.styleType === 'both') {
        if (category.categoryType === 'building_type') {
          response.photorealistic.type = options;
        } else {
          response.photorealistic[category.slug.replace('-', '_')] = options;
        }
      }

      if (category.styleType === 'art' || category.styleType === 'both') {
        if (category.categoryType === 'art_style') {
          response.art.style = options;
        } else if (category.categoryType === 'building_type') {
          response.art.type = options;
        } else {
          response.art[category.slug.replace('-', '_')] = options;
        }
      }
    });

    // Add materials to both styles
    response.photorealistic.walls = wallMaterials;
    response.photorealistic.floors = floorMaterials;
    response.art.walls = wallMaterials;
    response.art.floors = floorMaterials;

    res.json(response);
  } catch (error) {
    console.error('Get customization options error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching customization options',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getCustomizationOptionsByCategory = async (req, res) => {
  try {
    const { categorySlug } = req.params;
    const { style = 'photorealistic' } = req.query;

    const category = await prisma.customizationCategory.findUnique({
      where: { slug: categorySlug },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const options = category.options.map(option => ({
      id: option.slug,
      name: option.name,
      description: option.description,
      imageUrl: option.imageUrl,
      tags: option.tags
    }));

    res.json({
      category: {
        id: category.slug,
        name: category.displayName,
        type: category.categoryType,
        styleType: category.styleType
      },
      options
    });
  } catch (error) {
    console.error('Get category options error:', error);
    res.status(500).json({ message: 'Server error while fetching category options' });
  }
};

const getMaterialOptions = async (req, res) => {
  try {
    const { surfaceType = 'both' } = req.query;

    const whereCondition = {
      isActive: true
    };

    if (surfaceType !== 'both') {
      whereCondition.OR = [
        { surfaceType: 'both' },
        { surfaceType: surfaceType }
      ];
    }

    const categories = await prisma.materialCategory.findMany({
      where: whereCondition,
      include: {
        options: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: { orderIndex: 'asc' }
    });

    const response = {};
    categories.forEach(category => {
      response[category.slug] = category.options.map(option => ({
        id: option.slug,
        name: option.name,
        imageUrl: option.imageUrl,
        thumbnailUrl: option.thumbnailUrl,
        description: option.description,
        tags: option.tags
      }));
    });

    res.json(response);
  } catch (error) {
    console.error('Get material options error:', error);
    res.status(500).json({ message: 'Server error while fetching material options' });
  }
};

// Admin endpoints for managing customization options
const createCustomizationOption = async (req, res) => {
  try {
    const { categorySlug, ...optionData } = req.body;

    const category = await prisma.customizationCategory.findUnique({
      where: { slug: categorySlug }
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const option = await prisma.customizationOption.create({
      data: {
        ...optionData,
        categoryId: category.id
      }
    });

    res.status(201).json(option);
  } catch (error) {
    console.error('Create customization option error:', error);
    res.status(500).json({ message: 'Server error while creating option' });
  }
};

const updateCustomizationOption = async (req, res) => {
  try {
    const { optionId } = req.params;
    const updateData = req.body;

    const option = await prisma.customizationOption.update({
      where: { id: parseInt(optionId) },
      data: updateData
    });

    res.json(option);
  } catch (error) {
    console.error('Update customization option error:', error);
    res.status(500).json({ message: 'Server error while updating option' });
  }
};

const deleteCustomizationOption = async (req, res) => {
  try {
    const { optionId } = req.params;

    await prisma.customizationOption.delete({
      where: { id: parseInt(optionId) }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete customization option error:', error);
    res.status(500).json({ message: 'Server error while deleting option' });
  }
};

module.exports = {
  getCustomizationOptions,
  getCustomizationOptionsByCategory,
  getMaterialOptions,
  createCustomizationOption,
  updateCustomizationOption,
  deleteCustomizationOption
};