import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
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
import { uploadInputImage, fetchInputImagesBySource, createInputImageFromExisting } from '@/features/images/inputImagesSlice';
import { fetchAllVariations, addProcessingRefineVariations } from '@/features/images/historyImagesSlice';
import {
  setSelectedImage,
  setIsPromptModalOpen,
  setIsGenerating,
} from '@/features/refine/refineSlice';
import { generateUpscale } from '@/features/upscale/upscaleSlice';
import { setIsModalOpen } from '@/features/gallery/gallerySlice';
import { initializeRefineSettings } from '@/features/customization/customizationSlice';
import { clearSavedPrompt, getInputImageSavedPrompt } from '@/features/masks/maskSlice';

const RefinePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
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
  
  // Get slider values from customization slice  
  const customizationState = useAppSelector(state => state.customization);
  const { creativity, resemblance, dynamics, tilingWidth, tilingHeight } = customizationState;

  // WebSocket integration for real-time updates - same pattern as Create page
  const { isConnected } = useRunPodWebSocket({
    inputImageId: selectedImageId || undefined,
    enabled: !!selectedImageId
  });

  // NEW: User-based WebSocket for reliable notifications regardless of selected image
  const { isConnected: isUserConnected } = useUserWebSocket({
    enabled: true
  });
  
  // Centralized image selection function
  const selectImage = React.useCallback((imageId: number, imageType: 'input' | 'generated') => {
    if (selectedImageId === imageId) return;

    console.log('🎯 selectImage called:', { imageId, imageType, currentSelectedId: selectedImageId });

    let imageUrl: string | undefined;
    
    if (imageType === 'input') {
      const inputImage = inputImages.find(img => img.id === imageId);
      imageUrl = inputImage?.originalUrl || inputImage?.imageUrl;
      console.log('🔍 Looking for input image:', { imageId, found: !!inputImage, imageUrl });
    } else {
      const historyImage = filteredHistoryImages.find(img => img.id === imageId);
      imageUrl = historyImage?.processedImageUrl || historyImage?.imageUrl;
      console.log('🔍 Looking for history image:', { imageId, found: !!historyImage, imageUrl });
    }

    if (imageUrl) {
      console.log('✅ Selecting image:', { imageId, imageType, imageUrl });
      dispatch(setSelectedImage({ id: imageId, url: imageUrl, type: imageType }));
      
      // Reset states for input images
      if (imageType === 'input') {
        dispatch(clearSavedPrompt());
      }
      dispatch(initializeRefineSettings());
    } else {
      console.warn('❌ Image not found:', { imageId, imageType });
    }
  }, [selectedImageId, inputImages, filteredHistoryImages, dispatch]);

  // Handle URL parameters and auto-selection on page load/reload
  useEffect(() => {
    console.log('🔄 URL parameter effect running:', {
      inputImagesLoading,
      historyImagesLoading,
      selectedImageId,
      searchParams: Object.fromEntries(searchParams.entries()),
      inputImagesCount: inputImages.length,
      historyImagesCount: filteredHistoryImages.length
    });

    // Skip if data is still loading
    if (inputImagesLoading || historyImagesLoading) {
      console.log('⏳ Skipping - data still loading');
      return;
    }

    const imageIdParam = searchParams.get('imageId');
    const typeParam = searchParams.get('type');

    // PRIORITY 1: Handle URL parameters if they exist
    if (imageIdParam && typeParam) {
      console.log('🔗 URL parameters found:', { imageIdParam, typeParam });
      const targetImageId = parseInt(imageIdParam);
      
      if (!isNaN(targetImageId)) {
        const imageType = typeParam === 'generated' ? 'generated' : 'input';
        
        // Check if the image exists in the appropriate collection
        let imageExists = false;
        let foundImage = null;
        
        if (imageType === 'input') {
          foundImage = inputImages.find(img => img.id === targetImageId);
          imageExists = !!foundImage;
          console.log('🔍 Checking input images:', { targetImageId, imageExists, availableIds: inputImages.map(img => img.id) });
        } else {
          foundImage = filteredHistoryImages.find(img => img.id === targetImageId);
          imageExists = !!foundImage;
          console.log('🔍 Checking history images:', { targetImageId, imageExists, availableIds: filteredHistoryImages.map(img => img.id) });
        }
        
        if (imageExists && foundImage) {
          console.log('✅ Image exists - selecting it');
          // Image found - select it if not already selected
          if (selectedImageId !== targetImageId) {
            selectImage(targetImageId, imageType);
          }
          
          // Clear URL parameters after successful selection
          setTimeout(() => {
            console.log('🧹 Clearing URL parameters after successful selection');
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('imageId');
            newSearchParams.delete('type');
            setSearchParams(newSearchParams);
          }, 1000); // Give time for selection to complete
          
          return; // Don't fall back to auto-selection when URL params are successfully processed
        } else {
          console.log('⚠️ Image not found in collections - clearing invalid URL params');
          // Clear invalid URL parameters immediately if image doesn't exist
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete('imageId');
          newSearchParams.delete('type');
          setSearchParams(newSearchParams);
          // Continue to fallback logic below
        }
      } else {
        console.warn('❌ Invalid imageId in URL:', imageIdParam);
        // Clear invalid URL parameters
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('imageId');
        newSearchParams.delete('type');
        setSearchParams(newSearchParams);
        // Continue to fallback logic below
      }
    }
    
    // PRIORITY 2: No URL parameters OR invalid URL params - auto-select latest input image if nothing is selected
    if (!selectedImageId && inputImages.length > 0) {
      console.log('📋 No URL params/invalid params & no selection - auto-selecting latest input image');
      const latestInput = [...inputImages].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      
      if (latestInput) {
        console.log('✅ Auto-selecting latest input image:', { id: latestInput.id, createdAt: latestInput.createdAt });
        selectImage(latestInput.id, 'input');
      }
    } else if (!selectedImageId && inputImages.length === 0) {
      console.log('ℹ️ No input images available for auto-selection');
    } else if (selectedImageId) {
      console.log('ℹ️ Image already selected:', selectedImageId);
    }
  }, [selectedImageId, inputImages, filteredHistoryImages, inputImagesLoading, historyImagesLoading, searchParams, selectImage, setSearchParams]);

  // Handle navigation from other pages with pre-selected image
  useEffect(() => {
    const state = location.state as { imageId?: number; imageUrl?: string; imageType?: 'generated' | 'uploaded' } | null;
    if (state?.imageId && state?.imageUrl) {
      const imageType = state.imageType === 'uploaded' ? 'input' : 'generated';
      dispatch(setSelectedImage({ 
        id: state.imageId, 
        url: state.imageUrl, 
        type: imageType
      }));
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.state, dispatch]);

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
      const resultAction = await dispatch(uploadInputImage({ file, uploadSource }));

      if (uploadInputImage.fulfilled.match(resultAction)) {
        const uploadedImage = resultAction.payload;
        
        // Auto-select the uploaded image
        selectImage(uploadedImage.id, 'input');
        
        // Refresh input images
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

      let batchId;
      let runpodJobs;

      // Use upscale API for upscale operations with correct parameters
      const upscaleResult = await dispatch(generateUpscale({
        imageId: selectedImageId,
        imageUrl: selectedImageUrl,
        scale_factor: settings.scaleFactor, // Use scale factor from RefineEditInspector 
        creativity: creativity, // Direct value from Creativity slider
        resemblance: resemblance, // Direct value from Resemblance slider
        prompt: '', // Empty prompt for now
        dynamic: dynamics, // Direct value from Dynamics slider
        tiling_width: tilingWidth, // Direct value from Tiling Width dropdown
        tiling_height: tilingHeight, // Direct value from Tiling Height dropdown
        variations: 1,
        savePrompt: true,
        preserveAIMaterials: true
      })).unwrap();

      batchId = upscaleResult.batchId;
      runpodJobs = upscaleResult.images?.map((img: any, index: number) => ({
        imageId: img.id,
        variationNumber: index + 1
      }));

      console.log('✅ Upscale operation started with slider values:', { 
        scaleFactor: settings.scaleFactor,
        creativity, 
        resemblance, 
        dynamics,
        tilingWidth,
        tilingHeight
      });

      // console.log('✅ Upscale operation started successfully:', upscaleResult);
      // toast.success('Upscale operation started! Check the history panel for results.');

      // Add processing placeholders to history panel immediately for both modes
      if (batchId) {
        const imageIds = runpodJobs?.map((job: any) => job.imageId || (batchId * 1000 + job.variationNumber)) || [batchId * 1000 + 1];
        
        dispatch(addProcessingRefineVariations({
          batchId,
          totalVariations: 1,
          imageIds,
          operationType: 'unknown', // Both upscale and refine will show as REFINE operations
          originalInputImageId: selectedImageId // Pass the selected input image ID for relationship
        }));
      }

      // Close the prompt modal
      dispatch(setIsPromptModalOpen(false));

    } catch (error: any) {
      console.error(`❌ Failed to start ${isUpscaleMode ? 'upscale' : 'refine'} operation:`, error);
      toast.error(error || `Failed to start upscale operation`);

      // Reset generating state
      dispatch(setIsGenerating(false));
    }
  };

  // Handle prompt modal toggle
  const handleTogglePromptModal = (isOpen: boolean) => {
    dispatch(setIsPromptModalOpen(isOpen));
  };

  // Action button handlers for RefineImageCanvas
  const handleShare = async (imageUrl: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Refined Image',
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

  const handleEdit = async (imageId?: number) => {
    console.log('🔵 EDIT BUTTON CLICKED (REFINE):', { imageId });

    if (imageId) {
      // For refine page, we need to convert the current refine result back to TWEAK module
      // This allows users to further edit the refined result
      try {
        const result = await dispatch(createInputImageFromExisting({
          imageUrl: getCurrentImageUrl()!,
          thumbnailUrl: getCurrentImageUrl()!,
          fileName: `edit-from-refine-${imageId}.jpg`,
          originalImageId: imageId,
          uploadSource: 'TWEAK_MODULE'
        }));

        if (createInputImageFromExisting.fulfilled.match(result)) {
          const newInputImage = result.payload;
          console.log('✅ Successfully created new TWEAK input image from refine:', newInputImage);

          toast.success('Image sent to Edit module');
          navigate(`/edit?imageId=${newInputImage.id}&type=input`);
        } else {
          console.error('❌ Failed to create new TWEAK input image:', result);
          throw new Error('Failed to convert refined image for Edit module');
        }
      } catch (error: any) {
        console.error('❌ EDIT button error:', error);
        toast.error('Failed to convert image for Edit module: ' + error.message);
      }
    } else {
      toast.error('No image selected for editing');
    }
  };

  const handleCreate = async (imageId?: number) => {
    console.log('🟢 CREATE BUTTON CLICKED (REFINE):', { imageId });

    if (imageId) {
      // For refine page, we convert the current refine result back to CREATE module
      // This allows users to use the refined result as a starting point for new generations
      try {
        const result = await dispatch(createInputImageFromExisting({
          imageUrl: getCurrentImageUrl()!,
          thumbnailUrl: getCurrentImageUrl()!,
          fileName: `create-from-refine-${imageId}.jpg`,
          originalImageId: imageId,
          uploadSource: 'CREATE_MODULE'
        }));

        if (createInputImageFromExisting.fulfilled.match(result)) {
          const newInputImage = result.payload;
          console.log('✅ Successfully created new CREATE input image from refine:', newInputImage);

          toast.success('Image sent to Create module');
          navigate(`/create?imageId=${newInputImage.id}&type=input`);
        } else {
          console.error('❌ Failed to create new CREATE input image:', result);
          throw new Error('Failed to convert refined image for Create module');
        }
      } catch (error: any) {
        console.error('❌ CREATE button error:', error);
        toast.error('Failed to convert image for Create module: ' + error.message);
      }
    } else {
      toast.error('No image selected for creating');
    }
  };

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
      return historyImage.originalInputImageId;
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

  // Helper to get the preview URL that ALWAYS shows the base input image (original uploaded image)
  const getPreviewImageUrl = () => {
    if (!selectedImageId) {
      return undefined;
    }

    // If current selection is an input image, use its base image URL
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      return inputImage.previewUrl || inputImage.imageUrl;
    }

    // If current selection is a generated image, find the original input image that was used to generate it
    const historyImage = filteredHistoryImages.find(img => img.id === selectedImageId);
    if (historyImage && historyImage.originalInputImageId) {
      const originalInputImage = inputImages.find(img => img.id === historyImage.originalInputImageId);
      if (originalInputImage) {
        return originalInputImage.originalUrl || originalInputImage.imageUrl;
      }
    }

    // Final fallback: use getBaseImageUrl() logic if no original input image found
    return getBaseImageUrl();
  };

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

    console.log('🔍 Auto-detection running:', {
      isGenerating,
      filteredHistoryImagesCount: filteredHistoryImages.length,
      processingCount: filteredHistoryImages.filter(img => img.status === 'PROCESSING').length,
      completedCount: filteredHistoryImages.filter(img => img.status === 'COMPLETED').length
    });

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
        processingCount: processingOperations.length,
        recentImages: recentCompletedOperations.map(img => ({ id: img.id, status: img.status, createdAt: img.createdAt }))
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
                  onSelectImage={(imageId) => selectImage(imageId, 'input')}
                  onUploadImage={handleImageUpload}
                  loading={inputImagesLoading}
                  error={null}
                />
              </div>
            
              <RefineEditInspector
                imageUrl={getPreviewImageUrl()}
                previewUrl={getPreviewImageUrl()}
                inputImageId={getFunctionalInputImageId()}
                processedUrl={getCurrentImageUrl()}
                setIsPromptModalOpen={handleTogglePromptModal}
                editInspectorMinimized={editInspectorMinimized}
                setEditInspectorMinimized={setEditInspectorMinimized}
                loading={historyImagesLoading}
                onShare={handleShare}
                onEdit={handleEdit}
                onCreate={handleCreate}
                imageId={selectedImageId || undefined}
              />
            </div>

            <div className={`flex-1 flex flex-col relative transition-all`}>
              <div className="flex-1 relative">
                <RefineImageCanvas
                  imageUrl={getCurrentImageUrl()}
                  originalImageUrl={getOriginalImageUrl()}
                  loading={isGenerating}
                  setIsPromptModalOpen={handleTogglePromptModal}
                  editInspectorMinimized={editInspectorMinimized}
                  viewMode={viewMode}
                  onShare={handleShare}
                  onEdit={handleEdit}
                  onCreate={handleCreate}
                  imageId={selectedImageId || undefined}
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
                onSelectImage={(imageId) => selectImage(imageId, 'generated')}
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
