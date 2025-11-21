import { useMemo } from "react";
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

  // Get all batches for the current session
  const sessionBatches = useMemo(() => {
    // Get ALL images from historyImages that match the generating batch (both placeholders and real images)
    // This includes placeholders (negative IDs) and real images that replaced them (positive IDs from WebSocket)
    const batchImagesFromHistory = generatingBatchId 
      ? historyImages.filter(img => 
          img.batchId === generatingBatchId &&
          img.moduleType === 'CREATE' &&
          isValidCreateImageStatus(img.status)
        )
      : [];

    // If we have images from history but no session batches yet, create a temporary batch
    if (batchImagesFromHistory.length > 0 && (!currentSession || !currentSession.batches || currentSession.batches.length === 0)) {
      // Extract prompt from first image (they all have the same prompt)
      const batchPrompt = batchImagesFromHistory[0]?.aiPrompt || '';
      
      // Create a temporary batch with images from history
      return [{
        id: generatingBatchId!,
        prompt: batchPrompt,
        createdAt: new Date().toISOString(),
        variations: batchImagesFromHistory.map(img => ({
          ...img,
          moduleType: 'CREATE' as const,
        }))
      }];
    }

    if (!currentSession || !currentSession.batches) return [];
    
    return currentSession.batches
      .map(batch => {
        // Get variations from backend
        const backendVariations = (batch.variations || []).map((img: any) => ({
          id: img.id,
          imageUrl: img.originalImageUrl || img.imageUrl || img.thumbnailUrl,
          thumbnailUrl: img.processedImageUrl || img.thumbnailUrl,
          status: img.status,
          variationNumber: img.variationNumber,
          batchId: batch.id,
          aiPrompt: batch.prompt,
          settingsSnapshot: img.settingsSnapshot,
          originalInputImageId: img.originalInputImageId,
          createdAt: img.createdAt,
          moduleType: 'CREATE' as const,
        } as HistoryImage));

        // If this is the generating batch, merge images from historyImages (which includes WebSocket updates)
        if (batch.id === generatingBatchId && batchImagesFromHistory.length > 0) {
          // Create a map of images from historyImages by variation number for easy lookup
          const historyImagesMap = new Map<number, HistoryImage>();
          batchImagesFromHistory.forEach(img => {
            if (img.variationNumber) {
              // Prefer images with URLs (completed) over placeholders
              const existing = historyImagesMap.get(img.variationNumber);
              if (!existing || (img.imageUrl || img.thumbnailUrl) && !(existing.imageUrl || existing.thumbnailUrl)) {
                historyImagesMap.set(img.variationNumber, img);
              }
            }
          });
          
          // Merge backend variations with historyImages, prioritizing historyImages (WebSocket updates)
          const mergedVariations: HistoryImage[] = [];
          const processedVariationNumbers = new Set<number>();
          
          // First, add all images from historyImages (these are the most up-to-date from WebSocket)
          batchImagesFromHistory.forEach(img => {
            if (img.variationNumber && !processedVariationNumbers.has(img.variationNumber)) {
              mergedVariations.push(img);
              processedVariationNumbers.add(img.variationNumber);
            }
          });
          
          // Then add backend variations that don't have a corresponding historyImage entry
          backendVariations.forEach(backendImg => {
            if (backendImg.variationNumber && !processedVariationNumbers.has(backendImg.variationNumber)) {
              mergedVariations.push(backendImg);
              processedVariationNumbers.add(backendImg.variationNumber);
            }
          });
          
          // Sort by variation number
          mergedVariations.sort((a, b) => {
            const aNum = a.variationNumber || 0;
            const bNum = b.variationNumber || 0;
            return aNum - bNum;
          });
          
          return {
            id: batch.id,
            prompt: batch.prompt || batchImagesFromHistory[0]?.aiPrompt || '',
            createdAt: batch.createdAt,
            variations: mergedVariations
          };
        }
        
        return {
          id: batch.id,
          prompt: batch.prompt || '',
          createdAt: batch.createdAt,
          variations: backendVariations
        };
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [currentSession, historyImages, generatingBatchId]);

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

