import React, { useEffect, useRef, useState } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
// import { useRunPodWebSocket } from '@/hooks/useRunPodWebSocket';
import { useUserWebSocket } from '@/hooks/useUserWebSocket';
import { useCreditCheck } from '@/hooks/useCreditCheck';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import MainLayout from "@/components/layout/MainLayout";
import TweakCanvas, { TweakCanvasRef } from '@/components/tweak/TweakCanvas';
import ImageSelectionPanel from '@/components/tweak/ImageSelectionPanel';
import HistoryPanel from '@/components/create/HistoryPanel';
import TweakToolbar from '@/components/tweak/TweakToolbar';
import GalleryModal from '@/components/gallery/GalleryModal';
import FileUpload from '@/components/create/FileUpload';
import api from '@/lib/api';

// Redux actions
import { uploadInputImage } from '@/features/images/inputImagesSlice';
import { fetchInputAndCreateImages, fetchTweakHistoryForImage, fetchAllTweakImages, fetchAllVariations, addProcessingTweakVariations } from '@/features/images/historyImagesSlice';
import { fetchCurrentUser, updateCredits } from '@/features/auth/authSlice';
import {
  setPrompt,
  setIsGenerating,
  setSelectedBaseImageId,
  setSelectedBaseImageIdAndClearObjects,
  setSelectedImageWithContext,
  setCurrentTool,
  setVariations,
  generateInpaint,
  generateOutpaint,
  addImageToCanvas,
  undo,
  redo,
  hideCanvasSpinner,
  resetTimeoutStates,
  ImageType
} from '../../features/tweak/tweakSlice';
import { setIsModalOpen } from '@/features/gallery/gallerySlice';

const TweakPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const canvasRef = useRef<TweakCanvasRef | null>(null);
  const { checkCreditsBeforeAction } = useCreditCheck();
  const [processingUrlParams, setProcessingUrlParams] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Redux selectors - using new separated data structure
  const inputImages = useAppSelector(state => state.historyImages.inputImages);
  const createImages = useAppSelector(state => state.historyImages.createImages);
  const historyImages = useAppSelector(state => state.historyImages.images); // All create variations from fetchAllVariations
  const allTweakImages = useAppSelector(state => state.historyImages.allTweakImages); // ALL tweak generated images globally
  const currentBaseImageId = useAppSelector(state => state.historyImages.currentBaseImageId); // Original base image ID resolved by backend
  const loadingInputAndCreate = useAppSelector(state => state.historyImages.loadingInputAndCreate);
  const loadingAllTweakImages = useAppSelector(state => state.historyImages.loadingAllTweakImages); // Use loading state for all tweak images
  const loading = useAppSelector(state => state.historyImages.loading); // Loading state for fetchAllVariations
  const error = useAppSelector(state => state.historyImages.error);
  
  // Tweak state
  const { 
    selectedBaseImageId,
    selectedImageContext,
    currentTool, 
    prompt, 
    variations,
    isGenerating,
    canvasBounds,
    originalImageBounds,
    rectangleObjects,
    brushObjects,
    selectedRegions,
    history,
    historyIndex,
    showCanvasSpinner,
    retryInProgress,
    generationStartTime
  } = useAppSelector(state => state.tweak);
  
  // Gallery modal state
  const isGalleryModalOpen = useAppSelector(state => state.gallery.isModalOpen);

  // NEW: User-based WebSocket for reliable notifications regardless of selected image
  const { isConnected: isUserConnected } = useUserWebSocket({
    enabled: true
  });

  // Legacy WebSocket for backwards compatibility (keep both active during transition)
  // const { isConnected } = useRunPodWebSocket({
  //   inputImageId: selectedBaseImageId || undefined,
  //   enabled: !!selectedBaseImageId
  // });

  console.log('User WebSocket connected:', isUserConnected);
  // console.log('TWEAK selectedBaseImageId:', selectedBaseImageId, 'currentBaseImageId:', currentBaseImageId, 'isGenerating:', isGenerating);
  // console.log('TWEAK selectedImageContext:', selectedImageContext);
  // console.log('🔍 TWEAK WebSocket subscribing to ID:', selectedBaseImageId);
  
  // // Enhanced WebSocket debug info
  // console.log('🔍 TWEAK WebSocket Debug Info:', {
  //   isConnected,
  //   selectedBaseImageId,
  //   enabled: !!selectedBaseImageId,
  //   timestamp: new Date().toISOString(),
  //   userAgent: navigator.userAgent.slice(0, 50) + '...'
  // });
  
  // Debug URL parameters and current state
  const debugUrlParams = searchParams.get('imageId');
  const debugUrlType = searchParams.get('type');
  if (debugUrlParams) {
    console.log('🔍 TWEAK Page Current State:', {
      urlImageId: debugUrlParams,
      urlType: debugUrlType,
      selectedBaseImageId,
      hasHistoryImages: historyImages.length > 0,
      loading,
      loadingInputAndCreate
    });
  }
  
  // Automatic detection of new images (fallback when WebSocket fails)
  useEffect(() => {
    if (isGenerating && allTweakImages.length > 0) {
      // Give WebSocket a longer chance to work - wait 10 seconds before fallback
      const timeoutId = setTimeout(() => {
        // Check if there are any new completed images
        const recentImages = allTweakImages.filter(img => {
          const imgTime = new Date(img.createdAt).getTime();
          const tenSecondsAgo = Date.now() - 10000; // 10 seconds ago
          return img.status === 'COMPLETED' && imgTime > tenSecondsAgo;
        });
        
        if (recentImages.length > 0) {
          console.log('🎯 FALLBACK: Auto-detected new completed image (WebSocket may have failed)');
          const newestImage = recentImages.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
          
          dispatch(setIsGenerating(false));
          dispatch(setSelectedBaseImageIdAndClearObjects(newestImage.id));
          // Refresh all tweak images to show the new generation
          dispatch(fetchAllTweakImages());
        }
      }, 10000); // Wait 10 seconds before checking
      
      return () => clearTimeout(timeoutId);
    }
  }, [isGenerating, allTweakImages.length, dispatch]); // Only depend on isGenerating and image count
  
  // Simple timeout check for debugging (no polling)
  useEffect(() => {
    if (isGenerating) {
      const timeoutId = setTimeout(() => {
        console.log('🚨 [TWEAK DEBUG] STILL GENERATING AFTER 30 SECONDS - WEBSOCKET ISSUE');
        console.log('🚨 [TWEAK DEBUG] WebSocket connected:', isUserConnected);
        console.log('🚨 [TWEAK DEBUG] Selected image ID:', selectedBaseImageId);
      }, 30000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isGenerating, isUserConnected, selectedBaseImageId]);

  // Reset timeout states on page load for better UX
  useEffect(() => {
    console.log('🔄 Resetting timeout states on TweakPage load');
    dispatch(resetTimeoutStates());
  }, [dispatch]);

  // Manual 2-minute timeout check for canvas spinner
  useEffect(() => {
    if (!isGenerating || !generationStartTime || !showCanvasSpinner) {
      return;
    }

    const checkTimeout = () => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - generationStartTime;
      const twoMinutesInMs = 2 * 60 * 1000; // 2 minutes

      if (elapsedTime >= twoMinutesInMs && showCanvasSpinner) {
        console.log('⏰ Manual 2-minute timeout: Hiding canvas spinner');
        dispatch(hideCanvasSpinner());
      }
    };

    // Check immediately
    checkTimeout();

    // Set up interval to check every 5 seconds
    const intervalId = setInterval(checkTimeout, 5000);

    return () => clearInterval(intervalId);
  }, [isGenerating, generationStartTime, showCanvasSpinner, dispatch]);

  // Note: Removed subscription check to allow free access to Tweak page for image upload and editing

  // Load initial data and track completion
  useEffect(() => {
    const loadInitialData = async () => {
      console.log('🚀 Loading initial data for Tweak page...');
      
      // Load all required data in parallel
      const [inputCreateResult, variationsResult, tweakImagesResult] = await Promise.allSettled([
        dispatch(fetchInputAndCreateImages({ page: 1, limit: 100, uploadSource: 'TWEAK_MODULE' })),
        dispatch(fetchAllVariations({ page: 1, limit: 100 })),
        dispatch(fetchAllTweakImages())
      ]);
      
      console.log('📊 Initial data loading results:', {
        inputCreate: inputCreateResult.status,
        variations: variationsResult.status,
        tweakImages: tweakImagesResult.status
      });
      
      // Mark initial data as loaded regardless of individual results
      setInitialDataLoaded(true);
      console.log('✅ Initial data loading completed');
    };
    
    loadInitialData();
  }, [dispatch]);

  // Load tweak history when base image changes (keep for lineage tracking)
  useEffect(() => {
    if (selectedBaseImageId) {
      console.log('🔄 Fetching tweak history for selected image:', selectedBaseImageId);
      // Backend will automatically resolve to original base image and return all variants
      dispatch(fetchTweakHistoryForImage({ baseImageId: selectedBaseImageId }));
    }
  }, [selectedBaseImageId, dispatch]);

  // Load saved prompt for TWEAK_GENERATED images (both inpaint and outpaint variations)
  useEffect(() => {
    if (selectedBaseImageId) {
      // Use image context to determine prompt loading behavior
      const { imageType, source } = selectedImageContext;
      
      // Load prompts for TWEAK_GENERATED images (both inpaint and outpaint variations)
      if (imageType === 'TWEAK_GENERATED' && source === 'tweak') {
        const selectedTweakImage = allTweakImages.find(img => img.id === selectedBaseImageId);
        
        if (selectedTweakImage) {
          // Check if this image has a saved prompt in settingsSnapshot or aiPrompt
          const savedPrompt = selectedTweakImage.settingsSnapshot?.prompt || 
                             selectedTweakImage.aiPrompt || 
                             '';
          
          if (savedPrompt) {
            console.log('🔄 Loading saved prompt for TWEAK_GENERATED image:', {
              imageId: selectedBaseImageId,
              operationType: selectedTweakImage.settingsSnapshot?.operationType,
              prompt: savedPrompt.slice(0, 50) + '...'
            });
            dispatch(setPrompt(savedPrompt));
          } else {
            console.log('⏭️ No saved prompt found for TWEAK_GENERATED image - starting with empty prompt');
            dispatch(setPrompt(''));
          }
        } else {
          console.log('⏭️ TWEAK_GENERATED image not found in allTweakImages - starting with empty prompt');
          dispatch(setPrompt(''));
        }
      } else {
        // For all other image types (TWEAK_UPLOADED, CREATE_GENERATED) - start with empty prompt
        console.log('⏭️ Skipping prompt loading for image type:', imageType, '- starting with empty prompt');
        dispatch(setPrompt(''));
      }
    } else {
      // Clear prompt when no image is selected
      dispatch(setPrompt(''));
    }
  }, [selectedBaseImageId, selectedImageContext, allTweakImages, dispatch]);

  // Auto-select most recent image if none selected
  // Priority: 1) Latest tweak generated image, 2) Latest user uploaded image, 3) Latest CREATE generated image, 4) Fallback to history images
  // But don't auto-select if we have a URL parameter or if we're waiting for URL parameter data to load
  useEffect(() => {
    // Wait for initial data to be loaded before attempting auto-selection
    if (!initialDataLoaded) {
      console.log('⏳ Auto-selection waiting for initial data to load...');
      return;
    }

    const imageIdParam = searchParams.get('imageId');
    const hasUrlParameter = !!imageIdParam && !isNaN(parseInt(imageIdParam));
    
    // Don't auto-select if we have a URL parameter or if URL parameters are being processed
    console.log('🔍 Auto-selection check:', {
      selectedBaseImageId,
      hasUrlParameter,
      processingUrlParams,
      initialDataLoaded,
      willAutoSelect: !selectedBaseImageId && !hasUrlParameter && !processingUrlParams,
      dataAvailable: {
        tweakImages: allTweakImages.length,
        inputImages: inputImages.length,
        createImages: createImages.length,
        historyImages: historyImages.length
      }
    });
    
    if (!selectedBaseImageId && !hasUrlParameter && !processingUrlParams) {
      // PRIORITY 1: Latest tweak generated image (from outpaint/inpaint operations)
      const completedTweakImages = allTweakImages.filter((img: any) => img.status === 'COMPLETED');
      if (completedTweakImages.length > 0) {
        const mostRecentTweakImage = [...completedTweakImages].sort((a: any, b: any) => 
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        )[0];
        console.log('🎯 AUTO-SELECT: Most recent tweak generated image (PRIORITY 1):', mostRecentTweakImage.id);
        dispatch(setSelectedImageWithContext({
          imageId: mostRecentTweakImage.id,
          imageType: 'TWEAK_GENERATED',
          source: 'tweak'
        }));
        return;
      }
      
      // PRIORITY 2: Latest user uploaded image (input images from TWEAK_MODULE)
      const completedInputImages = inputImages.filter((img: any) => img.status === 'COMPLETED');
      if (completedInputImages.length > 0) {
        const mostRecentInputImage = [...completedInputImages].sort((a: any, b: any) => 
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        )[0];
        console.log('🎯 AUTO-SELECT: Most recent user uploaded image (PRIORITY 2):', mostRecentInputImage.id);
        dispatch(setSelectedImageWithContext({
          imageId: mostRecentInputImage.id,
          imageType: 'TWEAK_UPLOADED',
          source: 'input'
        }));
        return;
      }
      
      // PRIORITY 3: Latest CREATE generated image (from CREATE_MODULE)
      const completedCreateImages = createImages.filter((img: any) => img.status === 'COMPLETED');
      if (completedCreateImages.length > 0) {
        const mostRecentCreateImage = [...completedCreateImages].sort((a: any, b: any) => 
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        )[0];
        console.log('🎯 AUTO-SELECT: Most recent CREATE generated image (PRIORITY 3):', mostRecentCreateImage.id);
        dispatch(setSelectedImageWithContext({
          imageId: mostRecentCreateImage.id,
          imageType: 'CREATE_GENERATED',
          source: 'create'
        }));
        return;
      }
      
      // PRIORITY 4: Fallback to history images (all create variations)
      if (historyImages.length > 0) {
        const completedHistoryImages = historyImages.filter((img: any) => img.status === 'COMPLETED');
        if (completedHistoryImages.length > 0) {
          const mostRecentHistoryImage = [...completedHistoryImages].sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
          console.log('🎯 AUTO-SELECT: Most recent history image (PRIORITY 4):', mostRecentHistoryImage.id);
          dispatch(setSelectedImageWithContext({
            imageId: mostRecentHistoryImage.id,
            imageType: 'CREATE_GENERATED',
            source: 'create'
          }));
          return;
        }
      }
      
      console.log('⚠️ AUTO-SELECT: No images available for auto-selection');
    }
  }, [initialDataLoaded, allTweakImages, inputImages, createImages, historyImages, selectedBaseImageId, searchParams, processingUrlParams, dispatch]);

  // Handle URL parameter for direct image selection from gallery
  // This effect runs whenever the data changes, so it will keep trying until the image is found
  useEffect(() => {
    const imageIdParam = searchParams.get('imageId');
    const typeParam = searchParams.get('type');
    
    // Don't process URL parameters while data is still loading
    if (loading || loadingInputAndCreate) {
      console.log('⏳ Waiting for data to load before processing URL parameters...', { loading, loadingInputAndCreate });
      return;
    }
    
    if (imageIdParam) {
      const targetImageId = parseInt(imageIdParam);
      
      if (!isNaN(targetImageId)) {
        // Set flag to prevent auto-selection conflicts
        setProcessingUrlParams(true);
        console.log('🔗 URL parameter detected: Selecting image from gallery redirect:', { 
          targetImageId, 
          type: typeParam,
          currentSelectedId: selectedBaseImageId,
          dataStatus: {
            loading,
            loadingInputAndCreate,
            historyImagesCount: historyImages.length,
            inputImagesCount: inputImages.length,
            createImagesCount: createImages.length,
            tweakImagesCount: allTweakImages.length
          }
        });
        
        // Skip if this image is already selected
        if (selectedBaseImageId === targetImageId) {
          console.log('⏭️ Image already selected, skipping URL parameter processing');
          // Clear URL parameters since selection is complete
          setTimeout(() => {
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('imageId');
            newSearchParams.delete('type');
            setSearchParams(newSearchParams);
            setProcessingUrlParams(false); // Clear the processing flag
          }, 1000);
          return;
        }
        
        let imageFound = false;
        
        if (typeParam === 'input') {
          // Look for input image specifically
          const inputImage = inputImages.find(img => img.id === targetImageId);
          if (inputImage) {
            console.log('✅ Input image found, selecting:', targetImageId);
            dispatch(setSelectedImageWithContext({
              imageId: targetImageId,
              imageType: 'TWEAK_UPLOADED',
              source: 'input'
            }));
            imageFound = true;
          }
        } else if (typeParam === 'generated') {
          // Look for generated image specifically in history images first, then other sources
          const historyImage = historyImages.find(img => img.id === targetImageId);
          const tweakImage = allTweakImages.find(img => img.id === targetImageId);
          const createImage = createImages.find(img => img.id === targetImageId);
          
          console.log('🔍 Searching for generated image:', {
            targetImageId,
            historyImagesCount: historyImages.length,
            tweakImagesCount: allTweakImages.length,
            createImagesCount: createImages.length,
            foundInHistory: !!historyImage,
            foundInTweak: !!tweakImage,
            foundInCreate: !!createImage,
            historyImageSample: historyImages.slice(0, 3).map(img => ({ id: img.id, moduleType: img.moduleType })),
          });
          
          if (historyImage || tweakImage || createImage) {
            const foundImage = historyImage || tweakImage || createImage;
            
            // Determine the correct image type and source
            let imageType: ImageType = 'CREATE_GENERATED';
            let source: 'input' | 'create' | 'tweak' = 'create';
            
            if (tweakImage) {
              imageType = 'TWEAK_GENERATED';
              source = 'tweak';
            } else if (createImage || historyImage) {
              imageType = 'CREATE_GENERATED';
              source = 'create';
            }
            
            console.log('✅ Generated image found, selecting:', {
              targetImageId,
              foundIn: historyImage ? 'historyImages' : tweakImage ? 'allTweakImages' : 'createImages',
              imageType,
              source,
              imageUrl: foundImage?.imageUrl,
              originalInputImageId: foundImage?.originalInputImageId,
              moduleType: foundImage?.moduleType
            });
            
            dispatch(setSelectedImageWithContext({
              imageId: targetImageId,
              imageType,
              source
            }));
            imageFound = true;
          }
        } else {
          // Fallback to existing priority order when no type specified
          const existsInCreateImages = createImages.some(img => img.id === targetImageId);
          const existsInInputImages = inputImages.some(img => img.id === targetImageId);
          const existsInTweakImages = allTweakImages.some(img => img.id === targetImageId);
          const existsInHistoryImages = historyImages.some(img => img.id === targetImageId);
          
          console.log('🔍 URL parameter search (no type specified):', {
            targetImageId,
            existsInCreateImages,
            existsInInputImages, 
            existsInTweakImages,
            existsInHistoryImages,
            createImagesCount: createImages.length,
            inputImagesCount: inputImages.length,
            tweakImagesCount: allTweakImages.length,
            historyImagesCount: historyImages.length
          });
          
          if (existsInCreateImages || existsInInputImages || existsInTweakImages || existsInHistoryImages) {
            console.log('✅ Image found (fallback), selecting:', targetImageId);
            
            // Determine type for fallback - use smart priority
            let imageType: ImageType = 'TWEAK_UPLOADED';
            let source: 'input' | 'create' | 'tweak' = 'input';
            
            if (existsInTweakImages) {
              imageType = 'TWEAK_GENERATED';
              source = 'tweak';
            } else if (existsInCreateImages || existsInHistoryImages) {
              imageType = 'CREATE_GENERATED';
              source = 'create';
            } else if (existsInInputImages) {
              imageType = 'TWEAK_UPLOADED';
              source = 'input';
            }
            
            dispatch(setSelectedImageWithContext({
              imageId: targetImageId,
              imageType,
              source
            }));
            imageFound = true;
          }
        }
        
        if (imageFound) {
          // Clear URL parameters after successful selection to prevent re-triggering
          setTimeout(() => {
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('imageId');
            newSearchParams.delete('type');
            setSearchParams(newSearchParams);
            setProcessingUrlParams(false); // Clear the processing flag
          }, 1000);
        } else {
          // If image not found, still clear the processing flag
          setProcessingUrlParams(false);
          console.log('❌ Image not found in loaded data:', {
            targetImageId,
            typeRequested: typeParam,
            hasData: createImages.length > 0 || inputImages.length > 0 || historyImages.length > 0,
            loading: loadingInputAndCreate || loading,
            totalInputImages: inputImages.length,
            totalCreateImages: createImages.length, 
            totalHistoryImages: historyImages.length,
            totalTweakImages: allTweakImages.length,
            allHistoryIds: historyImages.map(img => img.id).slice(0, 10) // First 10 IDs for debugging
          });
        }
      } else {
        console.warn('⚠️ Invalid imageId URL parameter:', imageIdParam);
        setProcessingUrlParams(false);
      }
    } else {
      // No URL parameters, clear processing flag if it was set
      if (processingUrlParams) {
        setProcessingUrlParams(false);
      }
    }
  }, [searchParams, selectedBaseImageId, createImages, inputImages, allTweakImages, historyImages, loadingInputAndCreate, loading, dispatch, setSearchParams]);

  // Event handlers
  const handleImageUpload = async (file: File) => {
    try {
      const resultAction = await dispatch(uploadInputImage({ file, uploadSource: 'TWEAK_MODULE' }));
      if (uploadInputImage.fulfilled.match(resultAction)) {
        dispatch(setSelectedBaseImageId(resultAction.payload.id));
        // Refresh the input and create images list with TWEAK_MODULE filter
        dispatch(fetchInputAndCreateImages({ page: 1, limit: 100, uploadSource: 'TWEAK_MODULE' }));
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

  const handleSelectTweakImage = (imageId: number) => {
    console.log('🎯 User selected tweak image:', imageId);
    // For tweak images, we always know they are TWEAK_GENERATED
    dispatch(setSelectedImageWithContext({
      imageId,
      imageType: 'TWEAK_GENERATED',
      source: 'tweak'
    }));
    console.log('🎯 Tweak image context set:', { imageId, imageType: 'TWEAK_GENERATED', source: 'tweak' });
  };

  const handleSelectBaseImage = async (imageId: number, source: 'input' | 'create') => {
    console.log('🎯 User manually selected image:', imageId, 'from source:', source);
    
    // Determine the image type based on the source provided by the component
    let imageType: ImageType = 'TWEAK_UPLOADED';
    let actualSource: 'input' | 'create' | 'tweak' = source;
    
    if (source === 'input') {
      imageType = 'TWEAK_UPLOADED';
      actualSource = 'input';
      console.log('🎯 Selected image is TWEAK_UPLOADED from input panel:', imageId);
    } else if (source === 'create') {
      imageType = 'CREATE_GENERATED';
      actualSource = 'create';
      console.log('🎯 Selected image is CREATE_GENERATED from create panel:', imageId);
    }
    
    // Use the new context-aware action with the definitive source information
    dispatch(setSelectedImageWithContext({
      imageId,
      imageType,
      source: actualSource
    }));
    
    console.log('🎯 Image context set definitively:', { imageId, imageType, source: actualSource });
  };

  const handleToolChange = (tool: 'select' | 'region' | 'cut' | 'add' | 'rectangle' | 'brush' | 'move' | 'pencil') => {
    dispatch(setCurrentTool(tool));
  };

  const handleGenerate = async () => {
    if (!selectedBaseImageId) {
      toast.error('Please select an image first');
      console.warn('❌ No base image selected');
      return;
    }

    // Log if we're starting a new generation while a previous one is running
    if (isGenerating && !showCanvasSpinner) {
      console.log('🔄 Starting new generation while previous continues in background (post-2min timeout)');
      // Previous generation continues running, UI allows new generation
    }

    // 🔥 NEW: Determine API call based on user's tool selection and drawn objects
    const hasDrawnObjects = rectangleObjects.length > 0 || brushObjects.length > 0 || selectedRegions.length > 0;
    const isExpandBorderSelected = currentTool === 'select';
    const isOutpaintNeeded = canvasBounds.width > originalImageBounds.width || 
                              canvasBounds.height > originalImageBounds.height;

    // Calculate expansion amounts in pixels for validation
    const leftExpansion = Math.max(0, -canvasBounds.x);
    const rightExpansion = Math.max(0, canvasBounds.width - originalImageBounds.width + canvasBounds.x);
    const topExpansion = Math.max(0, -canvasBounds.y);
    const bottomExpansion = Math.max(0, canvasBounds.height - originalImageBounds.height + canvasBounds.y);
    const maxExpansion = Math.max(leftExpansion, rightExpansion, topExpansion, bottomExpansion);

    // Determine which API to call based on user interaction:
    // 1. If "Expand Border" (select tool) is selected AND canvas bounds are expanded → OUTPAINT
    // 2. If user has drawn any objects (Add Objects tools) → INPAINT
    // 3. Fallback to existing logic for backward compatibility
    let shouldUseOutpaint = false;
    let shouldUseInpaint = false;
    let reasoning = '';

    if (isExpandBorderSelected && isOutpaintNeeded) {
      shouldUseOutpaint = true;
      reasoning = 'Expand Border selected with expanded canvas bounds';
    } else if (hasDrawnObjects) {
      shouldUseInpaint = true;
      reasoning = 'User has drawn objects (Add Objects)';
    } else if (isOutpaintNeeded) {
      // Fallback: if bounds are expanded but no clear tool selection, use outpaint
      shouldUseOutpaint = true;
      reasoning = 'Fallback: Canvas bounds are expanded';
    } else {
      // Fallback: use inpaint if no other conditions match
      shouldUseInpaint = true;
      reasoning = 'Fallback: Default to inpaint';
    }

    // 🔥 NEW: Enhanced validation with helpful toast messages
    
    // OUTPAINT VALIDATION: Minimum 10px expansion required
    if (shouldUseOutpaint) {
      if (maxExpansion < 10) {
        toast.error('Outpaint requires at least 10px expansion. Please drag the border handles further out to expand the image boundaries.', {
          duration: 4000
        });
        console.warn('❌ Outpaint validation failed: insufficient expansion', {
          maxExpansion,
          expansions: { left: leftExpansion, right: rightExpansion, top: topExpansion, bottom: bottomExpansion }
        });
        return;
      }
      
      // Success message for outpaint
      // toast.success(`Outpaint ready! Expanding image by ${Math.round(maxExpansion)}px`, {
      //   duration: 2000
      // });
    }

    // INPAINT VALIDATION: Requires both prompt AND drawn objects
    if (shouldUseInpaint) {
      const hasPrompt = prompt.trim().length > 0;
      
      if (!hasDrawnObjects && !hasPrompt) {
        toast.error('To use inpaint: 1) Use "Add Objects" tools to draw on areas you want to modify, 2) Describe what you want to generate in those areas.', {
          duration: 5000
        });
        console.warn('❌ Inpaint validation failed: no drawn objects and no prompt');
        return;
      } else if (!hasDrawnObjects) {
        toast.error('Please draw objects on the image first! Use "Add Objects" tools (Rectangle, Brush, or Pencil) to mark areas you want to modify.', {
          duration: 4000
        });
        console.warn('❌ Inpaint validation failed: no drawn objects');
        return;
      } else if (!hasPrompt) {
        toast.error('Please describe what you want to generate! Add a prompt to describe what should appear in the areas you\'ve drawn.', {
          duration: 4000
        });
        console.warn('❌ Inpaint validation failed: no prompt provided');
        return;
      }
      
      // Success message for inpaint
      // const objectCount = rectangleObjects.length + brushObjects.length + selectedRegions.length;
      // toast.success(`Inpaint ready! Processing ${objectCount} drawn object${objectCount > 1 ? 's' : ''} with your prompt.`, {
      //   duration: 2000
      // });
    }

    // Check credits after validation passes
    if (!checkCreditsBeforeAction(1)) {
      return; // Credit check handles the error display
    }

    console.log('🤖 API Selection Logic:', {
      currentTool,
      isExpandBorderSelected,
      isOutpaintNeeded,
      hasDrawnObjects,
      hasPrompt: prompt.trim().length > 0,
      expansionValidation: shouldUseOutpaint ? {
        maxExpansion,
        isValid: maxExpansion >= 10,
        expansions: { left: leftExpansion, right: rightExpansion, top: topExpansion, bottom: bottomExpansion }
      } : null,
      drawnObjectsCount: {
        rectangles: rectangleObjects.length,
        brushes: brushObjects.length,
        regions: selectedRegions.length
      },
      decision: shouldUseOutpaint ? 'OUTPAINT' : 'INPAINT',
      reasoning,
      validationPassed: true
    });

    // Note: For inpaint operations, the prompt will be saved to the newly generated images by the backend
    // We do NOT save/update the prompt on the current selected image to avoid modifying the source image's prompt
    if (shouldUseInpaint) {
      console.log('🎨 Inpaint operation: Prompt will be saved to newly generated images only (not to source image)');
    } else if (shouldUseOutpaint) {
      console.log('🚀 Outpaint operation: No prompt saving (per requirements)');
    }

    // Execute the determined API call
    if (shouldUseOutpaint) {
      console.log('🚀 Executing outpaint generation:', reasoning);
      await handleOutpaintGeneration();
    } else {
      console.log('🎨 Executing inpaint generation:', reasoning);
      await handleInpaintGeneration();
    }
  };

  const handleInpaintGeneration = async () => {

    // Set loading state
    dispatch(setIsGenerating(true));

    try {
      if (canvasRef.current) {
        const maskDataUrl = canvasRef.current.generateMaskImage();
        
        if (maskDataUrl) {
          console.log('🎨 Generated mask for inpaint:', maskDataUrl);
          
          // Convert mask to blob for upload
          const response = await fetch(maskDataUrl);
          const maskBlob = await response.blob();
          
          // Upload mask to get URL
          const formData = new FormData();
          formData.append('file', maskBlob, 'mask.png');

          const uploadResponse = await api.post('/tweak/upload/mask', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          
          if (!uploadResponse.data || !uploadResponse.data.success) {
            throw new Error(uploadResponse.data?.message || 'Failed to upload mask image');
          }

          const maskImageUrl = uploadResponse.data.url;
          
          // Get the current selected image URL
          const currentImageUrl = getCurrentImageUrl();
          if (!currentImageUrl) {
            throw new Error('No current image URL available');
          }
          
          // Validate that we have a valid originalBaseImageId
          // For generated images, we need to use their originalInputImageId, not their own ID
          let validOriginalBaseImageId = currentBaseImageId || selectedBaseImageId;
          
          // Check if selected image is a generated image with originalInputImageId
          const selectedGeneratedImage = historyImages.find(img => img.id === selectedBaseImageId);
          if (selectedGeneratedImage && selectedGeneratedImage.originalInputImageId) {
            validOriginalBaseImageId = selectedGeneratedImage.originalInputImageId;
            console.log('🔄 Using originalInputImageId for generated image:', {
              selectedImageId: selectedBaseImageId,
              originalInputImageId: selectedGeneratedImage.originalInputImageId
            });
          }
          
          if (!validOriginalBaseImageId) {
            throw new Error('No valid base image ID found. Please select an image before attempting to generate inpaint.');
          }
          
          console.log('🔍 INPAINT: Using originalBaseImageId:', validOriginalBaseImageId, {
            currentBaseImageId,
            selectedBaseImageId,
            baseImageUrl: currentImageUrl
          });
          
          // Call inpaint API
          const resultAction = await dispatch(generateInpaint({
            baseImageUrl: currentImageUrl,
            maskImageUrl: maskImageUrl,
            prompt: prompt,
            negativePrompt: 'saturated full colors, neon lights,blurry  jagged edges, noise, and pixelation, oversaturated, unnatural colors or gradients  overly smooth or plastic-like surfaces, imperfections. deformed, watermark, (face asymmetry, eyes asymmetry, deformed eyes, open mouth), low quality, worst quality, blurry, soft, noisy extra digits, fewer digits, and bad anatomy. Poor Texture Quality: Avoid repeating patterns that are noticeable and break the illusion of realism. ,sketch, graphite, illustration, Unrealistic Proportions and Scale:  incorrect proportions. Out of scale',
            maskKeyword: prompt,
            variations: variations,
            originalBaseImageId: validOriginalBaseImageId,
            selectedBaseImageId: selectedBaseImageId || undefined
          }));
          
          if (generateInpaint.fulfilled.match(resultAction)) {
            console.log('✅ Inpaint generation started successfully');
            
            // 🔥 NEW: Add processing placeholders to history panel immediately
            if (resultAction.payload?.data?.imageIds && resultAction.payload?.data?.batchId) {
              console.log('📋 Adding processing placeholders to history panel:', {
                batchId: resultAction.payload.data.batchId,
                imageIds: resultAction.payload.data.imageIds,
                variations
              });
              
              dispatch(addProcessingTweakVariations({
                batchId: resultAction.payload.data.batchId,
                totalVariations: variations,
                imageIds: resultAction.payload.data.imageIds
              }));
              
              // 🔥 UPDATED: Keep loading state on canvas until WebSocket receives completion
              // Loading will be cleared by WebSocket in useRunPodWebSocket.ts when images are ready
            }
            
            // Update credits if provided in the response
            if (resultAction.payload?.data?.remainingCredits !== undefined) {
              console.log('💳 Updating credits after inpaint:', resultAction.payload.data.remainingCredits);
              dispatch(updateCredits(resultAction.payload.data.remainingCredits));
            } else {
              // Fallback: refresh user data to get updated credits
              console.log('💳 Refreshing user data for updated credits');
              dispatch(fetchCurrentUser());
            }
          } else {
            throw new Error('Failed to generate inpaint: ' + resultAction.error?.message);
          }
          
        } else {
          console.log('No drawn objects found - no mask generated');
          dispatch(setIsGenerating(false));
        }
      } else {
        dispatch(setIsGenerating(false));
      }
    } catch (error: any) {
      console.error('❌ Error in handleInpaintGeneration:', error);
      dispatch(setIsGenerating(false));
      // TODO: Show error toast to user
      alert('Failed to generate inpaint: ' + error.message);
    }
  };

  const handleOutpaintGeneration = async () => {
    if (!selectedBaseImageId || isGenerating) {
      console.warn('Cannot trigger outpaint: no base image or already generating');
      return;
    }

    // Check if outpaint is needed
    const isOutpaintNeeded = canvasBounds.width > originalImageBounds.width || 
                              canvasBounds.height > originalImageBounds.height;

    if (!isOutpaintNeeded) {
      console.log('No outpaint needed - canvas bounds within original image bounds');
      return;
    }

    console.log('🚀 Triggering outpaint generation from Generate button');
    dispatch(setIsGenerating(true));

    try {
      // Get the current selected image URL
      const currentImageUrl = getCurrentImageUrl();
      if (!currentImageUrl) {
        throw new Error('No current image URL available');
      }

      // Validate that we have a valid originalBaseImageId
      // For generated images, we need to use their originalInputImageId, not their own ID
      let validOriginalBaseImageId = currentBaseImageId || selectedBaseImageId;
      
      // Check if selected image is a generated image with originalInputImageId
      const selectedGeneratedImage = historyImages.find(img => img.id === selectedBaseImageId);
      if (selectedGeneratedImage && selectedGeneratedImage.originalInputImageId) {
        validOriginalBaseImageId = selectedGeneratedImage.originalInputImageId;
        console.log('🔄 Using originalInputImageId for generated image (outpaint):', {
          selectedImageId: selectedBaseImageId,
          originalInputImageId: selectedGeneratedImage.originalInputImageId
        });
      }
      
      if (!validOriginalBaseImageId) {
        throw new Error('No valid base image ID found. Please select an image before attempting to generate outpaint.');
      }
      
      console.log('🔍 OUTPAINT: Using originalBaseImageId:', validOriginalBaseImageId, {
        currentBaseImageId,
        selectedBaseImageId,
        baseImageUrl: currentImageUrl
      });
      
      // Call outpaint API
      const resultAction = await dispatch(generateOutpaint({
        prompt: prompt,
        baseImageUrl: currentImageUrl,
        canvasBounds,
        originalImageBounds,
        variations: variations,
        originalBaseImageId: validOriginalBaseImageId,
        selectedBaseImageId: selectedBaseImageId || undefined // Include selectedBaseImageId for WebSocket dual notification
      }));

      if (generateOutpaint.fulfilled.match(resultAction)) {
        console.log('✅ Outpaint generation started successfully');
        
        // 🔥 NEW: Add processing placeholders to history panel immediately
        if (resultAction.payload?.data?.imageIds && resultAction.payload?.data?.batchId) {
          console.log('📋 Adding processing placeholders to history panel:', {
            batchId: resultAction.payload.data.batchId,
            imageIds: resultAction.payload.data.imageIds,
            variations
          });
          
          dispatch(addProcessingTweakVariations({
            batchId: resultAction.payload.data.batchId,
            totalVariations: variations,
            imageIds: resultAction.payload.data.imageIds
          }));
          
          // 🔥 UPDATED: Keep loading state on canvas until WebSocket receives completion
          // Loading will be cleared by WebSocket in useRunPodWebSocket.ts when images are ready
        }
        
        // Update credits if provided in the response
        if (resultAction.payload?.data?.remainingCredits !== undefined) {
          console.log('💳 Updating credits after outpaint:', resultAction.payload.data.remainingCredits);
          dispatch(updateCredits(resultAction.payload.data.remainingCredits));
        } else {
          // Fallback: refresh user data to get updated credits
          console.log('💳 Refreshing user data for updated credits');
          dispatch(fetchCurrentUser());
        }
      } else {
        throw new Error('Failed to generate outpaint: ' + resultAction.error?.message);
      }
    } catch (error: any) {
      console.error('❌ Error in handleOutpaintGeneration:', error);
      dispatch(setIsGenerating(false));
      // TODO: Show error toast to user
      alert('Failed to generate outpaint: ' + error.message);
    }
  };

  const handleAddImageToCanvas = async (file: File) => {
    if (!selectedBaseImageId) return;

    // Add image at center of canvas
    await dispatch(addImageToCanvas({
      baseImageId: selectedBaseImageId,
      addedImage: file,
      position: { x: 400, y: 300 }, // Center position
      size: { width: 200, height: 200 } // Default size
    }));
  };

  const handlePromptChange = (newPrompt: string) => {
    dispatch(setPrompt(newPrompt));
    // 🔥 REMOVED: Auto-save on typing - will save only on Generate
  };

  const handleVariationsChange = (newVariations: number) => {
    dispatch(setVariations(newVariations));
  };

  const handleUndo = () => {
    dispatch(undo());
    // Clear local canvas selections after undo
    canvasRef.current?.clearLocalSelections();
  };

  const handleRedo = () => {
    dispatch(redo());
    // Clear local canvas selections after redo
    canvasRef.current?.clearLocalSelections();
  };

  const handleDownload = () => {
    console.log('Download image:', selectedBaseImageId);
    // Additional download logic can be added here if needed
  };

  const handleOpenGallery = () => {
    dispatch(setIsModalOpen(true));
  };

  const handleCloseGallery = () => {
    dispatch(setIsModalOpen(false));
  };

  const handleShare = async (imageUrl: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Generated Image',
          url: imageUrl,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(imageUrl);
        toast.success('Image URL copied to clipboard');
      } catch (error) {
        console.log('Error copying to clipboard:', error);
        toast.error('Failed to copy URL to clipboard');
      }
    }
  };

  const handleCreate = async (imageId?: number) => {
    if (imageId) {
      console.log('🎯 HandleCreate called for imageId:', imageId);
      console.log('🎯 Current selectedImageContext:', selectedImageContext);
      
      try {
        // Get the current image URL
        const currentImageUrl = getCurrentImageUrl();
        if (!currentImageUrl) {
          throw new Error('No current image URL available');
        }
        
        // Fetch the image as a blob
        const response = await fetch(currentImageUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch image');
        }
        const imageBlob = await response.blob();
        
        // Convert blob to File object
        const imageFile = new File([imageBlob], `image-${imageId}.jpg`, {
          type: imageBlob.type || 'image/jpeg'
        });
        
        // Upload the image with CREATE_MODULE upload source
        const resultAction = await dispatch(uploadInputImage({ 
          file: imageFile, 
          uploadSource: 'CREATE_MODULE' 
        }));
        
        if (uploadInputImage.fulfilled.match(resultAction)) {
          console.log('✅ Image uploaded successfully to CREATE_MODULE:', resultAction.payload.id);
          toast.success('Image uploaded to Create module');
          
          // Navigate to create page with the new input image
          navigate(`/create?imageId=${resultAction.payload.id}&type=input`);
        } else if (uploadInputImage.rejected.match(resultAction)) {
          const errorMessage = resultAction.payload as string;
          toast.error(errorMessage || 'Failed to upload image to Create module');
        }
        
      } catch (error: any) {
        console.error('❌ Error in handleCreate:', error);
        toast.error('Failed to create new InputImage: ' + error.message);
      }
      
      // Close gallery modal if open
      dispatch(setIsModalOpen(false));
    } else {
      toast.error('No image selected for creating');
    }
  };

  const handleUpscale = (imageId?: number) => {
    if (imageId) {
      console.log('🎯 HandleUpscale called for imageId:', imageId);
      console.log('🎯 Current selectedImageContext:', selectedImageContext);
      
      // Determine the correct type based on context and priority
      let targetType: 'input' | 'generated' = 'generated';
      let reasoning = '';
      
      // STRATEGY 1: Use the stored image context if available and matches
      if (selectedImageContext.imageId === imageId && selectedImageContext.imageType) {
        if (selectedImageContext.imageType === 'TWEAK_UPLOADED') {
          targetType = 'input';
          reasoning = 'From stored image context: TWEAK_UPLOADED';
        } else if (selectedImageContext.imageType === 'CREATE_GENERATED' || selectedImageContext.imageType === 'TWEAK_GENERATED') {
          targetType = 'generated';
          reasoning = `From stored image context: ${selectedImageContext.imageType}`;
        }
      } else {
        // STRATEGY 2: Fallback to source detection
        const inputImage = inputImages.find(img => img.id === imageId);
        const tweakImage = allTweakImages.find(img => img.id === imageId);
        const createImage = createImages.find(img => img.id === imageId);
        const historyImage = historyImages.find(img => img.id === imageId);
        
        console.log('🔍 Image found in sources (upscale):', {
          imageId,
          foundInInput: !!inputImage,
          foundInTweak: !!tweakImage,
          foundInCreate: !!createImage,
          foundInHistory: !!historyImage,
          currentlySelected: selectedBaseImageId === imageId
        });
        
        // STRATEGY 2A: If this is the currently selected image, use the context from which panel it's shown as selected
        if (selectedBaseImageId === imageId) {
          const inputSelection = getInputImageSelection();
          const createSelection = getCreateImageSelection();
          const tweakSelection = getTweakHistorySelection();
          
          if (inputSelection === imageId) {
            targetType = 'input';
            reasoning = 'Currently selected in input panel';
          } else if (tweakSelection === imageId) {
            targetType = 'generated';
            reasoning = 'Currently selected in tweak panel (tweak-generated image)';
          } else if (createSelection === imageId) {
            targetType = 'generated';
            reasoning = 'Currently selected in create panel (CREATE-generated image)';
          }
        } else {
          // STRATEGY 2B: For non-selected images, use smart priority based on image characteristics
          if (inputImage && !tweakImage && !createImage && !historyImage) {
            targetType = 'input';
            reasoning = 'Only found in input images (pure user upload)';
          } else if (tweakImage) {
            targetType = 'generated';
            reasoning = 'Found in tweak images (tweak-generated)';
          } else if (createImage || historyImage) {
            targetType = 'generated';
            reasoning = 'Found in create/history images (CREATE-generated)';
          } else if (inputImage) {
            targetType = 'input';
            reasoning = 'Fallback to input image';
          }
        }
      }
      
      console.log('🎯 Upscale decision:', { imageId, targetType, reasoning });
      
      // Navigate with the determined type
      if (targetType === 'input') {
        navigate(`/upscale?imageId=${imageId}&type=input`);
      } else {
        navigate(`/upscale?imageId=${imageId}&type=generated`);
      }
      
      // Close gallery modal if open
      dispatch(setIsModalOpen(false));
    } else {
      toast.error('No image selected for upscaling');
    }
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (historyIndex > 0) {
          handleUndo();
        }
      } else if (((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Z') || 
                 ((e.metaKey || e.ctrlKey) && e.key === 'y')) {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          handleRedo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history.length]);;

  const getCurrentImageUrl = () => {
    if (!selectedBaseImageId) {
      console.log('🔍 getCurrentImageUrl: No selectedBaseImageId');
      return undefined;
    }
    
    console.log('🔍 getCurrentImageUrl: Looking for image:', selectedBaseImageId);
    console.log('🔍 getCurrentImageUrl: Selected image context:', selectedImageContext);
    
    // Use the selected image context to determine the correct source
    if (selectedImageContext?.source && selectedImageContext?.imageType) {
      const { source, imageType } = selectedImageContext;
      
      console.log('🎯 Using context-aware selection:', { source, imageType, imageId: selectedBaseImageId });
      
      if (source === 'input' && imageType === 'TWEAK_UPLOADED') {
        // Look in input images (user uploaded to tweak)
        const inputImage = inputImages.find(img => img.id === selectedBaseImageId);
        if (inputImage) {
          console.log('✅ Found TWEAK_UPLOADED in inputImages:', inputImage.imageUrl);
          return inputImage.imageUrl;
        }
      } else if (source === 'create' && imageType === 'CREATE_GENERATED') {
        // Look in create images (generated in CREATE module)
        const createImage = createImages.find(img => img.id === selectedBaseImageId);
        if (createImage) {
          console.log('✅ Found CREATE_GENERATED in createImages:', createImage.imageUrl);
          return createImage.imageUrl;
        }
      } else if (source === 'tweak' && imageType === 'TWEAK_GENERATED') {
        // Look in tweak history images (generated in TWEAK module)
        const tweakImage = allTweakImages.find((img: any) => img.id === selectedBaseImageId);
        if (tweakImage) {
          console.log('✅ Found TWEAK_GENERATED in allTweakImages:', tweakImage.imageUrl);
          return tweakImage.imageUrl;
        }
      }
    }
    
    // Fallback to the old logic if context is not available or image not found
    console.log('🔄 Context-aware lookup failed, falling back to sequential search');
    console.log('🔍 getCurrentImageUrl: Available sources:', {
      tweakImages: allTweakImages.map(img => ({ id: img.id, url: img.imageUrl?.slice(-20) })),
      inputImages: inputImages.map(img => ({ id: img.id, url: img.imageUrl?.slice(-20) })),
      createImages: createImages.map(img => ({ id: img.id, url: img.imageUrl?.slice(-20) })),
      historyImages: historyImages.map(img => ({ id: img.id, url: img.imageUrl?.slice(-20) }))
    });
    
    // Check in tweak history images first (newly generated images)
    const tweakImage = allTweakImages.find((img: any) => img.id === selectedBaseImageId);
    if (tweakImage) {
      console.log('✅ Found in allTweakImages:', tweakImage.imageUrl);
      return tweakImage.imageUrl;
    }
    
    // Check in input images
    const inputImage = inputImages.find(img => img.id === selectedBaseImageId);
    if (inputImage) {
      console.log('✅ Found in inputImages:', inputImage.imageUrl);
      return inputImage.imageUrl;
    }
    
    // Check in create images (from TWEAK_MODULE)
    const createImage = createImages.find(img => img.id === selectedBaseImageId);
    if (createImage) {
      console.log('✅ Found in createImages:', createImage.imageUrl);
      return createImage.imageUrl;
    }
    
    // Check in all history images (from CREATE_MODULE and other sources)
    const historyImage = historyImages.find(img => img.id === selectedBaseImageId);
    if (historyImage) {
      console.log('✅ Found in historyImages:', historyImage.imageUrl);
      return historyImage.imageUrl;
    }
    
    console.log('❌ Image not found in any source for ID:', selectedBaseImageId);
    return undefined;
  };

  // Helper functions to determine correct selection for each panel
  const getInputImageSelection = (): number | null => {
    // Show selection only if context indicates TWEAK_UPLOADED and source is input
    if (selectedImageContext?.imageType === 'TWEAK_UPLOADED' && 
        selectedImageContext?.source === 'input' && 
        selectedBaseImageId) {
      const isInInputImages = inputImages.some(img => img.id === selectedBaseImageId);
      console.log('🔍 getInputImageSelection (context-aware):', { 
        selectedBaseImageId, 
        isInInputImages, 
        imageType: selectedImageContext.imageType,
        source: selectedImageContext.source
      });
      return isInInputImages ? selectedBaseImageId : null;
    }
    console.log('🔍 getInputImageSelection: Not TWEAK_UPLOADED from input');
    return null;
  };

  const getCreateImageSelection = (): number | null => {
    // Show selection only if context indicates CREATE_GENERATED and source is create
    if (selectedImageContext?.imageType === 'CREATE_GENERATED' && 
        selectedImageContext?.source === 'create' && 
        selectedBaseImageId) {
      const isInCreateImages = createImages.some(img => img.id === selectedBaseImageId);
      console.log('🔍 getCreateImageSelection (context-aware):', { 
        selectedBaseImageId, 
        isInCreateImages, 
        imageType: selectedImageContext.imageType,
        source: selectedImageContext.source
      });
      return isInCreateImages ? selectedBaseImageId : null;
    }
    console.log('🔍 getCreateImageSelection: Not CREATE_GENERATED from create');
    return null;
  };

  const getTweakHistorySelection = (): number | undefined => {
    // Show selection only if context indicates TWEAK_GENERATED and source is tweak
    if (selectedImageContext?.imageType === 'TWEAK_GENERATED' && 
        selectedImageContext?.source === 'tweak' && 
        selectedBaseImageId) {
      const isInTweakImages = allTweakImages.some(img => img.id === selectedBaseImageId);
      console.log('🔍 getTweakHistorySelection (context-aware):', { 
        selectedBaseImageId, 
        isInTweakImages, 
        imageType: selectedImageContext.imageType,
        source: selectedImageContext.source
      });
      return isInTweakImages ? selectedBaseImageId : undefined;
    }
    console.log('🔍 getTweakHistorySelection: Not TWEAK_GENERATED from tweak');
    return undefined;
  };

  // Check if we have any images to determine layout
  const hasImages = inputImages.length > 0 || historyImages.length > 0;

  return (
    <MainLayout>
      <div className="flex-1 flex overflow-hidden relative">
        {/* Show normal layout when images exist */}
        {hasImages ? (
          <>
            {/* Left Panel - Image Selection */}
            <div className="absolute top-1/2 left-3 -translate-y-1/2 z-50">
              <ImageSelectionPanel
                inputImages={inputImages.filter((img: any) => img.status === 'COMPLETED')}
                createImages={createImages.filter((img: any) => img.status === 'COMPLETED')}
                selectedImageId={getInputImageSelection() || getCreateImageSelection() || null}
                onSelectImage={handleSelectBaseImage}
                onUploadImage={handleImageUpload}
                loadingInputAndCreate={loadingInputAndCreate}
                error={error}
              />
            </div>

            {/* Center - Canvas Area (Full Screen) */}
            <TweakCanvas
              ref={canvasRef}
              imageUrl={getCurrentImageUrl()}
              currentTool={currentTool}
              selectedBaseImageId={selectedBaseImageId}
              onDownload={handleDownload}
              loading={isGenerating && showCanvasSpinner}
              onOpenGallery={handleOpenGallery}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
              onShare={handleShare}
              onCreate={handleCreate}
              onUpscale={handleUpscale}
              imageId={selectedBaseImageId || undefined}
            />

            {/* Right Panel - Tweak History */}
            <HistoryPanel
              images={allTweakImages.map((img: any) => ({
                id: img.id,
                imageUrl: img.imageUrl,
                thumbnailUrl: img.thumbnailUrl,
                createdAt: new Date(img.createdAt),
                status: img.status as 'PROCESSING' | 'COMPLETED' | 'FAILED',
                batchId: img.batchId,
                variationNumber: img.variationNumber,
                runpodStatus: img.runpodStatus
              }))}
              selectedImageId={getTweakHistorySelection()}
              onSelectImage={handleSelectTweakImage}
              loading={isGenerating || retryInProgress || loadingAllTweakImages}
              error={error}
              showAllImages={true} // Show all tweak images regardless of status
            />

            {/* Floating Toolbar */}
            <TweakToolbar
              currentTool={currentTool}
              onToolChange={handleToolChange}
              onGenerate={handleGenerate}
              onAddImage={handleAddImageToCanvas}
              prompt={prompt}
              onPromptChange={handlePromptChange}
              variations={variations}
              onVariationsChange={handleVariationsChange}
              disabled={!selectedBaseImageId || (isGenerating && showCanvasSpinner)}
              loading={isGenerating && showCanvasSpinner}
            />
          </>
        ) : (
          /* Show file upload section when no images exist */
          <div className="flex-1 flex items-center justify-center">
            <FileUpload 
              onUploadImage={handleImageUpload}
              loading={loadingInputAndCreate}
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

export default TweakPage;