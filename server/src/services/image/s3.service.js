const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const bucketName = process.env.AWS_BUCKET_NAME;

// Generate a unique filename for S3
const generateUniqueFileName = (originalName) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(16).toString('hex');
  const extension = path.extname(originalName);
  return `${timestamp}-${randomString}${extension}`;
};

// Upload a file to S3
const uploadFile = async (fileBuffer, originalFilename, mimeType) => {
  const key = `uploads/${generateUniqueFileName(originalFilename)}`;
  
  const uploadParams = {
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType
  };

  await s3Client.send(new PutObjectCommand(uploadParams));

  // Generate URL
  const url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  
  return {
    key,
    url
  };
};

// Generate a presigned URL for downloading a file
const getPresignedUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
};

// Delete a file from S3
const deleteFile = async (key) => {
  const deleteParams = {
    Bucket: bucketName,
    Key: key
  };

  return s3Client.send(new DeleteObjectCommand(deleteParams));
};

module.exports = {
  uploadFile,
  getPresignedUrl,
  deleteFile
};