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
import InputHistoryPanel from '@/components/create/InputHistoryPanel';
import AIPromptInput from '@/components/create/AIPromptInput';
import FileUpload from '@/components/create/FileUpload';
import GalleryModal from '@/components/gallery/GalleryModal';

// Redux actions
import { uploadInputImage, fetchInputImagesBySource, createInputImageFromGenerated } from '@/features/images/inputImagesSlice';
import { generateWithCurrentState, addProcessingVariations, fetchAllCreateImages } from '@/features/images/historyImagesSlice';
import { setSelectedImage, setIsPromptModalOpen } from '@/features/create/createUISlice';
import { resetSettings, loadBatchSettings, loadSettingsFromImage } from '@/features/customization/customizationSlice';
import { getMasks, resetMaskState, getAIPromptMaterials, restoreMaskMaterialMappings, restoreAIMaterials, clearMaskMaterialSelections, clearSavedPrompt, clearAIMaterials, saveAllConfigurationsToDatabase, getSavedPrompt } from '@/features/masks/maskSlice';
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
  const maskInputs = useAppSelector(state => state.masks.maskInputs);
  const aiPromptMaterials = useAppSelector(state => state.masks.aiPromptMaterials);
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

  // Auto-select most recent generated image when available (WebSocket updates and after generation)
  useEffect(() => {
    if (historyImages.length > 0) {
      const recentCompleted = historyImages
        .filter(img => img.status === 'COMPLETED')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      
      if (recentCompleted) {
        const isVeryRecent = Date.now() - recentCompleted.createdAt.getTime() < 60000; // 60 seconds
        const wasNotPreviouslySelected = lastAutoSelectedId.current !== recentCompleted.id;
        
        const isPageReload = !selectedImageId;
        
        // Auto-select generated images for WebSocket updates and new completions
        // Only when user is actively using the app (not on page reload)
        if (isVeryRecent && wasNotPreviouslySelected && !isPageReload) {
          console.log('🔄 Auto-selecting most recent completed generated image:', recentCompleted.id, {
            reason: 'new generation completion',
            imageAge: Date.now() - recentCompleted.createdAt.getTime() + 'ms',
            totalHistoryImages: historyImages.length,
            previouslySelected: lastAutoSelectedId.current,
            isPageReload
          });
          
          // For generated images, we need to calculate the baseInputImageId asynchronously
          const selectGeneratedImage = async () => {
            const baseInputImageId = await getBaseInputImageIdFromGenerated(recentCompleted);
            dispatch(setSelectedImage({ 
              id: recentCompleted.id, 
              type: 'generated',
              baseInputImageId
            }));
          };
          
          selectGeneratedImage();
          lastAutoSelectedId.current = recentCompleted.id;
        } else {
          console.log('⏭️ Skipping auto-selection:', {
            isVeryRecent,
            wasNotPreviouslySelected,
            isPageReload,
            selectedImageId,
            lastAutoSelectedId: lastAutoSelectedId.current
          });
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
          } else if (loadedImages.length > 0) {
            // No URL params - always select the most recent input image on page reload
            console.log('🔄 Page reload: Auto-selecting most recent input image:', loadedImages[0].id);
            dispatch(setSelectedImage({ id: loadedImages[0].id, type: 'input' }));
          }
          
          urlParamsProcessed.current = true;
        } else if (!urlParamsProcessed.current && loadedImages.length > 0) {
          // Default behavior when no URL params: always select the most recent input image on page reload
          console.log('🔄 Page reload: Auto-selecting most recent input image (no URL params):', loadedImages[0].id);
          dispatch(setSelectedImage({ id: loadedImages[0].id, type: 'input' }));
          urlParamsProcessed.current = true;
        }
      }
    };

    loadAllData();
  }, [dispatch, searchParams]); // Removed selectedImageId to prevent infinite loops

  // Reset Edit Inspector to initial state on component mount
  useEffect(() => {
    dispatch(resetSettings());
  }, [dispatch]);

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
    
    // Load masks (always needed - this gives us the base mask structure)
    console.log('📦 Loading fresh masks for input image:', inputImageId);
    dispatch(getMasks(inputImageId));
    
    if (clearPrevious) {
      // Only load AI materials for input images
      // For generated images, we'll restore these from the saved generation data
      
      // Load AI materials (for input images only)
      console.log('🎨 Loading fresh AI materials for input image:', inputImageId);
      dispatch(getAIPromptMaterials(inputImageId));
      
      // Load the generated prompt from the input image
      console.log('💭 Loading generated prompt for input image:', inputImageId);
      dispatch(getSavedPrompt(inputImageId));
    } else {
      console.log('⏭️ Skipping AI materials and prompt loading - will restore from generated image data');
    }
    
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
      
      // Determine behavior based on image type
      if (selectedImageType === 'generated') {
        console.log('🔄 Loading base masks for generated image (preserving generation data)');
        // For generated images, we need the base masks but should preserve generation data
        loadDataForInputImage(baseInputImageId, false); // Don't clear previous data
      } else {
        console.log('🔄 Loading fresh data for input image');
        // For input images, clear everything and load fresh
        loadDataForInputImage(baseInputImageId, true);
      }
      
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
  }, [baseInputImageId, selectedImageType, dispatch]);

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
          hasSettingsSnapshot: !!selectedImage.settingsSnapshot,
          hasContextSelection: !!selectedImage.contextSelection,
          // Debug: Show actual data available
          actualData: {
            aiPrompt: selectedImage.aiPrompt ? selectedImage.aiPrompt.substring(0, 50) + '...' : null,
            aiMaterialsCount: selectedImage.aiMaterials?.length || 0,
            settingsSnapshotKeys: selectedImage.settingsSnapshot ? Object.keys(selectedImage.settingsSnapshot) : [],
            maskMappingsCount: selectedImage.maskMaterialMappings ? Object.keys(selectedImage.maskMaterialMappings).length : 0,
            contextSelection: selectedImage.contextSelection
          }
        });

        // Mark this image as restored to prevent infinite loops
        restoredImageIds.current.add(selectedImageId);

        // 1. Skip AI prompt restoration - let users start with empty prompt
        console.log('⏭️ Skipping AI prompt restoration - starting with empty prompt');

        // 2. Restore AI materials immediately (doesn't depend on masks being loaded)
        if (selectedImage.aiMaterials && selectedImage.aiMaterials.length > 0) {
          console.log('🎨 Restoring AI materials:', selectedImage.aiMaterials.length, 'items');
          dispatch(restoreAIMaterials(selectedImage.aiMaterials));
        }
        
        // 3. Restore Edit Inspector settings from settingsSnapshot
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
        
        // 4. Store mask mappings for later restoration when masks are loaded
        // We'll handle this in the separate useEffect that waits for masks.length > 0
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
            selectedImageId,
            masksCount: masks.length,
            mappingsCount,
            maskIds: masks.map(m => m.id),
            mappingKeys: Object.keys(selectedImage.maskMaterialMappings),
            sampleMapping: Object.values(selectedImage.maskMaterialMappings)[0]
          });
          
          // Apply the mask material mappings to the loaded masks
          dispatch(restoreMaskMaterialMappings(selectedImage.maskMaterialMappings));
          
          console.log('✅ Mask material mappings restoration completed for generated image:', selectedImageId);
        } else {
          console.log('⏭️ No mask material mappings to restore for generated image:', selectedImageId);
        }
      } else {
        console.log('⏭️ No selected image or mask mappings found for restoration');
      }
    }
  }, [dispatch, selectedImageId, selectedImageType, masks.length, historyImages]);

  // Clear restored images when selectedImageId changes to allow re-restoration
  useEffect(() => {
    // Clear restored images cache when switching to a different image
    // This allows re-restoration when switching between generated images
    restoredImageIds.current.clear();
    console.log('🧹 Cleared restored images cache due to image selection change');
  }, [selectedImageId]);

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
      
      // Collect mask prompts from current frontend state
      const maskPrompts: Record<string, string> = {};
      masks.forEach(mask => {
        const userInput = maskInputs[mask.id]?.displayName?.trim();
        if (userInput || mask.customText || mask.materialOption || mask.customizationOption) {
          maskPrompts[`mask_${mask.id}`] = userInput || mask.customText || '';
        }
      });
      
      console.log('📝 Collected mask prompts:', maskPrompts);
      console.log('🎨 AI prompt materials:', aiPromptMaterials);
      console.log('⚙️ Slider settings:', { creativity, expressivity, resemblance });
      console.log('🎯 Context selection:', contextSelection);
      
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
      } else if (selectedImageType === 'generated' && baseInputImageId) {
        // Case 2: Selected image is a generated image - create new InputImage from it with copied masks
        const selectedGeneratedImage = historyImages.find(img => img.id === selectedImageId)!;
        
        console.log('💾 First, saving current frontend configurations to original input image...');
        // CRITICAL: Save current frontend state to the original input image FIRST
        // so that when we copy configurations, we get the updated user input
        await dispatch(saveAllConfigurationsToDatabase({ 
          inputImageId: baseInputImageId 
        }));
        console.log('✅ Current frontend configurations saved to original input image');
        
        console.log('🔄 Creating new InputImage from generated image for "Create again" workflow...');
        const createResult = await dispatch(createInputImageFromGenerated({
          generatedImageUrl: selectedGeneratedImage.imageUrl!,
          generatedThumbnailUrl: selectedGeneratedImage.thumbnailUrl,
          originalInputImageId: baseInputImageId,
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
        console.error('❌ No valid image selected for generation', {
          selectedImageType,
          selectedImageId,
          baseInputImageId,
          batchInputImageId,
          hasSelectedImage: !!selectedImageId,
          hasBaseInputImageId: !!baseInputImageId,
          hasBatchInputImageId: !!batchInputImageId
        });
        return;
      }
      
      console.log('📝 Using prompt for generation:', finalPrompt);

      // Prepare mask material mappings from current frontend state
      const maskMaterialMappings: Record<string, any> = {};
      masks.forEach(mask => {
        const userInput = maskInputs[mask.id]?.displayName?.trim();
        if (userInput || mask.customText || mask.materialOption || mask.customizationOption) {
          maskMaterialMappings[`mask_${mask.id}`] = {
            customText: userInput || mask.customText || '',
            materialOptionId: mask.materialOption?.id,
            customizationOptionId: mask.customizationOption?.id,
            subCategoryId: mask.subCategory?.id
          };
        }
      });

      // Use the new generateWithCurrentState workflow with enhanced data collection
      const generateRequest = {
        prompt: finalPrompt || 'CREATE AN ARCHITECTURAL VISUALIZATION',
        inputImageId: inputImageIdForGeneration,
        variations: selectedVariations,
        settings: {
          // RunPod specific settings
          seed: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
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
        },
        // Enhanced data collection for new workflow
        maskPrompts: maskPrompts,
        maskMaterialMappings,
        aiPromptMaterials,
        contextSelection: contextSelection,
        sliderSettings: {
          creativity,
          expressivity, 
          resemblance
        }
      };

      // Create temporary processing variations for immediate UI feedback
      const tempImageIds = Array.from({ length: selectedVariations }, (_, index) => Date.now() + index);
      const tempBatchId = Date.now();
      
      // Add processing variations immediately for loading states (before API call)
      console.log('✨ Adding immediate processing variations for UI feedback');
      dispatch(addProcessingVariations({
        batchId: tempBatchId,
        totalVariations: selectedVariations,
        imageIds: tempImageIds
      }));

      console.log('Dispatching new generateWithCurrentState with:', generateRequest);
      const result = await dispatch(generateWithCurrentState(generateRequest));
      
      if (generateWithCurrentState.fulfilled.match(result)) {
        console.log('RunPod generation started successfully:', result.payload);
        
        // Replace temporary processing variations with real ones if available
        if (result.payload.runpodJobs && result.payload.runpodJobs.length > 0) {
          const realImageIds = result.payload.runpodJobs.map((job: any) => parseInt(job.imageId) || job.imageId);
          console.log('🔄 Replacing temporary variations with real ones:', realImageIds);
          dispatch(addProcessingVariations({
            batchId: result.payload.batchId,
            totalVariations: selectedVariations,
            imageIds: realImageIds
          }));
        }
        
        // Refresh user credits to reflect the deduction
        // console.log('💳 Refreshing credits after generation');
        // dispatch(fetchCurrentUser());
        
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
      
      // Reset Edit Inspector settings when switching to input image
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