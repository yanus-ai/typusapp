import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import HistoryPanel from "@/components/create/HistoryPanel";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { setSelectedImage, setGeneratingBatchId } from "@/features/create/createUISlice";

interface CreationPromptHistoryPanelProps {
  currentStep?: number;
}

const CreationPromptHistoryPanel: React.FC<CreationPromptHistoryPanelProps> = ({ currentStep }) => {
  const dispatch = useAppDispatch();
  
  // Redux state
  const historyImages = useAppSelector(state => state.historyImages.images);
  const historyImagesLoading = useAppSelector(state => state.historyImages.loading);
  const selectedImageId = useAppSelector(state => state.createUI.selectedImageId);
  const selectedImageType = useAppSelector(state => state.createUI.selectedImageType);
  const isGenerating = useAppSelector(state => state.createUI.isGenerating);
  const generatingBatchId = useAppSelector(state => state.createUI.generatingBatchId);
  
  // Download progress state
  const [downloadingImageId, setDownloadingImageId] = useState<number | undefined>(undefined);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [imageObjectUrls, setImageObjectUrls] = useState<Record<number, string>>({});

  // Filter history images: exclude old processing images (except current batch)
  const filteredHistoryImages = React.useMemo(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    return historyImages.filter((image) => {
      if (image.moduleType !== 'CREATE') return false;
      if (!(image.status === 'COMPLETED' || image.status === 'PROCESSING' || !image.status)) return false;
      
      // For processing images: exclude old ones unless they're from current batch
      if (image.status === 'PROCESSING') {
        const isCurrentBatch = isGenerating && image.batchId === generatingBatchId;
        if (isCurrentBatch) return true;
        
        const imageDate = image.createdAt instanceof Date ? image.createdAt : new Date(image.createdAt);
        if (imageDate < oneHourAgo) return false;
        
        // Hide placeholder images not from current batch
        if (image.id < 0 && !isCurrentBatch) return false;
      }
      
      return true;
    });
  }, [historyImages, isGenerating, generatingBatchId]);

  // Download image with progress tracking
  const downloadImageWithProgress = useCallback(async (imageUrl: string, imageId: number) => {
    // Check if we already have this image
    if (imageObjectUrls[imageId]) {
      return imageObjectUrls[imageId];
    }

    try {
      setDownloadingImageId(imageId);
      setDownloadProgress(0);

      const response = await axios.get(imageUrl, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            setDownloadProgress(progress);
          }
        }
      });

      // Create object URL from blob
      const objectUrl = URL.createObjectURL(response.data);

      // Store the object URL for future use
      setImageObjectUrls(prev => ({
        ...prev,
        [imageId]: objectUrl
      }));

      return objectUrl;
    } catch (error) {
      console.error('Failed to download image with progress:', error);
      // Fallback to original URL
      return imageUrl;
    } finally {
      setDownloadingImageId(undefined);
      setDownloadProgress(0);
    }
  }, [imageObjectUrls]);

  // Handle image data loading with download progress for generated images
  useEffect(() => {
    if (selectedImageId && selectedImageType === 'generated') {
      const historyImage = filteredHistoryImages.find(img => img.id === selectedImageId);
      const imageUrl = historyImage?.imageUrl || historyImage?.processedImageUrl;

      if (imageUrl) {
        // Check if we already have this image cached
        if (imageObjectUrls[selectedImageId]) {
          // Already cached, no need to download again
          return;
        } else {
          // Download with progress tracking for generated images
          downloadImageWithProgress(imageUrl, selectedImageId);
        }
      }
    }
  }, [selectedImageId, selectedImageType, filteredHistoryImages, imageObjectUrls, downloadImageWithProgress]);

  // Handle image selection
  const handleSelectImage = useCallback((imageId: number, sourceType: 'input' | 'generated' = 'generated', batchId?: number) => {
    dispatch(setSelectedImage({ id: imageId, type: sourceType }));
    
    // Set generating batch ID to enable generating mode view
    if (batchId) {
      dispatch(setGeneratingBatchId(batchId));
    }
    // Settings and prompt will be loaded by page.tsx useEffect when selectedImageId changes
  }, [dispatch]);

  return (
    <HistoryPanel
      currentStep={currentStep}
      images={filteredHistoryImages}
      selectedImageId={selectedImageType === 'generated' ? selectedImageId : undefined}
      onSelectImage={handleSelectImage}
      loading={historyImagesLoading}
      showAllImages={true}
      downloadingImageId={downloadingImageId}
      downloadProgress={downloadProgress}
    />
  );
};

export default CreationPromptHistoryPanel;

