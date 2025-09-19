// server/src/controllers/image.controller.js
const { prisma } = require('../services/prisma.service');
const s3Service = require('../services/image/s3.service');
const replicateImageUploader = require('../services/image/replicateImageUploader.service');
const imageTaggingService = require('../services/imageTagging.service');
const multer = require('multer');
const sharp = require('sharp');
const axios = require('axios');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Multer middleware
const handleUpload = upload.single('file');

// Helper function to download image from URL using axios
async function downloadImageFromUrl(imageUrl) {
  try {
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YanusWebhook/1.0)'
      }
    });
    
    return Buffer.from(response.data);
  } catch (error) {
    console.error('❌ Image download error:', error);
    throw new Error(`Failed to download image: ${error.message}`);
  }
}

// Helper function to resize image while maintaining aspect ratio
const resizeImageForUpload = async (imageBuffer, maxWidth = 800, maxHeight = 600) => {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    console.log('Original image dimensions:', {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
    });

    // Calculate new dimensions while maintaining aspect ratio
    let newWidth = metadata.width;
    let newHeight = metadata.height;

    // Check if resizing is needed
    if (newWidth > maxWidth || newHeight > maxHeight) {
      const widthRatio = maxWidth / newWidth;
      const heightRatio = maxHeight / newHeight;
      const ratio = Math.min(widthRatio, heightRatio);

      newWidth = Math.round(newWidth * ratio);
      newHeight = Math.round(newHeight * ratio);

      console.log('Resizing image from', `${metadata.width}x${metadata.height}`, 'to', `${newWidth}x${newHeight}`);
    } else {
      console.log('Image is already within bounds, no resizing needed');
    }

    // Resize the image and convert to JPEG for consistency
    const resizedBuffer = await sharp(imageBuffer)
      .resize(newWidth, newHeight, { 
        fit: 'inside',
        withoutEnlargement: true // Don't enlarge if original is smaller
      })
      .jpeg({ 
        quality: 90, // High quality for main image
        progressive: true 
      })
      .toBuffer();

    console.log('Resized image buffer size:', resizedBuffer.length);

    return {
      buffer: resizedBuffer,
      width: newWidth,
      height: newHeight,
      originalWidth: metadata.width,
      originalHeight: metadata.height
    };
  } catch (error) {
    console.error('Error resizing image:', error);
    throw new Error('Failed to resize image: ' + error.message);
  }
};

// Upload input image (for InputHistoryPanel)
const uploadInputImage = async (req, res) => {
  try {
    // Test S3 connection first
    const s3Connected = await s3Service.testConnection();
    if (!s3Connected) {
      return res.status(500).json({ message: 'S3 service unavailable' });
    }

    await new Promise((resolve, reject) => {
      handleUpload(req, res, (err) => {
        if (err) {
          console.error('Multer error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' 
      });
    }

    // Validate file size (5MB limit)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ 
        message: 'File too large. Maximum size is 5MB.' 
      });
    }

    // Get image metadata to validate dimensions
    const metadata = await sharp(req.file.buffer).metadata();
    
    // Validate image width (2000px limit)
    if (metadata.width > 2000) {
      return res.status(400).json({ 
        message: 'Image width too large. Maximum width is 2000px.' 
      });
    }

    // Step 1: Upload the ORIGINAL image to S3 first (unprocessed)
    console.log('Uploading original image to S3...');
    const originalUpload = await s3Service.uploadInputImage(
      req.file.buffer, // Use original buffer
      req.file.originalname,
      req.file.mimetype // Keep original mimetype
    );

    if (!originalUpload.success) {
      return res.status(500).json({ 
        message: 'Failed to upload original image: ' + originalUpload.error 
      });
    }

    // Step 2: Resize the image for LoRA training (max 800x600) while maintaining aspect ratio
    console.log('Resizing image for LoRA training...');
    const resizedImage = await resizeImageForUpload(req.file.buffer, 800, 600);

    // Step 3: Upload the resized/processed image to S3
    console.log('Uploading processed image to S3...');
    const processedUpload = await s3Service.uploadProcessedInputImage(
      resizedImage.buffer,
      `processed-${req.file.originalname}`,
      'image/jpeg' // Always JPEG after processing
    );

    if (!processedUpload.success) {
      return res.status(500).json({ 
        message: 'Failed to upload processed image: ' + processedUpload.error 
      });
    }

    // Step 4: Create a thumbnail from the resized image
    console.log('Creating thumbnail from resized image...');
    const thumbnailBuffer = await sharp(resizedImage.buffer)
      .resize(300, 300, { 
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    console.log('Thumbnail created, size:', thumbnailBuffer.length);

    // Step 5: Upload thumbnail to S3
    console.log('Uploading thumbnail to S3...');
    const thumbnailUpload = await s3Service.uploadThumbnail(
      thumbnailBuffer,
      `thumbnail-${req.file.originalname}`,
      'image/jpeg'
    );

    if (!thumbnailUpload.success) {
      return res.status(500).json({ 
        message: 'Failed to upload thumbnail: ' + thumbnailUpload.error 
      });
    }

    // Step 5: Process the S3 uploaded image with Replicate API for LoRA training
    console.log('Processing resized S3 image with Replicate API for LoRA training...');
    let loraProcessedUrl = null;
    try {
      // Use the S3 URL of the resized image for LoRA training
      loraProcessedUrl = await replicateImageUploader.processImage(processedUpload.url);
      console.log('LoRA training successful, processed URL:', loraProcessedUrl);
    } catch (replicateError) {
      console.error('LoRA training failed:', replicateError);
      console.log('Will use S3 resized URL as fallback for processedUrl');
    }

    // Get upload source from request body or default to CREATE_MODULE
    const uploadSource = req.body.uploadSource || 'CREATE_MODULE';
    
    // Validate upload source
    const validUploadSources = ['CREATE_MODULE', 'TWEAK_MODULE', 'REFINE_MODULE', 'GALLERY_UPLOAD'];
    if (!validUploadSources.includes(uploadSource)) {
      return res.status(400).json({ 
        message: 'Invalid upload source. Must be one of: ' + validUploadSources.join(', ') 
      });
    }

    // Step 6: Save to InputImage table with both original and processed URLs
    // Use LoRA processed URL if available, otherwise fall back to S3 resized URL
    const finalProcessedUrl = loraProcessedUrl || processedUpload.url;
    
    console.log('Saving to database with upload source:', uploadSource);
    console.log('Final processedUrl to store:', finalProcessedUrl);
    
    const inputImage = await prisma.inputImage.create({
      data: {
        userId: req.user.id,
        originalUrl: originalUpload.url, // True original uploaded image
        processedUrl: finalProcessedUrl, // LoRA processed URL (preferred) or S3 resized URL (fallback)
        thumbnailUrl: thumbnailUpload.url,
        previewUrl: originalUpload.url, // For manual uploads, preview shows the original uploaded image
        fileName: req.file.originalname,
        fileSize: req.file.size, // Original file size
        dimensions: {
          width: resizedImage.width, // Processed dimensions
          height: resizedImage.height, // Processed dimensions
          originalWidth: resizedImage.originalWidth, // Original uploaded dimensions
          originalHeight: resizedImage.originalHeight // Original uploaded dimensions
        },
        uploadSource: uploadSource
      }
    });

    console.log('Input image created:', inputImage.id);
    console.log('Final dimensions:', `${resizedImage.width}x${resizedImage.height}`);
    console.log('Original dimensions:', `${resizedImage.originalWidth}x${resizedImage.originalHeight}`);

    // Trigger image tagging for REFINE_MODULE uploads
    if (uploadSource === 'REFINE_MODULE') {
      try {
        console.log('🏷️ Triggering image tagging for REFINE_MODULE upload...');
        const tagResult = await imageTaggingService.generateImageTags({
          imageUrl: inputImage.originalUrl,
          inputImageId: inputImage.id
        });

        if (tagResult.success) {
          console.log('✅ Image tagging initiated successfully:', {
            inputImageId: inputImage.id,
            predictionId: tagResult.predictionId
          });
        } else {
          console.warn('⚠️ Image tagging failed to initiate:', {
            inputImageId: inputImage.id,
            error: tagResult.error
          });
        }
      } catch (tagError) {
        console.error('❌ Error triggering image tagging:', {
          inputImageId: inputImage.id,
          error: tagError.message
        });
        // Don't fail the entire request if tagging fails
      }
    }

    res.status(201).json({
      id: inputImage.id,
      originalUrl: inputImage.originalUrl, // True original uploaded image
      processedUrl: inputImage.processedUrl, // LoRA processed URL (preferred) or S3 resized URL (fallback)
      imageUrl: inputImage.originalUrl, // Use original for high-quality canvas display
      thumbnailUrl: inputImage.thumbnailUrl,
      fileName: inputImage.fileName,
      createdAt: inputImage.createdAt,
      isProcessed: true, // Both original and processed are now available
      loraProcessed: !!loraProcessedUrl, // Whether LoRA training was successful
      dimensions: {
        width: resizedImage.originalWidth, // Original uploaded dimensions for display
        height: resizedImage.originalHeight, // Original uploaded dimensions for display
        processedWidth: resizedImage.width, // Processed dimensions for LoRA
        processedHeight: resizedImage.height, // Processed dimensions for LoRA
        wasResized: resizedImage.width !== resizedImage.originalWidth || resizedImage.height !== resizedImage.originalHeight
      }
    });
  } catch (error) {
    console.error('Input image upload error:', error);
    
    // Provide more specific error messages
    if (error.message.includes('credentials')) {
      return res.status(500).json({ message: 'AWS credentials not configured properly' });
    }
    if (error.message.includes('Bucket')) {
      return res.status(500).json({ message: 'S3 bucket not configured properly' });
    }
    if (error.message.includes('sharp') || error.message.includes('resize')) {
      return res.status(500).json({ message: 'Image processing/resizing failed' });
    }
    if (error.message.includes('Replicate API')) {
      // If only Replicate fails, still return success with resized URL
      console.warn('Replicate processing failed, using resized S3 URL');
    }
    
    res.status(500).json({ message: 'Server error during image upload' });
  }
};

// Get user's input images
const getUserInputImages = async (req, res) => {
  try {
    const inputImages = await prisma.inputImage.findMany({
      where: {
        userId: req.user.id,
        isDeleted: false
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        originalUrl: true,
        thumbnailUrl: true,
        processedUrl: true,
        fileName: true,
        dimensions: true, // Include dimensions to show if image was resized
        createdAt: true,
        uploadSource: true,
        // Include AI prompt related fields for restoration
        aiMaterials: true,
        aiPrompt: true,
        generatedPrompt: true,
        // Cross-module tracking fields
        createUploadId: true,
        tweakUploadId: true,
        refineUploadId: true
      }
    });

    res.json(inputImages);
  } catch (error) {
    console.error('Get input images error:', error);
    res.status(500).json({ message: 'Server error while fetching input images' });
  }
};

// Get a single image by ID (for regular images)
const getImageById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Convert string ID to integer
    const imageId = parseInt(id, 10);
    
    if (isNaN(imageId)) {
      return res.status(400).json({ message: 'Invalid image ID' });
    }

    const image = await prisma.image.findUnique({
      where: { id: imageId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            handle: true,
            profilePicture: true
          }
        }
      }
    });

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.json(image);
  } catch (error) {
    console.error('Get image by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching image' });
  }
};

// Get a single input image by ID
const getInputImageById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Convert string ID to integer
    const imageId = parseInt(id, 10);
    
    if (isNaN(imageId)) {
      return res.status(400).json({ message: 'Invalid image ID' });
    }

    const inputImage = await prisma.inputImage.findUnique({
      where: { 
        id: imageId,
        userId: req.user.id // Ensure user can only access their own images
      }
    });

    if (!inputImage) {
      return res.status(404).json({ message: 'Input image not found' });
    }

    res.json(inputImage);
  } catch (error) {
    console.error('Get input image by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching input image' });
  }
};

// Get user's regular images (generated images)
const getUserImages = async (req, res) => {
  try {
    const images = await prisma.image.findMany({
      where: {
        userId: req.user.id,
        isDeleted: false
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            handle: true,
            profilePicture: true
          }
        }
      }
    });

    res.json(images);
  } catch (error) {
    console.error('Get user images error:', error);
    res.status(500).json({ message: 'Server error while fetching images' });
  }
};

// Delete an input image
const deleteInputImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Convert string ID to integer
    const imageId = parseInt(id, 10);
    
    if (isNaN(imageId)) {
      return res.status(400).json({ message: 'Invalid image ID' });
    }

    // Soft delete the input image
    const inputImage = await prisma.inputImage.update({
      where: { 
        id: imageId,
        userId: req.user.id // Ensure user can only delete their own images
      },
      data: { isDeleted: true }
    });

    res.json({ message: 'Input image deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Input image not found' });
    }
    console.error('Delete input image error:', error);
    res.status(500).json({ message: 'Server error while deleting input image' });
  }
};

// Delete a regular image
const deleteImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Convert string ID to integer
    const imageId = parseInt(id, 10);
    
    if (isNaN(imageId)) {
      return res.status(400).json({ message: 'Invalid image ID' });
    }

    // Soft delete the image
    const image = await prisma.image.update({
      where: { 
        id: imageId,
        userId: req.user.id // Ensure user can only delete their own images
      },
      data: { isDeleted: true }
    });

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Image not found' });
    }
    console.error('Delete image error:', error);
    res.status(500).json({ message: 'Server error while deleting image' });
  }
};

// Convert generated image to input image for mask region creation
const convertGeneratedToInputImage = async (req, res) => {
  try {
    const { generatedImageId, imageUrl, thumbnailUrl } = req.body;

    if (!generatedImageId || !imageUrl) {
      return res.status(400).json({ 
        message: 'Generated image ID and image URL are required' 
      });
    }

    // Test S3 connection first
    const s3Connected = await s3Service.testConnection();
    if (!s3Connected) {
      return res.status(500).json({ message: 'S3 service unavailable' });
    }

    // Verify the generated image exists and belongs to the user
    const generatedImage = await prisma.image.findUnique({
      where: { 
        id: parseInt(generatedImageId, 10),
        userId: req.user.id // Ensure user owns the generated image
      }
    });

    if (!generatedImage) {
      return res.status(404).json({ message: 'Generated image not found' });
    }

    // Download the image from the provided URL
    console.log('Downloading image from URL:', imageUrl);
    const imageBuffer = await downloadImageFromUrl(imageUrl);
    console.log('Downloaded image buffer size:', imageBuffer.length);

    // Validate the downloaded image using sharp to detect format
    let contentType = 'image/jpeg'; // default
    try {
      const metadata = await sharp(imageBuffer).metadata();
      if (metadata.format === 'png') {
        contentType = 'image/png';
      } else if (metadata.format === 'webp') {
        contentType = 'image/webp';
      } else if (metadata.format === 'jpeg') {
        contentType = 'image/jpeg';
      } else {
        return res.status(400).json({ 
          message: 'Invalid image format. Only JPEG, PNG, and WebP are supported.' 
        });
      }
    } catch (error) {
      return res.status(400).json({ 
        message: 'Invalid image format. Only JPEG, PNG, and WebP are supported.' 
      });
    }

    // Step 1: Upload the original downloaded image to S3 first
    console.log('Uploading original downloaded image to S3...');
    const originalFileName = `converted-from-generated-${generatedImageId}-${Date.now()}.jpg`;
    const originalUpload = await s3Service.uploadInputImage(
      imageBuffer,
      originalFileName,
      contentType || 'image/jpeg'
    );

    if (!originalUpload.success) {
      return res.status(500).json({ 
        message: 'Failed to upload original image: ' + originalUpload.error 
      });
    }

    // Step 2: Resize the image for LoRA training (max 800x600) while maintaining aspect ratio
    console.log('Resizing downloaded image for LoRA training...');
    const resizedImage = await resizeImageForUpload(imageBuffer, 800, 600);

    // Step 3: Upload the processed/resized image to S3
    console.log('Uploading processed image to S3...');
    const processedFileName = `processed-converted-from-generated-${generatedImageId}-${Date.now()}.jpg`;
    const processedUpload = await s3Service.uploadProcessedInputImage(
      resizedImage.buffer,
      processedFileName,
      'image/jpeg'
    );

    if (!processedUpload.success) {
      return res.status(500).json({ 
        message: 'Failed to upload processed image: ' + processedUpload.error 
      });
    }

    // Step 4: Create a thumbnail from the resized image
    console.log('Creating thumbnail from resized image...');
    const thumbnailBuffer = await sharp(resizedImage.buffer)
      .resize(300, 300, { 
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    console.log('Thumbnail created, size:', thumbnailBuffer.length);

    // Step 5: Upload thumbnail to S3
    console.log('Uploading thumbnail to S3...');
    const thumbnailUpload = await s3Service.uploadThumbnail(
      thumbnailBuffer,
      `thumbnail-${processedFileName}`,
      'image/jpeg'
    );

    if (!thumbnailUpload.success) {
      return res.status(500).json({ 
        message: 'Failed to upload thumbnail: ' + thumbnailUpload.error 
      });
    }

    // Step 6: Save to InputImage table
    console.log('Saving to database...');
    const inputImage = await prisma.inputImage.create({
      data: {
        userId: req.user.id,
        originalUrl: originalUpload.url, // True original downloaded image
        processedUrl: processedUpload.url, // Resized image for LoRA training
        thumbnailUrl: thumbnailUpload.url,
        fileName: originalFileName,
        fileSize: imageBuffer.length, // Original downloaded image size
        dimensions: {
          width: resizedImage.width, // Processed dimensions
          height: resizedImage.height, // Processed dimensions
          originalWidth: resizedImage.originalWidth, // Original downloaded dimensions
          originalHeight: resizedImage.originalHeight, // Original downloaded dimensions
          convertedFrom: `generated-${generatedImageId}` // Track conversion source
        },
        uploadSource: 'CREATE_MODULE'
      }
    });

    console.log('Input image created from conversion:', inputImage.id);

    res.status(201).json({
      id: inputImage.id,
      originalUrl: inputImage.originalUrl, // True original downloaded image
      processedUrl: inputImage.processedUrl, // Resized image for LoRA training
      imageUrl: inputImage.originalUrl, // Use original for high-quality canvas display
      thumbnailUrl: inputImage.thumbnailUrl,
      fileName: inputImage.fileName,
      createdAt: inputImage.createdAt,
      isProcessed: true, // Both original and processed are now available
      dimensions: {
        width: resizedImage.originalWidth, // Original downloaded dimensions for display
        height: resizedImage.originalHeight, // Original downloaded dimensions for display
        processedWidth: resizedImage.width, // Processed dimensions for LoRA
        processedHeight: resizedImage.height, // Processed dimensions for LoRA
        wasResized: resizedImage.width !== resizedImage.originalWidth || resizedImage.height !== resizedImage.originalHeight
      }
    });
  } catch (error) {
    console.error('Convert generated to input image error:', error);
    
    // Provide specific error messages
    if (error.message.includes('Failed to download image') || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(400).json({ message: 'Failed to download image from URL' });
    }
    if (error.message.includes('credentials')) {
      return res.status(500).json({ message: 'AWS credentials not configured properly' });
    }
    if (error.message.includes('sharp') || error.message.includes('resize')) {
      return res.status(500).json({ message: 'Image processing/resizing failed' });
    }
    
    res.status(500).json({ message: 'Server error during image conversion' });
  }
};

// Create new InputImage from generated image with masks copied from original InputImage
const createInputImageFromGenerated = async (req, res) => {
  try {
    const { generatedImageUrl, generatedThumbnailUrl, generatedProcessedUrl, originalInputImageId, fileName, uploadSource = 'CREATE_MODULE', currentPrompt, maskPrompts } = req.body;

    if (!generatedImageUrl || !originalInputImageId || !fileName) {
      return res.status(400).json({ 
        message: 'Generated image URL, original input image ID, and file name are required' 
      });
    }

    console.log('📋 Creating InputImage from generated with mask copy:', {
      generatedImageUrl,
      generatedProcessedUrl,
      originalInputImageId,
      fileName,
      uploadSource,
      hasCurrentPrompt: !!currentPrompt,
      hasMaskPrompts: !!(maskPrompts && Object.keys(maskPrompts).length > 0)
    });

    // Test S3 connection first
    const s3Connected = await s3Service.testConnection();
    if (!s3Connected) {
      return res.status(500).json({ message: 'S3 service unavailable' });
    }

    // Verify the original input image exists and belongs to the user
    const originalInputImage = await prisma.inputImage.findUnique({
      where: { 
        id: parseInt(originalInputImageId, 10),
        userId: req.user.id // Ensure user owns the original input image
      },
      include: {
        maskRegions: {
          include: {
            materialOption: {
              include: {
                category: true
              }
            },
            customizationOption: {
              include: {
                subCategory: true
              }
            },
            subCategory: true
          }
        },
        aiPromptMaterials: {
          include: {
            materialOption: {
              include: {
                category: true
              }
            },
            customizationOption: {
              include: {
                subCategory: true
              }
            },
            subCategory: true
          }
        }
      }
    });

    if (!originalInputImage) {
      return res.status(404).json({ message: 'Original input image not found' });
    }

    // Download the image from the provided URL
    console.log('📥 Downloading image from URL:', generatedImageUrl);
    const imageBuffer = await downloadImageFromUrl(generatedImageUrl);
    console.log('📦 Downloaded image buffer size:', imageBuffer.length);

    // Validate the downloaded image using sharp to detect format
    let contentType = 'image/jpeg'; // default
    try {
      const metadata = await sharp(imageBuffer).metadata();
      if (metadata.format === 'png') {
        contentType = 'image/png';
      } else if (metadata.format === 'webp') {
        contentType = 'image/webp';
      } else if (metadata.format === 'jpeg') {
        contentType = 'image/jpeg';
      } else {
        return res.status(400).json({ 
          message: 'Invalid image format. Only JPEG, PNG, and WebP are supported.' 
        });
      }
    } catch (error) {
      return res.status(400).json({ 
        message: 'Invalid image format. Only JPEG, PNG, and WebP are supported.' 
      });
    }

    // Upload the image to S3
    const s3Key = `input-images/${req.user.id}/${Date.now()}-${fileName}`;
    const uploadResult = await s3Service.uploadInputImage(imageBuffer, fileName, contentType);
    
    if (!uploadResult.success) {
      console.error('❌ Failed to upload to S3:', uploadResult.error);
      return res.status(500).json({ message: 'Failed to upload image to storage' });
    }

    console.log('✅ Uploaded to S3:', uploadResult.url);

    // Create thumbnail if needed
    let thumbnailUrl = generatedThumbnailUrl;
    if (!thumbnailUrl) {
      try {
        const thumbnailBuffer = await sharp(imageBuffer)
          .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();

        const thumbnailKey = `thumbnails/${req.user.id}/${Date.now()}-thumb-${fileName}`;
        const thumbnailUploadResult = await s3Service.uploadThumbnail(thumbnailBuffer, `thumb-${fileName}`, 'image/jpeg');
        
        if (thumbnailUploadResult.success) {
          thumbnailUrl = thumbnailUploadResult.url;
        }
      } catch (error) {
        console.warn('⚠️ Failed to create thumbnail:', error);
      }
    }

    // Start database transaction to create InputImage and copy masks
    const newInputImage = await prisma.$transaction(async (tx) => {
      console.log('🚀 Starting transaction for InputImage creation and mask copying...');
      
      // 1. Create the new InputImage
      const createdInputImage = await tx.inputImage.create({
        data: {
          userId: req.user.id,
          originalUrl: uploadResult.url,
          processedUrl: generatedProcessedUrl || uploadResult.url, // Use provided processedUrl or fallback to originalUrl
          thumbnailUrl: thumbnailUrl,
          fileName: fileName,
          uploadSource: 'CREATE_MODULE', // Use different source to avoid AI material loading conflicts
          isDeleted: false,
          maskStatus: originalInputImage.maskStatus, // Copy mask status
          maskData: originalInputImage.maskData, // Copy mask data JSON
          aiPrompt: currentPrompt || null // Save the current frontend prompt
        }
      });

      // 2. Copy mask regions from original InputImage
      if (originalInputImage.maskRegions && originalInputImage.maskRegions.length > 0) {
        console.log(`📋 Copying ${originalInputImage.maskRegions.length} mask regions...`);
        
        for (const originalMask of originalInputImage.maskRegions) {
          try {
            // Check if we have a mask prompt from frontend state for this mask
            const maskKey = `mask_${originalMask.id}`;
            const frontendMaskPrompt = maskPrompts && maskPrompts[maskKey];
            
            // Use frontend mask prompt if available, otherwise fall back to original customText
            const finalCustomText = frontendMaskPrompt || originalMask.customText;
            
            console.log(`📝 Mask ${originalMask.id} prompt: ${frontendMaskPrompt ? 'FROM_FRONTEND' : 'FROM_ORIGINAL'} - "${finalCustomText}"`);
            
            await tx.maskRegion.create({
              data: {
                inputImageId: createdInputImage.id,
                maskUrl: originalMask.maskUrl,
                color: originalMask.color,
                materialOptionId: originalMask.materialOptionId,
                customizationOptionId: originalMask.customizationOptionId,
                customText: finalCustomText, // Use frontend prompt or original customText
                subCategoryId: originalMask.subCategoryId,
                orderIndex: originalMask.orderIndex || 0
              }
            });
            console.log(`✅ Copied mask ${originalMask.id} with prompt: "${finalCustomText}"`);
          } catch (error) {
            console.error(`❌ Failed to copy mask ${originalMask.id}:`, error.message);
            throw error; // Re-throw to fail the transaction
          }
        }
      }

      // 3. Skip copying AI prompt materials - they will be saved from frontend state during generation
      console.log('⏭️ Skipping AI prompt materials copy - will use frontend state instead');

      console.log('✅ Transaction completed successfully');
      return createdInputImage;
    }, {
      timeout: 30000 // 30 second timeout
    });

    console.log('✅ Created new InputImage with copied masks and materials:', newInputImage.id);

    res.status(201).json({
      id: newInputImage.id,
      originalUrl: newInputImage.originalUrl,
      processedUrl: newInputImage.processedUrl,
      imageUrl: newInputImage.originalUrl, // Return originalUrl as imageUrl for compatibility
      thumbnailUrl: newInputImage.thumbnailUrl,
      fileName: newInputImage.fileName,
      uploadSource: newInputImage.uploadSource,
      isProcessed: false,
      createdAt: newInputImage.createdAt
    });

  } catch (error) {
    console.error('❌ Error creating InputImage from generated:', error);
    
    // Provide specific error messages
    if (error.message.includes('Failed to download image') || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(400).json({ message: 'Failed to download image from URL' });
    }
    if (error.message.includes('S3') || error.message.includes('upload')) {
      return res.status(500).json({ message: 'Failed to upload image to storage' });
    }
    
    res.status(500).json({ message: 'Server error during InputImage creation' });
  }
};

// Create input image from existing image with cross-module tracking
const createTweakInputImageFromExisting = async (req, res) => {
  try {
    const { imageUrl, thumbnailUrl, fileName, originalImageId, uploadSource = 'TWEAK_MODULE' } = req.body;

    if (!imageUrl || !originalImageId) {
      return res.status(400).json({ 
        message: 'Image URL and original image ID are required' 
      });
    }

    console.log('📋 Creating InputImage from existing with cross-module tracking:', {
      imageUrl,
      thumbnailUrl,
      fileName,
      originalImageId,
      uploadSource,
      userId: req.user.id
    });

    // Pre-fetch all needed data outside the transaction
    console.log('🔍 Pre-fetching source image data...');

    // Check both tables to find the source and get its preview URL
    const [sourceInputImage, sourceGeneratedImage] = await Promise.all([
      prisma.inputImage.findUnique({
        where: { id: originalImageId },
        select: {
          id: true,
          previewUrl: true,
          originalUrl: true,
          userId: true,
          uploadSource: true,
          createUploadId: true,
          tweakUploadId: true,
          refineUploadId: true
        }
      }),
      prisma.image.findUnique({
        where: { id: originalImageId },
        select: {
          id: true,
          previewUrl: true,
          originalBaseImageId: true,
          batchId: true,
          processedImageUrl: true,
          originalImageUrl: true
        }
      })
    ]);

    console.log(`🔍 Found images for ID ${originalImageId}:`, {
      hasInputImage: !!sourceInputImage,
      hasGeneratedImage: !!sourceGeneratedImage,
      inputUploadSource: sourceInputImage?.uploadSource,
      generatedBatchId: sourceGeneratedImage?.batchId
    });

    // Determine preview URL and processed URL outside transaction
    let previewUrl = imageUrl; // Default fallback
    let processedUrl = imageUrl; // Default fallback
    let baseInputImage = null;

    if (sourceInputImage) {
      // Source is an InputImage - use its previewUrl (which points to the original base input)
      previewUrl = sourceInputImage.previewUrl || sourceInputImage.originalUrl;
      // For input images, use their processedUrl which contains the LoRA training resized image
      processedUrl = sourceInputImage.processedUrl || sourceInputImage.originalUrl;
      console.log(`📸 Using URLs from source InputImage - preview: ${previewUrl}, processed: ${processedUrl}`);
    } else if (sourceGeneratedImage) {
      // Source is a generated Image - get the original base input image's previewUrl
      if (sourceGeneratedImage.previewUrl) {
        previewUrl = sourceGeneratedImage.previewUrl;
        console.log(`📸 Using previewUrl from source generated Image: ${previewUrl}`);
      } else if (sourceGeneratedImage.originalBaseImageId) {
        // Get the original base input image's previewUrl
        baseInputImage = await prisma.inputImage.findUnique({
          where: { id: sourceGeneratedImage.originalBaseImageId },
          select: { previewUrl: true, originalUrl: true }
        });
        if (baseInputImage) {
          previewUrl = baseInputImage.previewUrl || baseInputImage.originalUrl;
          console.log(`📸 Using previewUrl from base InputImage ${sourceGeneratedImage.originalBaseImageId}: ${previewUrl}`);
        }
      }

      // For generated images, use the processedImageUrl which contains the LoRA training resized image
      processedUrl = sourceGeneratedImage.processedImageUrl || sourceGeneratedImage.originalImageUrl || imageUrl;
      console.log(`🎨 Using processedImageUrl from generated image: ${processedUrl}`);
    }

    // Determine tracking operations outside transaction
    const trackingField = getTrackingField(uploadSource);
    const trackingUpdates = [];

    if (trackingField) {
      console.log(`🔗 Planning tracking update for source ${originalImageId} with ${trackingField}`);

      // When converting FROM CREATE page TO another module, prioritize input images
      if (sourceInputImage && sourceInputImage.uploadSource === 'CREATE_MODULE') {
        console.log(`📄 Planning input image ${originalImageId} (CREATE_MODULE source) update for ${trackingField}`);
        trackingUpdates.push({
          type: 'inputImage',
          id: originalImageId,
          field: trackingField
        });
      }
      // For TWEAK_MODULE and REFINE_MODULE, could be either input or generated
      else if ((uploadSource === 'TWEAK_MODULE' || uploadSource === 'REFINE_MODULE')) {
        if (sourceInputImage) {
          console.log(`📄 Planning input image ${originalImageId} update for ${trackingField}`);
          trackingUpdates.push({
            type: 'inputImage',
            id: originalImageId,
            field: trackingField
          });
        }
        if (sourceGeneratedImage) {
          console.log(`🎨 Planning generated image ${originalImageId} update for ${trackingField}`);
          trackingUpdates.push({
            type: 'generatedImage',
            id: originalImageId,
            field: trackingField
          });
        }
      }
    }

    // Optimized transaction - only critical DB operations
    const result = await prisma.$transaction(async (tx) => {
      // Create the new input image record
      const newInputImage = await tx.inputImage.create({
        data: {
          userId: req.user.id,
          originalUrl: imageUrl,
          processedUrl: processedUrl, // Use the LoRA training resized image URL
          thumbnailUrl: thumbnailUrl || imageUrl,
          previewUrl: previewUrl, // Set the preview URL to show the actual base input image
          fileName: fileName || 'converted-image.jpg',
          uploadSource: uploadSource,
          sourceGeneratedImageId: originalImageId, // Track the source image
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Execute planned tracking updates
      for (const update of trackingUpdates) {
        if (update.type === 'inputImage') {
          await tx.inputImage.update({
            where: { id: update.id },
            data: { [update.field]: newInputImage.id }
          });
          console.log(`✅ Updated input image ${update.id} tracking with ${update.field}: ${newInputImage.id}`);
        } else if (update.type === 'generatedImage') {
          await tx.image.update({
            where: { id: update.id },
            data: { [update.field]: newInputImage.id }
          });
          console.log(`✅ Updated generated image ${update.id} tracking with ${update.field}: ${newInputImage.id}`);
        }
      }

      if (trackingField && trackingUpdates.length === 0) {
        console.warn(`⚠️ Source image ${originalImageId} not found in either table`);
      }

      return newInputImage;
    });

    console.log('✅ InputImage created with cross-module tracking:', result.id);

    // Trigger image tagging for REFINE_MODULE uploads
    if (uploadSource === 'REFINE_MODULE') {
      try {
        console.log('🏷️ Triggering image tagging for REFINE_MODULE upload...');
        const tagResult = await imageTaggingService.generateImageTags({
          imageUrl: result.originalUrl,
          inputImageId: result.id
        });

        if (tagResult.success) {
          console.log('✅ Image tagging initiated successfully:', {
            inputImageId: result.id,
            predictionId: tagResult.predictionId
          });
        } else {
          console.warn('⚠️ Image tagging failed to initiate:', {
            inputImageId: result.id,
            error: tagResult.error
          });
        }
      } catch (tagError) {
        console.error('❌ Error triggering image tagging:', {
          inputImageId: result.id,
          error: tagError.message
        });
        // Don't fail the entire request if tagging fails
      }
    }

    res.status(201).json({
      id: result.id,
      originalUrl: result.originalUrl,
      processedUrl: result.processedUrl,
      imageUrl: result.originalUrl, // For backward compatibility
      thumbnailUrl: result.thumbnailUrl,
      previewUrl: result.previewUrl, // Preview URL pointing to the actual base input image
      fileName: result.fileName,
      uploadSource: result.uploadSource,
      isProcessed: result.isProcessed,
      createdAt: result.createdAt,
      // Cross-module tracking fields
      createUploadId: result.createUploadId,
      tweakUploadId: result.tweakUploadId,
      refineUploadId: result.refineUploadId
    });

  } catch (error) {
    console.error('❌ Error creating input image from existing with cross-module tracking:', error);
    res.status(500).json({ 
      message: 'Failed to create input image from existing image',
      error: error.message 
    });
  }
};

// Helper function to get the correct tracking field based on upload source
const getTrackingField = (uploadSource) => {
  switch (uploadSource) {
    case 'CREATE_MODULE':
      return 'createUploadId';
    case 'TWEAK_MODULE':
      return 'tweakUploadId';
    case 'REFINE_MODULE':
      return 'refineUploadId';
    default:
      console.warn(`⚠️ Unknown upload source: ${uploadSource}`);
      return null;
  }
};

// Update input image with AI materials
const updateInputImageAIMaterials = async (req, res) => {
  try {
    const { id } = req.params;
    const { aiMaterials } = req.body;
    
    console.log('📦 Updating input image AI materials:', { inputImageId: id, materialsCount: aiMaterials?.length || 0 });
    
    // Validate request
    if (!aiMaterials || !Array.isArray(aiMaterials)) {
      return res.status(400).json({ 
        success: false, 
        message: 'aiMaterials must be an array' 
      });
    }
    
    // Verify input image exists and belongs to user
    const inputImage = await prisma.inputImage.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id
      }
    });
    
    if (!inputImage) {
      return res.status(404).json({ 
        success: false, 
        message: 'Input image not found' 
      });
    }
    
    // Update the input image with AI materials
    const updatedImage = await prisma.inputImage.update({
      where: { id: parseInt(id) },
      data: {
        aiMaterials: aiMaterials,
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Successfully updated input image AI materials for image:', id);
    
    res.json({
      success: true,
      message: 'AI materials updated successfully',
      data: {
        id: updatedImage.id,
        aiMaterials: updatedImage.aiMaterials
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating input image AI materials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update AI materials',
      error: error.message
    });
  }
};

// Download image endpoint - proxies S3 images to force download
const downloadImage = async (req, res) => {
  try {
    const { imageUrl } = req.query;
    
    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required' });
    }

    console.log('📥 Downloading image for user:', imageUrl);

    // Download the image from S3
    const imageBuffer = await downloadImageFromUrl(imageUrl);
    
    // Extract filename from URL or create default
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1] || `typus-ai-${Date.now()}.jpg`;
    
    // Set headers to force download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', imageBuffer.length);
    
    // Send the image buffer
    res.send(imageBuffer);

  } catch (error) {
    console.error('❌ Download image error:', error);
    res.status(500).json({ 
      message: 'Failed to download image',
      error: error.message
    });
  }
};

module.exports = {
  uploadInputImage,
  getUserInputImages,
  getImageById,
  getInputImageById,
  getUserImages,
  deleteInputImage,
  deleteImage,
  convertGeneratedToInputImage,
  createInputImageFromGenerated,
  createTweakInputImageFromExisting,
  updateInputImageAIMaterials,
  downloadImage,
  resizeImageForUpload // Export helper function for potential reuse
};