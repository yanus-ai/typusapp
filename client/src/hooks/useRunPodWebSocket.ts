import { useEffect, useCallback } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useWebSocket } from './useWebSocket';
import { 
  updateVariationFromWebSocket,
  updateBatchCompletionFromWebSocket,
  addProcessingVariations,
  fetchInputAndCreateImages,
  fetchTweakHistoryForImage
} from '@/features/images/historyImagesSlice';
import { setSelectedImageId } from '@/features/create/createUISlice';
import { updateCredits } from '@/features/auth/authSlice';
import { setIsGenerating, setSelectedBaseImageId, generateInpaint } from '@/features/tweak/tweakSlice';

interface UseRunPodWebSocketOptions {
  inputImageId?: number;
  enabled?: boolean;
}

export const useRunPodWebSocket = ({ inputImageId, enabled = true }: UseRunPodWebSocketOptions) => {
  const dispatch = useAppDispatch();

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((message: any) => {
    console.log('WebSocket message received:', message.type);
    
    // Only log tweak-related messages in detail
    if (message.data?.operationType === 'outpaint' || message.data?.operationType === 'tweak') {
      console.log('⚡ TWEAK OPERATION MESSAGE:', message.data.operationType, 'ImageID:', message.data.imageId);
    }

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
          
          // Update credits if provided in the WebSocket message
          if (typeof message.data.remainingCredits === 'number') {
            console.log('💳 WebSocket: Updating credits to:', message.data.remainingCredits);
            dispatch(updateCredits(message.data.remainingCredits));
          }
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
          const imageId = parseInt(message.data.imageId) || message.data.imageId;
          console.log('✅ Variation completed - ImageID:', imageId, 'Operation:', message.data.operationType);
          
          // First update the image in the store
          dispatch(updateVariationFromWebSocket({
            batchId: parseInt(message.data.batchId) || message.data.batchId,
            imageId: imageId,
            variationNumber: message.data.variationNumber,
            imageUrl: message.data.imageUrl,
            thumbnailUrl: message.data.thumbnailUrl,
            status: 'COMPLETED',
            runpodStatus: 'COMPLETED',
            operationType: message.data.operationType,
            originalBaseImageId: message.data.originalBaseImageId
          }));
          
          // Handle pipeline coordination and state management for tweak operations
          if (message.data.operationType === 'outpaint' || message.data.operationType === 'tweak') {
            // Check if we're in a sequential pipeline
            const pipelineState = (window as any).tweakPipelineState;
            
            if (pipelineState && 
                pipelineState.phase === 'OUTPAINT_STARTED' && 
                pipelineState.needsInpaint && 
                message.data.operationType === 'outpaint') {
              
              // Phase 1 complete, start Phase 2 (Inpaint)
              console.log('🔄 Phase 1 Complete: Outpaint finished, starting Phase 2: Inpaint');
              
              // Update pipeline state
              (window as any).tweakPipelineState = {
                ...pipelineState,
                phase: 'INPAINT_STARTING',
                outpaintResultImageId: imageId,
                outpaintResultImageUrl: message.data.imageUrl
              };
              
              // Trigger inpaint with the outpaint result as base image
              const inpaintParams = {
                ...pipelineState.inpaintParams,
                baseImageId: imageId, // Use the completed outpaint image as base
                baseImageUrl: message.data.imageUrl
              };
              
              setTimeout(async () => {
                console.log('🖌️ Starting Phase 2: Inpaint with outpaint result as base');
                
                try {
                  const result = await dispatch(generateInpaint(inpaintParams) as any);
                  
                  if (generateInpaint.fulfilled.match(result)) {
                    console.log('✅ Phase 2: Inpaint generation started:', result.payload);
                    (window as any).tweakPipelineState.phase = 'INPAINT_STARTED';
                  } else {
                    console.error('❌ Phase 2 failed: Inpaint generation failed:', result.error);
                    dispatch(setIsGenerating(false));
                    // Clear pipeline state
                    delete (window as any).tweakPipelineState;
                  }
                } catch (error) {
                  console.error('❌ Phase 2 error:', error);
                  dispatch(setIsGenerating(false));
                  delete (window as any).tweakPipelineState;
                }
              }, 500); // Small delay to ensure WebSocket state is fully updated
              
              // Don't reset generating state yet - we're moving to phase 2
              
            } else if (pipelineState && 
                       pipelineState.phase === 'INPAINT_STARTED' && 
                       message.data.operationType === 'inpaint') {
              
              // Phase 2 complete, pipeline finished
              console.log('✅ Pipeline Complete: Both Outpaint and Inpaint finished successfully');
              dispatch(setIsGenerating(false));
              
              // Clear pipeline state
              delete (window as any).tweakPipelineState;
              
            } else {
              // Single operation (not pipeline) - reset generating state normally
              console.log('🔄 Setting isGenerating to false');
              dispatch(setIsGenerating(false));
            }
            
            // Always refresh data
            dispatch(fetchInputAndCreateImages({ page: 1, limit: 50 }));
            
            // Only refresh tweak history if we have originalBaseImageId AND we're currently generating
            // This prevents unnecessary API calls when user is just browsing images
            if (message.data.originalBaseImageId) {
              console.log('🔄 WebSocket: Refreshing tweak history for completed generation:', message.data.originalBaseImageId);
              dispatch(fetchTweakHistoryForImage({ 
                baseImageId: message.data.originalBaseImageId
              }));
            }
          }
          
          // Then select the completed image after a short delay to ensure Redux store is updated
          setTimeout(() => {
            // Use appropriate selector based on operation type
            if (message.data.operationType === 'outpaint' || message.data.operationType === 'tweak') {
              console.log('🎯 Auto-selecting completed tweak image:', imageId);
              dispatch(setSelectedBaseImageId(imageId));
            } else {
              dispatch(setSelectedImageId(imageId));
            }
          }, 200);
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
          
          // Handle failure and reset generating state for tweak operations
          if (message.data.operationType === 'outpaint' || message.data.operationType === 'tweak') {
            dispatch(setIsGenerating(false));
            
            // Clean up pipeline state on failure
            const pipelineState = (window as any).tweakPipelineState;
            if (pipelineState) {
              console.log('❌ Pipeline failed at phase:', pipelineState.phase);
              delete (window as any).tweakPipelineState;
            }
            
            // Refresh both left panel data and tweak history (even failed ones to show status)
            dispatch(fetchInputAndCreateImages({ page: 1, limit: 50 }));
            
            // Only refresh tweak history for failed generations that we were tracking
            if (message.data.originalBaseImageId) {
              console.log('🔄 WebSocket: Refreshing tweak history for failed generation:', message.data.originalBaseImageId);
              dispatch(fetchTweakHistoryForImage({ 
                baseImageId: message.data.originalBaseImageId
              }));
            }
          }
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
          
          // Reset generating state for tweak operations
          if (message.data.operationType === 'outpaint' || message.data.operationType === 'tweak') {
            dispatch(setIsGenerating(false));
            
            // Refresh both left panel data and tweak history
            dispatch(fetchInputAndCreateImages({ page: 1, limit: 50 }));
            
            // Only refresh tweak history for batch completions that we were tracking
            if (message.data.originalBaseImageId) {
              console.log('🔄 WebSocket: Refreshing tweak history for completed batch:', message.data.originalBaseImageId);
              dispatch(fetchTweakHistoryForImage({ 
                baseImageId: message.data.originalBaseImageId
              }));
            }
          }
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