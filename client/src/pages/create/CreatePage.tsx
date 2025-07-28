import React, { useEffect, useState } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useRunPodWebSocket } from '@/hooks/useRunPodWebSocket';
import MainLayout from "@/components/layout/MainLayout";
import EditInspector from '@/components/create/EditInspector';
import ImageCanvas from '@/components/create/ImageCanvas';
import HistoryPanel from '@/components/create/HistoryPanel';
// import ContextToolbar from '@/components/create/ContextToolbar';
import InputHistoryPanel from '@/components/create/InputHistoryPanel';
import AIPromptInput from '@/components/create/AIPromptInput';

// Redux actions
import { fetchInputImages, uploadInputImage } from '@/features/images/inputImagesSlice';
import { generateWithRunPod, fetchAllVariations, addProcessingVariations } from '@/features/images/historyImagesSlice';
import { setSelectedImageId, setIsPromptModalOpen } from '@/features/create/createUISlice';
import { loadBatchSettings, fetchCustomizationOptions, resetSettings } from '@/features/customization/customizationSlice';
import { getMasks,resetMaskState, getAIPromptMaterials } from '@/features/masks/maskSlice';

const ArchitecturalVisualization: React.FC = () => {
  const dispatch = useAppDispatch();

  const [editInspectorMinimized, setEditInspectorMinimized] = useState(false);
  
  // Redux selectors
  const inputImages = useAppSelector(state => state.inputImages.images);
  const inputImagesLoading = useAppSelector(state => state.inputImages.loading);
  const inputImagesError = useAppSelector(state => state.inputImages.error);
  
  const historyImages = useAppSelector(state => state.historyImages.images);
  const historyImagesLoading = useAppSelector(state => state.historyImages.loading);
  
  const selectedImageId = useAppSelector(state => state.createUI.selectedImageId);
  const isPromptModalOpen = useAppSelector(state => state.createUI.isPromptModalOpen);

  const basePrompt = useAppSelector(state => state.masks.savedPrompt);
  const { selectedStyle, variations: selectedVariations, creativity, expressivity, resemblance, selections, availableOptions, inputImageId: batchInputImageId } = useAppSelector(state => state.customization);

  // Helper function to get current input image ID  
  const getCurrentInputImageId = () => {
    if (!selectedImageId) return undefined;
    
    // Check if the selected image is an input image
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      return inputImage.id;
    }
    
    return undefined;
  };

  // Helper function to get the original input image ID for both input and generated images
  const getOriginalInputImageId = () => {
    if (!selectedImageId) return undefined;
    
    // Check if the selected image is an input image
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      return inputImage.id;
    }
    
    // For generated images, use the inputImageId from batch settings
    return batchInputImageId;
  };

  // WebSocket integration for RunPod individual variation updates
  const currentInputImageId = getCurrentInputImageId();
  const { isConnected } = useRunPodWebSocket({
    inputImageId: currentInputImageId,
    enabled: !!currentInputImageId
  });

  console.log('RunPod WebSocket connected:', isConnected);

  // Auto-select most recent generated image when available
  useEffect(() => {
    if (historyImages.length > 0) {
      // Find the most recently completed image
      const recentCompleted = historyImages
        .filter(img => img.status === 'COMPLETED')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      
      // Auto-select if it's very recent (within 10 seconds) and no current selection
      if (recentCompleted && 
          !selectedImageId && 
          Date.now() - recentCompleted.createdAt.getTime() < 10000) {
        dispatch(setSelectedImageId(recentCompleted.id));
      }
    }
  }, [historyImages, selectedImageId, dispatch]);

  // Load input images and RunPod history on component mount
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

    const loadAllVariations = async () => {
      try {
        await dispatch(fetchAllVariations({ page: 1, limit: 50 }));
        console.log('All variations loaded');
      } catch (error) {
        console.error('Failed to load variations:', error);
      }
    };

    loadInputImages();
    loadAllVariations();
  }, [dispatch]);

  // Load customization options on mount
  useEffect(() => {
    if (!availableOptions) {
      dispatch(fetchCustomizationOptions());
    }
  }, [dispatch, availableOptions]);

  // Load masks and AI prompt materials when selected image changes
  useEffect(() => {
    const originalInputImageId = getOriginalInputImageId();
    if (originalInputImageId) {
      dispatch(getMasks(originalInputImageId));
      dispatch(getAIPromptMaterials(originalInputImageId));
    } else {
      dispatch(resetMaskState());
    }
  }, [dispatch, selectedImageId, batchInputImageId]);

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

  const handleSubmit = async () => {
    console.log('Submit button clicked - Starting RunPod generation');
    
    // Get the current input image ID
    const currentInputImageId = getCurrentInputImageId();
    if (!currentInputImageId) {
      console.error('No input image selected');
      return;
    }

    // Data for RunPod generation (as requested)
    const mockGenerationRequest = {
      prompt: basePrompt,
      inputImageId: currentInputImageId,
      variations: selectedVariations,
      settings: {
        // RunPod specific settings
        seed: Math.floor(1000000000 + Math.random() * 9000000000).toString(), // random 10 digit number
        model: "realvisxlLightning.safetensors",
        upscale: "Yes" as const,
        style: "No" as const,
        cfgKsampler1: creativity,
        cannyStrength: resemblance / 10,
        loraStrength: [1, expressivity / 10],
        // CreateSettings data
        mode: selectedStyle,
        creativity: creativity,
        expressivity: expressivity,
        resemblance: resemblance,
        buildingType: selections.type,
        category: selections.walls?.category,
        context: selections.context,
        styleSelection: selections.style,
        regions: selections
      }
    };

    try {
      console.log('Dispatching RunPod generation with:', mockGenerationRequest);
      const result = await dispatch(generateWithRunPod(mockGenerationRequest));
      
      if (generateWithRunPod.fulfilled.match(result)) {
        console.log('RunPod generation started successfully:', result.payload);
        
        // Add processing variations immediately for loading states
        if (result.payload.runpodJobs) {
          const imageIds = result.payload.runpodJobs.map((job: any) => parseInt(job.imageId) || job.imageId);
          dispatch(addProcessingVariations({
            batchId: result.payload.batchId || result.payload.batchId,
            totalVariations: selectedVariations,
            imageIds
          }));
        }
        
        // Close the prompt modal
        dispatch(setIsPromptModalOpen(false));
      } else {
        console.error('RunPod generation failed:', result.payload);
      }
    } catch (error) {
      console.error('Error starting RunPod generation:', error);
    }
  };

  const handleSelectImage = async (imageId: number) => {
    dispatch(setSelectedImageId(imageId));
    
    // Check if selecting a generated image or input image
    const isGeneratedImage = historyImages.some(img => img.id === imageId);
    const isInputImage = inputImages.some(img => img.id === imageId);
    
    if (isGeneratedImage) {
      // If selecting a generated image, load its batch settings
      const selectedImage = historyImages.find(img => img.id === imageId);
      if (selectedImage && selectedImage.batchId) {
        try {
          await dispatch(loadBatchSettings(selectedImage.batchId));
        } catch (error) {
          console.error('Failed to load batch settings:', error);
        }
      }
    } else if (isInputImage) {
      // If selecting an input image, clear any batch settings
      dispatch(resetSettings());
    }
  };

  const handleTogglePromptModal = (isOpen: boolean) => {
    dispatch(setIsPromptModalOpen(isOpen));
  };

  // const handleConvertToInputImage = async (image: any) => {
  //   try {
  //     const resultAction = await dispatch(convertGeneratedToInputImage({
  //       imageId: image.id.toString(),
  //       imageUrl: image.imageUrl,
  //       thumbnailUrl: image.thumbnailUrl
  //     }));
      
  //     if (convertGeneratedToInputImage.fulfilled.match(resultAction)) {
  //       // Auto-select the newly converted image
  //       dispatch(setSelectedImageId(resultAction.payload.id));
  //       console.log('Successfully converted generated image to input image');
  //     }
  //   } catch (error) {
  //     console.error('Failed to convert generated image:', error);
  //   }
  // };
  
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

  return (
    <MainLayout>
      <div className="flex-1 flex overflow-hidden relative">
        <div className={`transition-all flex gap-3 z-100 pl-2 h-full ${editInspectorMinimized ? 'absolute top-0 left-0' : 'relative'}`}>
          <div>
            <InputHistoryPanel
              images={inputImages}
              selectedImageId={selectedImageId}
              onSelectImage={handleSelectImage}
              onUploadImage={handleImageUpload}
              loading={inputImagesLoading}
              error={inputImagesError}
            />
          </div>
        
          <EditInspector 
            imageUrl={getCurrentImageUrl()} 
            inputImageId={getOriginalInputImageId()} // Pass original input image ID for mask generation
            setIsPromptModalOpen={handleTogglePromptModal}
            editInspectorMinimized={editInspectorMinimized}
            setEditInspectorMinimized={setEditInspectorMinimized}
          />
        </div>

        <div className={`flex-1 flex flex-col relative transition-all`}>
          <div className="flex-1 relative">
            <ImageCanvas 
              imageUrl={getCurrentImageUrl()} 
              loading={historyImagesLoading}
              setIsPromptModalOpen={handleTogglePromptModal}
            />

            {isPromptModalOpen && (
              <AIPromptInput 
                editInspectorMinimized={editInspectorMinimized}
                handleSubmit={handleSubmit}
                setIsPromptModalOpen={handleTogglePromptModal}
                loading={historyImagesLoading}
                inputImageId={getOriginalInputImageId()}
              />
            )}
          </div>

          <HistoryPanel 
            images={historyImages}
            selectedImageId={selectedImageId}
            onSelectImage={handleSelectImage}
            // onConvertToInputImage={handleConvertToInputImage}
            loading={historyImagesLoading}
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default ArchitecturalVisualization;