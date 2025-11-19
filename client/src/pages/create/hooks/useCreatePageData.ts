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
    if (!currentSession || !currentSession.batches) return [];

    console.log(currentSession.batches)
    
    return currentSession.batches
      .map(batch => ({
        id: batch.id,
        prompt: batch.prompt || '',
        createdAt: batch.createdAt,
        variations: (batch.variations || []).map((img: any) => ({
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
        } as HistoryImage))
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [currentSession]);

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

