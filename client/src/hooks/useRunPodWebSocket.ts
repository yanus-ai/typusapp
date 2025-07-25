import { useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useWebSocket } from './useWebSocket';
import { 
  updateVariationFromWebSocket,
  updateBatchCompletionFromWebSocket,
  addProcessingVariations
} from '@/features/images/historyImagesSlice';

interface UseRunPodWebSocketOptions {
  inputImageId?: number;
  enabled?: boolean;
}

export const useRunPodWebSocket = ({ inputImageId, enabled = true }: UseRunPodWebSocketOptions) => {
  const dispatch = useDispatch();

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((message: any) => {
    console.log('RunPod WebSocket message received:', message);

    switch (message.type) {
      case 'generation_started':
        // Handle batch generation started
        if (message.data?.runpodJobs && message.data.totalVariations) {
          const imageIds = message.data.runpodJobs.map((job: any) => parseInt(job.imageId) || job.imageId);
          dispatch(addProcessingVariations({
            batchId: parseInt(message.data.batchId) || message.data.batchId,
            totalVariations: message.data.totalVariations,
            imageIds
          }));
        }
        break;

      case 'variation_started':
        // Individual variation started
        if (message.data) {
          dispatch(updateVariationFromWebSocket({
            batchId: parseInt(message.data.batchId) || message.data.batchId,
            imageId: parseInt(message.data.imageId) || message.data.imageId,
            variationNumber: message.data.variationNumber,
            status: 'PROCESSING',
            runpodStatus: message.data.runpodStatus
          }));
        }
        break;

      case 'variation_progress':
        // Individual variation progress update
        if (message.data) {
          dispatch(updateVariationFromWebSocket({
            batchId: parseInt(message.data.batchId) || message.data.batchId,
            imageId: parseInt(message.data.imageId) || message.data.imageId,
            variationNumber: message.data.variationNumber,
            status: 'PROCESSING',
            runpodStatus: message.data.runpodStatus
          }));
        }
        break;

      case 'variation_completed':
        // Individual variation completed
        if (message.data) {
          dispatch(updateVariationFromWebSocket({
            batchId: parseInt(message.data.batchId) || message.data.batchId,
            imageId: parseInt(message.data.imageId) || message.data.imageId,
            variationNumber: message.data.variationNumber,
            imageUrl: message.data.imageUrl,
            thumbnailUrl: message.data.thumbnailUrl,
            status: 'COMPLETED',
            runpodStatus: 'COMPLETED'
          }));
        }
        break;

      case 'variation_failed':
        // Individual variation failed
        if (message.data) {
          dispatch(updateVariationFromWebSocket({
            batchId: parseInt(message.data.batchId) || message.data.batchId,
            imageId: parseInt(message.data.imageId) || message.data.imageId,
            variationNumber: message.data.variationNumber,
            status: 'FAILED',
            runpodStatus: 'FAILED'
          }));
        }
        break;

      case 'batch_completed':
        // Entire batch completed
        if (message.data) {
          dispatch(updateBatchCompletionFromWebSocket({
            batchId: parseInt(message.data.batchId) || message.data.batchId,
            status: message.data.status,
            totalVariations: message.data.totalVariations,
            successfulVariations: message.data.successfulVariations,
            failedVariations: message.data.failedVariations,
            completedImages: message.data.completedImages?.map((img: any) => ({
              id: parseInt(img.id) || img.id,
              url: img.url,
              thumbnailUrl: img.thumbnailUrl,
              variationNumber: img.variationNumber
            }))
          }));
        }
        break;

      default:
        console.log('Unknown RunPod WebSocket message type:', message.type);
    }
  }, [dispatch]);

  // Create WebSocket connection
  const { isConnected, sendMessage } = useWebSocket(
    `${import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3000/ws'}`,
    {
      onMessage: handleWebSocketMessage,
      onConnect: () => {
        console.log('RunPod WebSocket connected');
        
        // Subscribe to generation updates for this input image
        if (inputImageId && enabled) {
          sendMessage({
            type: 'subscribe_generation',
            inputImageId: inputImageId
          });
        }
      },
      onDisconnect: () => {
        console.log('RunPod WebSocket disconnected');
      },
      onError: (error) => {
        console.error('RunPod WebSocket error:', error);
      }
    }
  );

  // Subscribe/unsubscribe when inputImageId changes
  useEffect(() => {
    if (isConnected && inputImageId && enabled) {
      sendMessage({
        type: 'subscribe_generation',
        inputImageId: inputImageId
      });

      return () => {
        sendMessage({
          type: 'unsubscribe_generation',
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