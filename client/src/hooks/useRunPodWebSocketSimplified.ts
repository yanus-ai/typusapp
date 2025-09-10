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
    console.log('🔌 WebSocket message:', message.type);

    switch (message.type) {
      case 'generation_started':
        console.log('✨ Generation started via WebSocket');
        // Update credits if provided
        if (typeof message.data.remainingCredits === 'number') {
          dispatch(updateCredits(message.data.remainingCredits));
        }
        break;

      case 'image_completed':
      case 'image_updated':
        console.log('🖼️ Image completed/updated via WebSocket:', message.data.imageId);
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
        console.log('🎯 User variation completed via WebSocket:', message.data.imageId, message.data.operationType);
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
          console.log('🔄 TWEAK result received, refreshing variations for edit page');
          setTimeout(() => {
            dispatch(fetchAllVariations({ limit: 100 }));
          }, 500);
        }
        break;

      case 'user_image_completed':
        console.log('🖼️ User image completed via WebSocket:', message.data.imageId);
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
        console.log('✅ Batch completed via WebSocket - refreshing data');
        // Refresh the variations to get latest data
        dispatch(fetchAllVariations({ limit: 50 }));
        
        // Update credits if provided
        if (typeof message.data.remainingCredits === 'number') {
          dispatch(updateCredits(message.data.remainingCredits));
        }
        break;

      case 'credit_update':
        console.log('💳 Credits updated via WebSocket:', message.data.credits);
        dispatch(updateCredits(message.data.credits));
        break;

      default:
        console.log('📨 Unhandled WebSocket message type:', message.type);
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