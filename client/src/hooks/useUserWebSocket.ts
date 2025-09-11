import { useCallback, useRef } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useWebSocket } from './useWebSocket';
import { 
  updateVariationFromWebSocket,
  fetchAllTweakImages,
  fetchAllVariations,
  fetchInputAndCreateImages
} from '@/features/images/historyImagesSlice';
import { setSelectedImage } from '@/features/create/createUISlice';
import { 
  setIsGenerating, 
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
    console.log('🔔 User WebSocket message received:', message.type);
    
    // Enhanced logging for debugging CREATE vs TWEAK issues
    if (message.type === 'user_variation_completed' || message.type === 'user_image_completed') {
      console.log('🔍 WebSocket message debug data:', {
        type: message.type,
        imageId: message.data?.imageId,
        moduleType: message.data?.moduleType,
        operationType: message.data?.operationType,
        batchModuleType: message.data?.batch?.moduleType,
        fullData: message.data
      });
    }
    
    switch (message.type) {
      case 'user_variation_completed':
      case 'user_image_completed':
        if (message.data) {
          const imageId = parseInt(message.data.imageId) || message.data.imageId;
          console.log('✅ User image completed - ImageID:', imageId, 'Operation:', message.data.operationType);
          
          // Clear timeout states for tweak operations
          if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint') {
            console.log('⏰ Clearing timeout timers for completed user tweak operation');
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
          
          console.log('🔍 User WebSocket processing completion:', {
            imageId,
            moduleType,
            operationType,
            messageData: message.data
          });
          
          // Determine which branch will be taken
          const isTweakOperation = moduleType === 'TWEAK' || operationType === 'outpaint' || operationType === 'inpaint' || operationType === 'tweak';
          console.log('🎯 Route determination:', {
            isTweakOperation,
            moduleType,
            operationType,
            willProcessAs: isTweakOperation ? 'TWEAK' : 'CREATE'
          });
          
          // Handle TWEAK module operations (outpaint, inpaint, or TWEAK moduleType)
          if (isTweakOperation) {
            console.log('🔧 Processing TWEAK module completion');
            dispatch(setIsGenerating(false));
            
            // Refresh data
            dispatch(fetchInputAndCreateImages({ page: 1, limit: 100 }));
            dispatch(fetchAllTweakImages());
            dispatch(fetchAllVariations({ page: 1, limit: 100 }));
            
            // Auto-restore prompt if available
            if (message.data.promptData?.prompt) {
              console.log('🔄 Auto-restoring tweak prompt from user notification:', message.data.promptData.prompt.substring(0, 50) + '...');
              setTimeout(() => {
                dispatch(setPrompt(message.data.promptData.prompt));
              }, 500);
            }
            
            // Auto-select the completed image
            setTimeout(() => {
              console.log('🎯 Auto-selecting completed user image:', imageId, 'operation:', operationType);
              
              if (operationType === 'inpaint') {
                dispatch(setSelectedBaseImageIdAndClearObjects(imageId));
              } else {
                dispatch(setSelectedBaseImageIdSilent(imageId));
              }
            }, operationType === 'inpaint' ? 1000 : 200);
          } else {
            // For CREATE module completions (moduleType === 'CREATE' or default)
            console.log('🎨 Processing CREATE module completion');
            
            // Dispatch data refresh actions
            console.log('🔄 Dispatching CREATE data refresh actions...');
            dispatch(fetchInputAndCreateImages({ page: 1, limit: 50 }))
              .then(result => console.log('✅ fetchInputAndCreateImages completed:', result))
              .catch(error => console.error('❌ fetchInputAndCreateImages failed:', error));
              
            dispatch(fetchAllVariations({ page: 1, limit: 100 }))
              .then(result => console.log('✅ fetchAllVariations completed:', result))
              .catch(error => console.error('❌ fetchAllVariations failed:', error));
            
            // Do NOT auto-select variants - let user manually select them
            console.log('🚫 Skipping auto-selection for CREATE variant generation - user can manually select');
            
            // Optional: Only auto-select if it's the first image in a new batch
            // setTimeout(() => {
            //   console.log('🎯 Auto-selecting completed CREATE image:', imageId);
            //   dispatch(setSelectedImage({ id: imageId, type: 'generated' }));
            // }, 200);
          }
        }
        break;

      case 'connected':
        console.log('✅ User WebSocket connected successfully');
        break;

      case 'error':
        console.error('❌ User WebSocket error:', message.message);
        break;

      default:
        console.log('🤷 Unknown user WebSocket message type:', message.type);
    }
  }, [dispatch]);

  // Create WebSocket connection
  const { isConnected, sendMessage } = useWebSocket(
    `${import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3000/ws'}`,
    {
      onMessage: handleWebSocketMessage,
      onConnect: () => {
        console.log('🔗 User WebSocket connected');
        connectionQuality.current.isHealthy = true;
        
        // Reset disconnection count if we've been stable for 60 seconds
        const now = Date.now();
        if (now - connectionQuality.current.lastDisconnection > 60000) {
          connectionQuality.current.disconnectionCount = 0;
        }
      },
      onDisconnect: () => {
        console.log('🔌 User WebSocket disconnected');
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