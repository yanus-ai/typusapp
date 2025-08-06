import React, { useEffect } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useRunPodWebSocket } from '@/hooks/useRunPodWebSocket';
import MainLayout from "@/components/layout/MainLayout";
import TweakCanvas from '@/components/tweak/TweakCanvas';
import ImageSelectionPanel from '@/components/tweak/ImageSelectionPanel';
import TweakHistoryPanel from '@/components/tweak/TweakHistoryPanel';
import TweakToolbar from '@/components/tweak/TweakToolbar';

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

  // Redux selectors - using new separated data structure
  const inputImages = useAppSelector(state => state.historyImages.inputImages);
  const createImages = useAppSelector(state => state.historyImages.createImages);
  const tweakHistoryImages = useAppSelector(state => state.historyImages.selectedImageTweakHistory);
  const loadingInputAndCreate = useAppSelector(state => state.historyImages.loadingInputAndCreate);
  const loadingTweakHistory = useAppSelector(state => state.historyImages.loadingTweakHistory);
  const error = useAppSelector(state => state.historyImages.error);
  
  // Tweak state
  const { 
    selectedBaseImageId, 
    currentTool, 
    prompt, 
    variations,
    selectedRegions,
    isGenerating,
    canvasBounds,
    originalImageBounds
  } = useAppSelector(state => state.tweak);

  // WebSocket integration for real-time updates
  useRunPodWebSocket({
    inputImageId: selectedBaseImageId || undefined,
    enabled: true
  });

  // Load initial data
  useEffect(() => {
    dispatch(fetchInputAndCreateImages({ page: 1, limit: 50 }));
  }, [dispatch]);

  // Load tweak history when base image changes
  useEffect(() => {
    if (selectedBaseImageId) {
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
        dispatch(setSelectedBaseImageId(mostRecentImage.id));
      } else if (inputImages.length > 0) {
        // If no completed create images, use the most recent input image (create copy first)
        const mostRecentInputImage = [...inputImages].sort((a: any, b: any) => 
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        )[0];
        dispatch(setSelectedBaseImageId(mostRecentInputImage.id));
      }
    }
  }, [createImages.length, inputImages.length, selectedBaseImageId, dispatch]); // Keep minimal dependencies

  // Event handlers
  const handleImageUpload = async (file: File) => {
    try {
      const resultAction = await dispatch(uploadInputImage(file));
      if (uploadInputImage.fulfilled.match(resultAction)) {
        dispatch(setSelectedBaseImageId(resultAction.payload.id));
        // Refresh the input and create images list
        dispatch(fetchInputAndCreateImages({ page: 1, limit: 50 }));
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleSelectBaseImage = (imageId: number) => {
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
      // Find the selected base image to get its URL
      const selectedImage = tweakHistoryImages.find((img: any) => img.id === selectedBaseImageId) ||
                            createImages.find((img: any) => img.id === selectedBaseImageId) || 
                            inputImages.find((img: any) => img.id === selectedBaseImageId);
      
      if (!selectedImage) {
        console.warn('Selected base image not found');
        return;
      }

      // Check what operations are needed
      const isOutpaintNeeded = canvasBounds.width > originalImageBounds.width || 
                                canvasBounds.height > originalImageBounds.height;
      const isInpaintNeeded = selectedRegions.length > 0 || prompt.trim();

      // Store pipeline state for sequential processing
      const pipelineState = {
        selectedImageId: selectedBaseImageId,
        selectedImageUrl: selectedImage.imageUrl,
        needsOutpaint: isOutpaintNeeded,
        needsInpaint: isInpaintNeeded,
        outpaintParams: {
          baseImageUrl: selectedImage.imageUrl,
          canvasBounds,
          originalImageBounds,
          variations
        },
        inpaintParams: {
          baseImageId: selectedBaseImageId,
          regions: selectedRegions,
          prompt: prompt
        }
      };

      if (isOutpaintNeeded && isInpaintNeeded) {
        // Sequential pipeline: Outpaint first, then Inpaint
        console.log('🔄 Starting sequential pipeline: Outpaint → Inpaint');
        
        const result = await dispatch(generateOutpaint(pipelineState.outpaintParams));
        
        if (generateOutpaint.fulfilled.match(result)) {
          console.log('✅ Phase 1: Outpaint generation started:', result.payload);
          // Phase 2 (inpaint) will be triggered by WebSocket when outpaint completes
          // Store pipeline state for WebSocket to access
          (window as any).tweakPipelineState = {
            ...pipelineState,
            phase: 'OUTPAINT_STARTED',
            outpaintBatchId: result.payload.batchId
          };
        } else {
          console.error('❌ Phase 1 failed: Outpaint generation failed:', result.error);
          dispatch(setIsGenerating(false));
        }
      } else if (isOutpaintNeeded) {
        // Only outpaint needed
        console.log('🎨 Starting outpaint only');
        
        const result = await dispatch(generateOutpaint(pipelineState.outpaintParams));
        
        if (generateOutpaint.fulfilled.match(result)) {
          console.log('✅ Outpaint generation started:', result.payload);
        } else {
          console.error('❌ Outpaint generation failed:', result.error);
          dispatch(setIsGenerating(false));
        }
      } else if (isInpaintNeeded) {
        // Only inpaint needed
        console.log('🖌️ Starting inpaint only');
        
        const result = await dispatch(generateInpaint(pipelineState.inpaintParams));
        
        if (generateInpaint.fulfilled.match(result)) {
          console.log('✅ Inpaint generation started:', result.payload);
        } else {
          console.error('❌ Inpaint generation failed:', result.error);
          dispatch(setIsGenerating(false));
        }
      } else {
        console.warn('⚠️ Nothing to generate - no extended canvas or selected regions');
        dispatch(setIsGenerating(false));
      }
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      // Loading state will be managed by the WebSocket updates
      // Don't set isGenerating to false here - let the WebSocket handle it
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
    const tweakImage = tweakHistoryImages.find(img => img.id === selectedBaseImageId);
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
          imageUrl={getCurrentImageUrl()}
          currentTool={currentTool}
          selectedBaseImageId={selectedBaseImageId}
          onDownload={handleDownload}
        />

        {/* Right Panel - Tweak History */}
        <TweakHistoryPanel
          images={tweakHistoryImages}
          selectedImageId={selectedBaseImageId}
          onSelectImage={handleSelectBaseImage}
          loading={isGenerating}
          loadingTweakHistory={loadingTweakHistory}
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