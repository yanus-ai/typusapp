const maskService = require('../services/mask/mask.service');
const maskRegionService = require('../services/mask/maskRegion.service');
const webSocketService = require('../services/websocket.service');
const { BASE_URL } = require('../config/constants');
const { prisma } = require('../services/prisma.service');

const generateImageMasks = async (req, res) => {
  try {
    const { imageUrl, inputImageId, callbackUrl } = req.body;
    
    console.log('🎭 Generating mask images for:', { imageUrl, inputImageId, callbackUrl });

    // Validate required fields
    if (!imageUrl || !inputImageId) {
      return res.status(400).json({ 
        error: 'Missing required fields: imageUrl and inputImageId are required' 
      });
    }

    const imageId = parseInt(inputImageId, 10);
    if (isNaN(imageId)) {
      return res.status(400).json({ 
        error: 'Invalid inputImageId: must be a valid number' 
      });
    }

    console.log('🔎 [MASK] Incoming generate request validation passed. Checking existing masks...');
    // Check if masks already exist
    const existingMasks = await maskRegionService.checkExistingMasks(imageId);
    if (existingMasks.exists) {
      console.log('ℹ️ [MASK] Masks already exist for image. Returning cached regions.');
      const maskData = await maskRegionService.getMaskRegions(imageId);
      return res.status(200).json({
        success: true,
        message: 'Masks already exist',
        data: {
          inputImageId: imageId,
          status: 'completed',
          ...maskData
        }
      });
    }

    // Test FastAPI connectivity
    const isConnected = await maskService.testConnection();
    if (!isConnected) {
      return res.status(503).json({
        error: 'FastAPI service is not accessible',
        message: 'External service is down or unreachable'
      });
    }

    // Update status to processing
    console.log('🔧 [MASK] Setting mask status to processing...');
    await maskRegionService.updateImageMaskStatus(imageId, 'processing');

    // Download and process image
    console.log('📥 [MASK] Downloading image for color filter...');
    const imageBuffer = await maskService.downloadImage(imageUrl);
    
    // if (imageBuffer.length > 5 * 1024 * 1024) { // 5MB
    //   await maskRegionService.updateImageMaskStatus(imageId, 'failed');
    //   return res.status(413).json({
    //     error: 'Image too large',
    //     message: 'Image size exceeds 5MB limit'
    //   });
    // }

    // Prepare callback URL - prefer public BASE_URL; fallback to current request origin
    const requestOrigin = `${req.protocol}://${req.get('host')}`;
    const publicBase = BASE_URL || requestOrigin;
    const defaultCallbackUrl = `${publicBase}/api/masks/callback`;

    // Generate masks
    console.log('📤 [MASK] Sending image to FastAPI color_filter...');
    const apiResponse = await maskService.generateColorFilter(imageBuffer, imageId, defaultCallbackUrl);
    
    console.log('✅ [MASK] Mask generation initiated successfully');
    
    // If the FastAPI returns UUID mapping synchronously, persist immediately and notify clients
    if (apiResponse && apiResponse.image_uuid_mapping) {
      const mapping = apiResponse.image_uuid_mapping;
      const firstVal = Object.values(mapping)[0];
      const hasMaskUrlObjects = firstVal && typeof firstVal === 'object' && !!firstVal.mask_url;
      try {
        let uuids;
        if (hasMaskUrlObjects) {
          // FastAPI returned mask_url objects directly
          uuids = Object.values(mapping);
        } else {
          // FastAPI returned color->uuid mapping; build pairs for saver to derive URLs
          uuids = Object.entries(mapping);
        }

        console.log('💾 [MASK] Saving synchronous image_uuid_mapping to DB...', { uuidCount: uuids.length, mode: hasMaskUrlObjects ? 'mask_url' : 'color_uuid' });
        const savedRegions = await maskRegionService.saveMaskRegions(imageId, uuids, apiResponse);
        console.log('📦 [MASK] Saved regions:', { count: savedRegions.length });
        // Notify client via websocket
        const inputImage = await prisma.inputImage.findUnique({ where: { id: imageId }, include: { user: true } });
        if (inputImage?.user?.id) {
          console.log('📡 [MASK] Notifying clients of completion via WebSocket...');
          webSocketService.notifyUserMaskCompletion(inputImage.user.id, imageId, {
            maskCount: savedRegions.length,
            maskStatus: 'completed',
            masks: savedRegions
          });
        }
        return res.status(200).json({
          success: true,
          message: 'Masks generated and saved',
          data: {
            inputImageId: imageId,
            status: 'completed',
            maskRegions: savedRegions
          }
        });
      } catch (saveErr) {
        console.error('❌ [MASK] Failed to save synchronous mask response:', saveErr);
        // If saving failed, fall back to processing state to allow callback retry
      }
    }
    
    // Otherwise, wait for callback
    console.log('⏳ [MASK] No synchronous mapping. Waiting for callback...', {
      hasCallbackUrl: !!defaultCallbackUrl
    });
    res.status(200).json({
      success: true,
      message: 'Mask generation initiated',
      data: {
        inputImageId: imageId,
        requestId: apiResponse?.revert_extra || 'pending',
        callbackUrl: defaultCallbackUrl,
        status: 'processing',
        colorMapping: apiResponse?.image_uuid_mapping || {}
      }
    });

  } catch (error) {
    console.error('❌ Generate mask images error:', error);
    
    // Update status to failed if we have imageId
    const imageId = parseInt(req.body.inputImageId, 10);
    if (!isNaN(imageId)) {
      await maskRegionService.updateImageMaskStatus(imageId, 'failed');
    }
    
    let errorMessage = 'Server error during mask image generation';
    let statusCode = 500;
    
    if (error.code === 'ECONNRESET' || error.message.includes('socket hang up')) {
      errorMessage = 'Connection lost to external service';
      statusCode = 502;
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to external service';
      statusCode = 503;
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Request timeout';
      statusCode = 504;
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: error.message,
      code: error.code
    });
  }
};

// Callback handler - Updated to match your Python response format
const handleMaskCallback = async (req, res) => {
  try {
    const { revert_extra: inputImageId, uuids } = req.body;
    const imageId = parseInt(inputImageId, 10);

    console.log('🎭 Mask callback received for image:', imageId);

    // Get user information for WebSocket notification
    const inputImage = await prisma.inputImage.findUnique({
      where: { id: imageId },
      include: { user: true }
    });

    if (!inputImage) {
      throw new Error(`InputImage with ID ${imageId} not found`);
    }

    // If masks already saved (from synchronous flow), ignore duplicate callback
    const existingRegions = await prisma.maskRegion.count({ where: { inputImageId: imageId } });
    if (inputImage.maskStatus === 'completed' && existingRegions > 0) {
      console.log(`ℹ️ Callback ignored: masks already completed for image ${imageId} (regions: ${existingRegions})`);
      return res.status(200).json({ success: true, message: 'Masks already saved' });
    }

    // Save masks to database
    const savedRegions = await maskRegionService.saveMaskRegions(imageId, uuids, req.body);

    // 🚀 NOTIFY WEBSOCKET CLIENTS IMMEDIATELY
    webSocketService.notifyUserMaskCompletion(inputImage.user.id, imageId, {
      maskCount: savedRegions.length,
      maskStatus: 'completed',
      masks: savedRegions
    });

    console.log(`📡 WebSocket notification sent to subscribed clients for image ${imageId}`);

    res.status(200).json({
      success: true,
      message: 'Masks saved and clients notified',
      data: { maskRegions: savedRegions }
    });

  } catch (error) {
    console.error('❌ Callback error:', error);

    // Notify failure
    const imageId = parseInt(req.body.revert_extra, 10);
    if (!isNaN(imageId)) {
      try {
        const inputImage = await prisma.inputImage.findUnique({
          where: { id: imageId },
          include: { user: true }
        });

        if (inputImage) {
          webSocketService.notifyUserMaskFailure(inputImage.user.id, imageId, error);
        }
      } catch (notificationError) {
        console.error('❌ Failed to send mask failure notification:', notificationError);
      }
    }

    res.status(500).json({ success: false, error: error.message });
  }
};

const getMaskRegions = async (req, res) => {
  try {
    const { inputImageId } = req.params;
    
    const imageId = parseInt(inputImageId, 10);
    if (isNaN(imageId)) {
      return res.status(400).json({ 
        error: 'Invalid inputImageId: must be a valid number' 
      });
    }

    console.log('🔍 Fetching mask regions for image:', imageId);

    const maskData = await maskRegionService.getMaskRegions(imageId);

    // Rewrite mask URLs to same-origin proxy to avoid mixed content in browsers
    const requestOrigin = `${req.protocol}://${req.get('host')}`;
    const publicBase = BASE_URL || requestOrigin;
    const rewrittenMaskRegions = (maskData.maskRegions || []).map((m) => {
      if (!m?.maskUrl) return m;
      const alreadyProxy = m.maskUrl.includes('/api/masks/proxy-by-url') || m.maskUrl.includes('/api/masks/proxy/');
      if (alreadyProxy) return m; // don't double-wrap
      const proxied = `${publicBase}/api/masks/proxy-by-url?u=${encodeURIComponent(m.maskUrl)}`;
      return { ...m, maskUrl: proxied };
    });

    res.status(200).json({
      success: true,
      data: {
        inputImageId: imageId,
        ...maskData,
        maskRegions: rewrittenMaskRegions
      }
    });

  } catch (error) {
    console.error('❌ Get mask regions error:', error);
    res.status(500).json({
      error: 'Failed to fetch mask regions',
      message: error.message
    });
  }
};

// Proxy mask image via server to avoid mixed-content (HTTPS page loading HTTP image)
const proxyMaskByUuid = async (req, res) => {
  try {
    const { uuid } = req.params;
    if (!uuid) return res.status(400).send('UUID is required');

    const baseUrl = process.env.FAST_API_URL || 'http://34.45.42.199:8001';
    const axios = require('axios');

    // 0) Try to resolve original URL from DB (handles any stored path shape)
    try {
      const region = await prisma.maskRegion.findFirst({
        where: { maskUrl: { contains: uuid } },
        select: { maskUrl: true }
      });
      if (region?.maskUrl) {
        const response = await axios.get(region.maskUrl, { responseType: 'arraybuffer' });
        const contentType = response.headers['content-type'] || 'image/png';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(Buffer.from(response.data));
      }
    } catch (e) {
      console.error('⚠️ DB lookup for mask uuid failed or not found:', uuid, e?.message || e);
    }

    // Try multiple known endpoint shapes to be resilient to FastAPI routing
    const candidates = [
      `${baseUrl}/mask/${uuid}`,
      `${baseUrl}/mask/${uuid}/`,
      `${baseUrl}/masks/${uuid}`,
      `${baseUrl}/masks/${uuid}/`,
      `${baseUrl}/mask?uuid=${encodeURIComponent(uuid)}`
    ];

    let lastError = null;
    for (const url of candidates) {
      try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const contentType = response.headers['content-type'] || 'image/png';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(Buffer.from(response.data));
      } catch (e) {
        lastError = e;
        console.error('❌ Mask proxy attempt failed:', url, e?.response?.status || e?.code || e?.message);
        // Try next candidate
      }
    }

    const status = lastError?.response?.status || 502;
    return res.status(status).send('Failed to fetch mask');
  } catch (error) {
    console.error('❌ Mask proxy error:', error?.message || error);
    res.status(502).send('Failed to fetch mask');
  }
};

// Generic proxy by full URL (safer when FastAPI path shape changes)
const proxyMaskByUrl = async (req, res) => {
  try {
    const rawUrl = req.query.u;
    if (!rawUrl) return res.status(400).send('u query param required');
    const decodedUrl = decodeURIComponent(rawUrl);

    const axios = require('axios');
    const response = await axios.get(decodedUrl, { responseType: 'arraybuffer' });
    const contentType = response.headers['content-type'] || 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(Buffer.from(response.data));
  } catch (error) {
    console.error('❌ Mask proxy-by-url error:', error?.response?.status || error?.message || error);
    return res.status(error?.response?.status || 502).send('Failed to fetch mask');
  }
};

const updateMaskStyle = async (req, res) => {
  try {
    const { maskId } = req.params;
    const { materialOptionId, customizationOptionId, customText, subCategoryId } = req.body;

    // Validate maskId is a valid integer
    const maskIdInt = parseInt(maskId, 10);
    if (isNaN(maskIdInt)) {
      return res.status(400).json({
        error: 'Invalid maskId: must be a valid number'
      });
    }

    console.log('🎨 Updating mask style:', { 
      maskId: maskIdInt, // Log as integer
      materialOptionId, 
      customizationOptionId,
      customText,
      subCategoryId
    });

    // Validate that at least one option or custom text is provided
    if (!materialOptionId && !customizationOptionId && !customText) {
      return res.status(400).json({
        error: 'At least one style option or custom text must be provided',
        message: 'Provide either materialOptionId, customizationOptionId, or customText'
      });
    }

    // Convert string IDs to integers if provided
    const materialId = materialOptionId ? parseInt(materialOptionId, 10) : null;
    const customizationId = customizationOptionId ? parseInt(customizationOptionId, 10) : null;
    const subCategoryIdInt = subCategoryId ? parseInt(subCategoryId, 10) : null;

    // Validate ID formats
    if (materialOptionId && isNaN(materialId)) {
      return res.status(400).json({
        error: 'Invalid materialOptionId: must be a valid number'
      });
    }

    if (customizationOptionId && isNaN(customizationId)) {
      return res.status(400).json({
        error: 'Invalid customizationOptionId: must be a valid number'
      });
    }

    if (subCategoryId && isNaN(subCategoryIdInt)) {
      return res.status(400).json({
        error: 'Invalid subCategoryId: must be a valid number'
      });
    }

    const updatedMask = await maskRegionService.updateMaskStyle(
      maskIdInt, // Pass integer ID
      materialId,
      customizationId,
      customText,
      subCategoryIdInt
    );

    console.log('✅ Mask style updated successfully');

    res.status(200).json({
      success: true,
      message: 'Mask style updated successfully',
      data: updatedMask
    });

  } catch (error) {
    console.error('❌ Update mask style error:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Mask region not found',
        message: 'The specified mask ID does not exist'
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'Invalid option ID',
        message: 'The specified material or customization option does not exist'
      });
    }

    res.status(500).json({
      error: 'Failed to update mask style',
      message: error.message
    });
  }
};

const clearMaskStyle = async (req, res) => {
  try {
    const { maskId } = req.params;

    // Validate maskId is a valid integer
    const maskIdInt = parseInt(maskId, 10);
    if (isNaN(maskIdInt)) {
      return res.status(400).json({
        error: 'Invalid maskId: must be a valid number'
      });
    }

    console.log('🧹 Clearing mask style for:', maskIdInt);

    const updatedMask = await maskRegionService.updateMaskStyle(
      maskIdInt, // Pass integer ID
      null, // Clear material option
      null  // Clear customization option
    );

    console.log('✅ Mask style cleared successfully');

    res.status(200).json({
      success: true,
      message: 'Mask style cleared successfully',
      data: updatedMask
    });

  } catch (error) {
    console.error('❌ Clear mask style error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Mask region not found',
        message: 'The specified mask ID does not exist'
      });
    }

    res.status(500).json({
      error: 'Failed to clear mask style',
      message: error.message
    });
  }
};

const updateMaskVisibility = async (req, res) => {
  try {
    const { maskId } = req.params;
    const { isVisible } = req.body;

    // Validate maskId is a valid integer
    const maskIdInt = parseInt(maskId, 10);
    if (isNaN(maskIdInt)) {
      return res.status(400).json({
        error: 'Invalid maskId: must be a valid number'
      });
    }

    // Validate isVisible is a boolean
    if (typeof isVisible !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid isVisible: must be a boolean value'
      });
    }

    console.log('👁️ Updating mask visibility:', { 
      maskId: maskIdInt,
      isVisible
    });

    // Update mask visibility using the service
    const updatedMask = await maskRegionService.updateMaskVisibility(maskIdInt, isVisible);

    console.log('✅ Mask visibility updated successfully:', {
      maskId: maskIdInt,
      isVisible,
      updatedMask: {
        id: updatedMask.id,
        isVisible: updatedMask.isVisible
      }
    });

    res.status(200).json({
      success: true,
      message: 'Mask visibility updated successfully',
      data: updatedMask
    });

  } catch (error) {
    console.error('❌ Update mask visibility error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Mask region not found',
        message: 'The specified mask ID does not exist'
      });
    }

    res.status(500).json({
      error: 'Failed to update mask visibility',
      message: error.message
    });
  }
};

// Add WebSocket stats endpoint for debugging
const getWebSocketStats = async (req, res) => {
  try {
    const stats = webSocketService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  generateImageMasks,
  getMaskRegions,
  proxyMaskByUuid,
  proxyMaskByUrl,
  handleMaskCallback,
  updateMaskStyle,
  updateMaskVisibility,
  clearMaskStyle,
  getWebSocketStats
};