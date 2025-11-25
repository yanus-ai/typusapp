import { useMemo, useCallback } from "react";
import { useAppSelector } from "@/hooks/useAppSelector";
import { HistoryImage } from "../components/GenerationGrid";

const isValidCreateImageStatus = (status?: string): boolean => {
  return status === 'COMPLETED' || status === 'PROCESSING' || !status;
};

export const useCreatePageData = () => {
  const historyImages = useAppSelector(state => state.historyImages.images);
  const selectedImageId = useAppSelector(state => state.createUI.selectedImageId);
  const selectedImageType = useAppSelector(state => state.createUI.selectedImageType);
  const isGenerating = useAppSelector(state => state.createUI.isGenerating);
  const generatingBatchId = useAppSelector(state => state.createUI.generatingBatchId);
  const currentSession = useAppSelector(state => state.sessions.currentSession);

  const filteredHistoryImages = useMemo(() => {
    return historyImages.filter((image) => 
      image.moduleType === 'CREATE' && isValidCreateImageStatus(image.status)
    );
  }, [historyImages]);

  /**
   * Get all images from historyImages that match a specific batch ID
   */
  const getBatchImagesFromHistory = useMemo(() => {
    return (batchId: number | undefined): HistoryImage[] => {
      if (!batchId) return [];
      
      return historyImages.filter(img => 
        img.batchId === batchId &&
        img.moduleType === 'CREATE' &&
        isValidCreateImageStatus(img.status)
      );
    };
  }, [historyImages]);

  /**
   * Merge backend variations with historyImages (WebSocket updates + placeholders)
   * Prioritizes historyImages for real-time updates
   */
  const mergeBatchVariations = useCallback((
    backendVariations: HistoryImage[],
    historyImagesForBatch: HistoryImage[]
  ): HistoryImage[] => {
    // Create a map of backend variations by variation number (use as base)
    const backendMap = new Map<number, HistoryImage>();
    backendVariations.forEach(img => {
      if (img.variationNumber) {
        backendMap.set(img.variationNumber, img);
      }
    });

    // Create a map of historyImages by variation number (WebSocket updates)
    const historyMap = new Map<number, HistoryImage>();
    historyImagesForBatch.forEach(img => {
      if (img.variationNumber) {
        const existing = historyMap.get(img.variationNumber);
        // Prefer images with URLs (completed) over placeholders
        if (!existing || 
            ((img.imageUrl || img.thumbnailUrl) && !(existing.imageUrl || existing.thumbnailUrl))) {
          historyMap.set(img.variationNumber, img);
        }
      }
    });

    // Merge: Use backend variations as base, but prefer historyImages (WebSocket updates) when they exist
    // This ensures we use backend PROCESSING variations instead of frontend placeholders
    const merged: HistoryImage[] = [];

    // Process all variation numbers from both sources
    const allVariationNumbers = new Set<number>();
    backendMap.forEach((_, num) => allVariationNumbers.add(num));
    historyMap.forEach((_, num) => allVariationNumbers.add(num));

    allVariationNumbers.forEach(variationNumber => {
      const backendImg = backendMap.get(variationNumber);
      const historyImg = historyMap.get(variationNumber);

      // Prefer historyImage (WebSocket update) if it has a URL (completed image)
      // Otherwise use backend variation (which includes PROCESSING variations from backend)
      // Skip frontend placeholders (negative IDs) if backend variation exists
      if (historyImg && (historyImg.imageUrl || historyImg.thumbnailUrl)) {
        // Completed image from WebSocket - use it
        merged.push(historyImg);
      } else if (backendImg) {
        // Use backend variation (includes PROCESSING variations)
        merged.push(backendImg);
      } else if (historyImg && historyImg.id >= 0) {
        // Only use historyImage if it's not a placeholder (positive ID)
        merged.push(historyImg);
      }
    });

    // Sort by variation number
    merged.sort((a, b) => {
      const aNum = a.variationNumber || 0;
      const bNum = b.variationNumber || 0;
      return aNum - bNum;
    });

    return merged;
  }, []);

  /**
   * Get all batches for the current session
   * Handles:
   * 1. Backend batches (from session API)
   * 2. Generating batch with placeholders (before backend batch exists)
   * 3. Merging WebSocket updates with backend data
   */
  const sessionBatches = useMemo(() => {
    // Get images from historyImages for the currently generating batch
    const generatingBatchImages = generatingBatchId 
      ? getBatchImagesFromHistory(generatingBatchId)
      : [];

    // If no session, check if we need to show generating batch as temp batch
    if (!currentSession || !currentSession.batches) {
      if (generatingBatchImages.length > 0) {
        const batchPrompt = generatingBatchImages[0]?.aiPrompt || '';
        return [{
          id: generatingBatchId!,
          prompt: batchPrompt,
          createdAt: new Date().toISOString(),
          variations: generatingBatchImages
        }];
      }
      return [];
    }

    // Process backend batches and ensure generating batch is included
    const processedBatches = currentSession.batches
      .map(batch => {
        // Convert backend variations to HistoryImage format
        const backendVariations: HistoryImage[] = (batch.variations || []).map((img: any) => ({
          id: img.id,
          imageUrl: img.originalImageUrl || img.imageUrl || img.thumbnailUrl,
          thumbnailUrl: img.processedImageUrl || img.thumbnailUrl,
          status: img.status,
          variationNumber: img.variationNumber,
          batchId: batch.id,
          aiPrompt: batch.prompt || undefined,
          settingsSnapshot: img.settingsSnapshot,
          originalInputImageId: img.originalInputImageId,
          createdAt: img.createdAt,
          moduleType: 'CREATE' as const,
          // Mark as placeholder if PROCESSING without URLs
          isPlaceholder: img.status === 'PROCESSING' && !img.originalImageUrl && !img.imageUrl && !img.thumbnailUrl && !img.processedImageUrl,
        }));

        // Get historyImages for this batch (WebSocket updates + placeholders)
        const historyImagesForBatch = getBatchImagesFromHistory(batch.id);

        // If this is the generating batch or has historyImages, merge them
        // Prioritize backend variations to avoid duplicates
        if (batch.id === generatingBatchId || historyImagesForBatch.length > 0) {
          // Use backend variations as base, then merge with historyImages (WebSocket updates take priority)
          const mergedVariations = mergeBatchVariations(backendVariations, historyImagesForBatch);
          
          return {
            id: batch.id,
            prompt: batch.prompt || historyImagesForBatch[0]?.aiPrompt || '',
            createdAt: batch.createdAt,
            variations: mergedVariations
          };
        }

        // Return backend variations as-is for non-generating batches
        return {
          id: batch.id,
          prompt: batch.prompt || '',
          createdAt: batch.createdAt,
          variations: backendVariations
        };
      });

    // Check if generating batch exists in processed batches
    const generatingBatchExists = processedBatches.some(b => b.id === generatingBatchId);
    
    // If generating batch has images but doesn't exist in backend batches, add it as temp batch
    if (generatingBatchImages.length > 0 && !generatingBatchExists && generatingBatchId) {
      const batchPrompt = generatingBatchImages[0]?.aiPrompt || '';
      processedBatches.push({
        id: generatingBatchId,
        prompt: batchPrompt,
        createdAt: new Date().toISOString(),
        variations: generatingBatchImages
      });
    }

    // Sort by createdAt and deduplicate by batch ID (keep the one with more variations or later createdAt)
    const batchMap = new Map<number, typeof processedBatches[0]>();
    
    processedBatches.forEach(batch => {
      const existing = batchMap.get(batch.id);
      if (!existing || 
          batch.variations.length > existing.variations.length ||
          (batch.variations.length === existing.variations.length && 
           new Date(batch.createdAt).getTime() > new Date(existing.createdAt).getTime())) {
        batchMap.set(batch.id, batch);
      }
    });

    return Array.from(batchMap.values())
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [currentSession, generatingBatchId, getBatchImagesFromHistory, mergeBatchVariations]);

  // Check if we're in generating mode (has batches or currently generating)
  const isGeneratingMode = useMemo(() => {
    if (isGenerating && generatingBatchId) return true;
    if (sessionBatches.length > 0) return true;
    return false;
  }, [isGenerating, generatingBatchId, sessionBatches.length]);

  const currentInputImageId = useMemo(() => {
    if (!selectedImageId || !selectedImageType) return undefined;
    
    if (selectedImageType === 'input') {
      return selectedImageId;
    }
    
    if (selectedImageType === 'generated') {
      const generatedImage = historyImages.find(img => img.id === selectedImageId);
      return generatedImage?.originalInputImageId;
    }
    
    return undefined;
  }, [selectedImageId, selectedImageType, historyImages]);

  return {
    filteredHistoryImages,
    sessionBatches,
    currentInputImageId,
    isGeneratingMode,
    selectedImageId,
    selectedImageType,
  };
};
