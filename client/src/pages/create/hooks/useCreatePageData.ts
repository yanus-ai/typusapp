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
    // Get placeholder images from historyImages that match the generating batch
    const placeholderImages = generatingBatchId 
      ? historyImages.filter(img => 
          img.batchId === generatingBatchId && 
          img.id < 0 && // Placeholder images have negative IDs
          img.status === 'PROCESSING' &&
          img.moduleType === 'CREATE'
        )
      : [];

    // If we have placeholders but no session batches yet, create a temporary batch
    if (placeholderImages.length > 0 && (!currentSession || !currentSession.batches || currentSession.batches.length === 0)) {
      // Create a temporary batch with just placeholders
      return [{
        id: generatingBatchId!,
        prompt: '',
        createdAt: new Date().toISOString(),
        variations: placeholderImages.map(img => ({
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

        // If this is the generating batch, merge placeholder images
        if (batch.id === generatingBatchId && placeholderImages.length > 0) {
          // Merge placeholders with backend variations, avoiding duplicates
          const existingIds = new Set(backendVariations.map(v => v.id));
          const placeholdersToAdd = placeholderImages.filter(p => !existingIds.has(p.id));
          
          // Combine and sort by variation number
          const allVariations = [...backendVariations, ...placeholdersToAdd].sort((a, b) => {
            const aNum = a.variationNumber || 0;
            const bNum = b.variationNumber || 0;
            return aNum - bNum;
          });
          
          return {
            id: batch.id,
            prompt: batch.prompt || '',
            createdAt: batch.createdAt,
            variations: allVariations
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

