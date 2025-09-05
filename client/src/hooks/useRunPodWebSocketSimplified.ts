import { useEffect, useCallback } from 'react';
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

export const useRunPodWebSocketSimplified = ({ enabled = true }: UseRunPodWebSocketOptions) => {
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

  // Connect to WebSocket
  const { isConnected, lastMessage } = useWebSocket({
    url: process.env.NODE_ENV === 'production' 
      ? 'wss://your-production-domain.com/ws'
      : 'ws://localhost:8080/ws',
    onMessage: handleWebSocketMessage,
    enabled
  });

  return {
    isConnected,
    lastMessage
  };
};