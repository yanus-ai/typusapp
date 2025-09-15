import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useRunPodWebSocket } from '@/hooks/useRunPodWebSocket';
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
import { fetchAllVariations, fetchAllTweakImages } from '@/features/images/historyImagesSlice';
import { 
  fetchAvailableImages,
  fetchRefineOperations,
  loadRefineSettings,
  setSelectedImage,
  setIsPromptModalOpen,
  setIsGenerating,
  generateRefine,
} from '@/features/refine/refineSlice';
import { saveLocalMaterials } from '@/features/refine/refineMaterialsSlice';
import { setIsModalOpen, setMode } from '@/features/gallery/gallerySlice';
import { resetSettings } from '@/features/customization/customizationSlice';
import { getMasks, resetMaskState, clearMaskMaterialSelections, clearSavedPrompt, getInputImageSavedPrompt } from '@/features/masks/maskSlice';

const RefinePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Local state for UI
  const [editInspectorMinimized, setEditInspectorMinimized] = useState(false);
  
  // Redux selectors - Refine specific
  const {
    selectedImageId,
    selectedImageUrl,
    operations,
    loadingOperations,
    shouldFetchOperations,
    isGenerating,
    isPromptModalOpen,
    viewMode,
    settings
  } = useAppSelector(state => state.refine);
  
  // Input images from REFINE_MODULE only - using inputImages slice
  const inputImages = useAppSelector(state => state.inputImages.images);
  const inputImagesLoading = useAppSelector(state => state.inputImages.loading);
  const createImages = useAppSelector(state => state.historyImages.createImages);
  const allTweakImages = useAppSelector(state => state.historyImages.allTweakImages);
  const loadingAllTweakImages = useAppSelector(state => state.historyImages.loadingAllTweakImages);

  // Check if we have input images to determine layout (same as Create page)
  const hasInputImages = inputImages && inputImages.length > 0;
                      
  // Note: InputHistoryPanel now shows refine uploaded images (inputImages from REFINE_MODULE)
  // Other images (create/tweak generated) are available for selection but not shown in the side panel
  
  // Gallery modal state
  const isGalleryModalOpen = useAppSelector(state => state.gallery.isModalOpen);
  
  // Remove unused customization selector

  // WebSocket integration for real-time updates
  const { isConnected } = useRunPodWebSocket({
    inputImageId: selectedImageId || undefined,
    enabled: !!selectedImageId
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
    if (!hasInputImages && (inputImagesLoading || loadingAllTweakImages)) {
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
          }
        } else if (imageType === 'generated') {
          // Handle generated image selection (create or tweak generated)
          // First try tweak generated images
          const tweakImage = allTweakImages?.find(img => img.id === targetImageId && img.status === 'COMPLETED');
          
          if (tweakImage) {
            dispatch(setSelectedImage({
              id: targetImageId,
              url: tweakImage.imageUrl,
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
            // Try create generated images
            const createImage = createImages?.find(img => img.id === targetImageId && img.status === 'COMPLETED');
            
            if (createImage) {
              dispatch(setSelectedImage({
                id: targetImageId,
                url: createImage.imageUrl,
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
            }
          }
        }
      } else {
        console.warn('⚠️ Invalid imageId URL parameter:', imageIdParam);
      }
    }
  }, [searchParams, selectedImageId, inputImages, createImages, allTweakImages, hasInputImages, inputImagesLoading, loadingAllTweakImages, dispatch, setSearchParams]);

  // EFFECT: Retry URL parameter selection if image wasn't found initially but becomes available
  useEffect(() => {
    const imageIdParam = searchParams.get('imageId');
    const typeParam = searchParams.get('type');
    
    // Only retry if we have URL params but no selected image
    if (imageIdParam && !selectedImageId) {
      const targetImageId = parseInt(imageIdParam);
      
      if (typeParam === 'generated' && (allTweakImages?.length > 0 || createImages?.length > 0)) {
        // First try tweak generated images
        const tweakImage = allTweakImages?.find(img => img.id === targetImageId && img.status === 'COMPLETED');
        
        if (tweakImage) {
          dispatch(setSelectedImage({
            id: targetImageId,
            url: tweakImage.imageUrl,
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
          // Try create generated images
          const createImage = createImages?.find(img => img.id === targetImageId && img.status === 'COMPLETED');
          
          if (createImage) {
            dispatch(setSelectedImage({
              id: targetImageId,
              url: createImage.imageUrl,
              type: 'generated'
            }));
            
            // Clear URL parameters after successful selection
            setTimeout(() => {
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.delete('imageId');
              newSearchParams.delete('type');
              setSearchParams(newSearchParams);
            }, 1000);
          }
        }
      } else if (typeParam === 'input' && inputImages.length > 0) {
        const refineInputImage = inputImages.find(img => img.id === targetImageId);
        
        if (refineInputImage) {
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
        }
      }
    }
  }, [inputImages, createImages, allTweakImages, searchParams, selectedImageId, dispatch, setSearchParams]);

  // Simple auto-select logic - just like Create and Tweak pages
  useEffect(() => {
    if (!selectedImageId && hasInputImages) {
      const imageIdParam = searchParams.get('imageId');
      if (imageIdParam && !isNaN(parseInt(imageIdParam))) {
        return; // Skip if URL parameters exist - let URL handler take care of it
      }

      // Simple case: Select the latest uploaded input image if available - use original URL for high resolution
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

  // Note: Removed subscription check to allow free access to Refine page for image upload and setup

  // Load initial data and customization options
  useEffect(() => {
    // Load input images with REFINE_MODULE filter - using proper source filtering
    dispatch(fetchInputImagesBySource({ uploadSource: 'REFINE_MODULE' }));
    
    // Load all create generated images
    dispatch(fetchAllVariations({ page: 1, limit: 100 }));
    
    // Load all tweak generated images
    dispatch(fetchAllTweakImages());
    
    // Also load available images for refine operations
    dispatch(fetchAvailableImages());
    
    // Reset settings to initial state on component mount
    dispatch(resetSettings());
  }, [dispatch]);

  // Track last loaded image to prevent duplicate API calls
  const lastLoadedImageRef = React.useRef<number | null>(null);
  
  // Load operations and related data when image is selected (optimized with memoization)
  useEffect(() => {
    if (selectedImageId && shouldFetchOperations && lastLoadedImageRef.current !== selectedImageId) {
      
      // Mark this image as being loaded to prevent duplicate calls
      lastLoadedImageRef.current = selectedImageId;
      
      // Only fetch refine operations and settings - defer mask/AI data until needed
      dispatch(fetchRefineOperations(selectedImageId));
      dispatch(loadRefineSettings(selectedImageId));
      
      // Load masks and AI materials only for input images (not generated)
      // This reduces API calls for generated images that may not need masks
      const isInputImage = inputImages.some(img => img.id === selectedImageId);
      if (isInputImage) {
        dispatch(getMasks(selectedImageId));
        // Clear old AI materials from mask slice to prevent conflicts
        dispatch(clearMaskMaterialSelections());
        // Use the correct API for InputImage prompts in Refine module
        dispatch(getInputImageSavedPrompt(selectedImageId));
      }
    }
  }, [selectedImageId, shouldFetchOperations, inputImages, dispatch]);

  
  // Handle image upload
  const handleImageUpload = async (file: File) => {
    try {
      const resultAction = await dispatch(uploadInputImage({ 
        file, 
        uploadSource: 'REFINE_MODULE' 
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
        
        
        // Only refresh refine input images - no need to refresh other sources
        dispatch(fetchInputImagesBySource({ uploadSource: 'REFINE_MODULE' }));
        
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

  const handleOpenGallery = () => {
    dispatch(setMode('upscale'));
    dispatch(setIsModalOpen(true));
  };

  const handleCloseGallery = () => {
    dispatch(setIsModalOpen(false));
  };

  // Handle submit for refine operations
  const handleSubmit = async (userPrompt?: string, contextSelection?: string) => {
    if (!selectedImageId || !selectedImageUrl) {
      toast.error('No image selected for refinement');
      return;
    }

    try {
      // First, save any local materials to the database
      await dispatch(saveLocalMaterials(selectedImageId)).unwrap();
      console.log('✅ Local materials saved successfully');

      // Start the generation process
      dispatch(setIsGenerating(true));
      
      // Call generateRefine with current settings
      const result = await dispatch(generateRefine({
        imageId: selectedImageId,
        imageUrl: selectedImageUrl,
        settings,
        variations: 1
      })).unwrap();

      console.log('✅ Refine operation started successfully:', result);
      toast.success('Refine operation started! Check the history panel for results.');
      
      // Close the prompt modal
      dispatch(setIsPromptModalOpen(false));

    } catch (error: any) {
      console.error('❌ Failed to start refine operation:', error);
      toast.error(error.message || 'Failed to start refine operation');
      dispatch(setIsGenerating(false));
    }
  };

  // Handle prompt modal toggle
  const handleTogglePromptModal = (isOpen: boolean) => {
    dispatch(setIsPromptModalOpen(isOpen));
  };

  // Handle image selection (optimized for speed with debouncing)
  const handleSelectImage = React.useCallback((imageId: number) => {
    
    // Skip if already selected (prevent unnecessary work)
    if (selectedImageId === imageId) {
      return;
    }
    
    // Fast path: Check in refine uploaded images first (most common case)
    const inputImage = inputImages.find(img => img.id === imageId);
    if (inputImage) {
      
      // Single dispatch with image selection - use original URL for high resolution
      dispatch(setSelectedImage({
        id: imageId,
        url: inputImage.originalUrl || inputImage.imageUrl,
        type: 'input'
      }));
      
      // Reset states synchronously (these don't trigger API calls)
      dispatch(resetMaskState());
      dispatch(clearMaskMaterialSelections());
      dispatch(clearSavedPrompt());
      dispatch(resetSettings());
      return;
    }
    
    // Fallback: Check in create generated images
    const createImage = createImages?.find(img => img.id === imageId);
    if (createImage) {
      dispatch(setSelectedImage({
        id: imageId,
        url: createImage.imageUrl,
        type: 'generated'
      }));
      
      // Minimal reset for generated images
      dispatch(resetMaskState());
      dispatch(clearMaskMaterialSelections());
      dispatch(resetSettings());
      return;
    }
    
    // Fallback: Check in tweak generated images
    const tweakImage = allTweakImages?.find(img => img.id === imageId);
    if (tweakImage) {
      dispatch(setSelectedImage({
        id: imageId,
        url: tweakImage.imageUrl,
        type: 'generated'
      }));
      
      // Minimal reset for generated images
      dispatch(resetMaskState());
      dispatch(clearMaskMaterialSelections());
      dispatch(resetSettings());
      return;
    }
    
  }, [selectedImageId, inputImages, createImages, allTweakImages, dispatch]);
  
  // Handle selection of refine operation results
  const handleSelectRefineResult = (imageId: number) => {
    
    const selectedOperation = operations.find(op => op.id === imageId);
    if (selectedOperation && selectedOperation.resultImageUrl) {
      // For refine results, we update the selected image to show the refined result
      console.log('Selected refine result:', selectedOperation.resultImageUrl);
      dispatch(setSelectedImage({
        id: imageId,
        url: selectedOperation.resultImageUrl,
        type: 'generated'
      }));
    }
  };

  // Handle download
  const handleDownload = () => {
    console.log('Download image:', selectedImageId);
  };

  // Get current image URL for display
  const getCurrentImageUrl = () => {
    if (!selectedImageId) {
      return undefined;
    }
    
    
    // PRIORITY 1: Use selectedImageUrl from Redux state if it exists (set by setSelectedImage)
    if (selectedImageUrl) {
      return selectedImageUrl;
    }
    
    
    // PRIORITY 2: Check refine operation results
    const refineOperation = operations.find(op => op.id === selectedImageId);
    if (refineOperation) {
      const url = refineOperation.resultImageUrl || refineOperation.processedImageUrl;
      return url;
    }
    
    // PRIORITY 3: Check input images (refine uploaded) - prioritize original high-resolution URL
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      return inputImage.originalUrl || inputImage.imageUrl;
    }
    
    // PRIORITY 4: Check create generated images
    const createImage = createImages?.find(img => img.id === selectedImageId);
    if (createImage) {
      return createImage.imageUrl;
    }
    
    // PRIORITY 5: Check tweak generated images
    const tweakImage = allTweakImages?.find(img => img.id === selectedImageId);
    if (tweakImage) {
      return tweakImage.imageUrl;
    }
    
    return undefined;
  };
  
  // Get original input image ID for mask operations
  const getOriginalInputImageId = () => {
    return selectedImageId || undefined;
  };


  // WebSocket event handlers for refine operations
  useEffect(() => {
    if (!isConnected) return;

    // WebSocket event handlers would be implemented here when needed
    // For now, we'll rely on the fallback polling mechanism below
    
  }, [isConnected, selectedImageId, dispatch]);

  // Auto-detect new refined images (fallback when WebSocket fails)
  useEffect(() => {
    if (isGenerating && selectedImageId) {
      const timeoutId = setTimeout(() => {
        // Refresh operations to check for completed items
        dispatch(fetchRefineOperations(selectedImageId));
        
        // Check if generation should be stopped
        const recentOperations = operations.filter(op => {
          const opTime = new Date(op.createdAt).getTime();
          const tenSecondsAgo = Date.now() - 10000;
          return op.status === 'COMPLETED' && opTime > tenSecondsAgo;
        });
        
        if (recentOperations.length > 0) {
          dispatch(setIsGenerating(false));
        }
      }, 10000); // Wait 10 seconds before checking
      
      return () => clearTimeout(timeoutId);
    }
  }, [isGenerating, selectedImageId, operations.length, dispatch]);

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
                  selectedImageId={selectedImageId || undefined}
                  onSelectImage={handleSelectImage}
                  onUploadImage={handleImageUpload}
                  loading={inputImagesLoading}
                  error={null}
                />
              </div>
            
              <RefineEditInspector
                imageUrl={getCurrentImageUrl()}
                inputImageId={getOriginalInputImageId()}
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
                  originalImageUrl={selectedImageUrl || undefined}
                  operations={operations}
                  loading={loadingOperations}
                  setIsPromptModalOpen={handleTogglePromptModal}
                  editInspectorMinimized={editInspectorMinimized}
                  onDownload={handleDownload}
                  onOpenGallery={handleOpenGallery}
                  viewMode={viewMode}
                />

                {isPromptModalOpen && (
                  <RefineAIPromptInput 
                    handleSubmit={handleSubmit}
                    setIsPromptModalOpen={handleTogglePromptModal}
                    loading={loadingOperations}
                    inputImageId={getOriginalInputImageId()}
                  />
                )}
              </div>

              <HistoryPanel 
                images={operations.map(op => ({
                  id: op.id,
                  imageUrl: op.resultImageUrl || op.processedImageUrl || '',
                  thumbnailUrl: op.thumbnailUrl,
                  createdAt: new Date(op.createdAt),
                  status: op.status,
                  batchId: op.batchId,
                  variationNumber: undefined
                }))}
                selectedImageId={operations.find(op => op.id === selectedImageId)?.id} // Show selection for refine results
                onSelectImage={handleSelectRefineResult}
                loading={loadingOperations}
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
