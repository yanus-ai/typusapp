import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Proxies mask URLs through the backend to avoid CORS issues with GCS and other external sources
 * @param maskUrl - The original mask URL (may be GCS, FastAPI, or already proxied)
 * @returns The proxied URL if needed, or the original URL if already proxied
 */
export function proxyMaskUrl(maskUrl: string | undefined | null): string | undefined {
  if (!maskUrl) return undefined;
  
  // If already proxied, return as-is
  if (maskUrl.includes('/api/masks/proxy-by-url') || maskUrl.includes('/api/masks/proxy/')) {
    return maskUrl;
  }
  
  // Proxy GCS URLs and FastAPI URLs to avoid CORS issues
  const gcsBase = 'https://storage.googleapis.com';
  const fastApiBase = process.env.VITE_FAST_API_URL || 'http://34.45.42.199:8001';
  const shouldProxy = maskUrl.startsWith(gcsBase) || maskUrl.startsWith(fastApiBase);
  
  if (shouldProxy) {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
    return `${API_BASE}/masks/proxy-by-url?u=${encodeURIComponent(maskUrl)}`;
  }
  
  return maskUrl;
}