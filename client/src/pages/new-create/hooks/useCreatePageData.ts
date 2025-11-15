import { useMemo } from "react";
import { useAppSelector } from "@/hooks/useAppSelector";
import { HistoryImage } from "../components/GenerationGrid";

export const useCreatePageData = () => {
  const historyImages = useAppSelector(state => state.historyImages.images);
  const selectedImageId = useAppSelector(state => state.createUI.selectedImageId);
  const selectedImageType = useAppSelector(state => state.createUI.selectedImageType);
  const isGenerating = useAppSelector(state => state.createUI.isGenerating);
  const generatingBatchId = useAppSelector(state => state.createUI.generatingBatchId);
  const basePrompt = useAppSelector(state => state.masks.savedPrompt);

  // Filter history images for CREATE module
  const filteredHistoryImages = useMemo(() => {
    return historyImages.filter((image) => 
      image.moduleType === 'CREATE' && (
        image.status === 'COMPLETED' || 
        image.status === 'PROCESSING' || 
        !image.status
      )
    );
  }, [historyImages]);

  // Get current generating batch images
  const currentBatchImages = useMemo(() => {
    if (!generatingBatchId) return [];
    const batchImages = filteredHistoryImages.filter(img => img.batchId === generatingBatchId) as HistoryImage[];
    
    // Sort by variationNumber to ensure correct order
    batchImages.sort((a, b) => (a.variationNumber || 0) - (b.variationNumber || 0));
    
    return batchImages;
  }, [filteredHistoryImages, generatingBatchId]);

  // Get current batch prompt (from first image or basePrompt)
  const currentBatchPrompt = useMemo(() => {
    if (currentBatchImages.length > 0 && currentBatchImages[0].aiPrompt) {
      return currentBatchImages[0].aiPrompt;
    }
    return basePrompt || '';
  }, [currentBatchImages, basePrompt]);

  // Get current functional input image ID for WebSocket filtering
  const currentInputImageId = useMemo(() => {
    if (!selectedImageId || !selectedImageType) return undefined;
    if (selectedImageType === 'input') {
      return selectedImageId;
    } else if (selectedImageType === 'generated') {
      const generatedImage = historyImages.find(img => img.id === selectedImageId);
      return generatedImage?.originalInputImageId;
    }
    return undefined;
  }, [selectedImageId, selectedImageType, historyImages]);

  // Determine layout mode: generating vs normal
  const isGeneratingMode = isGenerating && generatingBatchId;

  return {
    filteredHistoryImages,
    currentBatchImages,
    currentBatchPrompt,
    currentInputImageId,
    isGeneratingMode,
    selectedImageId,
    selectedImageType,
  };
};

