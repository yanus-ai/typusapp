import React, { useEffect, useState } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useRunPodWebSocket } from '@/hooks/useRunPodWebSocket';
import { useCreditCheck } from '@/hooks/useCreditCheck';
import MainLayout from "@/components/layout/MainLayout";
import EditInspector from '@/components/create/EditInspector';
import ImageCanvas from '@/components/create/ImageCanvas';
import HistoryPanel from '@/components/create/HistoryPanel';
// import ContextToolbar from '@/components/create/ContextToolbar';
import InputHistoryPanel from '@/components/create/InputHistoryPanel';
import AIPromptInput from '@/components/create/AIPromptInput';

// Redux actions
import { uploadInputImage, fetchInputImagesBySource } from '@/features/images/inputImagesSlice';
import { generateWithRunPod, fetchAllVariations, addProcessingVariations } from '@/features/images/historyImagesSlice';
import { setSelectedImageId, setIsPromptModalOpen } from '@/features/create/createUISlice';
import { loadBatchSettings, fetchCustomizationOptions, resetSettings } from '@/features/customization/customizationSlice';
import { getMasks, resetMaskState, getAIPromptMaterials, restoreMaskMaterialMappings, restoreAIMaterials, restoreSavedPrompt, savePrompt, clearMaskMaterialSelections, clearSavedPrompt, clearAIMaterials } from '@/features/masks/maskSlice';
import { fetchCurrentUser } from '@/features/auth/authSlice';
import { useRef } from 'react';

const ArchitecturalVisualization: React.FC = () => {
  const dispatch = useAppDispatch();
  const { checkCreditsBeforeAction } = useCreditCheck();

  const [editInspectorMinimized, setEditInspectorMinimized] = useState(false);
  const lastAutoSelectedId = useRef<number | null>(null);
  const restoredImageIds = useRef<Set<number>>(new Set()); // Track restored images to prevent infinite loops
  
  // Redux selectors
  const inputImages = useAppSelector(state => state.inputImages.images);
  const inputImagesLoading = useAppSelector(state => state.inputImages.loading);
  const inputImagesError = useAppSelector(state => state.inputImages.error);
  
  const historyImages = useAppSelector(state => state.historyImages.images);
  const historyImagesLoading = useAppSelector(state => state.historyImages.loading);
  
  const selectedImageId = useAppSelector(state => state.createUI.selectedImageId);
  const isPromptModalOpen = useAppSelector(state => state.createUI.isPromptModalOpen);

  const basePrompt = useAppSelector(state => state.masks.savedPrompt);
  const masks = useAppSelector(state => state.masks.masks);
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

  // Helper function to get input image ID for WebSocket subscription and generation
  const getEffectiveInputImageId = () => {
    // First try to get current input image ID
    const inputImageId = getCurrentInputImageId();
    if (inputImageId) {
      console.log('🔍 getEffectiveInputImageId: Using direct input image:', inputImageId);
      return inputImageId;
    }
    
    // If no input image selected, check if we have a history image with batch settings
    if (selectedImageId && batchInputImageId) {
      const selectedHistoryImage = historyImages.find(img => img.id === selectedImageId);
      if (selectedHistoryImage && selectedHistoryImage.batchId) {
        console.log('🔍 getEffectiveInputImageId: Using batch input image from history:', batchInputImageId);
        return batchInputImageId;
      }
    }
    
    console.log('🔍 getEffectiveInputImageId: No effective input image found');
    return undefined;
  };

  // WebSocket integration for RunPod individual variation updates
  const effectiveInputImageId = getEffectiveInputImageId();
  const { isConnected } = useRunPodWebSocket({
    inputImageId: effectiveInputImageId,
    enabled: !!effectiveInputImageId
  });

  console.log('CREATE RunPod WebSocket connected:', isConnected);
  console.log('CREATE Mask WebSocket connected for inputImage:', effectiveInputImageId);

  // Auto-select most recent generated image when available (fallback for non-WebSocket updates)
  useEffect(() => {
    // Only run this fallback auto-selection if no image is currently selected
    if (!selectedImageId && historyImages.length > 0) {
      const recentCompleted = historyImages
        .filter(img => img.status === 'COMPLETED')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      
      if (recentCompleted) {
        const isVeryRecent = Date.now() - recentCompleted.createdAt.getTime() < 60000; // 60 seconds
        
        if (isVeryRecent) {
          console.log('Fallback auto-selecting recent image (no current selection):', recentCompleted.id);
          dispatch(setSelectedImageId(recentCompleted.id));
          lastAutoSelectedId.current = recentCompleted.id;
        }
      }
    }
  }, [historyImages, selectedImageId, dispatch]);

  // Load input images and RunPod history on component mount
  useEffect(() => {
    const loadInputImages = async () => {
      // Load only CREATE_MODULE images for the create page
      const resultAction = await dispatch(fetchInputImagesBySource({ uploadSource: 'CREATE_MODULE' }));
      
      // If no image is currently selected and we have images, select the first one (most recent)
      if (fetchInputImagesBySource.fulfilled.match(resultAction) && 
          !selectedImageId && 
          resultAction.payload.inputImages.length > 0) {
        dispatch(setSelectedImageId(resultAction.payload.inputImages[0].id));
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
    const isInputImage = inputImages.some(img => img.id === selectedImageId);
    const isGeneratedImage = historyImages.some(img => img.id === selectedImageId);
    
    console.log('🔄 Masks loading effect triggered:', {
      selectedImageId,
      originalInputImageId,
      isInputImage,
      isGeneratedImage
    });
    
    if (originalInputImageId) {
      console.log('📦 Loading masks for input image:', originalInputImageId);
      dispatch(getMasks(originalInputImageId));
      
      // Only load AI prompt materials for input images, not generated images
      if (isInputImage) {
        console.log('🎨 Loading AI materials for input image:', originalInputImageId);
        dispatch(getAIPromptMaterials(originalInputImageId));
      } else {
        console.log('🎨 Skipping AI materials loading for generated image (will use restored data)');
      }
    } else {
      console.log('🧹 Resetting mask state (no input image)');
      dispatch(resetMaskState());
    }
  }, [dispatch, selectedImageId, batchInputImageId, inputImages, historyImages]);

  // Restore mask material mappings, AI prompt, and AI materials for generated images
  useEffect(() => {
    if (selectedImageId && historyImages.length > 0) {
      const selectedImage = historyImages.find(img => img.id === selectedImageId);
      if (selectedImage && !restoredImageIds.current.has(selectedImageId)) {
        console.log('🔄 Restoration effect triggered for new image:', {
          imageId: selectedImageId,
          hasMaskMappings: !!selectedImage.maskMaterialMappings,
          hasAiPrompt: !!selectedImage.aiPrompt,
          hasAiMaterials: !!selectedImage.aiMaterials && selectedImage.aiMaterials.length > 0,
          maskMappingsKeys: selectedImage.maskMaterialMappings ? Object.keys(selectedImage.maskMaterialMappings) : []
        });

        // Mark this image as restored to prevent infinite loops
        restoredImageIds.current.add(selectedImageId);

        // Restore AI prompt immediately (doesn't depend on masks)
        if (selectedImage.aiPrompt) {
          dispatch(restoreSavedPrompt(selectedImage.aiPrompt));
        }

        // Restore AI materials immediately (doesn't depend on masks)
        if (selectedImage.aiMaterials && selectedImage.aiMaterials.length > 0) {
          dispatch(restoreAIMaterials(selectedImage.aiMaterials));
        }
      }
    }
  }, [dispatch, selectedImageId, historyImages]);

  // Separate effect for mask material mappings restoration (only when masks are loaded)
  // This effect now only handles auto-restoration for images that weren't manually selected
  useEffect(() => {
    if (selectedImageId && historyImages.length > 0 && masks.length > 0) {
      const selectedImage = historyImages.find(img => img.id === selectedImageId);
      // Only restore if this image wasn't restored already (to avoid conflicts with handleSelectImage)
      if (selectedImage && selectedImage.maskMaterialMappings && !restoredImageIds.current.has(selectedImageId)) {
        const mappingsCount = Object.keys(selectedImage.maskMaterialMappings).length;
        if (mappingsCount > 0) {
          console.log('🎭 Auto-restoring mask material mappings (useEffect):', {
            masksCount: masks.length,
            mappingsCount,
            maskIds: masks.map(m => m.id),
            mappingKeys: Object.keys(selectedImage.maskMaterialMappings)
          });
          dispatch(restoreMaskMaterialMappings(selectedImage.maskMaterialMappings));
        }
      }
    }
  }, [dispatch, selectedImageId, masks.length]); // Use masks.length instead of masks to avoid infinite loop

  // Clear restored images when selectedImageId changes to allow re-restoration
  useEffect(() => {
    // Only clear if we're switching to an input image or no image
    if (!selectedImageId || inputImages.some(img => img.id === selectedImageId)) {
      restoredImageIds.current.clear();
    }
  }, [selectedImageId, inputImages]);

  // Event handlers
  const handleImageUpload = async (file: File) => {
    try {
      const resultAction = await dispatch(uploadInputImage({ file, uploadSource: 'CREATE_MODULE' }));
      if (uploadInputImage.fulfilled.match(resultAction)) {
        dispatch(setSelectedImageId(resultAction.payload.id));
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleSubmit = async (userPrompt?: string, contextSelection?: string) => {
    console.log('Submit button clicked - Starting RunPod generation');
    console.log('🔍 Current state:', { 
      selectedImageId, 
      batchInputImageId,
      isInputImage: !!inputImages.find(img => img.id === selectedImageId),
      isHistoryImage: !!historyImages.find(img => img.id === selectedImageId),
      userPrompt,
      contextSelection
    });
    
    // Use the provided user prompt or fall back to the Redux state prompt
    const finalPrompt = userPrompt || basePrompt;
    
    // Check credits before proceeding
    if (!checkCreditsBeforeAction(selectedVariations)) {
      return; // Credit check handles the error display
    }

    // Get the effective input image ID for generation
    const inputImageIdForGeneration = getEffectiveInputImageId();
    
    if (!inputImageIdForGeneration) {
      console.error('❌ No input image available for generation. Please select an input image or a generated image.');
      return;
    }
    
    console.log('✅ Using input image for generation:', inputImageIdForGeneration);
    console.log('📝 Using prompt for generation:', finalPrompt);

    // Save the current prompt for this input image (important for manual user input)
    if (finalPrompt && finalPrompt.trim()) {
      try {
        console.log('💾 Saving current prompt for input image:', inputImageIdForGeneration);
        await dispatch(savePrompt({ 
          inputImageId: inputImageIdForGeneration, 
          prompt: finalPrompt 
        }));
      } catch (error) {
        console.error('Failed to save prompt, but continuing with generation:', error);
      }
    }

    // Data for RunPod generation (as requested)
    const mockGenerationRequest = {
      prompt: finalPrompt,
      inputImageId: inputImageIdForGeneration,
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
        context: contextSelection || selections.context,
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
        
        // Refresh user credits to reflect the deduction
        console.log('💳 Refreshing credits after generation');
        dispatch(fetchCurrentUser());
        
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
    console.log('🖼️ handleSelectImage called:', { imageId, isGeneratedImage: historyImages.some(img => img.id === imageId) });
    
    dispatch(setSelectedImageId(imageId));
    
    // Update last auto-selected to prevent conflicts with auto-selection
    lastAutoSelectedId.current = imageId;
    
    // Check if selecting a generated image or input image
    const isGeneratedImage = historyImages.some(img => img.id === imageId);
    const isInputImage = inputImages.some(img => img.id === imageId);
    
    if (isGeneratedImage) {
      // If selecting a generated image, load its batch settings first
      const selectedImage = historyImages.find(img => img.id === imageId);
      if (selectedImage) {
        console.log('🔄 Selecting generated image, restoring data:', {
          imageId,
          hasBatchId: !!selectedImage.batchId,
          hasMaskMappings: !!selectedImage.maskMaterialMappings,
          hasAiPrompt: !!selectedImage.aiPrompt,
          hasAiMaterials: !!selectedImage.aiMaterials && selectedImage.aiMaterials.length > 0,
          maskMappingsKeys: selectedImage.maskMaterialMappings ? Object.keys(selectedImage.maskMaterialMappings) : [],
          aiMaterialsCount: selectedImage.aiMaterials?.length || 0
        });

        // Load batch settings first if available (this sets Edit Inspector selections)
        if (selectedImage.batchId) {
          try {
            console.log('📦 Loading batch settings for batchId:', selectedImage.batchId);
            const batchResult = await dispatch(loadBatchSettings(selectedImage.batchId));
            console.log('📦 Batch settings loaded:', batchResult);
            
            // After batch settings are loaded, restore mask material mappings
            if (selectedImage.maskMaterialMappings && Object.keys(selectedImage.maskMaterialMappings).length > 0) {
              console.log('🎭 Restoring mask material mappings after batch load:', selectedImage.maskMaterialMappings);
              // Use setTimeout to ensure batch settings effects have completed
              setTimeout(() => {
                dispatch(restoreMaskMaterialMappings(selectedImage.maskMaterialMappings!));
              }, 100);
            }
          } catch (error) {
            console.error('Failed to load batch settings:', error);
          }
        } else {
          // If no batch settings, restore mask material mappings directly
          if (selectedImage.maskMaterialMappings && Object.keys(selectedImage.maskMaterialMappings).length > 0) {
            console.log('🎭 Restoring mask material mappings (no batch):', selectedImage.maskMaterialMappings);
            setTimeout(() => {
              dispatch(restoreMaskMaterialMappings(selectedImage.maskMaterialMappings!));
            }, 100);
          }
        }

        // Then restore data directly from the image (this ensures AI prompt and materials take precedence)
        if (selectedImage.aiPrompt) {
          console.log('🤖 Restoring AI prompt:', selectedImage.aiPrompt.substring(0, 100) + '...');
          dispatch(restoreSavedPrompt(selectedImage.aiPrompt));
        }

        if (selectedImage.aiMaterials && selectedImage.aiMaterials.length > 0) {
          console.log('🎨 Restoring AI materials:', selectedImage.aiMaterials.length, 'items');
          dispatch(restoreAIMaterials(selectedImage.aiMaterials));
        }

        // Mark this image as restored to prevent the useEffect from running again
        restoredImageIds.current.add(imageId);

        // Mask material mappings are restored above after batch settings load
      }
    } else if (isInputImage) {
      // If selecting an input image, clear any batch settings and restored data
      console.log('🧹 Clearing data for input image selection');
      dispatch(resetSettings());
      dispatch(clearMaskMaterialSelections()); // Clear mask material selections
      dispatch(clearSavedPrompt()); // Clear restored AI prompt
      dispatch(clearAIMaterials()); // Clear restored AI materials
      console.log('🧹 Cleared restored data for input image selection');
    }
  };

  const handleTogglePromptModal = (isOpen: boolean) => {
    dispatch(setIsPromptModalOpen(isOpen));
  };

  const handleDownload = () => {
    console.log('Download image:', selectedImageId);
    // Additional download logic can be added here if needed
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
    if (!selectedImageId) {
      console.log('🔍 getCurrentImageUrl: No selectedImageId');
      return undefined;
    }
    
    // Check in input images first
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      // For input images, prioritize original URL over processed URL for canvas display
      const displayUrl = inputImage.originalUrl || inputImage.processedUrl || inputImage.imageUrl;
      console.log('🔍 getCurrentImageUrl: Found input image:', displayUrl);
      return displayUrl;
    }
    
    // Check in history images (generated images)
    const historyImage = historyImages.find(img => img.id === selectedImageId);
    if (historyImage) {
      // For generated images, imageUrl should already be the original high-resolution image from the API
      console.log('🔍 getCurrentImageUrl: Found history image:', historyImage.imageUrl);
      return historyImage.imageUrl;
    }
    
    console.log('🔍 getCurrentImageUrl: No image found for selectedImageId:', selectedImageId);
    return undefined;
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
              editInspectorMinimized={editInspectorMinimized}
              onDownload={handleDownload}
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