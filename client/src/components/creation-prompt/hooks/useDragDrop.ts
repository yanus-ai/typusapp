/**
 * Hook for extracting URLs from drag events
 * Supports material catalog drag data and standard URL formats
 */
export function useDragDrop() {
  const extractUrlFromDrag = (e: React.DragEvent): string | undefined => {
    const types = e.dataTransfer.types || [];
    // Try common formats first
    const raw = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (!raw) {
      for (const t of Array.from(types)) {
        try {
          const val = e.dataTransfer.getData(t);
          if (!val) continue;
          if (t.includes('json')) {
            const obj = JSON.parse(val);
            // Extract URL from material catalog drag data
            const candidate = obj?.option?.thumbnailUrl || obj?.imageUrl || obj?.url || obj?.src;
            if (typeof candidate === 'string') return candidate;
          }
          if (/https?:\/\//i.test(val)) return val.split('\n')[0];
        } catch {
          // Ignore parse errors
        }
      }
    }
    if (raw && /https?:\/\//i.test(raw)) return raw.split('\n')[0];
    return undefined;
  };

  return {
    extractUrlFromDrag,
  };
}

