import api from "@/lib/api";
import { getLocalStorage } from "./helpers";

/**
 * Options for streaming a Server-Sent Events (SSE) response
 */
export interface StreamOptions {
  /** URL endpoint to stream from (relative to api baseURL) */
  url: string;
  /** HTTP method (default: 'POST') */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Request body (for POST/PUT/PATCH) */
  body?: any;
  /** Additional request headers (auth token is added automatically) */
  headers?: Record<string, string>;
  /** AbortController signal for cancellation */
  signal?: AbortSignal;
  /** Callback when a chunk is received */
  onChunk?: (chunk: string, accumulated: string) => void;
  /** Callback when streaming completes */
  onComplete?: (fullData: string) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

/**
 * Stream data from a Server-Sent Events (SSE) endpoint
 * 
 * @param options - Streaming configuration options
 * @returns Promise that resolves with the full accumulated data
 * 
 * @example
 * ```ts
 * const fullText = await streamSSE({
 *   url: '/api/ai-prompt/generate-stream',
 *   method: 'POST',
 *   body: { inputImageId: 123 },
 *   onChunk: (chunk, accumulated) => {
 *     console.log('Received chunk:', chunk);
 *     setPrompt(accumulated);
 *   },
 *   onComplete: (fullText) => {
 *     console.log('Streaming complete:', fullText);
 *   },
 *   onError: (error) => {
 *     console.error('Streaming error:', error);
 *   }
 * });
 * ```
 */
export async function streamSSE(options: StreamOptions): Promise<string> {
  const {
    url,
    method = 'POST',
    body,
    headers = {},
    signal,
    onChunk,
    onComplete,
    onError
  } = options;

  try {
    // Use api instance configuration for base URL and auth token
    const baseURL = api.defaults.baseURL || '';
    const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;
    
    // Get auth token using the same method as api interceptor
    const token = getLocalStorage<string | null>("token", null);
    
    // Build request headers using api defaults and provided headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    };

    // Add auth token if available (same as api interceptor)
    if (token && !requestHeaders['Authorization']) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Make the fetch request
    const response = await fetch(fullUrl, {
      method,
      headers: requestHeaders,
      ...(body && { body: JSON.stringify(body) }),
      signal
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get the reader and decoder
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedData = '';

    // Read chunks from the stream
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      // Process each line
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            // Handle errors from server
            if (data.error) {
              throw new Error(data.error);
            }

            // Handle chunk data
            if (data.chunk) {
              accumulatedData += data.chunk;
              onChunk?.(data.chunk, accumulatedData);
            }

            // Handle completion
            if (data.done) {
              const finalData = data.fullPrompt || accumulatedData;
              onComplete?.(finalData);
              return finalData;
            }
          } catch (parseError) {
            // Skip invalid JSON lines (keep-alive messages, etc.)
            if (line.trim() !== '') {
              console.warn('Failed to parse SSE line:', line, parseError);
            }
            continue;
          }
        }
      }
    }

    // If we exit the loop without a done signal, return accumulated data
    onComplete?.(accumulatedData);
    return accumulatedData;

  } catch (error: any) {
    // Don't call onError for abort errors (expected cancellation)
    if (error.name === 'AbortError') {
      throw error;
    }

    const streamError = error instanceof Error ? error : new Error(error?.message || 'Streaming failed');
    onError?.(streamError);
    throw streamError;
  }
}

/**
 * Create an abort controller for streaming requests
 * Useful for managing cancellation in React hooks
 */
export function createStreamAbortController(): {
  controller: AbortController;
  abort: () => void;
} {
  const controller = new AbortController();

  return {
    controller,
    abort: () => {
      controller.abort();
    }
  };
}

