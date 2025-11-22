/**
 * Utility functions for downloading files
 */

import { getLocalStorage } from "./helpers";

/**
 * Downloads an image from a URL by fetching it as a blob and triggering a download
 * Uses backend proxy endpoint to avoid CORS issues with S3
 * 
 * @param imageUrl - The URL of the image to download
 * @param fileName - The desired filename (without extension, extension will be auto-detected)
 * @returns Promise that resolves when download is initiated
 */
export async function downloadImage(
  imageUrl: string,
  fileName: string = 'image'
): Promise<void> {
  if (!imageUrl) {
    throw new Error('Image URL is required');
  }

  try {
    // Use backend proxy endpoint to avoid CORS issues
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
    // Use getLocalStorage helper to properly retrieve JSON-stored token
    const token = getLocalStorage<string | null>("token", null);
    
    // Build proxy URL
    const proxyUrl = `${API_BASE}/images/download?imageUrl=${encodeURIComponent(imageUrl)}`;
    
    // Build request headers
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Fetch the image through backend proxy
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers,
      credentials: 'include' // Include cookies if needed
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Determine file extension from blob type or URL
    let extension = 'png'; // default
    if (blob.type) {
      if (blob.type.includes('png')) {
        extension = 'png';
      } else if (blob.type.includes('jpeg') || blob.type.includes('jpg')) {
        extension = 'jpg';
      } else if (blob.type.includes('webp')) {
        extension = 'webp';
      } else if (blob.type.includes('gif')) {
        extension = 'gif';
      }
    } else {
      // Fallback: try to extract from URL
      const urlMatch = imageUrl.match(/\.(png|jpg|jpeg|webp|gif)/i);
      if (urlMatch) {
        extension = urlMatch[1].toLowerCase();
      }
    }
    
    // Extract filename from Content-Disposition header if available
    const contentDisposition = response.headers.get('content-disposition');
    let downloadFileName = fileName;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        downloadFileName = filenameMatch[1].replace(/\.[^.]+$/, ''); // Remove extension
      }
    }
    
    // Create object URL from blob
    const blobUrl = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${downloadFileName}.${extension}`;
    link.style.display = 'none';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

/**
 * Downloads a file from a blob directly
 * Useful when you already have the blob data
 * 
 * @param blob - The blob to download
 * @param fileName - The desired filename (without extension)
 * @param extension - The file extension (default: 'png')
 * @returns Promise that resolves when download is initiated
 */
export async function downloadBlob(
  blob: Blob,
  fileName: string = 'file',
  extension: string = 'png'
): Promise<void> {
  try {
    // Create object URL from blob
    const blobUrl = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${fileName}.${extension}`;
    link.style.display = 'none';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

