import { useEffect, useCallback } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useWebSocket } from './useWebSocket';
import { setMaskGenerationComplete, setMaskGenerationFailed, getMasks, getAIPromptMaterials } from '@/features/masks/maskSlice';
import { setSelectedModel } from '@/features/tweak/tweakSlice';
import { setIsCatalogOpen } from '@/features/create/createUISlice';

interface UseMaskWebSocketOptions {
  inputImageId?: number;
  enabled?: boolean;
}

export const useMaskWebSocket = ({ inputImageId, enabled = true }: UseMaskWebSocketOptions) => {
  const dispatch = useAppDispatch();

  // WebSocket message handler specifically for mask updates
  const handleMaskWebSocketMessage = useCallback((message: any) => {

    switch (message.type) {
      case 'connected':
        break;
        
      case 'subscribed':
        break;
        
      case 'masks_completed':
        if (message.inputImageId === inputImageId && inputImageId) {
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
        break;
        
      case 'masks_failed':
        if (message.inputImageId === inputImageId) {
          dispatch(setMaskGenerationFailed(message.error || 'Mask generation failed'));
        }
        break;
        
      default:
        // Don't log unknown messages to reduce console noise
        break;
    }
  }, [inputImageId, dispatch]);

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