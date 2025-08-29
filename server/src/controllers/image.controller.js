// server/src/controllers/image.controller.js
const { prisma } = require('../services/prisma.service');
const s3Service = require('../services/image/s3.service');
const replicateImageUploader = require('../services/image/replicateImageUploader.service');
const multer = require('multer');
const sharp = require('sharp');
const axios = require('axios');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
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

    // Validate file size (10MB limit)
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ 
        message: 'File too large. Maximum size is 10MB.' 
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
        // Include AI prompt related fields for restoration
        aiMaterials: true,
        aiPrompt: true,
        generatedPrompt: true
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
        uploadSource: 'CONVERTED_FROM_GENERATED'
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
    const { generatedImageUrl, generatedThumbnailUrl, originalInputImageId, fileName, uploadSource = 'CREATE_MODULE' } = req.body;

    if (!generatedImageUrl || !originalInputImageId || !fileName) {
      return res.status(400).json({ 
        message: 'Generated image URL, original input image ID, and file name are required' 
      });
    }

    console.log('📋 Creating InputImage from generated with mask copy:', {
      generatedImageUrl,
      originalInputImageId,
      fileName,
      uploadSource
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
      // 1. Create the new InputImage
      const createdInputImage = await tx.inputImage.create({
        data: {
          userId: req.user.id,
          originalUrl: uploadResult.url,
          processedUrl: uploadResult.url, // Use same URL for both original and processed
          thumbnailUrl: thumbnailUrl,
          fileName: fileName,
          uploadSource: uploadSource,
          isDeleted: false,
          maskStatus: originalInputImage.maskStatus, // Copy mask status
          maskData: originalInputImage.maskData // Copy mask data JSON
        }
      });

      // 2. Copy mask regions from original InputImage
      if (originalInputImage.maskRegions && originalInputImage.maskRegions.length > 0) {
        console.log(`📋 Copying ${originalInputImage.maskRegions.length} mask regions...`);
        
        for (const originalMask of originalInputImage.maskRegions) {
          await tx.maskRegion.create({
            data: {
              inputImageId: createdInputImage.id,
              maskUrl: originalMask.maskUrl,
              color: originalMask.color,
              materialOptionId: originalMask.materialOptionId,
              customizationOptionId: originalMask.customizationOptionId,
              customText: originalMask.customText,
              subCategoryId: originalMask.subCategoryId,
              orderIndex: originalMask.orderIndex || 0
            }
          });
        }
      }

      // 3. Copy AI prompt materials from original InputImage
      if (originalInputImage.aiPromptMaterials && originalInputImage.aiPromptMaterials.length > 0) {
        console.log(`🎨 Copying ${originalInputImage.aiPromptMaterials.length} AI prompt materials...`);
        
        for (const originalMaterial of originalInputImage.aiPromptMaterials) {
          await tx.aIPromptMaterial.create({
            data: {
              inputImageId: createdInputImage.id,
              materialOptionId: originalMaterial.materialOptionId,
              customizationOptionId: originalMaterial.customizationOptionId,
              subCategoryId: originalMaterial.subCategoryId,
              displayName: originalMaterial.displayName
            }
          });
        }
      }

      return createdInputImage;
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
  resizeImageForUpload // Export helper function for potential reuse
};