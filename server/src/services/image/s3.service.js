const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_BUCKET_NAME } = require('../../config/constants');

// Initialize S3 client
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

const bucketName = AWS_BUCKET_NAME;

// Upload single or multiple files with folder organization
const uploadFile = async (fileBuffer, originalFilename, mimeType, folder = 'uploads') => {
  try {
    if (!fileBuffer) {
      return { success: false, error: 'No file buffer provided' };
    }

    const fileExtension = path.extname(originalFilename || 'unknown');
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const fileName = `${folder}/${uniqueFileName}`;

    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType,
      // ACL: 'public-read', // Make files publicly accessible
    };

    console.log('Uploading to S3:', {
      Bucket: bucketName,
      Key: fileName,
      ContentType: mimeType,
      BufferSize: fileBuffer.length
    });

    await s3Client.send(new PutObjectCommand(params));

    const url = `https://${bucketName}.s3.${AWS_REGION}.amazonaws.com/${fileName}`;
    
    return {
      success: true,
      key: fileName,
      url: url,
      originalName: originalFilename
    };
  } catch (error) {
    console.error("S3 upload error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Upload original input image
const uploadInputImage = async (fileBuffer, originalFilename, mimeType) => {
  return await uploadFile(fileBuffer, originalFilename, mimeType, 'uploads/input-images');
};

// Upload thumbnail image
const uploadThumbnail = async (fileBuffer, originalFilename, mimeType) => {
  return await uploadFile(fileBuffer, originalFilename, mimeType, 'uploads/thumbnails');
};

// Upload generated image (for create/tweak/refine modules)
const uploadGeneratedImage = async (fileBuffer, originalFilename, mimeType) => {
  return await uploadFile(fileBuffer, originalFilename, mimeType, 'uploads/generated');
};

// Legacy function for backward compatibility - handles multiple files
const uploadFiles = async (files) => {
  try {
    if (!files) {
      return { success: true, urls: [] };
    }

    // Convert single file to array to handle both cases
    if (!Array.isArray(files)) {
      files = [files];
    }

    const uploadPromises = files.map(async (file) => {
      const result = await uploadFile(file.buffer, file.originalname, file.mimetype);
      return result;
    });

    const results = await Promise.all(uploadPromises);

    // Check if any uploads failed
    const failedUploads = results.filter(r => !r.success);
    if (failedUploads.length > 0) {
      return {
        success: false,
        error: `Failed to upload ${failedUploads.length} files`,
        failures: failedUploads
      };
    }

    return {
      success: true,
      uploads: results,
      // For backward compatibility
      url: results.length === 1 ? results[0].url : null,
      urls: results.map(r => r.url)
    };
  } catch (error) {
    console.error("S3 batch upload error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Test S3 connection
const testConnection = async () => {
  try {
    console.log('Testing S3 connection...');
    console.log('Bucket:', bucketName);
    console.log('Region:', AWS_REGION);
    
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1,
    });
    
    await s3Client.send(command);
    console.log('S3 connection successful');
    return true;
  } catch (error) {
    console.error('S3 connection failed:', error.message);
    return false;
  }
};

// Delete a file from S3
const deleteFile = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(command);
    console.log('File deleted from S3:', key);
    return { success: true };
  } catch (error) {
    console.error('S3 delete file error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  uploadFile,
  uploadInputImage,
  uploadThumbnail,
  uploadGeneratedImage,
  uploadFiles, // Legacy function for backward compatibility
  testConnection,
  deleteFile,
  bucketName
};