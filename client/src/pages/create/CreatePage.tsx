import React, { useEffect, useState } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useWebSocket } from '@/hooks/useWebSocket';
import MainLayout from "@/components/layout/MainLayout";
import EditInspector from '@/components/create/EditInspector';
import ImageCanvas from '@/components/create/ImageCanvas';
import HistoryPanel from '@/components/create/HistoryPanel';
// import ContextToolbar from '@/components/create/ContextToolbar';
import InputHistoryPanel from '@/components/create/InputHistoryPanel';
import AIPromptInput from '@/components/create/AIPromptInput';

// Redux actions
import { fetchInputImages, uploadInputImage } from '@/features/images/inputImagesSlice';
import { generateWithRunPod, fetchRunPodHistory, updateBatchFromWebSocket } from '@/features/images/historyImagesSlice';
import { setSelectedImageId, setIsPromptModalOpen } from '@/features/create/createUISlice';
import { loadBatchSettings } from '@/features/customization/customizationSlice';

const ArchitecturalVisualization: React.FC = () => {
  const dispatch = useAppDispatch();

  const [editInspectorMinimized, setEditInspectorMinimized] = useState(false);
  
  // Redux selectors
  const inputImages = useAppSelector(state => state.inputImages.images);
  const inputImagesLoading = useAppSelector(state => state.inputImages.loading);
  const inputImagesError = useAppSelector(state => state.inputImages.error);
  
  const historyImages = useAppSelector(state => state.historyImages.images);
  const historyImagesLoading = useAppSelector(state => state.historyImages.loading);
  
  const selectedImageId = useAppSelector(state => state.createUI.selectedImageId);
  const isPromptModalOpen = useAppSelector(state => state.createUI.isPromptModalOpen);

  // WebSocket integration for real-time updates (following mask pattern)
  const wsUrl = `${import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3000/ws'}`;
  
  const { sendMessage } = useWebSocket(wsUrl, {
    onMessage: (message) => {
      console.log('WebSocket message received:', message);
      
      // Handle generation updates (same pattern as masks)
      if (message.type === 'generation_started' || message.type === 'generation_completed' || message.type === 'generation_failed') {
        console.log('Generation update:', message);
        
        if (message.type === 'generation_completed' && message.data?.images) {
          // Add completed images to history immediately
          dispatch(updateBatchFromWebSocket({
            batchId: message.data.batchId,
            status: 'COMPLETED',
            images: message.data.images
          }));
        } else if (message.type === 'generation_failed') {
          console.error('Generation failed:', message.error);
        }
      }
    },
    onConnect: () => {
      console.log('Connected to WebSocket for real-time updates');
    },
    onDisconnect: () => {
      console.log('Disconnected from WebSocket');
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    }
  });

  // Subscribe to generation updates when an input image is selected
  useEffect(() => {
    const currentInputImageId = getCurrentInputImageId();
    if (currentInputImageId && sendMessage) {
      console.log('🎨 Subscribing to generation updates for input image:', currentInputImageId);
      
      const subscribed = sendMessage({
        type: 'subscribe_generation',
        inputImageId: currentInputImageId
      });

      if (subscribed) {
        return () => {
          console.log('🎨 Unsubscribing from generation updates for input image:', currentInputImageId);
          sendMessage({
            type: 'unsubscribe_generation',
            inputImageId: currentInputImageId
          });
        };
      }
    }
  }, [selectedImageId, sendMessage]);

  // Load input images and RunPod history on component mount
  useEffect(() => {
    const loadInputImages = async () => {
      const resultAction = await dispatch(fetchInputImages());
      
      // If no image is currently selected and we have images, select the first one (most recent)
      if (fetchInputImages.fulfilled.match(resultAction) && 
          !selectedImageId && 
          resultAction.payload.length > 0) {
        dispatch(setSelectedImageId(resultAction.payload[0].id));
      }
    };

    const loadRunPodHistory = async () => {
      try {
        await dispatch(fetchRunPodHistory({ page: 1, limit: 20 }));
        console.log('RunPod history loaded');
      } catch (error) {
        console.error('Failed to load RunPod history:', error);
      }
    };

    loadInputImages();
    loadRunPodHistory();
  }, [dispatch, selectedImageId]);

  // Event handlers
  const handleImageUpload = async (file: File) => {
    try {
      const resultAction = await dispatch(uploadInputImage(file));
      if (uploadInputImage.fulfilled.match(resultAction)) {
        dispatch(setSelectedImageId(resultAction.payload.id));
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleSubmit = async () => {
    console.log('Submit button clicked - Starting RunPod generation');
    
    // Get the current input image ID
    const currentInputImageId = getCurrentInputImageId();
    if (!currentInputImageId) {
      console.error('No input image selected');
      return;
    }

    // Mock data for RunPod generation (as requested)
    const mockGenerationRequest = {
      prompt: "Pen and ink, illustrated by hergé, studio ghibli, stunning color scheme, masterpiece",
      negativePrompt: "saturated full colors, neon lights,blurry  jagged edges, noise, and pixelation, oversaturated, unnatural colors or gradients  overly smooth or plastic-like surfaces, imperfections. deformed, watermark, (face asymmetry, eyes asymmetry, deformed eyes, open mouth), low quality, worst quality, blurry, soft, noisy extra digits, fewer digits, and bad anatomy. Poor Texture Quality: Avoid repeating patterns that are noticeable and break the illusion of realism. ,sketch, graphite, illustration, Unrealistic Proportions and Scale:  incorrect proportions. Out of scale",
      inputImageId: currentInputImageId,
      variations: 1,
      settings: {
        seed: "1337",
        model: "realvisxlLightning.safetensors",
        upscale: "Yes" as const,
        style: "No" as const,
        cfgKsampler1: 3,
        stepsKsampler1: 6
      }
    };

    try {
      console.log('Dispatching RunPod generation with:', mockGenerationRequest);
      const result = await dispatch(generateWithRunPod(mockGenerationRequest));
      
      if (generateWithRunPod.fulfilled.match(result)) {
        console.log('RunPod generation started successfully:', result.payload);
        // Close the prompt modal
        dispatch(setIsPromptModalOpen(false));
      } else {
        console.error('RunPod generation failed:', result.payload);
      }
    } catch (error) {
      console.error('Error starting RunPod generation:', error);
    }
  };

  const handleSelectImage = async (imageId: string) => {
    dispatch(setSelectedImageId(imageId));
    
    // If selecting a generated image, load its batch settings
    const isGeneratedImage = historyImages.some(img => img.id === imageId);
    if (isGeneratedImage) {
      const selectedImage = historyImages.find(img => img.id === imageId);
      if (selectedImage && selectedImage.batchId) {
        try {
          await dispatch(loadBatchSettings(selectedImage.batchId));
        } catch (error) {
          console.error('Failed to load batch settings:', error);
        }
      }
    }
  };

  const handleTogglePromptModal = (isOpen: boolean) => {
    dispatch(setIsPromptModalOpen(isOpen));
  };
  
  const getCurrentImageUrl = () => {
    if (!selectedImageId) return undefined;
    
    // Check in input images first
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      // Use the processed imageUrl which is already the fallback logic
      return inputImage.imageUrl;
    }
    
    // Check in history images
    const historyImage = historyImages.find(img => img.id === selectedImageId);
    return historyImage?.imageUrl;
  };

  const getCurrentInputImageId = () => {
    if (!selectedImageId) return undefined;
    
    // Check if the selected image is an input image
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      return parseInt(inputImage.id, 10);
    }
    
    return undefined;
  };
  
  return (
    <MainLayout>
      <div className="flex-1 flex overflow-hidden gap-2 relative">
        <div className={`transition-all flex gap-3 z-100 pl-2 py-2 h-full ${editInspectorMinimized ? 'absolute top-0 left-0' : 'relative'}`}>
          <div>
            <InputHistoryPanel
              images={inputImages}
              selectedImageId={selectedImageId}
              onSelectImage={handleSelectImage}
              onUploadImage={handleImageUpload}
              loading={inputImagesLoading}
              error={inputImagesError}
            />
          </div>
          
          <EditInspector 
            imageUrl={getCurrentImageUrl()} 
            inputImageId={getCurrentInputImageId()} // Pass inputImageId for mask generation
            setIsPromptModalOpen={handleTogglePromptModal}
            editInspectorMinimized={editInspectorMinimized}
            setEditInspectorMinimized={setEditInspectorMinimized}
          />
        </div>

        <div className={`flex-1 flex flex-col relative transition-all pt-2`}>
          <div className="flex-1 relative">
            <ImageCanvas 
              imageUrl={getCurrentImageUrl()} 
              loading={historyImagesLoading}
              setIsPromptModalOpen={handleTogglePromptModal}
            />

            {isPromptModalOpen && (
              <AIPromptInput 
                handleSubmit={handleSubmit}
                setIsPromptModalOpen={handleTogglePromptModal}
                loading={historyImagesLoading}
                inputImageId={getCurrentInputImageId()}
              />
            )}
          </div>

          <HistoryPanel 
            images={historyImages}
            selectedImageId={selectedImageId}
            onSelectImage={handleSelectImage}
            loading={historyImagesLoading}
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default ArchitecturalVisualization;