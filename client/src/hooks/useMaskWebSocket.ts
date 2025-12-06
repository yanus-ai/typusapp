import { useEffect, useCallback } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useWebSocket } from './useWebSocket';
import { setMaskGenerationComplete, setMaskGenerationFailed, getMasks, getAIPromptMaterials } from '@/features/masks/maskSlice';
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
        break;
        
      case 'subscribed':
        break;
        
      case 'masks_completed': {
        const messageInputImageId = message.inputImageId;
        
        // Handle mask completion for the currently selected image
        if (messageInputImageId === inputImageId && inputImageId) {
          dispatch(setSelectedModel('sdxl'));
          dispatch(setIsCatalogOpen(true));
          
          // Update Redux state immediately with websocket data
          if (message.data?.masks && message.data?.maskCount) {
            dispatch(setMaskGenerationComplete({
              maskCount: message.data.maskCount,
              masks: message.data.masks
            }));
          }
          
          // Also refresh from server to ensure data consistency
          dispatch(getMasks(inputImageId));
          
          // 🧬 Refresh AI prompt materials in case new ones were created from webhook
          dispatch(getAIPromptMaterials(inputImageId));
        } 
        // Handle mask completion from plugin webhooks when image is not currently selected
        // This happens when masks arrive from plugins (Revit, Rhino, etc.) and user hasn't selected the image yet
        else if (messageInputImageId && messageInputImageId !== currentInputImageId) {
          console.log('🎭 Plugin mask completion detected for image:', messageInputImageId, 'Current:', currentInputImageId);
          
          // Only auto-select and open catalog if we're on the create page
          if (currentPath === '/create') {
            // Set the selected image to the one with completed masks
            dispatch(setSelectedImage({ id: messageInputImageId, type: 'input' }));
            
            // Ensure customization slice has the correct inputImageId
            dispatch(loadSettingsFromImage({
              inputImageId: messageInputImageId,
              imageId: messageInputImageId,
              isGeneratedImage: false,
              settings: {}
            }));
            
            // Set SDXL model and open catalog
            dispatch(setSelectedModel('sdxl'));
            dispatch(setIsCatalogOpen(true));
            
            // Update Redux state immediately with websocket data
            if (message.data?.masks && message.data?.maskCount) {
              dispatch(setMaskGenerationComplete({
                maskCount: message.data.maskCount,
                masks: message.data.masks
              }));
            }
            
            // Also refresh from server to ensure data consistency
            dispatch(getMasks(messageInputImageId));
            
            // 🧬 Refresh AI prompt materials in case new ones were created from webhook
            dispatch(getAIPromptMaterials(messageInputImageId));
          }
        }
        break;
      }
        
      case 'masks_failed':
        if (message.inputImageId === inputImageId) {
          dispatch(setMaskGenerationFailed(message.error || 'Mask generation failed'));
        }
        break;
        
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