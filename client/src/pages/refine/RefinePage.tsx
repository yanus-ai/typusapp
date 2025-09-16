import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useRunPodWebSocket } from '@/hooks/useRunPodWebSocket';
import { useUserWebSocket } from '@/hooks/useUserWebSocket';
import toast from 'react-hot-toast';
import MainLayout from "@/components/layout/MainLayout";
import RefineEditInspector from '@/components/refine/RefineEditInspector';
import RefineImageCanvas from '@/components/refine/RefineImageCanvas';
import HistoryPanel from '@/components/create/HistoryPanel';
import InputHistoryPanel from '@/components/create/InputHistoryPanel';
import RefineAIPromptInput from '@/components/refine/RefineAIPromptInput';
import FileUpload from '@/components/create/FileUpload';
import GalleryModal from '@/components/gallery/GalleryModal';

// Redux actions
import { uploadInputImage, fetchInputImagesBySource } from '@/features/images/inputImagesSlice';
import { fetchAllVariations, addProcessingRefineVariations } from '@/features/images/historyImagesSlice';
import {
  setSelectedImage,
  setIsPromptModalOpen,
  setIsGenerating,
  generateRefine,
} from '@/features/refine/refineSlice';
import { generateUpscale } from '@/features/upscale/upscaleSlice';
import { setIsModalOpen } from '@/features/gallery/gallerySlice';
import { initializeRefineSettings } from '@/features/customization/customizationSlice';
import { clearSavedPrompt, getInputImageSavedPrompt } from '@/features/masks/maskSlice';

const RefinePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Local state for UI
  const [editInspectorMinimized, setEditInspectorMinimized] = useState(false);
  // const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // Redux selectors - only refine state needed
  const refineState = useAppSelector(state => state.refine);

  const {
    selectedImageId,
    selectedImageUrl,
    isGenerating,
    isPromptModalOpen,
    settings,
    viewMode
  } = refineState;
  
  // Input images from REFINE_MODULE only - using inputImages slice
  const inputImages = useAppSelector(state => state.inputImages.images);
  const inputImagesLoading = useAppSelector(state => state.inputImages.loading);
  
  const historyImages = useAppSelector(state => state.historyImages.images);
  const historyImagesLoading = useAppSelector(state => state.historyImages.loading);
  

  // Filter history images by module type - only REFINE module
  const filteredHistoryImages = React.useMemo(() => {
    const filtered = historyImages.filter((image) =>
      image.moduleType === 'REFINE' && (
        image.status === 'COMPLETED' ||
        image.status === 'PROCESSING' ||
        !image.status
      )
    );
    return filtered;
  }, [historyImages]);

  // Check if we have input images to determine layout
  const hasInputImages = inputImages && inputImages.length > 0;
                      
  // InputHistoryPanel shows refine uploaded images (inputImages from REFINE_MODULE only)
  // HistoryPanel shows refine generated images (filteredHistoryImages from REFINE module only)
  
  // Gallery modal state
  const isGalleryModalOpen = useAppSelector(state => state.gallery.isModalOpen);
  
  // Remove unused customization selector

  // WebSocket integration for real-time updates - same pattern as Create page
  const { isConnected } = useRunPodWebSocket({
    inputImageId: selectedImageId || undefined,
    enabled: !!selectedImageId
  });

  // NEW: User-based WebSocket for reliable notifications regardless of selected image
  const { isConnected: isUserConnected } = useUserWebSocket({
    enabled: true
  });
  
  // Handle navigation from create page with pre-selected image
  useEffect(() => {
    const state = location.state as { imageId?: number; imageUrl?: string; imageType?: 'generated' | 'uploaded' } | null;
    if (state?.imageId && state?.imageUrl) {
      // Set the selected image based on the passed data
      dispatch(setSelectedImage({ 
        id: state.imageId, 
        url: state.imageUrl, 
        type: state.imageType === 'uploaded' ? 'input' : 'generated' 
      }));
      
      // Clear the navigation state to prevent re-selection on page refresh
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.state, dispatch]);

  // Handle URL parameter for direct image selection (enhanced multi-source support)
  useEffect(() => {
    // Only handle URL params after initial data is loaded
    if (!hasInputImages && (inputImagesLoading)) {
      return;
    }

    const imageIdParam = searchParams.get('imageId');
    const typeParam = searchParams.get('type'); // 'input' or 'generated'
    
    if (imageIdParam && !selectedImageId) {
      const targetImageId = parseInt(imageIdParam);
      const imageType = typeParam === 'generated' ? 'generated' : 'input'; // Default to 'input' for backward compatibility
      
      if (!isNaN(targetImageId)) {
        
        if (imageType === 'input') {
          // Handle input image selection - ONLY from refine uploaded images (REFINE_MODULE)
          const refineInputImage = inputImages.find(img => img.id === targetImageId);
          
          if (refineInputImage) {
            console.log('🔗 URL Parameter: Selecting input image', { targetImageId, refineInputImage });
            dispatch(setSelectedImage({
              id: targetImageId,
              url: refineInputImage.originalUrl || refineInputImage.imageUrl,
              type: 'input'
            }));
            
            // Clear URL parameters after successful selection
            setTimeout(() => {
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.delete('imageId');
              newSearchParams.delete('type');
              setSearchParams(newSearchParams);
            }, 1000);
          } else {
            console.warn('🔗 URL Parameter: Input image not found', { targetImageId, availableInputImages: inputImages.map(img => img.id) });
          }
        } else if (imageType === 'generated') {
          // Handle generated image selection - check refine history first
          const refineGeneratedImage = historyImages.find(img => img.id === targetImageId);
          
          if (refineGeneratedImage) {
            console.log('🔗 URL Parameter: Selecting generated image from history', { targetImageId, refineGeneratedImage });
            dispatch(setSelectedImage({
              id: targetImageId,
              url: refineGeneratedImage.imageUrl,
              type: 'generated'
            }));
            
            // Clear URL parameters after successful selection
            setTimeout(() => {
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.delete('imageId');
              newSearchParams.delete('type');
              setSearchParams(newSearchParams);
            }, 1000);
          } else {
            console.warn('🔗 URL Parameter: Generated image not found in history', { targetImageId, availableGeneratedImages: historyImages.map(img => img.id) });
          }
        }
      } else {
        console.warn('⚠️ Invalid imageId URL parameter:', imageIdParam);
      }
    }
  }, [searchParams, selectedImageId, inputImages, hasInputImages, inputImagesLoading, dispatch, setSearchParams]);

  // Auto-selection logic - only refine input images
  useEffect(() => {
    if (!selectedImageId && hasInputImages) {
      const imageIdParam = searchParams.get('imageId');

      // Skip auto-selection if URL parameters exist - let URL handler take care of it
      if (imageIdParam && !isNaN(parseInt(imageIdParam))) {
        return;
      }

      // Auto-select most recent input image if available
      if (inputImages.length > 0) {
        const mostRecentInput = [...inputImages].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];

        dispatch(setSelectedImage({
          id: mostRecentInput.id,
          url: mostRecentInput.originalUrl || mostRecentInput.imageUrl,
          type: 'input'
        }));
      }
    }
  }, [selectedImageId, hasInputImages, inputImages, searchParams, dispatch]);

  // Load initial data (same as Create page)
  useEffect(() => {
    // Load input images with appropriate module filter based on mode
    const uploadSource = 'REFINE_MODULE';
    dispatch(fetchInputImagesBySource({ uploadSource }));

    // Load ALL variations (includes CREATE, TWEAK, REFINE) - same as Create page
    dispatch(fetchAllVariations({ page: 1, limit: 100 }));

    
  }, [dispatch]);

  // Load AI materials when image is selected (simplified - no masks needed for refine)
  useEffect(() => {
    if (selectedImageId) {
      // Load AI materials only for input images (not generated)
      const isInputImage = inputImages.some(img => img.id === selectedImageId);
      if (isInputImage) {
        // Load saved prompts for the input image
        dispatch(getInputImageSavedPrompt(selectedImageId));
      }
    }
  }, [selectedImageId, inputImages, dispatch]);

  
  // Handle image upload
  const handleImageUpload = async (file: File) => {
    try {
      const uploadSource = 'REFINE_MODULE';
      const resultAction = await dispatch(uploadInputImage({
        file,
        uploadSource
      }));

      if (uploadInputImage.fulfilled.match(resultAction)) {
        const uploadedImage = resultAction.payload;

        // Auto-select the uploaded image FIRST (before refresh)
        // Use original URL for high resolution instead of processed URL
        const imageUrlToUse = uploadedImage.originalUrl || uploadedImage.imageUrl || uploadedImage.processedUrl;

        dispatch(setSelectedImage({
          id: uploadedImage.id,
          url: imageUrlToUse,
          type: 'input'
        }));


        // Only refresh input images - no need to refresh other sources
        dispatch(fetchInputImagesBySource({ uploadSource }));
        
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

  const handleCloseGallery = () => {
    dispatch(setIsModalOpen(false));
  };

  // Detect if we're in upscale mode
  const isUpscaleMode = location.pathname === '/upscale';

  // Handle submit for refine and upscale operations
  const handleSubmit = async () => {
    if (!selectedImageId || !selectedImageUrl) {
      toast.error('No image selected for processing');
      return;
    }

    // Detect if we're in upscale mode based on the current route
    const isUpscaleMode = location.pathname === '/upscale';

    try {
      // Start the generation process
      dispatch(setIsGenerating(true));

      let result;
      let batchId;
      let runpodJobs;

      if (isUpscaleMode) {
        // Use upscale API for upscale operations with correct parameters
        const upscaleResult = await dispatch(generateUpscale({
          imageId: selectedImageId,
          imageUrl: selectedImageUrl,
          scale_factor: 2, // Fixed scale factor
          creativity: 0.5, // 0-1 range (default 0.5)
          resemblance: 0.6, // 0-3 range (default 0.6) 
          prompt: '', // Empty prompt for now
          variations: 1,
          savePrompt: true,
          preserveAIMaterials: true
        })).unwrap();

        batchId = upscaleResult.batchId;
        runpodJobs = upscaleResult.images?.map((img: any, index: number) => ({
          imageId: img.id,
          variationNumber: index + 1
        }));

        // console.log('✅ Upscale operation started successfully:', upscaleResult);
        // toast.success('Upscale operation started! Check the history panel for results.');
      } else {
        // Use refine API for refine operations
        result = await dispatch(generateRefine({
          imageId: selectedImageId,
          imageUrl: selectedImageUrl || '',
          settings: settings as any,
          variations: 1
        })).unwrap();

        batchId = result?.batchId;
        runpodJobs = result?.runpodJobs || result?.images?.map((img: any, index: number) => ({
          imageId: img.id,
          variationNumber: index + 1
        }));

        console.log('✅ Refine operation started successfully:', result);
        toast.success('Refine operation started! Check the history panel for results.');
      }

      // Add processing placeholders to history panel immediately for both modes
      if (batchId) {
        const imageIds = runpodJobs?.map((job: any) => job.imageId || (batchId * 1000 + job.variationNumber)) || [batchId * 1000 + 1];
        
        dispatch(addProcessingRefineVariations({
          batchId,
          totalVariations: 1,
          imageIds,
          operationType: 'unknown' // Both upscale and refine will show as REFINE operations
        }));
      }

      // Close the prompt modal
      dispatch(setIsPromptModalOpen(false));

    } catch (error: any) {
      console.error(`❌ Failed to start ${isUpscaleMode ? 'upscale' : 'refine'} operation:`, error);
      toast.error(error.message || `Failed to start ${isUpscaleMode ? 'upscale' : 'refine'} operation`);

      // Reset generating state
      dispatch(setIsGenerating(false));
    }
  };

  // Handle prompt modal toggle
  const handleTogglePromptModal = (isOpen: boolean) => {
    dispatch(setIsPromptModalOpen(isOpen));
  };

    // Handle image selection - simplified for refine only
  const handleSelectImage = React.useCallback((imageId: number, imageType: 'input' | 'generated') => {
    // Skip if already selected (prevent unnecessary work)
    if (selectedImageId === imageId) {
      return;
    }

    console.log('🖼️ RefinePage: Selecting image', { imageId, imageType });

    // Get the appropriate URL for the image
    let imageUrl: string | undefined;

    if (imageType === 'input') {
      const inputImage = inputImages.find(img => img.id === imageId);
      imageUrl = inputImage?.originalUrl || inputImage?.imageUrl;
      console.log('🖼️ RefinePage: Found input image', { inputImage, imageUrl });
    } else if (imageType === 'generated') {
      // Check in filtered history images (REFINE module) only
      const historyImage = filteredHistoryImages.find(img => img.id === imageId);
      if (historyImage) {
        imageUrl = historyImage.imageUrl || historyImage.processedImageUrl;
        console.log('🖼️ RefinePage: Found refine history image', { historyImage, imageUrl });
      }
    }

    if (imageUrl) {
      dispatch(setSelectedImage({
        id: imageId,
        url: imageUrl,
        type: imageType
      }));

      // Reset states (no mask materials needed for refine)
      if (imageType === 'input') {
        dispatch(clearSavedPrompt());
      }
      dispatch(initializeRefineSettings());

      console.log('🖼️ RefinePage: Image selection completed', { imageId, imageType, imageUrl });
    } else {
      console.error('🖼️ RefinePage: Failed to find image URL for', { imageId, imageType });
    }
  }, [selectedImageId, inputImages, filteredHistoryImages, dispatch]);


  // Get current image URL for display (updated to match Create page approach)
  const getCurrentImageUrl = () => {
    if (!selectedImageId) {
      return undefined;
    }

    // PRIORITY 1: Use selectedImageUrl from Redux state if it exists (set by setSelectedImage)
    if (selectedImageUrl) {
      return selectedImageUrl;
    }

    // PRIORITY 2: Check in filtered history images (REFINE module)
    const historyImage = filteredHistoryImages.find(img => img.id === selectedImageId);
    if (historyImage) {
      const url = historyImage.imageUrl || historyImage.processedImageUrl;
      return url;
    }

    // PRIORITY 3: Check input images (refine uploaded) - prioritize original high-resolution URL
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      const url = inputImage.originalUrl || inputImage.imageUrl;
      return url;
    }

    return undefined;
  };

  // Get original input image URL for before/after comparison - refine module only
  const getOriginalImageUrl = () => {
    if (!selectedImageId) {
      return undefined;
    }

    console.log('🔍 getOriginalImageUrl: Finding original for selectedImageId:', selectedImageId);

    // If current selection is an input image, it IS the original
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      const url = inputImage.originalUrl || inputImage.imageUrl;
      console.log('✅ Found input image as original:', url);
      return url;
    }

    // For generated images, find the original input image that was used (REFINE module only)
    const historyImage = filteredHistoryImages.find(img => img.id === selectedImageId);
    if (historyImage) {
      console.log('📋 Found history image:', { 
        id: historyImage.id, 
        originalInputImageId: historyImage.originalInputImageId,
        createUploadId: historyImage.createUploadId,
        tweakUploadId: historyImage.tweakUploadId,
        refineUploadId: historyImage.refineUploadId,
        moduleType: historyImage.moduleType,
        hasOriginalInputImageId: !!historyImage.originalInputImageId,
        hasCreateUploadId: !!historyImage.createUploadId,
        hasTweakUploadId: !!historyImage.tweakUploadId,
        hasRefineUploadId: !!historyImage.refineUploadId,
      });
      
      // Try to find the base image ID (should be refineUploadId for refine operations)
      const baseImageId = historyImage.originalInputImageId || 
                          historyImage.refineUploadId ||
                          historyImage.createUploadId || 
                          historyImage.tweakUploadId;
      
      if (baseImageId) {
        // Look for the original input in current inputImages (REFINE_MODULE)
        const originalInput = inputImages.find(img => img.id === baseImageId);
        
        if (originalInput) {
          const url = originalInput.originalUrl || originalInput.imageUrl;
          console.log('✅ Found original input from refine history image:', url);
          return url;
        } else {
          console.log('⚠️ Original input not found in REFINE_MODULE for baseImageId:', baseImageId);
          console.log('This might be an image from a different module or created before database fix');
          
          // Use fallback approach: use current image URL as both original and refined
          const fallbackUrl = getCurrentImageUrl();
          if (fallbackUrl) {
            console.log('⚠️ Using current image URL as original fallback for ViewMode:', fallbackUrl);
            return fallbackUrl;
          }
        }
      } else {
        console.log('❌ No base image ID found in refine history image - using fallback');
        
        // This is likely an image created before the database fix
        const fallbackUrl = getCurrentImageUrl();
        if (fallbackUrl) {
          console.log('⚠️ Using current image URL as original fallback for legacy image:', fallbackUrl);
          return fallbackUrl;
        }
      }
    }

    console.log('❌ No original image found for selectedImageId:', selectedImageId);
    console.log('📊 Available collections:', {
      inputImages: inputImages.length,
      historyImages: filteredHistoryImages.length,
    });
    
    // Final fallback: use current image URL if available
    const fallbackUrl = getCurrentImageUrl();
    if (fallbackUrl) {
      console.log('⚠️ Using current image URL as final fallback for ViewMode:', fallbackUrl);
      return fallbackUrl;
    }
    
    // Return undefined if no original can be found
    console.log('❌ No fallback URL available - ViewMode will show "Original Image Not Available"');
    return undefined;
  };
  
  // Debug effect to track image URL changes
  useEffect(() => {
    const currentUrl = getCurrentImageUrl();
    const originalUrl = getOriginalImageUrl();
    console.log('🖼️ RefinePage: Image URLs changed', {
      selectedImageId,
      selectedImageUrl,
      currentUrl,
      originalUrl
    });
  }, [selectedImageId, selectedImageUrl, inputImages, filteredHistoryImages]);
  
  // Get original input image ID for AI materials and prompts (same logic as CreatePage)
  const getFunctionalInputImageId = () => {
    if (!selectedImageId) return undefined;
    
    // If current selection is an input image, return its ID directly
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      return selectedImageId;
    }
    
    // If current selection is a generated image, return its original input image ID
    const historyImage = filteredHistoryImages.find(img => img.id === selectedImageId);
    if (historyImage) {
      return historyImage.originalInputImageId || 
             historyImage.refineUploadId ||
             historyImage.createUploadId || 
             historyImage.tweakUploadId;
    }
    
    return undefined;
  };

  // Helper to get the base/original input image URL (same logic as CreatePage)
  const getBaseImageUrl = () => {
    if (!selectedImageId) {
      return undefined;
    }
    
    // If current selection is an input image, show it directly
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      return inputImage.originalUrl || inputImage.imageUrl;
    }
    
    // If current selection is a generated image, find the original input image
    const historyImage = filteredHistoryImages.find(img => img.id === selectedImageId);
    if (historyImage) {
      const baseImageId = historyImage.originalInputImageId || 
                          historyImage.refineUploadId ||
                          historyImage.createUploadId || 
                          historyImage.tweakUploadId;
      
      if (baseImageId) {
        const originalInputImage = inputImages.find(img => img.id === baseImageId);
        if (originalInputImage) {
          return originalInputImage.originalUrl || originalInputImage.imageUrl;
        }
      }
    }
    
    return undefined;
  };


  // WebSocket event handlers for refine operations - enhanced like Create page
  useEffect(() => {
    if (!isConnected) return;

    // The WebSocket updates are handled automatically by the useRunPodWebSocket hook
    // It dispatches updateVariationFromWebSocket actions that update the historyImagesSlice
    // This automatically updates our filteredHistoryImages which triggers UI updates
    
    console.log('🔗 WebSocket connected for refine operations', { 
      selectedImageId, 
      isConnected: true 
    });
    
  }, [isConnected, selectedImageId]);

  // Auto-set generating state if there are processing images on page load/reload (REFINE module only)
  useEffect(() => {
    const processingImages = filteredHistoryImages.filter(img => img.status === 'PROCESSING');
    
    if (processingImages.length > 0) {
      console.log('🔄 Found processing images on page load, setting generating state', { 
        processingCount: processingImages.length,
        processingImages: processingImages.map(img => ({ id: img.id, status: img.status }))
      });
      
      if (!refineState.isGenerating) {
        dispatch(setIsGenerating(true));
      }
    }
  }, [filteredHistoryImages, refineState.isGenerating, dispatch]);

  // Auto-detect completed operations and update generating state - enhanced like Create page
  useEffect(() => {
    if (!isGenerating) return;

    // Check for recently completed operations (within last 30 seconds)
    const recentCompletedOperations = filteredHistoryImages.filter(img => {
      if (img.status !== 'COMPLETED') return false;
      
      const completedTime = new Date(img.createdAt).getTime();
      const thirtySecondsAgo = Date.now() - 30000;
      
      return completedTime > thirtySecondsAgo;
    });

    // If we have recent completions and no processing operations, stop generating state
    const processingOperations = filteredHistoryImages.filter(img => img.status === 'PROCESSING');
    
    if (recentCompletedOperations.length > 0 && processingOperations.length === 0) {
      console.log('🎉 Refine operation completed, stopping generating state', {
        recentCompletions: recentCompletedOperations.length,
        processingCount: processingOperations.length
      });
      
      dispatch(setIsGenerating(false));
    }
  }, [filteredHistoryImages, isGenerating, dispatch]);

  // Fallback polling mechanism when WebSocket fails (same as Create page)
  useEffect(() => {
    if (isGenerating && !isConnected) {
      console.log('📡 WebSocket disconnected, using fallback polling for refine operations');
      
      const timeoutId = setTimeout(() => {
        // Refresh all variations to check for completed items
        dispatch(fetchAllVariations({ page: 1, limit: 100 }));
        
        console.log('🔄 Fallback: Refreshed variations data during refine generation');
      }, 10000); // Poll every 10 seconds when WebSocket is disconnected

      return () => clearTimeout(timeoutId);
    }
  }, [isGenerating, isConnected, dispatch]);

  return (
    <MainLayout>
      <div className="flex-1 flex overflow-hidden relative">
        {/* Show normal layout when any images exist */}
        {hasInputImages ? (
          <>
            <div className={`transition-all flex gap-3 z-100 pl-2 h-full ${editInspectorMinimized ? 'absolute top-0 left-0' : 'relative'}`}>
              <div>
                <InputHistoryPanel
                  images={inputImages}
                  selectedImageId={(() => {
                    // For input images, show the selection directly
                    if (selectedImageId && inputImages.some(img => img.id === selectedImageId)) {
                      return selectedImageId;
                    }
                    return undefined;
                  })()}
                  onSelectImage={(imageId) => handleSelectImage(imageId, 'input')}
                  onUploadImage={handleImageUpload}
                  loading={inputImagesLoading}
                  error={null}
                />
              </div>
            
              <RefineEditInspector
                imageUrl={getBaseImageUrl()}
                inputImageId={getFunctionalInputImageId()}
                processedUrl={getCurrentImageUrl()}
                setIsPromptModalOpen={handleTogglePromptModal}
                editInspectorMinimized={editInspectorMinimized}
                setEditInspectorMinimized={setEditInspectorMinimized}
              />
            </div>

            <div className={`flex-1 flex flex-col relative transition-all`}>
              <div className="flex-1 relative">
                <RefineImageCanvas
                  imageUrl={getCurrentImageUrl()}
                  originalImageUrl={getOriginalImageUrl()}
                  loading={historyImagesLoading}
                  setIsPromptModalOpen={handleTogglePromptModal}
                  editInspectorMinimized={editInspectorMinimized}
                  viewMode={viewMode}
                />

                {/* Debug info - remove in production */}
                {/* {false && (
                  <div className="absolute top-4 right-4 bg-black/80 text-white p-2 text-xs rounded max-w-md overflow-y-auto max-h-96">
                    <div>Selected ID: {selectedImageId}</div>
                    <div>Selected URL: {selectedImageUrl}</div>
                    <div>Current URL: {getCurrentImageUrl()}</div>
                    <div>Base URL: {getBaseImageUrl()}</div>
                    <div>Original URL: {getOriginalImageUrl()}</div>
                    <div>Input Images: {inputImages.length}</div>
                    <div>History Images: {filteredHistoryImages.length}</div>
                    <div>View Mode: {viewMode}</div>
                    <div>Current Mode: {isUpscaleMode ? 'UPSCALE' : 'REFINE'} MODULE</div>
                    <div>Input Images Sample:</div>
                    <div className="ml-2 text-xs">
                      {inputImages.slice(0, 2).map((img, i) => (
                        <div key={i}>
                          {i + 1}: {img.imageUrl?.includes('/generated/') ? 'Generated' : 'Input'} ({img.id})
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 border-t pt-2">
                      <div>Selected Image Debug:</div>
                      {(() => {
                        // Check in history images (REFINE module)
                        const historyImage = filteredHistoryImages.find(img => img.id === selectedImageId);
                        if (historyImage) {
                          const hasBaseImageId = !!(historyImage.originalInputImageId || 
                                                   historyImage.createUploadId || 
                                                   historyImage.tweakUploadId || 
                                                   historyImage.refineUploadId);
                          return (
                            <div className="ml-2">
                              <div className="text-green-300">Found in REFINE History</div>
                              <div>moduleType: {historyImage.moduleType || 'undefined'}</div>
                              <div>originalInputImageId: {historyImage.originalInputImageId || 'undefined'}</div>
                              <div>createUploadId: {historyImage.createUploadId || 'undefined'}</div>
                              <div>tweakUploadId: {historyImage.tweakUploadId || 'undefined'}</div>
                              <div>refineUploadId: {historyImage.refineUploadId || 'undefined'}</div>
                              <div>createdAt: {new Date(historyImage.createdAt).toLocaleString()}</div>
                              {!hasBaseImageId && (
                                <div className="text-yellow-300 mt-1">
                                  ⚠️ Using fallback original image
                                  <br />
                                  <small>This image was created before the database fix.</small>
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Check in input images (REFINE module)
                        const inputImage = inputImages.find(img => img.id === selectedImageId);
                        if (inputImage) {
                          return (
                            <div className="ml-2">
                              <div className="text-blue-300">Found in REFINE Input Images</div>
                              <div>imageUrl: {inputImage.imageUrl || 'undefined'}</div>
                              <div>originalUrl: {inputImage.originalUrl || 'undefined'}</div>
                            </div>
                          );
                        }
                        
                        return <div className="ml-2 text-red-300">Not found in REFINE module collections</div>;
                      })()}
                    </div>
                    <div className="mt-2 border-t pt-2 text-xs">
                      <div>REFINE Module Collections:</div>
                      <div className="ml-2">
                        <div>Input Images: {inputImages.length}</div>
                        <div>History Images: {filteredHistoryImages.length}</div>
                      </div>
                    </div>
                  </div>
                )} */}

                {isPromptModalOpen && (
                  <RefineAIPromptInput
                    handleSubmit={handleSubmit}
                    setIsPromptModalOpen={handleTogglePromptModal}
                    loading={historyImagesLoading}
                    inputImageId={getFunctionalInputImageId()}
                  />
                )}
              </div>

              <HistoryPanel
                images={filteredHistoryImages}
                selectedImageId={(() => {
                  // For generated images, show the selection only if it's a generated image
                  if (selectedImageId && filteredHistoryImages.some(img => img.id === selectedImageId)) {
                    return selectedImageId;
                  }
                  return undefined;
                })()}
                onSelectImage={(imageId) => handleSelectImage(imageId, 'generated')}
                loading={historyImagesLoading}
                showAllImages={true} // Show all images including processing ones
              />
            </div>
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

export default RefinePage;
