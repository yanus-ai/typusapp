import React, { useEffect } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import MainLayout from "@/components/layout/MainLayout";
import TweakCanvas from '@/components/tweak/TweakCanvas';
import ImageSelectionPanel from '@/components/tweak/ImageSelectionPanel';
import TweakHistoryPanel from '@/components/tweak/TweakHistoryPanel';
import TweakToolbar from '@/components/tweak/TweakToolbar';

// Redux actions
import { fetchInputImages, uploadInputImage } from '@/features/images/inputImagesSlice';
import { fetchAllVariations } from '@/features/images/historyImagesSlice';
import { 
  setSelectedBaseImageId, 
  setCurrentTool, 
  setPrompt,
  generateInpaint,
  addImageToCanvas
} from '@/features/tweak/tweakSlice';

const TweakPage: React.FC = () => {
  const dispatch = useAppDispatch();

  // Redux selectors
  const inputImages = useAppSelector(state => state.inputImages.images);
  const inputImagesLoading = useAppSelector(state => state.inputImages.loading);
  const historyImages = useAppSelector(state => state.historyImages.images);
  
  // Tweak state
  const { 
    selectedBaseImageId, 
    currentTool, 
    prompt, 
    selectedRegions,
    addedImages,
    isGenerating 
  } = useAppSelector(state => state.tweak);

  // Load initial data
  useEffect(() => {
    dispatch(fetchInputImages());
    dispatch(fetchAllVariations({ page: 1, limit: 50 }));
  }, [dispatch]);

  // Auto-select first image if none selected (prioritize completed history images)
  useEffect(() => {
    if (!selectedBaseImageId) {
      const completedHistoryImages = historyImages.filter((img: any) => img.status === 'COMPLETED');
      if (completedHistoryImages.length > 0) {
        dispatch(setSelectedBaseImageId(completedHistoryImages[0].id));
      } else if (inputImages.length > 0) {
        dispatch(setSelectedBaseImageId(inputImages[0].id));
      }
    }
  }, [historyImages.length, inputImages.length, selectedBaseImageId, dispatch]); // Keep minimal dependencies

  // Event handlers
  const handleImageUpload = async (file: File) => {
    try {
      const resultAction = await dispatch(uploadInputImage(file));
      if (uploadInputImage.fulfilled.match(resultAction)) {
        dispatch(setSelectedBaseImageId(resultAction.payload.id));
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleSelectBaseImage = (imageId: number) => {
    dispatch(setSelectedBaseImageId(imageId));
  };

  const handleToolChange = (tool: 'select' | 'region' | 'cut' | 'add') => {
    dispatch(setCurrentTool(tool));
  };

  const handleGenerate = async () => {
    if (!selectedBaseImageId || (!selectedRegions.length && !addedImages.length && !prompt.trim())) {
      console.warn('Nothing to generate');
      return;
    }

    // Generate based on selected regions and/or added images
    if (selectedRegions.length > 0 || prompt.trim()) {
      await dispatch(generateInpaint({
        baseImageId: selectedBaseImageId,
        regions: selectedRegions,
        prompt: prompt
      }));
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

  const handleDownload = () => {
    console.log('Download image:', selectedBaseImageId);
    // Additional download logic can be added here if needed
  };

  const getCurrentImageUrl = () => {
    if (!selectedBaseImageId) return undefined;
    
    // Check in input images first
    const inputImage = inputImages.find(img => img.id === selectedBaseImageId);
    if (inputImage) {
      return inputImage.imageUrl;
    }
    
    // Check in history images
    const historyImage = historyImages.find(img => img.id === selectedBaseImageId);
    return historyImage?.imageUrl;
  };

  return (
    <MainLayout>
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel - Image Selection */}
        <div className="absolute top-1/2 left-3 -translate-y-1/2 z-50">
          <ImageSelectionPanel
            images={[
              ...historyImages
                .filter((img: any) => img.status === 'COMPLETED')
                .map((img: any) => ({
                  ...img,
                  isUploaded: false
                }))
            ]}
            selectedImageId={selectedBaseImageId}
            onSelectImage={handleSelectBaseImage}
            onUploadImage={handleImageUpload}
            loading={inputImagesLoading}
          />
        </div>

        {/* Center - Canvas Area (Full Screen) */}
        <TweakCanvas
          imageUrl={getCurrentImageUrl()}
          currentTool={currentTool}
          selectedBaseImageId={selectedBaseImageId}
          onDownload={handleDownload}
        />

        {/* Right Panel - History */}
        <TweakHistoryPanel
          images={historyImages.filter((img: any) => img.moduleType === 'TWEAK')}
          selectedImageId={null}
          onSelectImage={() => {}}
          loading={isGenerating}
        />


        {/* Floating Bottom Toolbar */}
        <TweakToolbar
          currentTool={currentTool}
          onToolChange={handleToolChange}
          onGenerate={handleGenerate}
          onReGenerate={() => handleGenerate()}
          onGallery={() => console.log('Gallery clicked')}
          onAddImage={handleAddImageToCanvas}
          prompt={prompt}
          onPromptChange={handlePromptChange}
          disabled={!selectedBaseImageId || isGenerating}
        />
      </div>
    </MainLayout>
  );
};

export default TweakPage;