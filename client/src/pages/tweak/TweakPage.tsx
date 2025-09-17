import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
// import { useRunPodWebSocket } from '@/hooks/useRunPodWebSocket';
import { useUserWebSocket } from '@/hooks/useUserWebSocket';
import { useCreditCheck } from '@/hooks/useCreditCheck';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import MainLayout from "@/components/layout/MainLayout";
import TweakCanvas, { TweakCanvasRef } from '@/components/tweak/TweakCanvas';
import InputHistoryPanel from '@/components/create/InputHistoryPanel';
import HistoryPanel from '@/components/create/HistoryPanel';
import TweakToolbar from '@/components/tweak/TweakToolbar';
import GalleryModal from '@/components/gallery/GalleryModal';
import FileUpload from '@/components/create/FileUpload';
import api from '@/lib/api';

// Redux actions
import { uploadInputImage, fetchInputImagesBySource, createInputImageFromExisting } from '@/features/images/inputImagesSlice';
import { fetchTweakHistoryForImage, fetchAllTweakImages, fetchAllVariations, addProcessingTweakVariations } from '@/features/images/historyImagesSlice';
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
import { setIsModalOpen, setMode } from '@/features/gallery/gallerySlice';

const TweakPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const canvasRef = useRef<TweakCanvasRef | null>(null);
  const { checkCreditsBeforeAction } = useCreditCheck();
  const [processingUrlParams, setProcessingUrlParams] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Redux selectors - using consistent data structure with Create/Refine pages
  const inputImages = useAppSelector(state => state.inputImages.images); // TWEAK_MODULE input images
  const inputImagesLoading = useAppSelector(state => state.inputImages.loading);
  const inputImagesError = useAppSelector(state => state.inputImages.error);
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

  // Debug URL parameters and current state
  const debugUrlParams = searchParams.get('imageId');
  const debugUrlType = searchParams.get('type');
  
  // Automatic detection of new images (fallback when WebSocket fails)
  useEffect(() => {
    if (isGenerating) {
      // Give WebSocket a longer chance to work - wait 10 seconds before fallback
      const timeoutId = setTimeout(() => {
        // Check if there are any new completed images
        const recentImages = allTweakImages.filter(img => {
          const imgTime = new Date(img.createdAt).getTime();
          const tenSecondsAgo = Date.now() - 10000; // 10 seconds ago
          return img.status === 'COMPLETED' && imgTime > tenSecondsAgo;
        });
        
        if (recentImages.length > 0) {
          const newestImage = recentImages.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
          
          dispatch(setIsGenerating(false));
          dispatch(setSelectedBaseImageIdAndClearObjects(newestImage.id));
          // Refresh all tweak images to show the new generation (only once per generation)
          dispatch(fetchAllTweakImages());
        }
      }, 10000); // Wait 10 seconds before checking
      
      return () => clearTimeout(timeoutId);
    }
  }, [isGenerating, dispatch]); // Removed allTweakImages.length to prevent cascading updates
  
  // Simple timeout check for debugging (no polling)
  useEffect(() => {
    if (isGenerating) {
      const timeoutId = setTimeout(() => {
      }, 30000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isGenerating, isUserConnected, selectedBaseImageId]);

  // Reset timeout states on page load for better UX
  useEffect(() => {
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
      
      // Load all required data in parallel
      const [inputCreateResult, variationsResult, tweakImagesResult] = await Promise.allSettled([
        dispatch(fetchInputImagesBySource({ uploadSource: 'TWEAK_MODULE' })),
        dispatch(fetchAllVariations({ page: 1, limit: 100 })),
        dispatch(fetchAllTweakImages())
      ]);
      
      // Mark initial data as loaded regardless of individual results
      setInitialDataLoaded(true);
    };
    
    loadInitialData();
  }, [dispatch]);

  // Load tweak history when base image changes (keep for lineage tracking)
  useEffect(() => {
    if (selectedBaseImageId) {
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
            dispatch(setPrompt(savedPrompt));
          } else {
            dispatch(setPrompt(''));
          }
        } else {
          dispatch(setPrompt(''));
        }
      } else {
        // For all other image types (TWEAK_UPLOADED, CREATE_GENERATED) - start with empty prompt
        dispatch(setPrompt(''));
      }
    } else {
      // Clear prompt when no image is selected
      dispatch(setPrompt(''));
    }
  }, [selectedBaseImageId, selectedImageContext, allTweakImages, dispatch]);

  // Simplified auto-selection logic
  const autoSelectedImage = useMemo(() => {
    // Only run auto-selection logic when we have initial data and no current selection
    if (!initialDataLoaded || selectedBaseImageId || processingUrlParams) {
      return null;
    }
    
    const imageIdParam = searchParams.get('imageId');
    if (imageIdParam && !isNaN(parseInt(imageIdParam))) {
      return null; // Skip if URL parameters exist - let URL handler take care of it
    }

    // Simple case: Select the latest uploaded input image if available
    if (inputImages.length > 0) {
      const mostRecent = [...inputImages].sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      return { id: mostRecent.id, type: 'TWEAK_UPLOADED' as const, source: 'input' as const };
    }

    return null;
  }, [initialDataLoaded, selectedBaseImageId, processingUrlParams, searchParams, inputImages]);

  // Simplified auto-selection effect
  useEffect(() => {
    if (autoSelectedImage) {
      dispatch(setSelectedImageWithContext({
        imageId: autoSelectedImage.id,
        imageType: autoSelectedImage.type,
        source: autoSelectedImage.source
      }));
    }
  }, [autoSelectedImage, dispatch]);

  // Handle URL parameter for direct image selection from gallery
  // This effect runs whenever the data changes, so it will keep trying until the image is found
  useEffect(() => {
    const imageIdParam = searchParams.get('imageId');
    const typeParam = searchParams.get('type');
    
    // Don't process URL parameters while data is still loading
    if (loading || loadingInputAndCreate) {
      return;
    }
    
    if (imageIdParam) {
      const targetImageId = parseInt(imageIdParam);
      
      if (!isNaN(targetImageId)) {
        // Set flag to prevent auto-selection conflicts
        setProcessingUrlParams(true);
        
        // Skip if this image is already selected
        if (selectedBaseImageId === targetImageId) {
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
          
          
          if (historyImage || tweakImage || createImage) {
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
          
          
          if (existsInCreateImages || existsInInputImages || existsInTweakImages || existsInHistoryImages) {
            
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
  }, [searchParams, selectedBaseImageId, dispatch, setSearchParams]); // Removed data arrays and loading states to prevent cascading re-renders

  // Event handlers
  const handleImageUpload = async (file: File) => {
    try {
      const resultAction = await dispatch(uploadInputImage({ file, uploadSource: 'TWEAK_MODULE' }));
      if (uploadInputImage.fulfilled.match(resultAction)) {
        dispatch(setSelectedBaseImageId(resultAction.payload.id));
        // Refresh the input images list with TWEAK_MODULE filter
        dispatch(fetchInputImagesBySource({ uploadSource: 'TWEAK_MODULE' }));
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
    // For tweak images, we always know they are TWEAK_GENERATED
    dispatch(setSelectedImageWithContext({
      imageId,
      imageType: 'TWEAK_GENERATED',
      source: 'tweak'
    }));
  };

  const handleSelectBaseImage = async (imageId: number, source: 'input' | 'create') => {
    
    // Determine the image type based on the source provided by the component
    let imageType: ImageType = 'TWEAK_UPLOADED';
    let actualSource: 'input' | 'create' | 'tweak' = source;
    
    if (source === 'input') {
      imageType = 'TWEAK_UPLOADED';
      actualSource = 'input';
    } else if (source === 'create') {
      imageType = 'CREATE_GENERATED';
      actualSource = 'create';
    }
    
    // Use the new context-aware action with the definitive source information
    dispatch(setSelectedImageWithContext({
      imageId,
      imageType,
      source: actualSource
    }));
    
  };

  // Wrapper handler for InputHistoryPanel (which only handles input images)
  const handleSelectInputImage = async (imageId: number) => {
    await handleSelectBaseImage(imageId, 'input');
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

    if (isExpandBorderSelected && isOutpaintNeeded) {
      shouldUseOutpaint = true;
    } else if (hasDrawnObjects) {
      shouldUseInpaint = true;
    } else if (isOutpaintNeeded) {
      // Fallback: if bounds are expanded but no clear tool selection, use outpaint
      shouldUseOutpaint = true;
    } else {
      // Fallback: use inpaint if no other conditions match
      shouldUseInpaint = true;
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


    // Note: For inpaint operations, the prompt will be saved to the newly generated images by the backend
    // We do NOT save/update the prompt on the current selected image to avoid modifying the source image's prompt
    if (shouldUseInpaint) {
    } else if (shouldUseOutpaint) {
    }

    // Execute the determined API call
    if (shouldUseOutpaint) {
      await handleOutpaintGeneration();
    } else {
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
          }
          
          if (!validOriginalBaseImageId) {
            throw new Error('No valid base image ID found. Please select an image before attempting to generate inpaint.');
          }
          
          
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
            
            // 🔥 NEW: Add processing placeholders to history panel immediately
            if (resultAction.payload?.data?.imageIds && resultAction.payload?.data?.batchId) {
              
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
              dispatch(updateCredits(resultAction.payload.data.remainingCredits));
            } else {
              // Fallback: refresh user data to get updated credits
              dispatch(fetchCurrentUser());
            }
          } else {
            throw new Error('Failed to generate inpaint: ' + resultAction.error?.message);
          }
          
        } else {
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
      return;
    }

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
      }
      
      if (!validOriginalBaseImageId) {
        throw new Error('No valid base image ID found. Please select an image before attempting to generate outpaint.');
      }
      
      
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
        
        // 🔥 NEW: Add processing placeholders to history panel immediately
        if (resultAction.payload?.data?.imageIds && resultAction.payload?.data?.batchId) {
          
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
          dispatch(updateCredits(resultAction.payload.data.remainingCredits));
        } else {
          // Fallback: refresh user data to get updated credits
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
    dispatch(setMode('edit'));
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
    console.log('🟢 CREATE BUTTON CLICKED (TWEAK):', { imageId });

    if (imageId) {
      // Determine if it's an input or generated image
      const isInputImage = inputImages.some(img => img.id === imageId);
      const isTweakImage = allTweakImages.some(img => img.id === imageId);
      const isCreateImage = createImages.some(img => img.id === imageId);
      const isHistoryImage = historyImages.some(img => img.id === imageId);

      console.log('🔍 Image type detection (Create from Tweak):', {
        imageId,
        isInputImage,
        isTweakImage,
        isCreateImage,
        isHistoryImage,
        totalInputImages: inputImages.length,
        totalTweakImages: allTweakImages.length,
        totalCreateImages: createImages.length,
        totalHistoryImages: historyImages.length
      });

      if (isInputImage) {
        // For input images, check if already converted to CREATE
        const inputImage = inputImages.find(img => img.id === imageId);

        console.log('📄 Input image found (Create from Tweak):', {
          id: inputImage?.id,
          uploadSource: inputImage?.uploadSource,
          createUploadId: inputImage?.createUploadId,
          tweakUploadId: inputImage?.tweakUploadId,
          refineUploadId: inputImage?.refineUploadId
        });

        if (inputImage && inputImage.createUploadId) {
          // Already converted - use existing CREATE input
          console.log('✅ Using existing CREATE conversion:', inputImage.createUploadId);
          navigate(`/create?imageId=${inputImage.createUploadId}&type=input`);
        } else {
          // Convert: Create new CREATE input image with cross-module tracking
          console.log('🔄 Creating new CREATE conversion for input image:', inputImage?.id);

          const result = await dispatch(createInputImageFromExisting({
            imageUrl: inputImage!.imageUrl,
            thumbnailUrl: inputImage!.thumbnailUrl,
            fileName: `create-from-tweak-input-${inputImage!.id}.jpg`,
            originalImageId: inputImage!.id,
            uploadSource: 'CREATE_MODULE'
          }));

          if (createInputImageFromExisting.fulfilled.match(result)) {
            const newInputImage = result.payload;
            console.log('✅ Successfully created new CREATE input image:', newInputImage);

            // Refresh Tweak page data to show updated tracking fields
            dispatch(fetchInputImagesBySource({ uploadSource: 'TWEAK_MODULE' }));
            dispatch(fetchAllTweakImages({ page: 1, limit: 100 }));
            dispatch(fetchAllVariations({ page: 1, limit: 100 }));

            toast.success('Image uploaded to Create module');
            navigate(`/create?imageId=${newInputImage.id}&type=input`);
          } else {
            console.error('❌ Failed to create new CREATE input image:', result);
            throw new Error('Failed to convert input image for Create module');
          }
        }
      } else if (isTweakImage || isCreateImage || isHistoryImage) {
        // For generated images, check if already converted or convert now
        const generatedImage = isTweakImage
          ? allTweakImages.find(img => img.id === imageId)
          : isCreateImage
            ? createImages.find(img => img.id === imageId)
            : historyImages.find(img => img.id === imageId);

        if (generatedImage) {
          try {
            if (generatedImage.createUploadId) {
              // Already converted - use existing
              console.log('✅ Using existing CREATE conversion for generated image:', generatedImage.createUploadId);
              navigate(`/create?imageId=${generatedImage.createUploadId}&type=input`);
            } else {
              // Convert: Create new input image for Create module with cross-module tracking
              console.log('🔄 Creating new CREATE conversion for generated image:', generatedImage.id);

              const result = await dispatch(createInputImageFromExisting({
                imageUrl: generatedImage.imageUrl,
                thumbnailUrl: generatedImage.thumbnailUrl,
                fileName: `create-from-tweak-generated-${generatedImage.id}.jpg`,
                originalImageId: generatedImage.id,
                uploadSource: 'CREATE_MODULE'
              }));

              if (createInputImageFromExisting.fulfilled.match(result)) {
                const newInputImage = result.payload;

                // Refresh Tweak page data to show updated tracking fields
                dispatch(fetchInputImagesBySource({ uploadSource: 'TWEAK_MODULE' }));
                dispatch(fetchAllTweakImages({ page: 1, limit: 100 }));
                dispatch(fetchAllVariations({ page: 1, limit: 100 }));

                toast.success('Image uploaded to Create module');
                navigate(`/create?imageId=${newInputImage.id}&type=input`);
              } else {
                throw new Error('Failed to convert generated image for Create module');
              }
            }
          } catch (error: any) {
            console.error('❌ CREATE button error (generated image):', error);
            toast.error('Failed to convert image for Create module: ' + error.message);
          }
        }
      } else {
        toast.error('Image not found');
      }

      // Close gallery modal if open
      dispatch(setIsModalOpen(false));
    } else {
      toast.error('No image selected for creating');
    }
  };

  const handleUpscale = async (imageId?: number) => {
    console.log('🟡 UPSCALE BUTTON CLICKED (TWEAK):', { imageId });

    if (imageId) {
      // Determine if it's an input or generated image
      const isInputImage = inputImages.some(img => img.id === imageId);
      const isTweakImage = allTweakImages.some(img => img.id === imageId);
      const isCreateImage = createImages.some(img => img.id === imageId);
      const isHistoryImage = historyImages.some(img => img.id === imageId);

      console.log('🔍 Image type detection (Upscale from Tweak):', {
        imageId,
        isInputImage,
        isTweakImage,
        isCreateImage,
        isHistoryImage,
        totalInputImages: inputImages.length,
        totalTweakImages: allTweakImages.length,
        totalCreateImages: createImages.length,
        totalHistoryImages: historyImages.length
      });

      if (isInputImage) {
        // For input images, check if already converted to REFINE
        const inputImage = inputImages.find(img => img.id === imageId);

        console.log('📄 Input image found (Upscale from Tweak):', {
          id: inputImage?.id,
          uploadSource: inputImage?.uploadSource,
          createUploadId: inputImage?.createUploadId,
          tweakUploadId: inputImage?.tweakUploadId,
          refineUploadId: inputImage?.refineUploadId
        });

        if (inputImage && inputImage.refineUploadId) {
          // Already converted - use existing REFINE input
          console.log('✅ Using existing REFINE conversion:', inputImage.refineUploadId);
          navigate(`/upscale?imageId=${inputImage.refineUploadId}&type=input`);
        } else {
          // Convert: Create new REFINE input image with cross-module tracking
          console.log('🔄 Creating new REFINE conversion for input image:', inputImage?.id);

          try {
            const result = await dispatch(createInputImageFromExisting({
              imageUrl: inputImage!.imageUrl,
              thumbnailUrl: inputImage!.thumbnailUrl,
              fileName: `refine-from-tweak-input-${inputImage!.id}.jpg`,
              originalImageId: inputImage!.id,
              uploadSource: 'REFINE_MODULE'
            }));

            if (createInputImageFromExisting.fulfilled.match(result)) {
              const newInputImage = result.payload;
              console.log('✅ Successfully created new REFINE input image:', newInputImage);

              // Refresh Tweak page data to show updated tracking fields
              dispatch(fetchInputImagesBySource({ uploadSource: 'TWEAK_MODULE' }));
              dispatch(fetchAllTweakImages({ page: 1, limit: 100 }));
              dispatch(fetchAllVariations({ page: 1, limit: 100 }));

              navigate(`/upscale?imageId=${newInputImage.id}&type=input`);
            } else {
              console.error('❌ Failed to create new REFINE input image:', result);
              throw new Error('Failed to convert input image for Refine module');
            }
          } catch (error: any) {
            console.error('❌ UPSCALE button error (input image):', error);
            toast.error('Failed to convert image for Refine module: ' + error.message);
          }
        }
      } else if (isTweakImage || isCreateImage || isHistoryImage) {
        // For generated images, check if already converted or convert now
        const generatedImage = isTweakImage
          ? allTweakImages.find(img => img.id === imageId)
          : isCreateImage
            ? createImages.find(img => img.id === imageId)
            : historyImages.find(img => img.id === imageId);

        if (generatedImage) {
          try {
            if (generatedImage.refineUploadId) {
              // Already converted - use existing
              console.log('✅ Using existing REFINE conversion for generated image:', generatedImage.refineUploadId);
              navigate(`/upscale?imageId=${generatedImage.refineUploadId}&type=input`);
            } else {
              // Convert: Create new input image for Refine module with cross-module tracking
              console.log('🔄 Creating new REFINE conversion for generated image:', generatedImage.id);

              const result = await dispatch(createInputImageFromExisting({
                imageUrl: generatedImage.imageUrl,
                thumbnailUrl: generatedImage.thumbnailUrl,
                fileName: `refine-from-tweak-generated-${generatedImage.id}.jpg`,
                originalImageId: generatedImage.id,
                uploadSource: 'REFINE_MODULE'
              }));

              if (createInputImageFromExisting.fulfilled.match(result)) {
                const newInputImage = result.payload;

                // Refresh Tweak page data to show updated tracking fields
                dispatch(fetchInputImagesBySource({ uploadSource: 'TWEAK_MODULE' }));
                dispatch(fetchAllTweakImages({ page: 1, limit: 100 }));
                dispatch(fetchAllVariations({ page: 1, limit: 100 }));

                navigate(`/upscale?imageId=${newInputImage.id}&type=input`);
              } else {
                throw new Error('Failed to convert generated image for Refine module');
              }
            }
          } catch (error: any) {
            console.error('❌ UPSCALE button error (generated image):', error);
            toast.error('Failed to convert image for Refine module: ' + error.message);
          }
        }
      } else {
        toast.error('Image not found');
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
      return undefined;
    }
    
    
    // Use the selected image context to determine the correct source
    if (selectedImageContext?.source && selectedImageContext?.imageType) {
      const { source, imageType } = selectedImageContext;
      
      
      if (source === 'input' && imageType === 'TWEAK_UPLOADED') {
        // Look in input images (user uploaded to tweak)
        const inputImage = inputImages.find(img => img.id === selectedBaseImageId);
        if (inputImage) {
          return inputImage.imageUrl;
        }
      } else if (source === 'create' && imageType === 'CREATE_GENERATED') {
        // Look in create images (generated in CREATE module)
        const createImage = createImages.find(img => img.id === selectedBaseImageId);
        if (createImage) {
          return createImage.imageUrl;
        }
      } else if (source === 'tweak' && imageType === 'TWEAK_GENERATED') {
        // Look in tweak history images (generated in TWEAK module)
        const tweakImage = allTweakImages.find((img: any) => img.id === selectedBaseImageId);
        if (tweakImage) {
          return tweakImage.imageUrl;
        }
      }
    }
    
    // Fallback to the old logic if context is not available or image not found
    
    // Check in tweak history images first (newly generated images)
    const tweakImage = allTweakImages.find((img: any) => img.id === selectedBaseImageId);
    if (tweakImage) {
      return tweakImage.imageUrl;
    }
    
    // Check in input images
    const inputImage = inputImages.find(img => img.id === selectedBaseImageId);
    if (inputImage) {
      return inputImage.imageUrl;
    }
    
    // Check in create images (from TWEAK_MODULE)
    const createImage = createImages.find(img => img.id === selectedBaseImageId);
    if (createImage) {
      return createImage.imageUrl;
    }
    
    // Check in all history images (from CREATE_MODULE and other sources)
    const historyImage = historyImages.find(img => img.id === selectedBaseImageId);
    if (historyImage) {
      return historyImage.imageUrl;
    }
    
    return undefined;
  };

  // Helper functions to determine correct selection for each panel
  const getInputImageSelection = (): number | null => {
    // Show selection only if context indicates TWEAK_UPLOADED and source is input
    if (selectedImageContext?.imageType === 'TWEAK_UPLOADED' && 
        selectedImageContext?.source === 'input' && 
        selectedBaseImageId) {
      const isInInputImages = inputImages.some(img => img.id === selectedBaseImageId);
      return isInInputImages ? selectedBaseImageId : null;
    }
    return null;
  };

  const getCreateImageSelection = (): number | null => {
    // Show selection only if context indicates CREATE_GENERATED and source is create
    if (selectedImageContext?.imageType === 'CREATE_GENERATED' && 
        selectedImageContext?.source === 'create' && 
        selectedBaseImageId) {
      const isInCreateImages = createImages.some(img => img.id === selectedBaseImageId);
      return isInCreateImages ? selectedBaseImageId : null;
    }
    return null;
  };

  const getTweakHistorySelection = (): number | undefined => {
    // Show selection only if context indicates TWEAK_GENERATED and source is tweak
    if (selectedImageContext?.imageType === 'TWEAK_GENERATED' && 
        selectedImageContext?.source === 'tweak' && 
        selectedBaseImageId) {
      const isInTweakImages = allTweakImages.some(img => img.id === selectedBaseImageId);
      return isInTweakImages ? selectedBaseImageId : undefined;
    }
    return undefined;
  };

  // Check if we have input images to determine layout (same as Create page)
  const hasInputImages = inputImages && inputImages.length > 0;

  return (
    <MainLayout>
      <div className="flex-1 flex overflow-hidden relative">
        {/* Show normal layout when images exist */}
        {hasInputImages ? (
          <>
            {/* Left Panel - Image Selection */}
            <div className="absolute top-1/2 left-3 -translate-y-1/2 z-50">
              <InputHistoryPanel
                images={inputImages}
                selectedImageId={getInputImageSelection() || undefined}
                onSelectImage={handleSelectInputImage}
                onUploadImage={handleImageUpload}
                loading={inputImagesLoading}
                error={inputImagesError}
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

export default TweakPage;