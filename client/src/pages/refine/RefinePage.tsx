import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useRunPodWebSocket } from '@/hooks/useRunPodWebSocket';
import toast from 'react-hot-toast';
import MainLayout from "@/components/layout/MainLayout";
import RefineEditInspector from '@/components/refine/RefineEditInspector';
import RefineImageCanvas from '@/components/refine/RefineImageCanvas';
import HistoryPanel from '@/components/create/HistoryPanel';
import RefineInputHistoryPanel from '@/components/refine/RefineInputHistoryPanel';
import RefineAIPromptInput from '@/components/refine/RefineAIPromptInput';
import RefineFileUpload from '@/components/refine/RefineFileUpload';
import GalleryModal from '@/components/gallery/GalleryModal';

// Redux actions
import { uploadInputImage } from '@/features/images/inputImagesSlice';
import { fetchInputAndCreateImages, fetchAllCreateImages, fetchAllTweakImages } from '@/features/images/historyImagesSlice';
import { 
  fetchAvailableImages,
  fetchRefineOperations,
  setSelectedImage,
  loadRefineSettings,
  setIsGenerating,
  setIsPromptModalOpen
} from '@/features/refine/refineSlice';
import { setIsModalOpen } from '@/features/gallery/gallerySlice';
import { resetSettings } from '@/features/customization/customizationSlice';
import { getMasks, resetMaskState, getAIPromptMaterials, clearMaskMaterialSelections, clearSavedPrompt, clearAIMaterials, getSavedPrompt } from '@/features/masks/maskSlice';

const RefinePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Local state for UI
  const [editInspectorMinimized, setEditInspectorMinimized] = useState(false);
  
  // Auth and subscription selectors
  const { subscription, isAuthenticated } = useAppSelector(state => state.auth);
  
  // Redux selectors - Refine specific
  const {
    selectedImageId,
    selectedImageUrl,
    operations,
    loadingOperations,
    shouldFetchOperations,
    isGenerating,
    isPromptModalOpen
  } = useAppSelector(state => state.refine);
  
  // Input images from REFINE_MODULE only
  const inputImages = useAppSelector(state => state.historyImages.inputImages);
  const createImages = useAppSelector(state => state.historyImages.createImages); 
  const loadingInputAndCreate = useAppSelector(state => state.historyImages.loadingInputAndCreate);

  // Check if we have any images to determine layout (only REFINE_MODULE images)
  const hasAnyImages = (inputImages && inputImages.length > 0) || 
                      (createImages && createImages.length > 0);
                      
  // Only show REFINE_MODULE images in the input panel
  const allAvailableImages = [
    ...(inputImages || []).map(img => ({ ...img, sourceType: 'input' as const })),
    ...(createImages || []).filter(img => img.status === 'COMPLETED').map(img => ({ ...img, sourceType: 'create' as const }))
  ];
  
  // Sort by most recent first
  const sortedImages = allAvailableImages.sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt).getTime();
    return dateB - dateA;
  });
  
  // Gallery modal state
  const isGalleryModalOpen = useAppSelector(state => state.gallery.isModalOpen);
  
  // Customization selectors
  const { availableOptions } = useAppSelector(state => state.customization);

  // WebSocket integration for real-time updates
  const { isConnected } = useRunPodWebSocket({
    inputImageId: selectedImageId || undefined,
    enabled: !!selectedImageId
  });

  console.log('REFINE WebSocket connected:', isConnected);
  console.log('REFINE selectedImageId:', selectedImageId, 'isGenerating:', isGenerating);
  
  // Handle navigation from create page with pre-selected image
  useEffect(() => {
    const state = location.state as { imageId?: number; imageUrl?: string; imageType?: 'generated' | 'uploaded' } | null;
    if (state?.imageId && state?.imageUrl) {
      console.log('🔗 Navigated from create page with image:', state);
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

  // Auto-select most recent image if none selected (REFINE_MODULE images only)
  useEffect(() => {
    if (!selectedImageId && hasAnyImages) {
      // First try generated images from REFINE create operations
      const completedCreateImages = createImages.filter(img => img.status === 'COMPLETED');
      if (completedCreateImages.length > 0) {
        const mostRecentCreate = [...completedCreateImages].sort((a, b) => 
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        )[0];
        console.log('🎯 Auto-selecting most recent REFINE create image:', mostRecentCreate.id);
        dispatch(setSelectedImage({ 
          id: mostRecentCreate.id, 
          url: mostRecentCreate.imageUrl, 
          type: 'generated' 
        }));
        return;
      }
      
      // Then try input images from REFINE_MODULE
      if (inputImages.length > 0) {
        const mostRecentInput = [...inputImages].sort((a, b) => 
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        )[0];
        console.log('🎯 Auto-selecting most recent REFINE input image:', mostRecentInput.id);
        dispatch(setSelectedImage({ 
          id: mostRecentInput.id, 
          url: mostRecentInput.imageUrl, 
          type: 'input' 
        }));
      }
    }
  }, [selectedImageId, hasAnyImages, createImages, inputImages, dispatch]);

  // Note: Removed subscription check to allow free access to Refine page for image upload and setup

  // Load initial data and customization options
  useEffect(() => {
    // Load input images with REFINE_MODULE filter to maintain module isolation
    dispatch(fetchInputAndCreateImages({ page: 1, limit: 50, uploadSource: 'REFINE_MODULE' }));
    
    // Also load available images for refine operations
    dispatch(fetchAvailableImages());
    
    // Reset settings to initial state on component mount
    dispatch(resetSettings());
  }, [dispatch]);

  // Load operations and related data when image is selected
  useEffect(() => {
    if (selectedImageId && shouldFetchOperations) {
      console.log('Fetching refine operations for selected image:', selectedImageId);
      dispatch(fetchRefineOperations(selectedImageId));
      dispatch(loadRefineSettings(selectedImageId));
      
      // Load masks and AI materials for the selected image
      dispatch(getMasks(selectedImageId));
      dispatch(getAIPromptMaterials(selectedImageId));
      dispatch(getSavedPrompt(selectedImageId));
    }
  }, [selectedImageId, shouldFetchOperations, dispatch]);

  
  // Handle image upload
  const handleImageUpload = async (file: File) => {
    try {
      const resultAction = await dispatch(uploadInputImage({ 
        file, 
        uploadSource: 'REFINE_MODULE' 
      }));
      
      if (uploadInputImage.fulfilled.match(resultAction)) {
        console.log('Image uploaded successfully to REFINE_MODULE');
        
        // Refresh images after upload with REFINE_MODULE filter
        dispatch(fetchInputAndCreateImages({ page: 1, limit: 50, uploadSource: 'REFINE_MODULE' }));
        
        // Auto-select the uploaded image
        dispatch(setSelectedImage({
          id: resultAction.payload.id,
          url: resultAction.payload.processedUrl || resultAction.payload.originalUrl,
          type: 'input'
        }));
        
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
    dispatch(setIsModalOpen(true));
  };

  const handleCloseGallery = () => {
    dispatch(setIsModalOpen(false));
  };

  // Handle submit for refine operations
  const handleSubmit = async (userPrompt?: string, contextSelection?: string) => {
    console.log('Submit button clicked - Starting refine operation');
    console.log('🔍 Current state:', { 
      selectedImageId, 
      userPrompt,
      contextSelection
    });
    
    // TODO: Implement refine-specific submission logic
    // This will be different from Create page as it handles refining existing images
    console.log('Refine submission logic to be implemented');
  };

  // Handle prompt modal toggle
  const handleTogglePromptModal = (isOpen: boolean) => {
    dispatch(setIsPromptModalOpen(isOpen));
  };

  // Handle image selection (both input and generated images)
  const handleSelectImage = (imageId: number) => {
    console.log('🖼️ handleSelectImage called:', { imageId });
    
    // Reset mask state when switching images
    dispatch(resetMaskState());
    dispatch(clearMaskMaterialSelections());
    dispatch(clearSavedPrompt());
    dispatch(clearAIMaterials());
    
    // Check if it's an input image
    const inputImage = inputImages.find(img => img.id === imageId);
    if (inputImage) {
      dispatch(setSelectedImage({
        id: imageId,
        url: inputImage.imageUrl,
        type: 'input'
      }));
      dispatch(resetSettings());
      return;
    }
    
    // Check if it's a create image from REFINE_MODULE
    const createImage = createImages.find(img => img.id === imageId);
    if (createImage) {
      dispatch(setSelectedImage({
        id: imageId,
        url: createImage.imageUrl,
        type: 'generated'
      }));
      dispatch(resetSettings());
      return;
    }
  };
  
  // Handle selection of refine operation results
  const handleSelectRefineResult = (imageId: number) => {
    console.log('🖼️ handleSelectRefineResult called:', { imageId });
    
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
    if (!selectedImageId) return undefined;
    
    // Check refine operation results first
    const refineOperation = operations.find(op => op.id === selectedImageId);
    if (refineOperation) {
      return refineOperation.resultImageUrl || refineOperation.processedImageUrl;
    }
    
    // Check input images
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      return inputImage.imageUrl;
    }
    
    // Check create images from REFINE_MODULE
    const createImage = createImages.find(img => img.id === selectedImageId);
    if (createImage) {
      return createImage.imageUrl;
    }
    
    return selectedImageUrl || undefined;
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
          console.log('🎯 FALLBACK: Auto-detected new completed refine operation');
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
        {hasAnyImages ? (
          <>
            <div className={`transition-all flex gap-3 z-100 pl-2 h-full ${editInspectorMinimized ? 'absolute top-0 left-0' : 'relative'}`}>
              <div>
                <RefineInputHistoryPanel
                  images={sortedImages.map(img => ({
                    id: img.id,
                    imageUrl: img.imageUrl || '',
                    thumbnailUrl: img.thumbnailUrl || undefined,
                    createdAt: new Date(img.createdAt)
                  }))}
                  selectedImageId={selectedImageId || undefined}
                  onSelectImage={handleSelectImage}
                  onUploadImage={handleImageUpload}
                  loading={loadingInputAndCreate && sortedImages.length === 0}
                  error={null}
                />
              </div>
            
              <RefineEditInspector 
                imageUrl={getCurrentImageUrl()} 
                inputImageId={getOriginalInputImageId()}
                setIsPromptModalOpen={handleTogglePromptModal}
                editInspectorMinimized={editInspectorMinimized}
                setEditInspectorMinimized={setEditInspectorMinimized}
              />
            </div>

            <div className={`flex-1 flex flex-col relative transition-all`}>
              <div className="flex-1 relative">
                <RefineImageCanvas 
                  imageUrl={getCurrentImageUrl()} 
                  loading={loadingOperations}
                  setIsPromptModalOpen={handleTogglePromptModal}
                  editInspectorMinimized={editInspectorMinimized}
                  onDownload={handleDownload}
                  onOpenGallery={handleOpenGallery}
                />

                {isPromptModalOpen && (
                  <RefineAIPromptInput 
                    editInspectorMinimized={editInspectorMinimized}
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
            <RefineFileUpload 
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

export default RefinePage;
