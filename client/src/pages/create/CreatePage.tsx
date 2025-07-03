import React, { useEffect } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import MainLayout from "@/components/layout/MainLayout";
import EditInspector from '@/components/create/EditInspector';
import ImageCanvas from '@/components/create/ImageCanvas';
import HistoryPanel from '@/components/create/HistoryPanel';
import ContextToolbar from '@/components/create/ContextToolbar';
import InputHistoryPanel from '@/components/create/InputHistoryPanel';
import AIPromptInput from '@/components/create/AIPromptInput';

// Redux actions
import { fetchInputImages, uploadInputImage } from '@/features/images/inputImagesSlice';
import { generateImages, addDemoImage } from '@/features/images/historyImagesSlice';
import { setSelectedImageId, setIsPromptModalOpen } from '@/features/create/createUISlice';

const ArchitecturalVisualization: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Redux selectors
  const inputImages = useAppSelector(state => state.inputImages.images);
  const inputImagesLoading = useAppSelector(state => state.inputImages.loading);
  const inputImagesError = useAppSelector(state => state.inputImages.error);
  
  const historyImages = useAppSelector(state => state.historyImages.images);
  const historyImagesLoading = useAppSelector(state => state.historyImages.loading);
  
  const selectedImageId = useAppSelector(state => state.createUI.selectedImageId);
  const isPromptModalOpen = useAppSelector(state => state.createUI.isPromptModalOpen);

  // Load input images on component mount
  useEffect(() => {
    dispatch(fetchInputImages());
  }, [dispatch]);

  // Auto-select the first image when images are loaded
  useEffect(() => {
    if (!selectedImageId && inputImages.length > 0 && !inputImagesLoading) {
      dispatch(setSelectedImageId(inputImages[0].id));
    }
  }, [inputImages, selectedImageId, inputImagesLoading, dispatch]);

  // Event handlers
  const handleImageUpload = async (file: File) => {
    const resultAction = await dispatch(uploadInputImage(file));
    if (uploadInputImage.fulfilled.match(resultAction)) {
      dispatch(setSelectedImageId(resultAction.payload.id));
    }
  };

  const handlePromptSubmit = (prompt: string) => {
    console.log('Prompt submitted:', prompt);
    
    // For now, use demo image - replace with actual generation later
    dispatch(addDemoImage(prompt));
    
    // Close prompt modal
    dispatch(setIsPromptModalOpen(false));
    
    // TODO: Replace with actual image generation
    // dispatch(generateImages(prompt));
  };

  const handleSubmit = () => {
    console.log('Submit button clicked');
    // TODO: Implement actual submission logic
  };

  const handleSelectImage = (imageId: string) => {
    dispatch(setSelectedImageId(imageId));
  };

  const handleTogglePromptModal = (isOpen: boolean) => {
    dispatch(setIsPromptModalOpen(isOpen));
  };
  
  const getCurrentImageUrl = () => {
    if (!selectedImageId) return undefined;
    
    // Check in history images first
    const historyImage = historyImages.find(img => img.id === selectedImageId);
    if (historyImage) return historyImage.imageUrl;
    
    // Check in input images
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    return inputImage?.imageUrl;
  };
  
  return (
    <MainLayout>
      <div className="flex-1 flex overflow-hidden gap-2">
        <InputHistoryPanel
          images={inputImages}
          selectedImageId={selectedImageId}
          onSelectImage={handleSelectImage}
          onUploadImage={handleImageUpload}
          loading={inputImagesLoading}
          error={inputImagesError}
        />

        <EditInspector imageUrl={getCurrentImageUrl()} />
        
        <div className="flex-1 flex flex-col relative">
          <div className="flex-1 relative">
            <ImageCanvas 
              imageUrl={getCurrentImageUrl()} 
              loading={historyImagesLoading}
            />
            
            <ContextToolbar 
              setIsPromptModalOpen={handleTogglePromptModal} 
              onSubmit={handleSubmit}
              loading={historyImagesLoading}
            />

            {isPromptModalOpen && (
              <AIPromptInput 
                setIsPromptModalOpen={handleTogglePromptModal}
                onSubmit={handlePromptSubmit}
                loading={historyImagesLoading}
              />
            )}
          </div>

          <HistoryPanel 
            images={historyImages}
            selectedImageId={selectedImageId}
            onSelectImage={handleSelectImage}
            loading={historyImagesLoading}
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default ArchitecturalVisualization;