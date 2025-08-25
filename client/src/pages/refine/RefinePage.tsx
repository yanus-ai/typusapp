import React, { useEffect, useState } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useRunPodWebSocket } from '@/hooks/useRunPodWebSocket';
import MainLayout from "@/components/layout/MainLayout";
import RefineImageSelectionPanel from '@/components/refine/RefineImageSelectionPanel';
import RefineCanvas from '@/components/refine/RefineCanvas';
import RefineEditInspector from '@/components/refine/RefineEditInspector';
import GalleryModal from '@/components/gallery/GalleryModal';

// Redux actions
import { 
  fetchAvailableImages,
  fetchRefineOperations,
  setSelectedImage,
  loadRefineSettings,
  setIsGenerating
} from '@/features/refine/refineSlice';
import { setIsModalOpen } from '@/features/gallery/gallerySlice';

const RefinePage: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Local state for UI
  const [editInspectorMinimized, setEditInspectorMinimized] = useState(false);
  
  // Redux selectors
  const {
    selectedImageId,
    selectedImageUrl,
    availableInputImages,
    availableGeneratedImages,
    loadingImages,
    operations,
    loadingOperations,
    shouldFetchOperations,
    isGenerating,
    viewMode,
    error
  } = useAppSelector(state => state.refine);
  
  // Gallery modal state
  const isGalleryModalOpen = useAppSelector(state => state.gallery.isModalOpen);

  // WebSocket integration for real-time updates
  const { isConnected } = useRunPodWebSocket({
    inputImageId: selectedImageId || undefined,
    enabled: !!selectedImageId
  });

  console.log('REFINE WebSocket connected:', isConnected);
  console.log('REFINE selectedImageId:', selectedImageId, 'isGenerating:', isGenerating);

  // Load initial data
  useEffect(() => {
    dispatch(fetchAvailableImages());
  }, [dispatch]);

  // Load operations when image is selected or when shouldFetchOperations flag is set
  useEffect(() => {
    if (selectedImageId && shouldFetchOperations) {
      console.log('Fetching refine operations for selected image:', selectedImageId);
      dispatch(fetchRefineOperations(selectedImageId));
      dispatch(loadRefineSettings(selectedImageId));
    }
  }, [selectedImageId, shouldFetchOperations, dispatch]);

  // Handle image selection
  const handleImageSelect = (image: any, type: 'input' | 'generated') => {
    const imageUrl = type === 'input' 
      ? (image.processedUrl || image.originalUrl)
      : image.imageUrl; // Generated images use 'imageUrl' property
    
    console.log('🖼️ Refine: Selecting image:', { 
      id: image.id, 
      type, 
      imageUrl, 
      fullImage: image 
    });
    
    dispatch(setSelectedImage({
      id: image.id,
      url: imageUrl,
      type
    }));
  };
  
  // Handle image upload
  const handleImageUpload = async (file: File) => {
    try {
      // Import the upload action from input images slice
      const { uploadInputImage } = await import('@/features/images/inputImagesSlice');
      
      const resultAction = await dispatch(uploadInputImage({ 
        file, 
        uploadSource: 'REFINE_MODULE' 
      }));
      
      if (uploadInputImage.fulfilled.match(resultAction)) {
        console.log('Image uploaded successfully to REFINE_MODULE');
        // Refresh available images after upload
        dispatch(fetchAvailableImages());
        
        // Auto-select the uploaded image
        dispatch(setSelectedImage({
          id: resultAction.payload.id,
          url: resultAction.payload.processedUrl || resultAction.payload.originalUrl,
          type: 'input'
        }));
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleOpenGallery = () => {
    dispatch(setIsModalOpen(true));
  };

  const handleCloseGallery = () => {
    dispatch(setIsModalOpen(false));
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
        {/* Left Panel - Compact Image Selection */}
        <div className="transition-all flex gap-3 z-100 pl-2 h-full">
          <RefineImageSelectionPanel
            inputImages={availableInputImages}
            generatedImages={availableGeneratedImages}
            selectedImageId={selectedImageId}
            onImageSelect={handleImageSelect}
            onUploadImage={handleImageUpload}
            onOpenGallery={handleOpenGallery}
            loading={loadingImages}
            operations={operations}
            loadingOperations={loadingOperations}
          />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col relative transition-all">
          <RefineCanvas
            selectedImageId={selectedImageId}
            selectedImageUrl={selectedImageUrl}
            operations={operations}
            viewMode={viewMode}
            isGenerating={isGenerating}
            error={error}
          />
        </div>

        {/* Right Panel - Edit Inspector */}
        <div className="transition-all flex gap-3 z-100 pr-2 h-full">
          <RefineEditInspector
            selectedImageId={selectedImageId}
            selectedImageUrl={selectedImageUrl}
            editInspectorMinimized={editInspectorMinimized}
            setEditInspectorMinimized={setEditInspectorMinimized}
          />
        </div>
        
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
