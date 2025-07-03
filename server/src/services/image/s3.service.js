const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const {AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_BUCKET_NAME} = require('../../config/constants');

// Initialize S3 client
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

const bucketName = AWS_BUCKET_NAME;

// Upload single or multiple files
const uploadFile = async (files) => {
  try {
    if (!files) {
      return { success: true, urls: [] };
    }

    // Convert single file to array to handle both cases
    if (!Array.isArray(files)) {
      files = [files];
    }

    const uploadPromises = files.map(async (file) => {
      const fileExtension = path.extname(file.originalname || 'unknown');
      const fileName = `uploads/${uuidv4()}${fileExtension}`;

      const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        // ACL: 'public-read', // Make files publicly accessible
      };

      await s3Client.send(new PutObjectCommand(params));

      const url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
      
      return {
        key: fileName,
        url: url,
        originalName: file.originalname
      };
    });

    const results = await Promise.all(uploadPromises);

    return {
      success: true,
      uploads: results,
      // For backward compatibility
      url: results.length === 1 ? results[0].url : null,
      urls: results.map(r => r.url)
    };
  } catch (error) {
    console.error("S3 upload error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Upload base64 image (keep for backward compatibility)
const uploadImageToS3 = async (base64Image, fileName) => {
  try {
    console.log('Uploading base64 image to S3...');

    const cleanedBase64Image = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanedBase64Image, 'base64');

    const key = `uploads/${fileName}`;
    const params = {
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'image/png',
      ACL: 'public-read',
    };

    await s3Client.send(new PutObjectCommand(params));
    const url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    
    return url;
  } catch (error) {
    console.error('Error uploading base64 image to S3:', error);
    throw new Error('Error uploading base64 image to S3: ' + error.message);
  }
};

// Test S3 connection
const testConnection = async () => {
  try {
    console.log('Testing S3 connection...');
    console.log('Bucket:', bucketName);
    console.log('Region:', process.env.AWS_REGION);
    
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
  uploadImageToS3,
  testConnection,
  deleteFile,
  bucketName
};