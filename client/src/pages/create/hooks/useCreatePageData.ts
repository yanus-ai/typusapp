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
    // Create a map of historyImages by variation number
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

    // Merge: historyImages first (most up-to-date), then backend variations
    const merged: HistoryImage[] = [];
    const processedVariations = new Set<number>();

    // Add all historyImages first (WebSocket updates + placeholders)
    historyImagesForBatch.forEach(img => {
      if (img.variationNumber && !processedVariations.has(img.variationNumber)) {
        merged.push(img);
        processedVariations.add(img.variationNumber);
      }
    });

    // Add backend variations that don't have a historyImage entry
    backendVariations.forEach(backendImg => {
      if (backendImg.variationNumber && !processedVariations.has(backendImg.variationNumber)) {
        merged.push(backendImg);
        processedVariations.add(backendImg.variationNumber);
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

    // If we have a generating batch but no session batches yet, create a temporary batch
    // This handles the case where placeholders are shown before backend batch is created
    // OR when a new batch is created but session hasn't been refreshed yet
    if (generatingBatchImages.length > 0) {
      const batchExistsInSession = currentSession?.batches?.some(b => b.id === generatingBatchId);
      
      // If batch doesn't exist in session yet, create a temporary batch entry
      if (!batchExistsInSession) {
        const batchPrompt = generatingBatchImages[0]?.aiPrompt || '';
        
        const tempBatch = {
          id: generatingBatchId!,
          prompt: batchPrompt,
          createdAt: new Date().toISOString(),
          variations: generatingBatchImages
        };

        // If we have other batches in the session, include them too
        if (currentSession?.batches && currentSession.batches.length > 0) {
          const backendBatches = currentSession.batches.map(batch => {
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
            }));

            return {
              id: batch.id,
              prompt: batch.prompt || '',
              createdAt: batch.createdAt,
              variations: backendVariations
            };
          });

          return [...backendBatches, tempBatch].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        }

        return [tempBatch];
      }
    }

    // If no session, return empty array
    if (!currentSession || !currentSession.batches) {
      return [];
    }

    // Process backend batches
    return currentSession.batches
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
        }));

        // Get historyImages for this batch (WebSocket updates + placeholders)
        const historyImagesForBatch = getBatchImagesFromHistory(batch.id);

        // If this is the generating batch or has historyImages, merge them
        if (batch.id === generatingBatchId || historyImagesForBatch.length > 0) {
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
      })
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
