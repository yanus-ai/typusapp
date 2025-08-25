import React, { useEffect, useState } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useRunPodWebSocket } from '@/hooks/useRunPodWebSocket';
import { useCreditCheck } from '@/hooks/useCreditCheck';
import { useSearchParams } from 'react-router-dom';
import MainLayout from "@/components/layout/MainLayout";
import EditInspector from '@/components/create/EditInspector';
import ImageCanvas from '@/components/create/ImageCanvas';
import HistoryPanel from '@/components/create/HistoryPanel';
// import ContextToolbar from '@/components/create/ContextToolbar';
import InputHistoryPanel from '@/components/create/InputHistoryPanel';
import AIPromptInput from '@/components/create/AIPromptInput';
import FileUpload from '@/components/create/FileUpload';
import GalleryModal from '@/components/gallery/GalleryModal';

// Redux actions
import { uploadInputImage, fetchInputImagesBySource, createInputImageFromGenerated } from '@/features/images/inputImagesSlice';
import { generateWithRunPod, addProcessingVariations, fetchAllCreateImages } from '@/features/images/historyImagesSlice';
import { setSelectedImage, setIsPromptModalOpen } from '@/features/create/createUISlice';
import { fetchCustomizationOptions, resetSettings, loadBatchSettings, loadSettingsFromImage } from '@/features/customization/customizationSlice';
import { getMasks, resetMaskState, getAIPromptMaterials, restoreMaskMaterialMappings, restoreAIMaterials, restoreSavedPrompt, clearMaskMaterialSelections, clearSavedPrompt, clearAIMaterials, saveAllConfigurationsToDatabase, getSavedPrompt } from '@/features/masks/maskSlice';
import { fetchCurrentUser } from '@/features/auth/authSlice';
import { setIsModalOpen } from '@/features/gallery/gallerySlice';
import { useRef } from 'react';

const ArchitecturalVisualization: React.FC = () => {
  const dispatch = useAppDispatch();
  const { checkCreditsBeforeAction } = useCreditCheck();
  const [searchParams] = useSearchParams();

  const [editInspectorMinimized, setEditInspectorMinimized] = useState(false);
  const lastAutoSelectedId = useRef<number | null>(null);
  const restoredImageIds = useRef<Set<number>>(new Set()); // Track restored images to prevent infinite loops
  const urlParamsProcessed = useRef<boolean>(false); // Track if URL params have been processed
  
  // Redux selectors
  const inputImages = useAppSelector(state => state.inputImages.images);
  const inputImagesLoading = useAppSelector(state => state.inputImages.loading);
  const inputImagesError = useAppSelector(state => state.inputImages.error);
  
  const historyImages = useAppSelector(state => state.historyImages.allCreateImages); // Use filtered CREATE images
  const historyImagesLoading = useAppSelector(state => state.historyImages.loadingAllCreateImages);
  
  const selectedImageId = useAppSelector(state => state.createUI.selectedImageId);
  const selectedImageType = useAppSelector(state => state.createUI.selectedImageType);
  const baseInputImageId = useAppSelector(state => state.createUI.baseInputImageId);
  const isPromptModalOpen = useAppSelector(state => state.createUI.isPromptModalOpen);

  const basePrompt = useAppSelector(state => state.masks.savedPrompt);
  const masks = useAppSelector(state => state.masks.masks);
  const { selectedStyle, variations: selectedVariations, creativity, expressivity, resemblance, selections, availableOptions, inputImageId: batchInputImageId } = useAppSelector(state => state.customization);
  
  // Gallery modal state
  const isGalleryModalOpen = useAppSelector(state => state.gallery.isModalOpen);

  // Helper function to get the original input image ID for both input and generated images
  const getOriginalInputImageId = () => {
    if (!selectedImageId || !selectedImageType) return undefined;
    
    // Use selectedImageType to determine how to get the input image ID
    if (selectedImageType === 'input') {
      return selectedImageId; // For input images, the selected ID is the input image ID
    } else if (selectedImageType === 'generated') {
      // For generated images, only return input image ID if batch settings have been loaded
      // This prevents loading masks when just viewing a generated image
      return batchInputImageId || undefined;
    }
    
    return undefined;
  };

  // Helper function to get input image ID for WebSocket subscription and generation
  const getEffectiveInputImageId = () => {
    if (!selectedImageId || !selectedImageType) {
      console.log('🔍 getEffectiveInputImageId: No selected image');
      return undefined;
    }
    
    if (selectedImageType === 'input') {
      console.log('🔍 getEffectiveInputImageId: Using direct input image:', selectedImageId);
      return selectedImageId;
    } else if (selectedImageType === 'generated' && batchInputImageId) {
      console.log('🔍 getEffectiveInputImageId: Using batch input image from generated:', batchInputImageId);
      return batchInputImageId;
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

  // Auto-select most recent generated image when available (enhanced for WebSocket updates and page reload)
  useEffect(() => {
    if (historyImages.length > 0) {
      const recentCompleted = historyImages
        .filter(img => img.status === 'COMPLETED')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      
      if (recentCompleted) {
        const isVeryRecent = Date.now() - recentCompleted.createdAt.getTime() < 60000; // 60 seconds
        const wasNotPreviouslySelected = lastAutoSelectedId.current !== recentCompleted.id;
        
        // On page reload (no current selection), prioritize recent generated images over input images
        const isPageReload = !selectedImageId;
        
        // Auto-select if:
        // 1. No image is currently selected (page reload), OR
        // 2. The recent image is very new and wasn't previously auto-selected (from WebSocket)
        if (isPageReload || (isVeryRecent && wasNotPreviouslySelected)) {
          const reason = isPageReload ? 'page reload - prioritizing recent generated image' : 'new WebSocket completion';
          console.log('🔄 Auto-selecting most recent completed generated image:', recentCompleted.id, {
            reason,
            imageAge: Date.now() - recentCompleted.createdAt.getTime() + 'ms',
            totalHistoryImages: historyImages.length,
            isPageReload
          });
          dispatch(setSelectedImage({ id: recentCompleted.id, type: 'generated' }));
          lastAutoSelectedId.current = recentCompleted.id;
        }
      }
    }
  }, [historyImages, selectedImageId, dispatch]);

  // Load input images and RunPod history on component mount
  useEffect(() => {
    const loadAllData = async () => {
      // Load CREATE images first to check for recent generated images
      try {
        await dispatch(fetchAllCreateImages());
        console.log('All CREATE images loaded');
      } catch (error) {
        console.error('Failed to load CREATE images:', error);
      }

      // Then load input images
      const resultAction = await dispatch(fetchInputImagesBySource({ uploadSource: 'CREATE_MODULE' }));
      
      if (fetchInputImagesBySource.fulfilled.match(resultAction)) {
        const loadedImages = resultAction.payload.inputImages;
        
        // Handle URL parameters after images are loaded
        if (!urlParamsProcessed.current && loadedImages.length > 0) {
          const imageIdParam = searchParams.get('imageId');
          const showMasksParam = searchParams.get('showMasks');
          
          if (imageIdParam) {
            const targetImageId = parseInt(imageIdParam);
            const targetImage = loadedImages.find((img: any) => img.id === targetImageId);
            
            if (targetImage) {
              console.log('🔗 URL params: Selecting input image from URL:', targetImageId);
              dispatch(setSelectedImage({ id: targetImageId, type: 'input' }));
              
              // If showMasks=true, open the AI prompt modal after a short delay
              if (showMasksParam === 'true') {
                console.log('🔗 URL params: Opening AI prompt modal due to showMasks=true');
                setTimeout(() => {
                  dispatch(setIsPromptModalOpen(true));
                }, 1000); // 1 second delay to allow data to load
              }
              
              // Optional: Clean up URL parameters after processing
              // Uncomment the lines below if you want to remove parameters from URL after processing
              // setTimeout(() => {
              //   setSearchParams({});
              // }, 1500);
            } else {
              console.warn('🔗 URL params: Image ID not found in loaded images:', targetImageId);
              // Fallback to first image if specified image not found
              dispatch(setSelectedImage({ id: loadedImages[0].id, type: 'input' }));
            }
          } else {
            // No URL params, check if we should auto-select an input image
            // Give a small delay to allow the generated image auto-selection to run first
            setTimeout(() => {
              // Use a ref to check if an image was selected by generated image auto-selection
              console.log('🔄 Page reload: Auto-selecting most recent input image (after delay check):', loadedImages[0].id);
              dispatch(setSelectedImage({ id: loadedImages[0].id, type: 'input' }));
            }, 200);
          }
          
          urlParamsProcessed.current = true;
        } else if (!urlParamsProcessed.current && loadedImages.length > 0) {
          // Default behavior when no URL params: select the most recent input image if no generated image was selected
          setTimeout(() => {
            console.log('🔄 Page reload: Auto-selecting most recent input image (no URL params, after delay):', loadedImages[0].id);
            dispatch(setSelectedImage({ id: loadedImages[0].id, type: 'input' }));
          }, 200);
          urlParamsProcessed.current = true;
        }
      }
    };

    loadAllData();
  }, [dispatch, searchParams]); // Removed selectedImageId to prevent infinite loops

  // Load customization options on mount and reset to initial state
  useEffect(() => {
    if (!availableOptions) {
      dispatch(fetchCustomizationOptions());
    }
    
    // Reset Edit Inspector to initial state on component mount
    dispatch(resetSettings());
  }, [dispatch, availableOptions]);

  // Track previous input image ID to only load data when it actually changes
  const prevInputImageIdRef = useRef<number | undefined>(undefined);
  
  // Cache batch ID to input image ID mappings to avoid repeated API calls
  const batchToInputImageCache = useRef<Map<number, number>>(new Map());
  
  // Helper function to get base input image ID from a generated image
  const getBaseInputImageIdFromGenerated = async (generatedImage: any): Promise<number | undefined> => {
    if (!generatedImage.batchId) return undefined;
    
    const batchId = generatedImage.batchId;
    
    // Check cache first to avoid unnecessary API calls
    if (batchToInputImageCache.current.has(batchId)) {
      const cachedInputImageId = batchToInputImageCache.current.get(batchId);
      console.log('🔍 Using cached batch-to-input mapping:', { batchId, inputImageId: cachedInputImageId });
      return cachedInputImageId;
    }
    
    try {
      console.log('🔍 Making API call to get base input image ID from batch:', batchId);
      const batchResult = await dispatch(loadBatchSettings(batchId));
      
      if (loadBatchSettings.fulfilled.match(batchResult)) {
        const inputImageId = batchResult.payload.inputImageId;
        console.log('✅ Found base input image ID via API:', inputImageId);
        
        // Cache this mapping for future use
        if (inputImageId) {
          batchToInputImageCache.current.set(batchId, inputImageId);
        }
        
        return inputImageId;
      }
    } catch (error) {
      console.error('❌ Failed to get base input image ID:', error);
    }
    
    return undefined;
  };
  
  // Centralized function to load all data when base input image changes
  const loadDataForInputImage = async (inputImageId: number, clearPrevious: boolean = true) => {
    console.log('🔄 Loading all data for input image:', inputImageId, 'clearPrevious:', clearPrevious);
    
    if (clearPrevious) {
      // Clear ALL previous data first to prevent inconsistencies
      console.log('🧹 Clearing previous data before loading new input image data');
      dispatch(resetMaskState());
      dispatch(clearMaskMaterialSelections());
      dispatch(clearSavedPrompt());
      dispatch(clearAIMaterials());
      
      // Clear restored images to allow fresh restoration
      restoredImageIds.current.clear();
      console.log('🧹 Cleared restored images cache');
    }
    
    // Load masks (always needed)
    console.log('📦 Loading fresh masks for input image:', inputImageId);
    dispatch(getMasks(inputImageId));
    
    // Load AI materials (always needed)
    console.log('🎨 Loading fresh AI materials for input image:', inputImageId);
    dispatch(getAIPromptMaterials(inputImageId));
    
    // Load saved prompt (always needed)
    console.log('💬 Loading fresh saved prompt for input image:', inputImageId);
    dispatch(getSavedPrompt(inputImageId));
    
    return inputImageId;
  };

  // Centralized Redux state-driven data loading
  useEffect(() => {
    console.log('🔄 Redux effect triggered:', {
      baseInputImageId,
      prevInputImageIdRef: prevInputImageIdRef.current,
      selectedImageId,
      selectedImageType,
      shouldLoad: baseInputImageId && baseInputImageId !== prevInputImageIdRef.current
    });
    
    // Only load data when we have a base input image ID and it's different from before
    if (baseInputImageId && baseInputImageId !== prevInputImageIdRef.current) {
      console.log('🔄 Base input image changed via Redux state:', {
        previousBaseInputImageId: prevInputImageIdRef.current,
        newBaseInputImageId: baseInputImageId,
        selectedImageId,
        selectedImageType,
        source: 'Redux state change'
      });
      
      loadDataForInputImage(baseInputImageId, true);
      prevInputImageIdRef.current = baseInputImageId;
    } else if (!baseInputImageId && prevInputImageIdRef.current !== undefined) {
      // Reset state when no base input image is available
      console.log('🧹 Resetting state (no base input image available)');
      dispatch(resetMaskState());
      dispatch(clearMaskMaterialSelections());
      dispatch(clearSavedPrompt());
      dispatch(clearAIMaterials());
      prevInputImageIdRef.current = undefined;
    } else {
      console.log('⏭️ Skipping data load - base input image unchanged or invalid:', {
        baseInputImageId,
        prevInputImageIdRef: prevInputImageIdRef.current
      });
    }
  }, [baseInputImageId, dispatch]);

  // Restore generated image-specific data when a generated image is selected
  useEffect(() => {
    if (selectedImageId && selectedImageType === 'generated' && historyImages.length > 0) {
      const selectedImage = historyImages.find(img => img.id === selectedImageId);
      if (selectedImage && !restoredImageIds.current.has(selectedImageId)) {
        console.log('🔄 Restoring generated image-specific data:', {
          imageId: selectedImageId,
          hasMaskMappings: !!selectedImage.maskMaterialMappings,
          hasAiPrompt: !!selectedImage.aiPrompt,
          hasAiMaterials: !!selectedImage.aiMaterials && selectedImage.aiMaterials.length > 0,
          hasSettingsSnapshot: !!selectedImage.settingsSnapshot
        });

        // Mark this image as restored to prevent infinite loops
        restoredImageIds.current.add(selectedImageId);

        // Restore AI prompt immediately
        if (selectedImage.aiPrompt) {
          console.log('🤖 Restoring AI prompt:', selectedImage.aiPrompt.substring(0, 100) + '...');
          dispatch(restoreSavedPrompt(selectedImage.aiPrompt));
        }

        // Restore AI materials immediately
        if (selectedImage.aiMaterials && selectedImage.aiMaterials.length > 0) {
          console.log('🎨 Restoring AI materials:', selectedImage.aiMaterials.length, 'items');
          dispatch(restoreAIMaterials(selectedImage.aiMaterials));
        }
        
        // Restore Edit Inspector settings from settingsSnapshot
        if (selectedImage.settingsSnapshot && Object.keys(selectedImage.settingsSnapshot).length > 0) {
          console.log('⚙️ Restoring Edit Inspector settings:', selectedImage.settingsSnapshot);
          dispatch(loadSettingsFromImage({
            settings: {
              selectedStyle: selectedImage.settingsSnapshot.mode || 'photorealistic',
              creativity: selectedImage.settingsSnapshot.creativity || 3,
              expressivity: selectedImage.settingsSnapshot.expressivity || 2,
              resemblance: selectedImage.settingsSnapshot.resemblance || 3,
              variations: selectedImage.settingsSnapshot.variations || 1, // Use saved variations
              selections: selectedImage.settingsSnapshot.regions || {},
              contextSelection: selectedImage.contextSelection
            },
            inputImageId: baseInputImageId,
            imageId: selectedImageId,
            isGeneratedImage: true
          }));
        }
      }
    }
  }, [dispatch, selectedImageId, selectedImageType, historyImages, baseInputImageId]);

  // Restore mask material mappings when masks are loaded for generated images
  useEffect(() => {
    if (selectedImageId && selectedImageType === 'generated' && historyImages.length > 0 && masks.length > 0) {
      const selectedImage = historyImages.find(img => img.id === selectedImageId);
      if (selectedImage && selectedImage.maskMaterialMappings) {
        const mappingsCount = Object.keys(selectedImage.maskMaterialMappings).length;
        if (mappingsCount > 0) {
          console.log('🎭 Restoring mask material mappings after masks loaded:', {
            masksCount: masks.length,
            mappingsCount,
            maskIds: masks.map(m => m.id),
            mappingKeys: Object.keys(selectedImage.maskMaterialMappings)
          });
          dispatch(restoreMaskMaterialMappings(selectedImage.maskMaterialMappings));
        }
      }
    }
  }, [dispatch, selectedImageId, selectedImageType, masks.length, historyImages]);

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
        dispatch(setSelectedImage({ id: resultAction.payload.id, type: 'input' }));
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
    
    // Prevent any default behavior or page navigation
    try {
      // Use the provided user prompt or fall back to the Redux state prompt
      const finalPrompt = userPrompt || basePrompt;
      
      // Check credits before proceeding
      if (!checkCreditsBeforeAction(selectedVariations)) {
        return; // Credit check handles the error display
      }

      // Determine if we need to create a new InputImage or use existing one
      let inputImageIdForGeneration: number;
      
      if (selectedImageType === 'input') {
        // Case 1: Selected image is an InputImage - use it directly
        inputImageIdForGeneration = selectedImageId!;
        console.log('✅ Using existing InputImage for generation:', inputImageIdForGeneration);
      } else if (selectedImageType === 'generated' && batchInputImageId) {
        // Case 2: Selected image is a generated image - create new InputImage from it with copied masks
        const selectedGeneratedImage = historyImages.find(img => img.id === selectedImageId)!;
        
        console.log('🔄 Creating new InputImage from generated image for "Create again" workflow...');
        const createResult = await dispatch(createInputImageFromGenerated({
          generatedImageUrl: selectedGeneratedImage.imageUrl!,
          generatedThumbnailUrl: selectedGeneratedImage.thumbnailUrl,
          originalInputImageId: batchInputImageId,
          fileName: `variation_${selectedImageId}_${Date.now()}.jpg`
        }));
        
        if (createInputImageFromGenerated.fulfilled.match(createResult)) {
          inputImageIdForGeneration = createResult.payload.id;
          
          // Select the newly created InputImage
          dispatch(setSelectedImage({ id: inputImageIdForGeneration, type: 'input' }));
          
          console.log('✅ Created new InputImage with copied masks:', inputImageIdForGeneration);
        } else {
          console.error('❌ Failed to create new InputImage:', createResult.payload);
          return;
        }
      } else {
        console.error('❌ No valid image selected for generation');
        return;
      }
      
      console.log('📝 Using prompt for generation:', finalPrompt);

      // Save all configurations to database before generation
      console.log('💾 Saving all configurations to database before generation...');
      await dispatch(saveAllConfigurationsToDatabase({ 
        inputImageId: inputImageIdForGeneration 
      }));
      console.log('✅ All configurations saved to database successfully');

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

  const handleSelectImage = async (imageId: number, sourceType?: 'input' | 'generated') => {
    console.log('🖼️ handleSelectImage called:', { 
      imageId, 
      sourceType,
      hasInputImage: inputImages.some(img => img.id === imageId),
      hasGeneratedImage: historyImages.some(img => img.id === imageId)
    });
    
    // Debug Redux state
    console.log('🔍 Current Redux state:', {
      inputImagesCount: inputImages.length,
      inputImageIds: inputImages.map(img => img.id),
      historyImagesCount: historyImages.length,
      historyImageIds: historyImages.map(img => img.id),
      currentSelectedImageId: selectedImageId,
      currentSelectedImageType: selectedImageType,
      currentBaseInputImageId: baseInputImageId,
      targetImageId: imageId
    });
    
    // Use sourceType if provided, otherwise try to determine from the arrays
    let imageType: 'input' | 'generated';
    
    if (sourceType) {
      imageType = sourceType;
    } else {
      // Fallback logic if no sourceType provided
      const isInputImage = inputImages.some(img => img.id === imageId);
      const isGeneratedImage = historyImages.some(img => img.id === imageId);
      
      if (isInputImage && !isGeneratedImage) {
        imageType = 'input';
      } else if (isGeneratedImage && !isInputImage) {
        imageType = 'generated';
      } else if (isInputImage && isGeneratedImage) {
        console.warn('⚠️ ID collision detected! Both input and generated images have ID:', imageId);
        console.warn('⚠️ Please specify sourceType to resolve ambiguity');
        return;
      } else {
        console.warn('⚠️ Selected image not found in either input or history images');
        return;
      }
    }
    
    // Update last auto-selected to prevent conflicts with auto-selection
    lastAutoSelectedId.current = imageId;

    if (imageType === 'input') {
      // For input images, base input image ID = selected image ID
      console.log('🖼️ Selecting input image - base input image ID = selected image ID');
      dispatch(setSelectedImage({ 
        id: imageId, 
        type: imageType, 
        baseInputImageId: imageId 
      }));
      
      // Only reset Edit Inspector settings, but keep masks, AI materials, and prompts
      dispatch(resetSettings());
    } else if (imageType === 'generated') {
      // For generated images, get the base input image ID first
      const selectedImage = historyImages.find(img => img.id === imageId);
      if (selectedImage) {
        console.log('🖼️ Selected generated image data:', {
          id: selectedImage.id,
          batchId: selectedImage.batchId,
          hasSettingsSnapshot: !!selectedImage.settingsSnapshot,
          hasMaskMappings: !!selectedImage.maskMaterialMappings,
          hasAiPrompt: !!selectedImage.aiPrompt,
          hasAiMaterials: !!selectedImage.aiMaterials,
          contextSelection: selectedImage.contextSelection,
          settingsSnapshot: selectedImage.settingsSnapshot
        });
        
        const baseInputImageId = await getBaseInputImageIdFromGenerated(selectedImage);
        
        console.log('🖼️ Calculated base input image ID:', baseInputImageId);
        
        // Set the selected image with the base input image ID
        dispatch(setSelectedImage({ 
          id: imageId, 
          type: imageType, 
          baseInputImageId: baseInputImageId 
        }));
        
        console.log('🖼️ Dispatched setSelectedImage with:', {
          id: imageId,
          type: imageType,
          baseInputImageId: baseInputImageId
        });
      } else {
        console.error('❌ Generated image not found in historyImages:', imageId);
      }
    }
  };

  const handleTogglePromptModal = (isOpen: boolean) => {
    dispatch(setIsPromptModalOpen(isOpen));
  };

  const handleDownload = () => {
    console.log('Download image:', selectedImageId);
    // Additional download logic can be added here if needed
  };

  const handleOpenGallery = () => {
    dispatch(setIsModalOpen(true));
  };

  const handleCloseGallery = () => {
    dispatch(setIsModalOpen(false));
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
    if (!selectedImageId || !selectedImageType) {
      console.log('🔍 getCurrentImageUrl: No selectedImageId or selectedImageType');
      return undefined;
    }
    
    // Use selectedImageType to determine which collection to search
    if (selectedImageType === 'input') {
      const inputImage = inputImages.find(img => img.id === selectedImageId);
      if (inputImage) {
        // For input images, prioritize original URL over processed URL for canvas display
        const displayUrl = inputImage.originalUrl || inputImage.processedUrl || inputImage.imageUrl;
        console.log('🔍 getCurrentImageUrl: Found input image:', displayUrl);
        return displayUrl;
      } else {
        console.log('🔍 getCurrentImageUrl: Input image not found for ID:', selectedImageId);
      }
    } else if (selectedImageType === 'generated') {
      const historyImage = historyImages.find(img => img.id === selectedImageId);
      if (historyImage) {
        // For generated images, imageUrl should already be the original high-resolution image from the API
        console.log('🔍 getCurrentImageUrl: Found generated image:', historyImage.imageUrl);
        return historyImage.imageUrl;
      } else {
        console.log('🔍 getCurrentImageUrl: Generated image not found for ID:', selectedImageId);
      }
    }
    
    console.log('🔍 getCurrentImageUrl: No image found for selectedImageId:', selectedImageId, 'type:', selectedImageType);
    return undefined;
  };

  // Check if we have any input images to determine layout
  const hasInputImages = inputImages && inputImages.length > 0;

  return (
    <MainLayout>
      <div className="flex-1 flex overflow-hidden relative">
        {/* Show normal layout when input images exist */}
        {hasInputImages ? (
          <>
            <div className={`transition-all flex gap-3 z-100 pl-2 h-full ${editInspectorMinimized ? 'absolute top-0 left-0' : 'relative'}`}>
              <div>
                <InputHistoryPanel
                  images={inputImages}
                  selectedImageId={selectedImageType === 'input' ? selectedImageId : undefined}
                  onSelectImage={(imageId) => handleSelectImage(imageId, 'input')}
                  onUploadImage={handleImageUpload}
                  loading={inputImagesLoading && inputImages.length === 0} // Only show loading when no images are loaded yet
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
                  onOpenGallery={handleOpenGallery}
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
                selectedImageId={selectedImageType === 'generated' ? selectedImageId : undefined}
                onSelectImage={(imageId) => handleSelectImage(imageId, 'generated')}
                // onConvertToInputImage={handleConvertToInputImage}
                loading={historyImagesLoading}
              />
            </div>
          </>
        ) : (
          /* Show file upload section when no input images exist */
          <div className="flex-1 flex items-center justify-center">
            <FileUpload 
              onUploadImage={handleImageUpload}
              loading={inputImagesLoading}
            />
          </div>
        )}
        
        {/* Gallery Modal */}
        <GalleryModal 
          isOpen={isGalleryModalOpen}
          onClose={handleCloseGallery}
        />
      </div>
    </MainLayout>
  );
};

export default ArchitecturalVisualization;