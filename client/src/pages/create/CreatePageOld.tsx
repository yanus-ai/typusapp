import React, { useEffect, useState } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useRunPodWebSocket } from '@/hooks/useRunPodWebSocket';
import { useMaskWebSocket } from '@/hooks/useMaskWebSocket';
// Note: Credit validation moved to backend
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import MainLayout from "@/components/layout/MainLayout";
import EditInspector from '@/components/create/EditInspector';
import ImageCanvas from '@/components/create/ImageCanvas';
import HistoryPanel from '@/components/create/HistoryPanel';
import InputHistoryPanel from '@/components/create/InputHistoryPanel';
import AIPromptInput from '@/components/create/AIPromptInput';
import FileUpload from '@/components/create/FileUpload';
import GalleryModal from '@/components/gallery/GalleryModal';
import { Button } from '@/components/ui/button';

// Redux actions
import { uploadInputImage, fetchInputImagesBySource, createInputImageFromGenerated } from '@/features/images/inputImagesSlice';
import { generateWithCurrentState, fetchAllVariations } from '@/features/images/historyImagesSlice';
import { setSelectedImage, setIsPromptModalOpen } from '@/features/create/createUISlice';
import { resetSettings, loadBatchSettings, loadSettingsFromImage } from '@/features/customization/customizationSlice';
import { getMasks, resetMaskState, getAIPromptMaterials, restoreMaskMaterialMappings, restoreAIMaterials, clearMaskMaterialSelections, clearSavedPrompt, clearAIMaterials, saveAllConfigurationsToDatabase, getSavedPrompt, restoreSavedPrompt } from '@/features/masks/maskSlice';
import { setIsModalOpen } from '@/features/gallery/gallerySlice';
import { useRef } from 'react';

const ArchitecturalVisualization: React.FC = () => {
  const dispatch = useAppDispatch();
  // Note: Credit checks moved to backend validation
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [editInspectorMinimized, setEditInspectorMinimized] = useState(false);
  const lastAutoSelectedId = useRef<number | null>(null);
  const restoredImageIds = useRef<Set<number>>(new Set()); // Track restored images to prevent infinite loops
  const urlParamsProcessed = useRef<boolean>(false); // Track if URL params have been processed
  const dataLoadStarted = useRef<boolean>(false); // Prevent duplicate API calls
  
  // Auth and subscription selectors
  const { user, subscription, isAuthenticated } = useAppSelector(state => state.auth);
  
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

  // Mask WebSocket for real-time mask and AI material updates
  useMaskWebSocket({
    inputImageId: baseInputImageId,
    enabled: !!baseInputImageId
  });

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
      return undefined;
    }
    
    if (selectedImageType === 'input') {
      return selectedImageId;
    } else if (selectedImageType === 'generated' && batchInputImageId) {
      return batchInputImageId;
    }
    
    return undefined;
  };

  // WebSocket integration for RunPod individual variation updates
  const effectiveInputImageId = getEffectiveInputImageId();
  const { isConnected } = useRunPodWebSocket({
    inputImageId: effectiveInputImageId,
    enabled: !!effectiveInputImageId
  });

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
          // For generated images, we need to calculate the baseInputImageId asynchronously
          // But first verify this is truly a generated image and not a new upload with ID collision
          const selectGeneratedImage = async () => {
            // Check if there's also an input image with the same ID (collision case)
            const hasInputImageWithSameId = inputImages.some(img => img.id === recentCompleted.id);
            
            if (hasInputImageWithSameId) {
              const inputImage = inputImages.find(img => img.id === recentCompleted.id);
              const isRecentUpload = inputImage && (
                inputImage.uploadSource === 'CREATE_MODULE' || 
                inputImage.uploadSource === 'TWEAK_MODULE' ||
                Date.now() - inputImage.createdAt.getTime() < 60000
              );
              
              if (isRecentUpload) {
                dispatch(setSelectedImage({ id: recentCompleted.id, type: 'input' }));
                return;
              }
            }
            
            // Proceed with generated image selection
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
        }
      }
    }
  }, [historyImages, selectedImageId, dispatch]);

  // Load input images and RunPod history on component mount (with duplicate prevention)
  useEffect(() => {
    // Prevent duplicate API calls
    if (dataLoadStarted.current) {
      return;
    }
    
    dataLoadStarted.current = true;

    const loadAllData = async () => {
      // Load both CREATE images and input images in parallel for better performance
      const [createImagesResult, inputImagesResult] = await Promise.allSettled([
        dispatch(fetchAllVariations({ limit: 50 })),
        dispatch(fetchInputImagesBySource({ uploadSource: 'CREATE_MODULE' }))
      ]);

      // Handle CREATE images result
      if (createImagesResult.status === 'fulfilled') {
      } else {
        console.error('❌ Failed to load CREATE images:', createImagesResult.reason);
      }

      // Handle input images result  
      if (inputImagesResult.status === 'fulfilled') {
        const resultAction = inputImagesResult.value;
        
        if (fetchInputImagesBySource.fulfilled.match(resultAction)) {
          const loadedImages = resultAction.payload.inputImages;
        
        // Handle URL parameters after images are loaded (process even if no existing images)
        if (!urlParamsProcessed.current) {
          const imageIdParam = searchParams.get('imageId');
          const showMasksParam = searchParams.get('showMasks');
          const sourceParam = searchParams.get('source'); // Add source parameter detection
          
          if (imageIdParam) {
            const targetImageId = parseInt(imageIdParam);
            const targetImage = loadedImages.find((img: any) => img.id === targetImageId);
            
            if (targetImage) {
              dispatch(setSelectedImage({ id: targetImageId, type: 'input' }));
              
              // If showMasks=true, open the AI prompt modal after a short delay
              // Use longer delay for webhook/revit sources to allow mask processing to complete
              if (showMasksParam === 'true') {
                const isFromWebhook = sourceParam === 'webhook' || sourceParam === 'revit';
                const delay = isFromWebhook ? 2000 : 1000; // Longer delay for webhook sources
                
                if (isFromWebhook) {
                }
                
                setTimeout(() => {
                  dispatch(setIsPromptModalOpen(true));
                }, delay);
              }
              
              // Optional: Clean up URL parameters after processing
              // Uncomment the lines below if you want to remove parameters from URL after processing
              // setTimeout(() => {
              //   setSearchParams({});
              // }, 1500);
            } else {
              // Check if it's a generated image that needs to be converted to input image
              // For now, we'll handle this when historyImages are available in a separate effect
              // Don't fallback to first image yet - wait to see if it's a generated image
            }
          } else if (loadedImages.length > 0) {
            // No URL params - always select the most recent input image on page reload
            dispatch(setSelectedImage({ id: loadedImages[0].id, type: 'input' }));
          }
          
          urlParamsProcessed.current = true;
        }
        } else {
          console.error('❌ Failed to match input images result action');
        }
      } else {
        console.error('❌ Failed to load input images:', (inputImagesResult as any).reason);
      }
    };

    loadAllData();
  }, [dispatch, searchParams]); // Removed selectedImageId to prevent infinite loops

  // Note: Removed subscription check to allow free access to Create page for image upload and mask generation

  // Reset Edit Inspector to initial state on component mount
  useEffect(() => {
    dispatch(resetSettings());
  }, [dispatch]);

  // Track previous input image ID to only load data when it actually changes
  const prevInputImageIdRef = useRef<number | undefined>(undefined);
  const prevSelectedImageIdRef = useRef<number | undefined>(undefined); // Track selected image changes
  const prevSelectedBatchIdRef = useRef<number | undefined>(undefined); // Track batch changes for generated images
  const loadingImageDataRef = useRef<number | undefined>(undefined); // Track which image is currently loading data
  const loadedImageDataCache = useRef<Set<number>>(new Set()); // Track which images have data loaded
  
  // Cache batch ID to input image ID mappings to avoid repeated API calls
  const batchToInputImageCache = useRef<Map<number, number>>(new Map());
  
  // Helper function to get base input image ID from a generated image
  const getBaseInputImageIdFromGenerated = async (generatedImage: any): Promise<number | undefined> => {
    if (!generatedImage.batchId) return undefined;
    
    const batchId = generatedImage.batchId;
    
    // Check cache first to avoid unnecessary API calls
    if (batchToInputImageCache.current.has(batchId)) {
      const cachedInputImageId = batchToInputImageCache.current.get(batchId);
      return cachedInputImageId;
    }
    
    // IMPORTANT: Only load batch settings for actual generated images, not new uploads
    // Check if this image has the characteristics of a generated image
    if (!generatedImage.moduleType || generatedImage.uploadSource === 'CREATE_MODULE' || generatedImage.uploadSource === 'TWEAK_MODULE') {
      return undefined;
    }
    
    try {
      const batchResult = await dispatch(loadBatchSettings(batchId));
      
      if (loadBatchSettings.fulfilled.match(batchResult)) {
        const inputImageId = batchResult.payload.inputImageId;
        
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
  
  // Enhanced function to load data based on selected image type with batch awareness
  const loadDataForSelectedImage = async (imageId: number, imageType: 'input' | 'generated', inputImageId: number, clearPrevious: boolean = true) => {
    // Get batch ID for generated images to create unique cache keys
    const batchId = imageType === 'generated' ? historyImages.find(img => img.id === imageId)?.batchId : undefined;
    const cacheKey = imageType === 'generated' ? `${inputImageId}-${batchId}` : `${inputImageId}`;
    
    // Prevent duplicate API calls for the same image/batch combination
    if (loadingImageDataRef.current === inputImageId) {
      return inputImageId;
    }
    
    loadingImageDataRef.current = inputImageId;
    
    // For generated images with batch changes, always clear previous data
    if (imageType === 'generated' && clearPrevious) {
      dispatch(resetMaskState());
      dispatch(clearMaskMaterialSelections());
      dispatch(clearSavedPrompt());
      dispatch(clearAIMaterials());
      restoredImageIds.current.clear();
      
      // Clear cache for all batch-specific entries
      loadedImageDataCache.current.clear();
    } else if (clearPrevious) {
      // Standard clearing for input images or initial loads
      dispatch(resetMaskState());
      dispatch(clearMaskMaterialSelections());
      dispatch(clearSavedPrompt());
      dispatch(clearAIMaterials());
      restoredImageIds.current.clear();
    }
    
    if (imageType === 'input') {
      await loadDataForInputImage(inputImageId, clearPrevious);
    } else if (imageType === 'generated') {
      await loadDataForGeneratedImage(imageId, inputImageId, clearPrevious);
    }
    
    // Mark this batch/image combination as loaded using the cache key
    loadedImageDataCache.current.add(inputImageId);
    loadingImageDataRef.current = undefined;
    return inputImageId;
  };

  // Specialized function for loading input image data
  const loadDataForInputImage = async (inputImageId: number, clearPrevious: boolean = true) => {
    const selectedInputImage = inputImages.find(img => img.id === inputImageId);
    
    if (!selectedInputImage) {
      console.error('❌ Input image not found:', inputImageId);
      return;
    }


    if (clearPrevious) {
      const hasStoredAIMaterials = selectedInputImage.aiMaterials && selectedInputImage.aiMaterials.length > 0;
      
      
      // Dispatch all API calls in parallel for input images
      const promises = [
        dispatch(getMasks(inputImageId)), // PULL: Masks from InputImage.masks relationship
        dispatch(getSavedPrompt(inputImageId)) // PULL: Prompt from InputImage.aiPrompt field
      ];

      // PULL: AI materials from InputImage.aiMaterials or database
      if (selectedInputImage.uploadSource === 'CREATE_MODULE') {
        promises.push(dispatch(getAIPromptMaterials(inputImageId)));
      } else if (selectedInputImage.uploadSource === 'CONVERTED_FROM_GENERATED' && hasStoredAIMaterials) {
        dispatch(restoreAIMaterials(selectedInputImage.aiMaterials!));
      } else if (hasStoredAIMaterials) {
        dispatch(restoreAIMaterials(selectedInputImage.aiMaterials!));
      }

      await Promise.allSettled(promises);
    } else {
      // Minimal load for generated image context
      dispatch(getMasks(inputImageId));
    }
  };

  // Specialized function for loading generated image data
  const loadDataForGeneratedImage = async (generatedImageId: number, baseInputImageId: number, clearPrevious: boolean = true) => {
    const selectedGeneratedImage = historyImages.find(img => img.id === generatedImageId);
    
    if (!selectedGeneratedImage) {
      console.error('❌ Generated image not found:', generatedImageId);
      return;
    }


    // PULL: Base masks and AI prompt materials from the original input image
    const promises = [
      dispatch(getMasks(baseInputImageId)), // PULL: Base masks
      dispatch(getAIPromptMaterials(baseInputImageId)) // PULL: AI prompt materials for base input image
    ];
    
    await Promise.allSettled(promises);

    if (clearPrevious) {
      // PULL generation-specific data from the generation batch record
      
      // 1. PULL AI prompt from generation batch (optional restore)
      if (selectedGeneratedImage.aiPrompt) {
      }

      // 2. PULL AI materials from generation batch
      if (selectedGeneratedImage.aiMaterials && selectedGeneratedImage.aiMaterials.length > 0) {
        dispatch(restoreAIMaterials(selectedGeneratedImage.aiMaterials));
      }

      // 3. PULL settings snapshot from generation batch
      if (selectedGeneratedImage.settingsSnapshot && Object.keys(selectedGeneratedImage.settingsSnapshot).length > 0) {
      }

      // 4. PULL mask mappings from generation batch (when masks are loaded)
      if (selectedGeneratedImage.maskMaterialMappings && Object.keys(selectedGeneratedImage.maskMaterialMappings).length > 0) {
      }

    }
  };

  // Enhanced Redux state-driven data loading with batch and image type awareness
  useEffect(() => {
    // Get current batch ID for generated images
    const currentBatchId = selectedImageType === 'generated' && selectedImageId 
      ? historyImages.find(img => img.id === selectedImageId)?.batchId 
      : undefined;

    
    // Determine if we need to reload data based on various change conditions
    const baseInputImageChanged = baseInputImageId && baseInputImageId !== prevInputImageIdRef.current;
    const selectedImageChanged = selectedImageId && selectedImageId !== prevSelectedImageIdRef.current;
    const batchChanged = selectedImageType === 'generated' && currentBatchId && currentBatchId !== prevSelectedBatchIdRef.current;
    
    const shouldReloadData = baseInputImageChanged || selectedImageChanged || batchChanged;
    
    if (baseInputImageId && selectedImageId && selectedImageType && shouldReloadData) {
      
      // Use the enhanced loading function with image type awareness
      if (selectedImageType === 'generated') {
        // For generated images, force clear if batch changed or selected image changed
        const shouldClear = !!(batchChanged || selectedImageChanged);
        loadDataForSelectedImage(selectedImageId, 'generated', baseInputImageId, shouldClear);
      } else {
        loadDataForSelectedImage(selectedImageId, 'input', baseInputImageId, true); // Always clear for input images
      }
      
      // Update all tracking references
      prevInputImageIdRef.current = baseInputImageId;
      prevSelectedImageIdRef.current = selectedImageId;
      prevSelectedBatchIdRef.current = currentBatchId;
    } else if (!baseInputImageId && prevInputImageIdRef.current !== undefined) {
      // Reset state when no base input image is available
      dispatch(resetMaskState());
      dispatch(clearMaskMaterialSelections());
      dispatch(clearSavedPrompt());
      dispatch(clearAIMaterials());
      prevInputImageIdRef.current = undefined;
      prevSelectedImageIdRef.current = undefined;
      prevSelectedBatchIdRef.current = undefined;
    } else {
    }
  }, [baseInputImageId, selectedImageType, selectedImageId, historyImages, dispatch]);

  // Enhanced restoration of generated image data from Generation batch with batch change detection
  useEffect(() => {
    if (selectedImageId && selectedImageType === 'generated' && historyImages.length > 0) {
      const selectedGeneratedImage = historyImages.find(img => img.id === selectedImageId);
      
      // Additional safety check: Verify this is truly a generated image and not a new upload
      // Check if there's a corresponding input image with upload source that suggests it's a new upload
      const correspondingInputImage = inputImages.find(img => img.id === selectedImageId);
      if (correspondingInputImage && (correspondingInputImage.uploadSource === 'CREATE_MODULE' || correspondingInputImage.uploadSource === 'TWEAK_MODULE')) {
        const isRecentUpload = Date.now() - correspondingInputImage.createdAt.getTime() < 60000; // Within last minute
        if (isRecentUpload) {
          return; // Skip restoration for new uploads
        }
      }
      
      // Get current and previous batch IDs to detect batch changes
      const currentBatchId = selectedGeneratedImage?.batchId;
      const batchChanged = currentBatchId !== prevSelectedBatchIdRef.current;
      const imageChanged = selectedImageId !== prevSelectedImageIdRef.current;
      
      if (selectedGeneratedImage && (batchChanged || imageChanged || !restoredImageIds.current.has(selectedImageId))) {

        // Clear previous restored images when batch changes to force reload
        if (batchChanged || imageChanged) {
          restoredImageIds.current.clear();
        }
        
        // Mark this image as restored to prevent infinite loops
        restoredImageIds.current.add(selectedImageId);

        // CLEAR AND PULL DATA FROM NEW GENERATION BATCH:

        // 1. AI Prompt from generation batch (optional auto-restore)
        if (selectedGeneratedImage.aiPrompt) {
          // Auto-restore prompt for generated images to show what was used
          dispatch(restoreSavedPrompt(selectedGeneratedImage.aiPrompt));
        } else {
          dispatch(clearSavedPrompt());
        }

        // 2. AI Materials from generation batch
        if (selectedGeneratedImage.aiMaterials && selectedGeneratedImage.aiMaterials.length > 0) {
          dispatch(restoreAIMaterials(selectedGeneratedImage.aiMaterials));
        } else {
          dispatch(clearAIMaterials());
        }
        
        // 3. Settings Snapshot from generation batch (creativity, expressivity, resemblance, etc.)
        if (selectedGeneratedImage.settingsSnapshot && Object.keys(selectedGeneratedImage.settingsSnapshot).length > 0) {
          dispatch(loadSettingsFromImage({
            settings: {
              selectedStyle: selectedGeneratedImage.settingsSnapshot.mode || 'photorealistic',
              creativity: selectedGeneratedImage.settingsSnapshot.creativity || 3,
              expressivity: selectedGeneratedImage.settingsSnapshot.expressivity || 2,
              resemblance: selectedGeneratedImage.settingsSnapshot.resemblance || 3,
              variations: selectedGeneratedImage.settingsSnapshot.variations || 1,
              selections: selectedGeneratedImage.settingsSnapshot.regions || {},
              contextSelection: selectedGeneratedImage.contextSelection
            },
            inputImageId: baseInputImageId,
            imageId: selectedImageId,
            isGeneratedImage: true
          }));
        } else {
          dispatch(resetSettings());
        }

        // 4. Context Selection from generation batch
        if (selectedGeneratedImage.contextSelection) {
        }
        
        // 5. Mask Material Mappings will be restored when masks are loaded (see next useEffect)
        if (selectedGeneratedImage.maskMaterialMappings && Object.keys(selectedGeneratedImage.maskMaterialMappings).length > 0) {
        } else {
          dispatch(clearMaskMaterialSelections());
        }
        
      }
    }
  }, [dispatch, selectedImageId, selectedImageType, historyImages, baseInputImageId, inputImages]);

  // Restore mask material mappings from generation batch when base masks are loaded (with batch change detection)
  useEffect(() => {
    if (selectedImageId && selectedImageType === 'generated' && historyImages.length > 0 && masks.length > 0) {
      const selectedGeneratedImage = historyImages.find(img => img.id === selectedImageId);
      
      // Check if this is a different batch or image to force mask mapping reload
      const currentBatchId = selectedGeneratedImage?.batchId;
      const batchChanged = currentBatchId !== prevSelectedBatchIdRef.current;
      const imageChanged = selectedImageId !== prevSelectedImageIdRef.current;
      
      if (selectedGeneratedImage && (batchChanged || imageChanged)) {

        if (selectedGeneratedImage.maskMaterialMappings) {
          const mappingsCount = Object.keys(selectedGeneratedImage.maskMaterialMappings).length;
          if (mappingsCount > 0) {
            
            // Clear previous mappings first to ensure clean state
            dispatch(clearMaskMaterialSelections());
            
            // Apply mask material mappings from the generation batch to the loaded base masks
            dispatch(restoreMaskMaterialMappings(selectedGeneratedImage.maskMaterialMappings));
            
          } else {
            dispatch(clearMaskMaterialSelections());
          }
        } else {
          dispatch(clearMaskMaterialSelections());
        }
      }
    }
  }, [dispatch, selectedImageId, selectedImageType, masks.length, historyImages]);

  // Clear restored images and update tracking when selectedImageId changes
  useEffect(() => {
    // Clear restored images cache when switching to a different image
    // This allows re-restoration when switching between generated images
    restoredImageIds.current.clear();
  }, [selectedImageId]);

  // Event handlers
  const handleImageUpload = async (file: File) => {
    try {
      const resultAction = await dispatch(uploadInputImage({ file, uploadSource: 'CREATE_MODULE' }));
      if (uploadInputImage.fulfilled.match(resultAction)) {
        dispatch(setSelectedImage({ id: resultAction.payload.id, type: 'input' }));
        toast.success('Image uploaded successfully');
      } else if (uploadInputImage.rejected.match(resultAction)) {
        const errorMessage = resultAction.payload as string;
        toast.error(errorMessage || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('An unexpected error occurred during upload');
    }
  };

  const handleSubmit = async (userPrompt?: string, contextSelection?: string) => {
    
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
      
      
      // Note: Credit and subscription validation moved to backend

      // Determine if we need to create a new InputImage or use existing one
      let inputImageIdForGeneration: number;
      
      if (selectedImageType === 'input') {
        // Case 1: Selected image is an InputImage - use it directly
        inputImageIdForGeneration = selectedImageId!;
      } else if (selectedImageType === 'generated' && baseInputImageId) {
        // Case 2: Selected image is a generated image - create new InputImage from it with copied masks
        const selectedGeneratedImage = historyImages.find(img => img.id === selectedImageId)!;
        
        // For "Create from Generated" workflow, we use frontend state directly
        // without modifying the original input image
        
        const createResult = await dispatch(createInputImageFromGenerated({
          generatedImageUrl: selectedGeneratedImage.imageUrl!,
          generatedThumbnailUrl: selectedGeneratedImage.thumbnailUrl,
          generatedProcessedUrl: selectedGeneratedImage.processedImageUrl,
          originalInputImageId: baseInputImageId,
          fileName: `create-from-${selectedImageId}_${Date.now()}.jpg`,
          currentPrompt: finalPrompt || undefined, // Pass the final prompt (userPrompt || basePrompt)
          maskPrompts // Pass current mask prompts from frontend state
        }));
        
        if (createInputImageFromGenerated.fulfilled.match(createResult)) {
          inputImageIdForGeneration = createResult.payload.id;
          
          // Select the newly created InputImage
          dispatch(setSelectedImage({ id: inputImageIdForGeneration, type: 'input' }));
          
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

      const result = await dispatch(generateWithCurrentState(generateRequest));
      
      if (generateWithCurrentState.fulfilled.match(result)) {
        
        // Close the prompt modal first
        dispatch(setIsPromptModalOpen(false));
        
        // Processing variations will be handled by WebSocket updates
      } else {
        console.error('RunPod generation failed:', result.payload);
        
        // Handle backend validation errors
        const errorPayload = result.payload as any;
        
        if (errorPayload?.code === 'SUBSCRIPTION_REQUIRED') {
          toast.error('Please upgrade your subscription to create images');
          setTimeout(() => {
            navigate('/subscription');
          }, 2000);
        } else if (errorPayload?.code === 'INSUFFICIENT_CREDITS') {
          toast.error('Insufficient credits. Please upgrade your plan.');
          setTimeout(() => {
            navigate('/subscription');
          }, 2000);
        } else {
          toast.error(errorPayload?.message || 'Generation failed');
        }
      }
    } catch (error) {
      console.error('Error starting RunPod generation:', error);
    }
  };

  // Helper function to get detailed image information for debugging
  const getImageDetails = (imageId: number, imageType: 'input' | 'generated') => {
    if (imageType === 'input') {
      const inputImage = inputImages.find(img => img.id === imageId);
      return inputImage ? {
        id: inputImage.id,
        fileName: inputImage.fileName,
        uploadSource: inputImage.uploadSource,
        hasAIMaterials: !!(inputImage.aiMaterials && inputImage.aiMaterials.length > 0),
        hasPrompt: !!inputImage.aiPrompt,
        isProcessed: inputImage.isProcessed,
        createdAt: inputImage.createdAt
      } : null;
    } else {
      const generatedImage = historyImages.find(img => img.id === imageId);
      return generatedImage ? {
        id: generatedImage.id,
        batchId: generatedImage.batchId,
        variationNumber: generatedImage.variationNumber,
        status: generatedImage.status,
        moduleType: generatedImage.moduleType,
        hasAIPrompt: !!generatedImage.aiPrompt,
        hasAIMaterials: !!(generatedImage.aiMaterials && generatedImage.aiMaterials.length > 0),
        hasMaskMappings: !!(generatedImage.maskMaterialMappings && Object.keys(generatedImage.maskMaterialMappings).length > 0),
        hasSettingsSnapshot: !!(generatedImage.settingsSnapshot && Object.keys(generatedImage.settingsSnapshot).length > 0),
        contextSelection: generatedImage.contextSelection,
        createdAt: generatedImage.createdAt
      } : null;
    }
  };

  const handleSelectImage = async (imageId: number, sourceType?: 'input' | 'generated') => {
    
    // Use sourceType if provided, otherwise determine from the arrays
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
        
        // For ID collisions, prioritize newly uploaded images over generated images
        // Check the upload source and creation time to determine which is more recent
        const inputImage = inputImages.find(img => img.id === imageId);
        
        const isRecentUpload = inputImage && (
          inputImage.uploadSource === 'CREATE_MODULE' || 
          inputImage.uploadSource === 'TWEAK_MODULE' ||
          Date.now() - inputImage.createdAt.getTime() < 60000 // Created within last minute
        );
        
        if (isRecentUpload) {
          imageType = 'input';
        } else {
          imageType = 'generated';
        }
        
        // Still log the warning for debugging
        console.warn('⚠️ Note: ID collision was automatically resolved based on upload characteristics');
      } else {
        console.warn('⚠️ Selected image not found in either input or history images');
        return;
      }
    }

    // Get detailed information about the selected image
    const imageDetails = getImageDetails(imageId, imageType);
    
    // Update last auto-selected to prevent conflicts with auto-selection
    lastAutoSelectedId.current = imageId;

    if (imageType === 'input') {
      // INPUT IMAGE SELECTED: Pull data from InputImage record
      
      dispatch(setSelectedImage({ 
        id: imageId, 
        type: imageType, 
        baseInputImageId: imageId 
      }));
      
      // Only reset settings if this is not a newly created InputImage from generated workflow
      const imageDetails = getImageDetails(imageId, imageType);
      const isRecentlyCreated = imageDetails && Date.now() - imageDetails.createdAt.getTime() < 10000; // Within last 10 seconds
      
      if (!isRecentlyCreated) {
        // Reset Edit Inspector settings when switching to older input images
        dispatch(resetSettings());
      } else {
      }
      
      // Show data source summary
      setTimeout(() => {
        const summary = getDataSourceSummary();
      }, 100);
      
    } else if (imageType === 'generated') {
      // GENERATED IMAGE SELECTED: Pull data from Generation batch
      const selectedGeneratedImage = historyImages.find(img => img.id === imageId);
      if (selectedGeneratedImage) {
        
        const baseInputImageId = await getBaseInputImageIdFromGenerated(selectedGeneratedImage);
        
        
        // Set the selected image with the base input image ID
        dispatch(setSelectedImage({ 
          id: imageId, 
          type: imageType, 
          baseInputImageId: baseInputImageId 
        }));
        
        
        // Show data source summary
        setTimeout(() => {
          const summary = getDataSourceSummary();
        }, 100);
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

  const handleUpscale = () => {
    // Navigate to the upscale page with the current image information
    const imageData = getCurrentImageData();
    if (imageData && getCurrentImageUrl()) {
      // Pass the image data as state to the refine page
      navigate('/upscale', { 
        state: { 
          imageId: imageData.id,
          imageUrl: getCurrentImageUrl(),
          imageType: selectedImageType === 'input' ? 'uploaded' : 'generated'
        } 
      });
    }
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
  //     }
  //   } catch (error) {
  //     console.error('Failed to convert generated image:', error);
  //   }
  // };
  
  const getCurrentImageUrl = () => {
    if (!selectedImageId || !selectedImageType) {
      return undefined;
    }
    
    // Use selectedImageType to determine which collection to search
    if (selectedImageType === 'input') {
      const inputImage = inputImages.find(img => img.id === selectedImageId);
      if (inputImage) {
        // For input images, prioritize original URL over processed URL for canvas display
        const displayUrl = inputImage.originalUrl || inputImage.processedUrl || inputImage.imageUrl;
        return displayUrl;
      } else {
      }
    } else if (selectedImageType === 'generated') {
      const historyImage = historyImages.find(img => img.id === selectedImageId);
      if (historyImage) {
        // For generated images, imageUrl should already be the original high-resolution image from the API
        return historyImage.imageUrl;
      } else {
      }
    }
    
    return undefined;
  };

  const getCurrentImageData = () => {
    if (!selectedImageId || !selectedImageType) {
      return null;
    }
    
    // Use selectedImageType to determine which collection to search
    if (selectedImageType === 'input') {
      const inputImage = inputImages.find(img => img.id === selectedImageId);
      return inputImage || null;
    } else if (selectedImageType === 'generated') {
      const historyImage = historyImages.find(img => img.id === selectedImageId);
      return historyImage || null;
    }
    
    return null;
  };

  // Summary function to show what data sources are being used
  const getDataSourceSummary = () => {
    if (!selectedImageId || !selectedImageType) {
      return { type: 'none', sources: [] };
    }

    if (selectedImageType === 'input') {
      const inputImage = inputImages.find(img => img.id === selectedImageId);
      return {
        type: 'input',
        imageId: selectedImageId,
        sources: [
          { data: 'Masks', source: 'InputImage.masks relationship' },
          { data: 'AI Prompt', source: 'InputImage.aiPrompt field' },
          { data: 'AI Materials', source: inputImage?.aiMaterials?.length ? 'InputImage.aiMaterials field' : 'Database API' },
          { data: 'Mask Prompts', source: 'Mask.customText and related fields' }
        ]
      };
    } else {
      const generatedImage = historyImages.find(img => img.id === selectedImageId);
      return {
        type: 'generated',
        imageId: selectedImageId,
        batchId: generatedImage?.batchId,
        sources: [
          { data: 'Masks', source: `Original InputImage (ID: ${baseInputImageId})` },
          { data: 'AI Prompt Materials', source: `Original InputImage database (ID: ${baseInputImageId})` },
          { data: 'AI Prompt', source: 'GeneratedImage.aiPrompt field (from batch)' },
          { data: 'AI Materials', source: 'GeneratedImage.aiMaterials field (from batch)' },
          { data: 'Mask Prompts', source: 'GeneratedImage.maskMaterialMappings field (from batch)' },
          { data: 'Settings', source: 'GeneratedImage.settingsSnapshot field (from batch)' },
          { data: 'Context Selection', source: 'GeneratedImage.contextSelection field (from batch)' }
        ]
      };
    }
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