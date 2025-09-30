import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function setLocalStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
}

export function getLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (error) {
    console.error("Error getting from localStorage:", error);
    return defaultValue;
  }
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export async function downloadImageFromUrl(
  imageUrl: string, 
  filename?: string,
  onLoadingChange?: (loading: boolean) => void
): Promise<void> {
  try {
    onLoadingChange?.(true);
    
    // Use existing API configuration - same as lib/api.ts
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
    const token = getLocalStorage<string | null>("token", null);
    
    if (!token) {
      console.error('No authentication token found');
      onLoadingChange?.(false);
      return;
    }

    // Use the server proxy endpoint to download the image
    const downloadUrl = `${API_BASE}/images/download?imageUrl=${encodeURIComponent(imageUrl)}`;
    
    // Fetch with proper authorization
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    // Extract filename from Content-Disposition header or use provided filename
    let downloadFilename = filename;
    const contentDisposition = response.headers.get('content-disposition');
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        downloadFilename = filenameMatch[1];
      }
    }
    
    if (!downloadFilename) {
      downloadFilename = `typus-ai-${Date.now()}.jpg`;
    }

    // Create download link
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(blobUrl);
    
  } catch (error) {
    console.error('Failed to download image:', error);
    // Fallback to direct link method (may open in new tab on some browsers)
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename || `typus-ai-${Date.now()}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    onLoadingChange?.(false);
  }
}