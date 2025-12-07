import { useEffect, useCallback } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useWebSocket } from './useWebSocket';
import { setMaskGenerationComplete, setMaskGenerationFailed, getMasks, getAIPromptMaterials, setMaskGenerationProcessing, setSavedPrompt } from '@/features/masks/maskSlice';
import { setSelectedModel } from '@/features/tweak/tweakSlice';
import { setIsCatalogOpen, setSelectedImage } from '@/features/create/createUISlice';
import { loadSettingsFromImage } from '@/features/customization/customizationSlice';

interface UseMaskWebSocketOptions {
  inputImageId?: number;
  enabled?: boolean;
}

export const useMaskWebSocket = ({ inputImageId, enabled = true }: UseMaskWebSocketOptions) => {
  const dispatch = useAppDispatch();
  const currentInputImageId = useAppSelector((state) => state.customization.inputImageId);
  const currentPath = window.location.pathname;

  // WebSocket message handler specifically for mask updates
  const handleMaskWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'connected':
        console.log('🎭 Mask WebSocket connected');
        break;
        
      case 'subscribed':
        console.log('🎭 Mask WebSocket subscribed');
        break;
        
      case 'masks_completed': {
        try {
          console.log('🎭 Mask completion detected:', JSON.stringify(message || {}, null, 2));
        } catch {
          // Do nothing
        }

        const messageInputImageId = message.inputImageId;
        
        if (!messageInputImageId) {
          console.warn('⚠️ Mask completion message missing inputImageId');
          break;
        }
        
        // Set the selected image to the one with completed masks
        dispatch(setSelectedImage({ id: messageInputImageId, type: 'input' }));
        
        // Ensure customization slice has the correct inputImageId
        dispatch(loadSettingsFromImage({
          inputImageId: messageInputImageId,
          imageId: messageInputImageId,
          isGeneratedImage: false,
          settings: {}
        }));
        
        // Check if hasInputImage is false (indicated by presence of keywords and generatedPrompt)
        const hasKeywords = message.data?.keywords && Array.isArray(message.data.keywords) && message.data.keywords.length > 0;
        const hasGeneratedPrompt = message.data?.generatedPrompt && typeof message.data.generatedPrompt === 'string';
        const hasInputImage = !hasKeywords; // If keywords are present, hasInputImage is false
        
        if (!hasInputImage) {
          // When hasInputImage is false: set model to nano banana, apply generated prompt, and handle keywords
          console.log('🎭 hasInputImage=false detected, setting nano banana model and applying prompt/keywords');
          dispatch(setSelectedModel('nanobanana'));
          
          // Apply generated prompt if available
          if (hasGeneratedPrompt) {
            dispatch(setSavedPrompt(message.data.generatedPrompt));
            console.log('✅ Generated prompt applied:', message.data.generatedPrompt.substring(0, 50) + '...');
          }
          
          // Keywords are already saved as AI materials in the backend, will be fetched below
          if (hasKeywords) {
            console.log('📝 Keywords received:', message.data.keywords);
          }
        } else {
          // When hasInputImage is true: set SDXL model (existing behavior)
          dispatch(setSelectedModel('sdxl'));

          // Open the catalog to show mask regions
          dispatch(setIsCatalogOpen(true));
          
          // Update Redux state immediately with websocket data
          if (message.data?.masks && message.data?.maskCount) {
            dispatch(setMaskGenerationComplete({
              maskCount: message.data.maskCount,
              masks: message.data.masks
            }));
          }

          // Set mask generation processing
          dispatch(setMaskGenerationProcessing({ inputImageId: messageInputImageId }))
          
          // Also refresh from server to ensure data consistency
          dispatch(getMasks(messageInputImageId));
        }
        
        // 🧬 Refresh AI prompt materials in case new ones were created from webhook (includes keywords)
        dispatch(getAIPromptMaterials(messageInputImageId));

        break;
      }
        
      case 'masks_failed': {
        const failedInputImageId = message.inputImageId;
        
        // Handle failure for currently selected image OR if no image is selected (plugin webhook)
        if (!inputImageId || failedInputImageId === inputImageId) {
          dispatch(setMaskGenerationFailed(message.error || 'Mask generation failed'));
        }
        break;
      }
        
      default:
        // Don't log unknown messages to reduce console noise
        break;
    }
  }, [inputImageId, currentInputImageId, currentPath, dispatch]);

  // Create WebSocket connection specifically for masks
  const { isConnected, sendMessage } = useWebSocket(
    `${import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3000/ws'}`,
    {
      onMessage: handleMaskWebSocketMessage,
      onConnect: () => {
        
        // Subscribe to mask updates for this input image
        if (inputImageId && enabled) {
          sendMessage({
            type: 'subscribe_masks',
            inputImageId: inputImageId
          });
        }
      },
      onDisconnect: () => {
      },
      onError: (error) => {
        console.error('❌ Mask WebSocket error:', error);
      }
    }
  );

  // Subscribe/unsubscribe when inputImageId changes
  useEffect(() => {
    if (isConnected && inputImageId && enabled) {
      
      sendMessage({
        type: 'subscribe_masks',
        inputImageId: inputImageId
      });

      return () => {
        sendMessage({
          type: 'unsubscribe_masks',
          inputImageId: inputImageId
        });
      };
    }
  }, [isConnected, inputImageId, enabled, sendMessage]);

  return {
    isConnected,
    sendMessage
  };
};