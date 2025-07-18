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
// import { generateImages, addDemoImage } from '@/features/images/historyImagesSlice';
import { setSelectedImageId, setIsPromptModalOpen } from '@/features/create/createUISlice';
import { generateImageWithSettings, loadBatchSettings } from '@/features/customization/customizationSlice';

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
  
  const customizationState = useAppSelector(state => state.customization);

  // Load input images on component mount
  useEffect(() => {
    const loadInputImages = async () => {
      const resultAction = await dispatch(fetchInputImages());
      
      // If no image is currently selected and we have images, select the first one (most recent)
      if (fetchInputImages.fulfilled.match(resultAction) && 
          !selectedImageId && 
          resultAction.payload.length > 0) {
        dispatch(setSelectedImageId(resultAction.payload[0].id));
      }
    };

    loadInputImages();
  }, [dispatch, selectedImageId]);

  // Event handlers
  const handleImageUpload = async (file: File) => {
    try {
      const resultAction = await dispatch(uploadInputImage(file));
      if (uploadInputImage.fulfilled.match(resultAction)) {
        dispatch(setSelectedImageId(resultAction.payload.id));
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handlePromptSubmit = async (prompt: string, selectedMasks?: number[]) => {
    if (!selectedImageId) {
      console.error('No image selected');
      return;
    }

    try {
      setIsPromptModalOpen(false);
      
      // // Include selected masks in the generation request
      // const requestData = {
      //   inputImageId: getCurrentInputImageId(),
      //   prompt: prompt,
      //   selectedMasks: selectedMasks || [], // Include selected mask IDs
      //   // ... other generation parameters
      // };

      // // Make your API call with the mask selection
      // await dispatch(generateImageVariation(requestData)).unwrap();
      
    } catch (error) {
      console.error('Failed to generate with prompt:', error);
    }
  };

  const handleSubmit = () => {
    console.log('Submit button clicked');
    dispatch(setIsPromptModalOpen(true));
  };

  const handleSelectImage = async (imageId: string) => {
    dispatch(setSelectedImageId(imageId));
    
    // If selecting a generated image, load its batch settings
    const isGeneratedImage = historyImages.some(img => img.id === imageId);
    if (isGeneratedImage) {
      const selectedImage = historyImages.find(img => img.id === imageId);
      if (selectedImage && selectedImage.batchId) {
        try {
          await dispatch(loadBatchSettings(selectedImage.batchId));
        } catch (error) {
          console.error('Failed to load batch settings:', error);
        }
      }
    }
  };

  const handleTogglePromptModal = (isOpen: boolean) => {
    dispatch(setIsPromptModalOpen(isOpen));
  };
  
  const getCurrentImageUrl = () => {
    if (!selectedImageId) return undefined;
    
    // Check in input images first
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      // Use the processed imageUrl which is already the fallback logic
      return inputImage.imageUrl;
    }
    
    // Check in history images
    const historyImage = historyImages.find(img => img.id === selectedImageId);
    return historyImage?.imageUrl;
  };

  const getCurrentInputImageId = () => {
    if (!selectedImageId) return undefined;
    
    // Check if the selected image is an input image
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      return parseInt(inputImage.id, 10);
    }
    
    return undefined;
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

        <EditInspector 
          imageUrl={getCurrentImageUrl()} 
          inputImageId={getCurrentInputImageId()} // Pass inputImageId for mask generation
          setIsPromptModalOpen={handleTogglePromptModal}
        />
        
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
                onSubmit={handlePromptSubmit} // Now handles selectedMasks parameter
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