import React, { useEffect, useRef } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useRunPodWebSocket } from '@/hooks/useRunPodWebSocket';
import MainLayout from "@/components/layout/MainLayout";
import TweakCanvas, { TweakCanvasRef } from '@/components/tweak/TweakCanvas';
import ImageSelectionPanel from '@/components/tweak/ImageSelectionPanel';
import HistoryPanel from '@/components/create/HistoryPanel';
import TweakToolbar from '@/components/tweak/TweakToolbar';
import api from '@/lib/api';

// Redux actions
import { uploadInputImage } from '@/features/images/inputImagesSlice';
import { fetchInputAndCreateImages, fetchTweakHistoryForImage } from '@/features/images/historyImagesSlice';
import { 
  setSelectedBaseImageId, 
  setCurrentTool, 
  setPrompt,
  setVariations,
  generateOutpaint,
  generateInpaint,
  addImageToCanvas,
  setIsGenerating
} from '@/features/tweak/tweakSlice';

const TweakPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const canvasRef = useRef<TweakCanvasRef | null>(null);

  // Redux selectors - using new separated data structure
  const inputImages = useAppSelector(state => state.historyImages.inputImages);
  const createImages = useAppSelector(state => state.historyImages.createImages);
  const allTweakImages = useAppSelector(state => state.historyImages.tweakHistoryImages); // ALL tweak generated images
  const currentBaseImageId = useAppSelector(state => state.historyImages.currentBaseImageId); // Original base image ID resolved by backend
  const loadingInputAndCreate = useAppSelector(state => state.historyImages.loadingInputAndCreate);
  const loadingTweakHistory = useAppSelector(state => state.historyImages.loadingTweakHistory);
  const error = useAppSelector(state => state.historyImages.error);
  
  // Tweak state
  const { 
    selectedBaseImageId, 
    currentTool, 
    prompt, 
    variations,
    isGenerating,
    canvasBounds,
    originalImageBounds
  } = useAppSelector(state => state.tweak);

  // WebSocket integration for real-time updates
  // CRITICAL: Use selectedBaseImageId for WebSocket subscription since that's what user interacted with
  // The dual notification system in the backend ensures notifications are sent to both:
  // - originalBaseImageId (for history/lineage)
  // - selectedBaseImageId (for UI updates - this is what we subscribe to)
  const { isConnected } = useRunPodWebSocket({
    inputImageId: selectedBaseImageId || undefined,
    enabled: !!selectedBaseImageId
  });

  console.log('TWEAK WebSocket connected:', isConnected);
  console.log('TWEAK selectedBaseImageId:', selectedBaseImageId, 'currentBaseImageId:', currentBaseImageId, 'isGenerating:', isGenerating);
  console.log('🔍 TWEAK WebSocket subscribing to ID:', selectedBaseImageId);
  
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
          dispatch(setSelectedBaseImageId(newestImage.id));
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
        console.log('🚨 [TWEAK DEBUG] WebSocket connected:', isConnected);
        console.log('🚨 [TWEAK DEBUG] Selected image ID:', selectedBaseImageId);
      }, 30000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isGenerating, isConnected, selectedBaseImageId]);

  // Load initial data
  useEffect(() => {
    // Fetch images with TWEAK_MODULE upload source filter for TweakPage
    dispatch(fetchInputAndCreateImages({ page: 1, limit: 50, uploadSource: 'TWEAK_MODULE' }));
  }, [dispatch]);

  // Load tweak history when base image changes
  useEffect(() => {
    if (selectedBaseImageId) {
      console.log('🔄 Fetching tweak history for selected image:', selectedBaseImageId);
      // Backend will automatically resolve to original base image and return all variants
      dispatch(fetchTweakHistoryForImage({ baseImageId: selectedBaseImageId }));
    }
  }, [selectedBaseImageId, dispatch]);

  // Auto-select most recent image if none selected (prioritize create results, then input images)
  useEffect(() => {
    if (!selectedBaseImageId) {
      // First try create images (generated results)
      const completedCreateImages = createImages.filter((img: any) => img.status === 'COMPLETED');
      if (completedCreateImages.length > 0) {
        // Sort by updatedAt to get the most recently updated image (create copy first)
        const mostRecentImage = [...completedCreateImages].sort((a: any, b: any) => 
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        )[0];
        console.log('🎯 Auto-selecting most recent create image:', mostRecentImage.id);
        dispatch(setSelectedBaseImageId(mostRecentImage.id));
      } else if (inputImages.length > 0) {
        // If no completed create images, use the most recent input image (create copy first)
        const mostRecentInputImage = [...inputImages].sort((a: any, b: any) => 
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        )[0];
        console.log('🎯 Auto-selecting most recent input image:', mostRecentInputImage.id);
        dispatch(setSelectedBaseImageId(mostRecentInputImage.id));
      }
    }
  }, [createImages, inputImages, selectedBaseImageId, dispatch]); // More specific dependencies

  // Event handlers
  const handleImageUpload = async (file: File) => {
    try {
      const resultAction = await dispatch(uploadInputImage({ file, uploadSource: 'TWEAK_MODULE' }));
      if (uploadInputImage.fulfilled.match(resultAction)) {
        dispatch(setSelectedBaseImageId(resultAction.payload.id));
        // Refresh the input and create images list with TWEAK_MODULE filter
        dispatch(fetchInputAndCreateImages({ page: 1, limit: 50, uploadSource: 'TWEAK_MODULE' }));
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleSelectBaseImage = (imageId: number) => {
    console.log('🎯 User manually selected image:', imageId);
    dispatch(setSelectedBaseImageId(imageId));
  };

  const handleToolChange = (tool: 'select' | 'region' | 'cut' | 'add' | 'rectangle' | 'brush' | 'move' | 'pencil') => {
    dispatch(setCurrentTool(tool));
  };

  const handleGenerate = async () => {
    if (!selectedBaseImageId) {
      console.warn('No base image selected');
      return;
    }

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
          
          // Call inpaint API
          const resultAction = await dispatch(generateInpaint({
            baseImageUrl: currentImageUrl,
            maskImageUrl: maskImageUrl,
            prompt: prompt || 'Add a bird',
            negativePrompt: 'negative_prompt',
            maskKeyword: prompt || 'Add a bird',
            variations: variations,
            originalBaseImageId: currentBaseImageId || selectedBaseImageId,
            selectedBaseImageId: selectedBaseImageId
          }));
          
          if (generateInpaint.fulfilled.match(resultAction)) {
            console.log('✅ Inpaint generation started successfully');
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
      console.error('❌ Error in handleGenerate:', error);
      dispatch(setIsGenerating(false));
      // TODO: Show error toast to user
      alert('Failed to generate inpaint: ' + error.message);
    }
  };

  const handleOutpaintTrigger = async () => {
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

    console.log('🚀 Auto-triggering outpaint due to boundary expansion');
    dispatch(setIsGenerating(true));

    try {
      // Get the current selected image URL
      const currentImageUrl = getCurrentImageUrl();
      if (!currentImageUrl) {
        throw new Error('No current image URL available');
      }

      // Call outpaint API
      const resultAction = await dispatch(generateOutpaint({
        baseImageUrl: currentImageUrl,
        canvasBounds,
        originalImageBounds,
        variations: variations,
        originalBaseImageId: currentBaseImageId || selectedBaseImageId
      }));

      if (generateOutpaint.fulfilled.match(resultAction)) {
        console.log('✅ Outpaint generation started successfully');
      } else {
        throw new Error('Failed to generate outpaint: ' + resultAction.error?.message);
      }
    } catch (error: any) {
      console.error('❌ Error in handleOutpaintTrigger:', error);
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
  };

  const handleVariationsChange = (newVariations: number) => {
    dispatch(setVariations(newVariations));
  };

  const handleDownload = () => {
    console.log('Download image:', selectedBaseImageId);
    // Additional download logic can be added here if needed
  };

  const getCurrentImageUrl = () => {
    if (!selectedBaseImageId) return undefined;
    
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
    
    // Check in create images
    const createImage = createImages.find(img => img.id === selectedBaseImageId);
    return createImage?.imageUrl;
  };

  return (
    <MainLayout>
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel - Image Selection */}
        <div className="absolute top-1/2 left-3 -translate-y-1/2 z-50">
          <ImageSelectionPanel
            inputImages={inputImages.filter((img: any) => img.status === 'COMPLETED')}
            createImages={createImages.filter((img: any) => img.status === 'COMPLETED')}
            selectedImageId={selectedBaseImageId}
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
          loading={isGenerating}
          onOutpaintTrigger={handleOutpaintTrigger}
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
          selectedImageId={selectedBaseImageId || undefined}
          onSelectImage={handleSelectBaseImage}
          loading={isGenerating || loadingTweakHistory}
          error={error}
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
          disabled={!selectedBaseImageId || isGenerating}
        />
      </div>
    </MainLayout>
  );
};

export default TweakPage;