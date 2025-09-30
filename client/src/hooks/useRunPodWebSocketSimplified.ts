import { useCallback } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useWebSocket } from './useWebSocket';
import { 
  updateVariationFromWebSocket,
  fetchAllVariations
} from '@/features/images/historyImagesSlice';
import { updateCredits } from '@/features/auth/authSlice';

interface UseRunPodWebSocketOptions {
  enabled?: boolean;
}

export const useRunPodWebSocketSimplified = ({}: UseRunPodWebSocketOptions = {}) => {
  const dispatch = useAppDispatch();

  // Simplified WebSocket message handler
  const handleWebSocketMessage = useCallback((message: any) => {

    switch (message.type) {
      case 'generation_started':
        // Update credits if provided
        if (typeof message.data.remainingCredits === 'number') {
          dispatch(updateCredits(message.data.remainingCredits));
        }
        break;

      case 'image_completed':
      case 'image_updated':
        // Update individual image
        dispatch(updateVariationFromWebSocket({
          batchId: message.data.batchId,
          imageId: message.data.imageId,
          variationNumber: message.data.variationNumber,
          imageUrl: message.data.imageUrl,
          processedImageUrl: message.data.processedImageUrl,
          thumbnailUrl: message.data.thumbnailUrl,
          status: message.data.status,
          runpodStatus: message.data.runpodStatus,
          operationType: message.data.operationType
        }));
        break;

      case 'user_variation_completed':
        // Handle user-based variation completion (from TWEAK operations)
        dispatch(updateVariationFromWebSocket({
          batchId: message.data.batchId,
          imageId: message.data.imageId,
          variationNumber: message.data.variationNumber,
          imageUrl: message.data.imageUrl,
          processedImageUrl: message.data.processedUrl,
          thumbnailUrl: message.data.thumbnailUrl,
          status: message.data.status,
          runpodStatus: message.data.runpodStatus,
          operationType: message.data.operationType
        }));
        
        // For TWEAK module results, refresh history to show in edit page
        if (message.data.sourceModule === 'TWEAK') {
          setTimeout(() => {
            dispatch(fetchAllVariations({ limit: 100 }));
          }, 500);
        }
        break;

      case 'user_image_completed':
        // Handle user-based image completion
        dispatch(updateVariationFromWebSocket({
          batchId: message.data.batchId,
          imageId: message.data.imageId,
          variationNumber: message.data.variationNumber,
          imageUrl: message.data.imageUrl,
          processedImageUrl: message.data.processedUrl,
          thumbnailUrl: message.data.thumbnailUrl,
          status: message.data.status,
          runpodStatus: message.data.runpodStatus,
          operationType: message.data.operationType
        }));
        break;

      case 'batch_completed':
        // Refresh the variations to get latest data
        dispatch(fetchAllVariations({ limit: 50 }));
        
        // Update credits if provided
        if (typeof message.data.remainingCredits === 'number') {
          dispatch(updateCredits(message.data.remainingCredits));
        }
        break;

      case 'credit_update':
        dispatch(updateCredits(message.data.credits));
        break;

      default:
    }
  }, [dispatch]);

  // Connect to WebSocket - use same URL as useUserWebSocket
  const { isConnected, sendMessage } = useWebSocket(
    `${import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3000/ws'}`,
    {
      onMessage: handleWebSocketMessage
    }
  );

  return {
    isConnected,
    sendMessage
  };
};