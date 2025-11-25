/**
 * Request Deduplication Utility
 * Prevents duplicate API calls by tracking pending requests
 */

type RequestKey = string;
type PendingRequest<T> = Promise<T>;

class RequestDeduplication {
  private pendingRequests = new Map<RequestKey, PendingRequest<any>>();

  /**
   * Execute a request, deduplicating if already in progress
   */
  async execute<T>(
    key: RequestKey,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // If request is already pending, return the existing promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Create new request
    const requestPromise = requestFn()
      .then((result) => {
        // Remove from pending when complete
        this.pendingRequests.delete(key);
        return result;
      })
      .catch((error) => {
        // Remove from pending on error
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store pending request
    this.pendingRequests.set(key, requestPromise);

    return requestPromise;
  }

  /**
   * Check if a request is currently pending
   */
  isPending(key: RequestKey): boolean {
    return this.pendingRequests.has(key);
  }

  /**
   * Clear a specific pending request
   */
  clear(key: RequestKey): void {
    this.pendingRequests.delete(key);
  }

  /**
   * Clear all pending requests
   */
  clearAll(): void {
    this.pendingRequests.clear();
  }
}

// Singleton instance
export const requestDeduplication = new RequestDeduplication();

/**
 * Helper to create a deduplicated fetch function
 */
export function createDeduplicatedFetch<T>(
  key: RequestKey,
  fetchFn: () => Promise<T>
): Promise<T> {
  return requestDeduplication.execute(key, fetchFn);
}

