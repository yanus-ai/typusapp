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
import { generateWithCurrentState, addProcessingVariations, fetchAllCreateImages } from '@/features/images/historyImagesSlice';
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

  // Load input images and RunPod history on component mount (with duplicate prevention)
  useEffect(() => {
    // Prevent duplicate API calls
    if (dataLoadStarted.current) {
      console.log('⏭️ Skipping data load - already started');
      return;
    }
    
    dataLoadStarted.current = true;
    console.log('🚀 Starting initial data load for Create page...');

    const loadAllData = async () => {
      // Load both CREATE images and input images in parallel for better performance
      const [createImagesResult, inputImagesResult] = await Promise.allSettled([
        dispatch(fetchAllCreateImages()),
        dispatch(fetchInputImagesBySource({ uploadSource: 'CREATE_MODULE' }))
      ]);

      // Handle CREATE images result
      if (createImagesResult.status === 'fulfilled') {
        console.log('✅ All CREATE images loaded');
      } else {
        console.error('❌ Failed to load CREATE images:', createImagesResult.reason);
      }

      // Handle input images result  
      if (inputImagesResult.status === 'fulfilled') {
        const resultAction = inputImagesResult.value;
        
        if (fetchInputImagesBySource.fulfilled.match(resultAction)) {
          const loadedImages = resultAction.payload.inputImages;
        
        // Handle URL parameters after images are loaded
        if (!urlParamsProcessed.current && loadedImages.length > 0) {
          const imageIdParam = searchParams.get('imageId');
          const showMasksParam = searchParams.get('showMasks');
          const sourceParam = searchParams.get('source'); // Add source parameter detection
          
          if (imageIdParam) {
            const targetImageId = parseInt(imageIdParam);
            const targetImage = loadedImages.find((img: any) => img.id === targetImageId);
            
            if (targetImage) {
              console.log('🔗 URL params: Selecting input image from URL:', targetImageId);
              console.log('🔗 URL params: Source:', sourceParam || 'unknown');
              dispatch(setSelectedImage({ id: targetImageId, type: 'input' }));
              
              // If showMasks=true, open the AI prompt modal after a short delay
              // Use longer delay for webhook/revit sources to allow mask processing to complete
              if (showMasksParam === 'true') {
                console.log('🔗 URL params: Opening AI prompt modal due to showMasks=true');
                const isFromWebhook = sourceParam === 'webhook' || sourceParam === 'revit';
                const delay = isFromWebhook ? 2000 : 1000; // Longer delay for webhook sources
                
                if (isFromWebhook) {
                  console.log('🔗 URL params: Detected webhook/revit source, using extended delay');
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
          } else if (loadedImages.length > 0) {
            // Default behavior when no URL params: always select the most recent input image on page reload
            console.log('🔄 Page reload: Auto-selecting most recent input image (no URL params):', loadedImages[0].id);
            dispatch(setSelectedImage({ id: loadedImages[0].id, type: 'input' }));
            urlParamsProcessed.current = true;
          }
        } else {
          console.error('❌ Failed to load input images:', (inputImagesResult as any).reason);
        }
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
  
  // Enhanced function to load data based on selected image type with batch awareness
  const loadDataForSelectedImage = async (imageId: number, imageType: 'input' | 'generated', inputImageId: number, clearPrevious: boolean = true) => {
    // Get batch ID for generated images to create unique cache keys
    const batchId = imageType === 'generated' ? historyImages.find(img => img.id === imageId)?.batchId : undefined;
    const cacheKey = imageType === 'generated' ? `${inputImageId}-${batchId}` : `${inputImageId}`;
    
    // Prevent duplicate API calls for the same image/batch combination
    if (loadingImageDataRef.current === inputImageId) {
      console.log('⏭️ Skipping data load - already loading for image:', inputImageId);
      return inputImageId;
    }
    
    loadingImageDataRef.current = inputImageId;
    console.log('🔄 Loading data with batch awareness:', {
      selectedImageId: imageId,
      selectedImageType: imageType,
      baseInputImageId: inputImageId,
      batchId,
      cacheKey,
      clearPrevious
    });
    
    // For generated images with batch changes, always clear previous data
    if (imageType === 'generated' && clearPrevious) {
      console.log('🧹 BATCH CHANGE DETECTED - Force clearing all previous data');
      dispatch(resetMaskState());
      dispatch(clearMaskMaterialSelections());
      dispatch(clearSavedPrompt());
      dispatch(clearAIMaterials());
      restoredImageIds.current.clear();
      
      // Clear cache for all batch-specific entries
      loadedImageDataCache.current.clear();
    } else if (clearPrevious) {
      // Standard clearing for input images or initial loads
      console.log('🧹 Clearing previous data before loading new image data');
      dispatch(resetMaskState());
      dispatch(clearMaskMaterialSelections());
      dispatch(clearSavedPrompt());
      dispatch(clearAIMaterials());
      restoredImageIds.current.clear();
    }
    
    if (imageType === 'input') {
      console.log('📥 Loading data for INPUT image:', imageId);
      await loadDataForInputImage(inputImageId, clearPrevious);
    } else if (imageType === 'generated') {
      console.log('📤 Loading data for GENERATED image from batch:', batchId);
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

    console.log('📥 Loading INPUT image data:', {
      inputImageId,
      fileName: selectedInputImage.fileName,
      uploadSource: selectedInputImage.uploadSource,
      hasStoredAIMaterials: !!(selectedInputImage.aiMaterials && selectedInputImage.aiMaterials.length > 0),
      hasStoredPrompt: !!selectedInputImage.aiPrompt
    });

    if (clearPrevious) {
      const hasStoredAIMaterials = selectedInputImage.aiMaterials && selectedInputImage.aiMaterials.length > 0;
      
      console.log('📥 PULLING DATA FROM INPUT IMAGE:', {
        masks: 'Loading from InputImage masks relationship',
        prompt: 'Loading from InputImage.aiPrompt field',
        aiMaterials: hasStoredAIMaterials ? 'Available in InputImage.aiMaterials' : 'Will load from database'
      });
      
      // Dispatch all API calls in parallel for input images
      const promises = [
        dispatch(getMasks(inputImageId)), // PULL: Masks from InputImage.masks relationship
        dispatch(getSavedPrompt(inputImageId)) // PULL: Prompt from InputImage.aiPrompt field
      ];

      // PULL: AI materials from InputImage.aiMaterials or database
      if (selectedInputImage.uploadSource === 'CREATE_MODULE') {
        console.log('🎨 PULLING AI materials from database for user uploaded image');
        promises.push(dispatch(getAIPromptMaterials(inputImageId)));
      } else if (hasStoredAIMaterials) {
        console.log('🎨 PULLING AI materials from InputImage.aiMaterials field:', selectedInputImage.aiMaterials!.length, 'items');
        dispatch(restoreAIMaterials(selectedInputImage.aiMaterials!));
      }

      await Promise.allSettled(promises);
      console.log('✅ INPUT image data pull completed - masks, prompt, and AI materials loaded');
    } else {
      // Minimal load for generated image context
      console.log('📦 Loading base masks only for generated image context');
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

    console.log('📤 Loading GENERATED image data:', {
      generatedImageId,
      baseInputImageId,
      batchId: selectedGeneratedImage.batchId,
      hasStoredMaskMappings: !!(selectedGeneratedImage.maskMaterialMappings && Object.keys(selectedGeneratedImage.maskMaterialMappings).length > 0),
      hasStoredAIPrompt: !!selectedGeneratedImage.aiPrompt,
      hasStoredAIMaterials: !!(selectedGeneratedImage.aiMaterials && selectedGeneratedImage.aiMaterials.length > 0),
      hasSettingsSnapshot: !!(selectedGeneratedImage.settingsSnapshot && Object.keys(selectedGeneratedImage.settingsSnapshot).length > 0),
      contextSelection: selectedGeneratedImage.contextSelection
    });

    console.log('📤 PULLING DATA FROM GENERATION BATCH:', {
      masks: 'From original InputImage (via baseInputImageId)',
      aiPromptMaterials: 'From original InputImage database (via getAIPromptMaterials)',
      prompt: selectedGeneratedImage.aiPrompt ? 'Available in GeneratedImage.aiPrompt' : 'Not available',
      aiMaterials: selectedGeneratedImage.aiMaterials?.length ? `Available: ${selectedGeneratedImage.aiMaterials.length} items` : 'Not available',
      maskPrompts: selectedGeneratedImage.maskMaterialMappings ? `Available: ${Object.keys(selectedGeneratedImage.maskMaterialMappings).length} mappings` : 'Not available',
      settings: selectedGeneratedImage.settingsSnapshot ? `Available: ${Object.keys(selectedGeneratedImage.settingsSnapshot)}` : 'Not available',
      contextSelection: selectedGeneratedImage.contextSelection || 'Not available'
    });

    // PULL: Base masks and AI prompt materials from the original input image
    console.log('📦 PULLING base masks and AI prompt materials from original InputImage:', baseInputImageId);
    const promises = [
      dispatch(getMasks(baseInputImageId)), // PULL: Base masks
      dispatch(getAIPromptMaterials(baseInputImageId)) // PULL: AI prompt materials for base input image
    ];
    
    await Promise.allSettled(promises);
    console.log('✅ Base masks and AI prompt materials loaded for generated image context');

    if (clearPrevious) {
      // PULL generation-specific data from the generation batch record
      
      // 1. PULL AI prompt from generation batch (optional restore)
      if (selectedGeneratedImage.aiPrompt) {
        console.log('📝 AI Prompt from generation batch available (will be restored in useEffect)');
      }

      // 2. PULL AI materials from generation batch
      if (selectedGeneratedImage.aiMaterials && selectedGeneratedImage.aiMaterials.length > 0) {
        console.log('🎨 PULLING AI materials from generation batch:', selectedGeneratedImage.aiMaterials.length, 'materials');
        dispatch(restoreAIMaterials(selectedGeneratedImage.aiMaterials));
      }

      // 3. PULL settings snapshot from generation batch
      if (selectedGeneratedImage.settingsSnapshot && Object.keys(selectedGeneratedImage.settingsSnapshot).length > 0) {
        console.log('⚙️ Settings snapshot from generation batch will be restored in useEffect');
      }

      // 4. PULL mask mappings from generation batch (when masks are loaded)
      if (selectedGeneratedImage.maskMaterialMappings && Object.keys(selectedGeneratedImage.maskMaterialMappings).length > 0) {
        console.log('🎭 Mask mappings from generation batch will be restored when base masks finish loading');
      }

      console.log('✅ GENERATED image data pull from generation batch initiated');
    }
  };

  // Enhanced Redux state-driven data loading with batch and image type awareness
  useEffect(() => {
    // Get current batch ID for generated images
    const currentBatchId = selectedImageType === 'generated' && selectedImageId 
      ? historyImages.find(img => img.id === selectedImageId)?.batchId 
      : undefined;

    console.log('🔄 Enhanced Redux effect triggered:', {
      baseInputImageId,
      prevInputImageIdRef: prevInputImageIdRef.current,
      selectedImageId,
      prevSelectedImageIdRef: prevSelectedImageIdRef.current,
      selectedImageType,
      currentBatchId,
      prevSelectedBatchIdRef: prevSelectedBatchIdRef.current,
      conditions: {
        baseInputImageChanged: baseInputImageId !== prevInputImageIdRef.current,
        selectedImageChanged: selectedImageId !== prevSelectedImageIdRef.current,
        batchChanged: currentBatchId && currentBatchId !== prevSelectedBatchIdRef.current
      }
    });
    
    // Determine if we need to reload data based on various change conditions
    const baseInputImageChanged = baseInputImageId && baseInputImageId !== prevInputImageIdRef.current;
    const selectedImageChanged = selectedImageId && selectedImageId !== prevSelectedImageIdRef.current;
    const batchChanged = selectedImageType === 'generated' && currentBatchId && currentBatchId !== prevSelectedBatchIdRef.current;
    
    const shouldReloadData = baseInputImageChanged || selectedImageChanged || batchChanged;
    
    if (baseInputImageId && selectedImageId && selectedImageType && shouldReloadData) {
      console.log('🔄 Data reload triggered:', {
        reason: baseInputImageChanged ? 'base input image changed' : 
                selectedImageChanged ? 'selected image changed' : 
                batchChanged ? 'generation batch changed' : 'unknown',
        previousBaseInputImageId: prevInputImageIdRef.current,
        newBaseInputImageId: baseInputImageId,
        previousSelectedImageId: prevSelectedImageIdRef.current,
        newSelectedImageId: selectedImageId,
        previousBatchId: prevSelectedBatchIdRef.current,
        newBatchId: currentBatchId,
        selectedImageType
      });
      
      // Use the enhanced loading function with image type awareness
      if (selectedImageType === 'generated') {
        // For generated images, force clear if batch changed or selected image changed
        const shouldClear = !!(batchChanged || selectedImageChanged);
        console.log('🔄 Loading data for selected GENERATED image:', {
          shouldClearPreviousData: shouldClear,
          reason: shouldClear ? (batchChanged ? 'batch changed' : 'image changed') : 'base input changed'
        });
        loadDataForSelectedImage(selectedImageId, 'generated', baseInputImageId, shouldClear);
      } else {
        console.log('🔄 Loading fresh data for selected INPUT image');
        loadDataForSelectedImage(selectedImageId, 'input', baseInputImageId, true); // Always clear for input images
      }
      
      // Update all tracking references
      prevInputImageIdRef.current = baseInputImageId;
      prevSelectedImageIdRef.current = selectedImageId;
      prevSelectedBatchIdRef.current = currentBatchId;
    } else if (!baseInputImageId && prevInputImageIdRef.current !== undefined) {
      // Reset state when no base input image is available
      console.log('🧹 Resetting state (no base input image available)');
      dispatch(resetMaskState());
      dispatch(clearMaskMaterialSelections());
      dispatch(clearSavedPrompt());
      dispatch(clearAIMaterials());
      prevInputImageIdRef.current = undefined;
      prevSelectedImageIdRef.current = undefined;
      prevSelectedBatchIdRef.current = undefined;
    } else {
      console.log('⏭️ Skipping data load - no significant changes detected:', {
        baseInputImageId,
        selectedImageId,
        selectedImageType,
        currentBatchId,
        prevStates: {
          baseInputImageId: prevInputImageIdRef.current,
          selectedImageId: prevSelectedImageIdRef.current,
          batchId: prevSelectedBatchIdRef.current
        }
      });
    }
  }, [baseInputImageId, selectedImageType, selectedImageId, historyImages, dispatch]);

  // Enhanced restoration of generated image data from Generation batch with batch change detection
  useEffect(() => {
    if (selectedImageId && selectedImageType === 'generated' && historyImages.length > 0) {
      const selectedGeneratedImage = historyImages.find(img => img.id === selectedImageId);
      
      // Get current and previous batch IDs to detect batch changes
      const currentBatchId = selectedGeneratedImage?.batchId;
      const batchChanged = currentBatchId !== prevSelectedBatchIdRef.current;
      const imageChanged = selectedImageId !== prevSelectedImageIdRef.current;
      
      if (selectedGeneratedImage && (batchChanged || imageChanged || !restoredImageIds.current.has(selectedImageId))) {
        console.log('🎯 GENERATED IMAGE BATCH DATA RESTORE:', {
          generatedImageId: selectedImageId,
          batchId: currentBatchId,
          previousBatchId: prevSelectedBatchIdRef.current,
          baseInputImageId,
          changeReason: batchChanged ? 'batch changed' : imageChanged ? 'image changed' : 'first load',
          dataAvailable: {
            maskMaterialMappings: !!selectedGeneratedImage.maskMaterialMappings,
            aiPrompt: !!selectedGeneratedImage.aiPrompt,
            aiMaterials: !!(selectedGeneratedImage.aiMaterials && selectedGeneratedImage.aiMaterials.length > 0),
            settingsSnapshot: !!selectedGeneratedImage.settingsSnapshot,
            contextSelection: !!selectedGeneratedImage.contextSelection
          },
          detailedData: {
            aiPrompt: selectedGeneratedImage.aiPrompt ? selectedGeneratedImage.aiPrompt.substring(0, 50) + '...' : null,
            aiMaterialsCount: selectedGeneratedImage.aiMaterials?.length || 0,
            settingsSnapshotKeys: selectedGeneratedImage.settingsSnapshot ? Object.keys(selectedGeneratedImage.settingsSnapshot) : [],
            maskMappingsCount: selectedGeneratedImage.maskMaterialMappings ? Object.keys(selectedGeneratedImage.maskMaterialMappings).length : 0,
            contextSelection: selectedGeneratedImage.contextSelection
          }
        });

        // Clear previous restored images when batch changes to force reload
        if (batchChanged || imageChanged) {
          console.log('🧹 Clearing restored images cache due to batch/image change');
          restoredImageIds.current.clear();
        }
        
        // Mark this image as restored to prevent infinite loops
        restoredImageIds.current.add(selectedImageId);

        // CLEAR AND PULL DATA FROM NEW GENERATION BATCH:

        // 1. AI Prompt from generation batch (optional auto-restore)
        if (selectedGeneratedImage.aiPrompt) {
          console.log('📝 PULLING AI Prompt from generation batch:', selectedGeneratedImage.aiPrompt.substring(0, 100) + '...');
          // Auto-restore prompt for generated images to show what was used
          dispatch(restoreSavedPrompt(selectedGeneratedImage.aiPrompt));
        } else {
          console.log('📝 No AI prompt in generation batch - clearing previous prompt');
          dispatch(clearSavedPrompt());
        }

        // 2. AI Materials from generation batch
        if (selectedGeneratedImage.aiMaterials && selectedGeneratedImage.aiMaterials.length > 0) {
          console.log('🎨 PULLING AI Materials from generation batch:', selectedGeneratedImage.aiMaterials.length, 'materials');
          dispatch(restoreAIMaterials(selectedGeneratedImage.aiMaterials));
        } else {
          console.log('🎨 No AI materials in generation batch - clearing previous materials');
          dispatch(clearAIMaterials());
        }
        
        // 3. Settings Snapshot from generation batch (creativity, expressivity, resemblance, etc.)
        if (selectedGeneratedImage.settingsSnapshot && Object.keys(selectedGeneratedImage.settingsSnapshot).length > 0) {
          console.log('⚙️ PULLING Settings from generation batch:', Object.keys(selectedGeneratedImage.settingsSnapshot));
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
          console.log('⚙️ No settings snapshot in generation batch - using defaults');
          dispatch(resetSettings());
        }

        // 4. Context Selection from generation batch
        if (selectedGeneratedImage.contextSelection) {
          console.log('🎯 Context selection from generation batch:', selectedGeneratedImage.contextSelection);
        }
        
        // 5. Mask Material Mappings will be restored when masks are loaded (see next useEffect)
        if (selectedGeneratedImage.maskMaterialMappings && Object.keys(selectedGeneratedImage.maskMaterialMappings).length > 0) {
          console.log('🎭 Mask mappings from generation batch will be restored when base masks finish loading');
        } else {
          console.log('🎭 No mask mappings in generation batch - will use base masks only');
          dispatch(clearMaskMaterialSelections());
        }
        
        console.log('✅ Generation batch data restore completed');
      }
    }
  }, [dispatch, selectedImageId, selectedImageType, historyImages, baseInputImageId]);

  // Restore mask material mappings from generation batch when base masks are loaded (with batch change detection)
  useEffect(() => {
    if (selectedImageId && selectedImageType === 'generated' && historyImages.length > 0 && masks.length > 0) {
      const selectedGeneratedImage = historyImages.find(img => img.id === selectedImageId);
      
      // Check if this is a different batch or image to force mask mapping reload
      const currentBatchId = selectedGeneratedImage?.batchId;
      const batchChanged = currentBatchId !== prevSelectedBatchIdRef.current;
      const imageChanged = selectedImageId !== prevSelectedImageIdRef.current;
      
      if (selectedGeneratedImage && (batchChanged || imageChanged)) {
        console.log('🎭 MASK MAPPINGS RESTORE CHECK:', {
          generatedImageId: selectedImageId,
          batchId: currentBatchId,
          previousBatchId: prevSelectedBatchIdRef.current,
          changeReason: batchChanged ? 'batch changed' : 'image changed',
          baseMasksCount: masks.length,
          hasMaskMappings: !!selectedGeneratedImage.maskMaterialMappings
        });

        if (selectedGeneratedImage.maskMaterialMappings) {
          const mappingsCount = Object.keys(selectedGeneratedImage.maskMaterialMappings).length;
          if (mappingsCount > 0) {
            console.log('🎭 PULLING MASK PROMPTS from Generation batch - restoring after base masks loaded:', {
              generatedImageId: selectedImageId,
              batchId: currentBatchId,
              baseMasksCount: masks.length,
              maskMappingsFromBatch: mappingsCount,
              baseMaskIds: masks.map(m => m.id),
              mappingKeys: Object.keys(selectedGeneratedImage.maskMaterialMappings),
              sampleMaskMapping: Object.values(selectedGeneratedImage.maskMaterialMappings)[0]
            });
            
            // Clear previous mappings first to ensure clean state
            dispatch(clearMaskMaterialSelections());
            
            // Apply mask material mappings from the generation batch to the loaded base masks
            dispatch(restoreMaskMaterialMappings(selectedGeneratedImage.maskMaterialMappings));
            
            console.log('✅ Mask prompts from generation batch restored successfully');
          } else {
            console.log('⏭️ No mask mappings in generation batch - clearing previous mappings');
            dispatch(clearMaskMaterialSelections());
          }
        } else {
          console.log('⏭️ No mask mappings found in generation batch - clearing previous mappings');
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
    console.log('🧹 Cleared restored images cache due to image selection change');
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
      
      // Note: Credit and subscription validation moved to backend

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

      console.log('Dispatching new generateWithCurrentState with:', generateRequest);
      const result = await dispatch(generateWithCurrentState(generateRequest));
      
      if (generateWithCurrentState.fulfilled.match(result)) {
        console.log('RunPod generation started successfully:', result.payload);
        
        // Close the prompt modal first
        dispatch(setIsPromptModalOpen(false));
        
        // Add processing variations for UI feedback (only after modal closes)
        console.log('✨ Adding processing variations for UI feedback after modal closes');
        if (result.payload.runpodJobs && result.payload.runpodJobs.length > 0) {
          const realImageIds = result.payload.runpodJobs.map((job: any) => parseInt(job.imageId) || job.imageId);
          console.log('🔄 Adding processing variations with real job IDs:', realImageIds);
          dispatch(addProcessingVariations({
            batchId: result.payload.batchId,
            totalVariations: selectedVariations,
            imageIds: realImageIds
          }));
        } else {
          // Fallback to temporary IDs if no job IDs are available
          const tempImageIds = Array.from({ length: selectedVariations }, (_, index) => Date.now() + index);
          dispatch(addProcessingVariations({
            batchId: result.payload.batchId,
            totalVariations: selectedVariations,
            imageIds: tempImageIds
          }));
        }
      } else {
        console.error('RunPod generation failed:', result.payload);
        
        // Handle backend validation errors
        const errorPayload = result.payload as any;
        console.log('🔍 Error payload structure:', errorPayload);
        
        if (errorPayload?.code === 'SUBSCRIPTION_REQUIRED') {
          console.log('🚨 Showing subscription required toast');
          toast.error('Please upgrade your subscription to create images');
          setTimeout(() => {
            console.log('🔄 Redirecting to subscription page');
            navigate('/subscription');
          }, 2000);
        } else if (errorPayload?.code === 'INSUFFICIENT_CREDITS') {
          console.log('🚨 Showing insufficient credits toast');
          toast.error('Insufficient credits. Please upgrade your plan.');
          setTimeout(() => {
            console.log('🔄 Redirecting to subscription page');
            navigate('/subscription');
          }, 2000);
        } else {
          console.log('🚨 Showing generic error toast');
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
    console.log('🖼️ IMAGE SELECTION - Identifying image type and preparing data pull:', { 
      targetImageId: imageId, 
      providedSourceType: sourceType,
      hasInputImage: inputImages.some(img => img.id === imageId),
      hasGeneratedImage: historyImages.some(img => img.id === imageId)
    });
    
    // Use sourceType if provided, otherwise determine from the arrays
    let imageType: 'input' | 'generated';
    
    if (sourceType) {
      imageType = sourceType;
      console.log('✅ Image type provided explicitly:', imageType);
    } else {
      // Fallback logic if no sourceType provided
      const isInputImage = inputImages.some(img => img.id === imageId);
      const isGeneratedImage = historyImages.some(img => img.id === imageId);
      
      if (isInputImage && !isGeneratedImage) {
        imageType = 'input';
        console.log('✅ Image type identified as INPUT from image collections');
      } else if (isGeneratedImage && !isInputImage) {
        imageType = 'generated';
        console.log('✅ Image type identified as GENERATED from image collections');
      } else if (isInputImage && isGeneratedImage) {
        console.warn('⚠️ ID collision detected! Both input and generated images have ID:', imageId);
        console.warn('⚠️ Please specify sourceType to resolve ambiguity');
        return;
      } else {
        console.warn('⚠️ Selected image not found in either input or history images');
        return;
      }
    }

    // Get detailed information about the selected image
    const imageDetails = getImageDetails(imageId, imageType);
    console.log(`🔍 ${imageType.toUpperCase()} IMAGE DETAILS:`, imageDetails);
    
    // Update last auto-selected to prevent conflicts with auto-selection
    lastAutoSelectedId.current = imageId;

    if (imageType === 'input') {
      // INPUT IMAGE SELECTED: Pull data from InputImage record
      console.log('📥 INPUT IMAGE SELECTED - Will pull data from InputImage record:', {
        inputImageId: imageId,
        willPull: {
          masks: 'From InputImage.masks relationship',
          prompt: 'From InputImage.aiPrompt field', 
          aiMaterials: 'From InputImage.aiMaterials field or database',
          maskPrompts: 'From mask.customText and related fields'
        }
      });
      
      dispatch(setSelectedImage({ 
        id: imageId, 
        type: imageType, 
        baseInputImageId: imageId 
      }));
      
      // Reset Edit Inspector settings when switching to input image
      dispatch(resetSettings());
      
      // Show data source summary
      setTimeout(() => {
        const summary = getDataSourceSummary();
        console.log('📋 DATA SOURCE SUMMARY:', summary);
      }, 100);
      
    } else if (imageType === 'generated') {
      // GENERATED IMAGE SELECTED: Pull data from Generation batch
      const selectedGeneratedImage = historyImages.find(img => img.id === imageId);
      if (selectedGeneratedImage) {
        console.log('📤 GENERATED IMAGE SELECTED - Will pull data from Generation batch:', {
          generatedImageId: imageId,
          batchId: selectedGeneratedImage.batchId,
          willPull: {
            masks: 'From original InputImage (via baseInputImageId)',
            aiPromptMaterials: 'From original InputImage database (via getAIPromptMaterials)',
            prompt: 'From GeneratedImage.aiPrompt field',
            aiMaterials: 'From GeneratedImage.aiMaterials field',
            maskPrompts: 'From GeneratedImage.maskMaterialMappings field',
            settings: 'From GeneratedImage.settingsSnapshot field (creativity, expressivity, etc.)',
            contextSelection: 'From GeneratedImage.contextSelection field'
          },
          batchDataAvailable: {
            hasSettingsSnapshot: !!selectedGeneratedImage.settingsSnapshot,
            hasMaskMappings: !!selectedGeneratedImage.maskMaterialMappings,
            hasAiPrompt: !!selectedGeneratedImage.aiPrompt,
            hasAiMaterials: !!selectedGeneratedImage.aiMaterials,
            hasContextSelection: !!selectedGeneratedImage.contextSelection
          }
        });
        
        const baseInputImageId = await getBaseInputImageIdFromGenerated(selectedGeneratedImage);
        
        console.log('🖼️ Calculated base input image ID for masks:', baseInputImageId);
        
        // Set the selected image with the base input image ID
        dispatch(setSelectedImage({ 
          id: imageId, 
          type: imageType, 
          baseInputImageId: baseInputImageId 
        }));
        
        console.log('✅ Selection completed - data will be automatically pulled based on image type');
        
        // Show data source summary
        setTimeout(() => {
          const summary = getDataSourceSummary();
          console.log('📋 DATA SOURCE SUMMARY:', summary);
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

                {(
                  <Button
                    variant="outline"
                    onClick={handleUpscale}
                    className="absolute bottom-15 left-1/2 -translate-x-1/2 h-auto shadow-lg bg-white z-50"
                    title="Upscale Image"
                  >
                    Upscale Image
                  </Button>
                )}

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