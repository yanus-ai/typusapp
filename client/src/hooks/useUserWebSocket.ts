import { useCallback, useRef } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useWebSocket } from './useWebSocket';
import { 
  updateVariationFromWebSocket,
  fetchAllTweakImages,
  fetchAllVariations,
  fetchInputAndCreateImages
} from '@/features/images/historyImagesSlice';
// Note: We intentionally do NOT use setSelectedImage here to avoid
// interfering with Tweak/Create page-specific selection logic.
// import { setSelectedImage } from '@/features/create/createUISlice';
import { 
  setSelectedBaseImageIdSilent, 
  setSelectedBaseImageIdAndClearObjects, 
  setPrompt,
  resetTimeoutStates
} from '@/features/tweak/tweakSlice';

interface UseUserWebSocketOptions {
  enabled?: boolean;
}

export const useUserWebSocket = ({ enabled = true }: UseUserWebSocketOptions = {}) => {
  const dispatch = useAppDispatch();
  const connectionQuality = useRef({
    isHealthy: true,
    disconnectionCount: 0,
    lastDisconnection: 0,
    criticalOperationActive: false
  });

  const handleWebSocketMessage = useCallback((message: any) => {
    
    // Enhanced logging for debugging CREATE vs TWEAK issues
    if (message.type === 'user_variation_completed' || message.type === 'user_image_completed') {
      console.log('👤 [UserWebSocket] Variation/image completed message received:', {
        type: message.type,
        operationType: message.data?.operationType,
        moduleType: message.data?.moduleType || message.data?.batch?.moduleType,
        imageId: message.data?.imageId,
        batchId: message.data?.batchId
      });
    }
    
    switch (message.type) {
      case 'user_variation_completed':
      case 'user_image_completed':
        if (message.data) {
          const imageId = parseInt(message.data.imageId) || message.data.imageId;
          
          // Clear timeout states for tweak operations
          if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint') {
            dispatch(resetTimeoutStates());
          }
          
          // Update the image in the store
          dispatch(updateVariationFromWebSocket({
            batchId: parseInt(message.data.batchId) || message.data.batchId,
            imageId: imageId,
            variationNumber: message.data.variationNumber,
            imageUrl: message.data.imageUrl,
            processedImageUrl: message.data.processedImageUrl,
            thumbnailUrl: message.data.thumbnailUrl,
            status: 'COMPLETED',
            runpodStatus: 'COMPLETED',
            operationType: message.data.operationType,
            originalBaseImageId: message.data.originalBaseImageId,
            promptData: message.data.promptData
          }));

          // Determine module type: Use moduleType if available, otherwise fall back to operationType
          const moduleType = message.data.moduleType || message.data.batch?.moduleType;
          const operationType = message.data.operationType;
          
          // Determine which branch will be taken
          const isTweakOperation = moduleType === 'TWEAK' || operationType === 'outpaint' || operationType === 'inpaint' || operationType === 'tweak';
          
          // Handle TWEAK module operations (outpaint, inpaint, or TWEAK moduleType)
          // IMPORTANT: Do NOT stop tweak generation state here; let TweakPage batch-completion logic + unified WebSocket manage it,
          // so loading only stops after ALL variations in the batch are fully completed and have URLs.
          if (isTweakOperation) {
            // Refresh data
            dispatch(fetchInputAndCreateImages({ page: 1, limit: 100 }));
            dispatch(fetchAllTweakImages());
            dispatch(fetchAllVariations({ page: 1, limit: 100 }));
            
            // Auto-restore prompt if available
            if (message.data.promptData?.prompt) {
              setTimeout(() => {
                dispatch(setPrompt(message.data.promptData.prompt));
              }, 500);
            }
            
            // Auto-select the completed image
            setTimeout(() => {
              
              if (operationType === 'inpaint') {
                dispatch(setSelectedBaseImageIdAndClearObjects(imageId));
              } else {
                dispatch(setSelectedBaseImageIdSilent(imageId));
              }
            }, operationType === 'inpaint' ? 1000 : 200);
          } else {
            // For CREATE module completions (moduleType === 'CREATE' or default)
            
            // Dispatch data refresh actions
            dispatch(fetchInputAndCreateImages({ page: 1, limit: 50 }))
              .catch(error => console.error('❌ fetchInputAndCreateImages failed:', error));
              
            dispatch(fetchAllVariations({ page: 1, limit: 100 }))
              .catch(error => console.error('❌ fetchAllVariations failed:', error));
            
            // Do NOT auto-select variants - let user manually select them
            
            // Optional: Only auto-select if it's the first image in a new batch
            // setTimeout(() => {
            //   dispatch(setSelectedImage({ id: imageId, type: 'generated' }));
            // }, 200);
          }
        }
        break;

      case 'connected':
        break;

      case 'error':
        console.error('❌ User WebSocket error:', message.message);
        break;

      default:
    }
  }, [dispatch]);

  // Create WebSocket connection
  const { isConnected, sendMessage } = useWebSocket(
    `${import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3000/ws'}`,
    {
      onMessage: handleWebSocketMessage,
      onConnect: () => {
        connectionQuality.current.isHealthy = true;
        
        // Reset disconnection count if we've been stable for 60 seconds
        const now = Date.now();
        if (now - connectionQuality.current.lastDisconnection > 60000) {
          connectionQuality.current.disconnectionCount = 0;
        }
      },
      onDisconnect: () => {
        connectionQuality.current.isHealthy = false;
        connectionQuality.current.disconnectionCount++;
        connectionQuality.current.lastDisconnection = Date.now();
        
        // Log connection quality issues
        if (connectionQuality.current.disconnectionCount > 3) {
          console.warn('⚠️ User WebSocket connection unstable - multiple disconnections:', {
            disconnectionCount: connectionQuality.current.disconnectionCount,
            criticalOperationActive: connectionQuality.current.criticalOperationActive
          });
        }
      },
      onError: (error) => {
        console.error('❌ User WebSocket error:', error);
        connectionQuality.current.isHealthy = false;
      }
    }
  );

  // Use the enabled parameter for future extensibility
  const shouldConnect = enabled;

  return {
    isConnected: shouldConnect ? isConnected : false,
    sendMessage
  };
};