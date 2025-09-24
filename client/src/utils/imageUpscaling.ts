/**
 * Image upscaling utility for client-side image processing
 * Upscales images to 2K resolution while maintaining aspect ratio
 */

export interface UpscaleOptions {
  targetWidth?: number;
  targetHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Upscales an image file to 2K resolution (2000px on the longer side)
 * while maintaining aspect ratio and image quality
 */
export async function upscaleImageTo2K(
  file: File,
  options: UpscaleOptions = {}
): Promise<File> {
  const {
    targetWidth = 2000,
    targetHeight = 2000,
    quality = 0.95,
    format = 'jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    const handleImageLoad = () => {
      try {
        const { width: originalWidth, height: originalHeight } = img;

        // Calculate scaling to achieve 2K on the longer side
        const longerSide = Math.max(originalWidth, originalHeight);
        const targetSize = Math.max(targetWidth, targetHeight);

        // Only upscale if the image is smaller than target size
        let scaleFactor = 1;
        if (longerSide < targetSize) {
          scaleFactor = targetSize / longerSide;
        }

        const newWidth = Math.round(originalWidth * scaleFactor);
        const newHeight = Math.round(originalHeight * scaleFactor);

        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;

        // Use high-quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw the upscaled image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create new file with upscaled content
              const upscaledFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, `.upscaled.${format === 'jpeg' ? 'jpg' : format}`),
                {
                  type: `image/${format}`,
                  lastModified: Date.now()
                }
              );
              resolve(upscaledFile);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          `image/${format}`,
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onload = handleImageLoad;
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Create object URL for the image
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    // Clean up object URL after image loads
    img.addEventListener('load', () => {
      URL.revokeObjectURL(objectUrl);
    }, { once: true });
  });
}

/**
 * Gets image dimensions from a file
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
      URL.revokeObjectURL(img.src);
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Checks if an image needs upscaling to 2K resolution
 */
export async function needsUpscaling(file: File, targetSize = 2000): Promise<boolean> {
  try {
    const { width, height } = await getImageDimensions(file);
    const longerSide = Math.max(width, height);
    return longerSide < targetSize;
  } catch (error) {
    console.error('Error checking if image needs upscaling:', error);
    return false;
  }
}