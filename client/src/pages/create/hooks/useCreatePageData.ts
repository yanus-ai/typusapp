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
  const basePrompt = useAppSelector(state => state.masks.savedPrompt);

  const filteredHistoryImages = useMemo(() => {
    return historyImages.filter((image) => 
      image.moduleType === 'CREATE' && isValidCreateImageStatus(image.status)
    );
  }, [historyImages]);

  const currentBatchImages = useMemo(() => {
    if (!generatingBatchId) return [];
    const batchImages = filteredHistoryImages.filter(
      img => img.batchId === generatingBatchId
    ) as HistoryImage[];
    
    batchImages.sort((a, b) => (a.variationNumber || 0) - (b.variationNumber || 0));
    
    return batchImages;
  }, [filteredHistoryImages, generatingBatchId]);

  const currentBatchPrompt = useMemo(() => {
    if (currentBatchImages.length > 0 && currentBatchImages[0].aiPrompt) {
      return currentBatchImages[0].aiPrompt;
    }
    return basePrompt || '';
  }, [currentBatchImages, basePrompt]);

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

  const isGeneratingMode = (isGenerating && !!generatingBatchId) || (!!generatingBatchId && currentBatchImages.length > 0);

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

