import { useEffect, useCallback } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useWebSocket } from './useWebSocket';
import { setMaskGenerationComplete, setMaskGenerationFailed, getMasks } from '@/features/masks/maskSlice';

interface UseMaskWebSocketOptions {
  inputImageId?: number;
  enabled?: boolean;
}

export const useMaskWebSocket = ({ inputImageId, enabled = true }: UseMaskWebSocketOptions) => {
  const dispatch = useAppDispatch();

  // WebSocket message handler specifically for mask updates
  const handleMaskWebSocketMessage = useCallback((message: any) => {
    console.log('🎭 Mask WebSocket message received:', message);

    switch (message.type) {
      case 'connected':
        console.log('✅ Mask WebSocket connected');
        break;
        
      case 'subscribed':
        console.log('📺 Subscribed to mask updates for image:', message.inputImageId);
        break;
        
      case 'masks_completed':
        if (message.inputImageId === inputImageId && inputImageId) {
          console.log('✅ Masks completed! Processing websocket update for image:', inputImageId);
          
          // Update Redux state immediately with websocket data
          if (message.data?.masks && message.data?.maskCount) {
            dispatch(setMaskGenerationComplete({
              maskCount: message.data.maskCount,
              masks: message.data.masks
            }));
          }
          
          // Also refresh from server to ensure data consistency
          dispatch(getMasks(inputImageId));
        }
        break;
        
      case 'masks_failed':
        if (message.inputImageId === inputImageId) {
          console.log('❌ Masks failed via WebSocket:', message.error);
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
        console.log('🎭 Mask WebSocket connected');
        
        // Subscribe to mask updates for this input image
        if (inputImageId && enabled) {
          sendMessage({
            type: 'subscribe_masks',
            inputImageId: inputImageId
          });
        }
      },
      onDisconnect: () => {
        console.log('🔌 Mask WebSocket disconnected');
      },
      onError: (error) => {
        console.error('❌ Mask WebSocket error:', error);
      }
    }
  );

  // Subscribe/unsubscribe when inputImageId changes
  useEffect(() => {
    if (isConnected && inputImageId && enabled) {
      console.log('📺 Subscribing to mask updates for image:', inputImageId);
      
      sendMessage({
        type: 'subscribe_masks',
        inputImageId: inputImageId
      });

      return () => {
        console.log('📺 Unsubscribing from mask updates for image:', inputImageId);
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