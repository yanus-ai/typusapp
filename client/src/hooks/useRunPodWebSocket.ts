import { useEffect, useCallback, useRef } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useWebSocket } from './useWebSocket';
import { 
  updateVariationFromWebSocket,
  updateBatchCompletionFromWebSocket,
  fetchInputAndCreateImages,
  fetchTweakHistoryForImage,
  fetchAllTweakImages,
  fetchAllVariations
} from '@/features/images/historyImagesSlice';
import { setSelectedImage } from '@/features/create/createUISlice';
import { updateCredits } from '@/features/auth/authSlice';
import { 
  setIsGenerating, 
  setSelectedBaseImageIdSilent, 
  setSelectedBaseImageIdAndClearObjects, 
  setPrompt,
  hideCanvasSpinner,
  setTimeoutPhase,
  resetTimeoutStates
} from '@/features/tweak/tweakSlice';

interface UseRunPodWebSocketOptions {
  inputImageId?: number;
  enabled?: boolean;
}

export const useRunPodWebSocket = ({ inputImageId, enabled = true }: UseRunPodWebSocketOptions) => {
  const dispatch = useAppDispatch();

  // Timeout management state
  const timeouts = useRef<{
    canvasSpinnerTimeout?: NodeJS.Timeout;
    retryTimeout?: NodeJS.Timeout;
    finalFailureTimeout?: NodeJS.Timeout;
  }>({});
  
  // Store original generation parameters for retry
  const retryParams = useRef<any>(null);

  // Clear all timeout timers
  const clearAllTimeouts = useCallback(() => {
    if (timeouts.current.canvasSpinnerTimeout) {
      clearTimeout(timeouts.current.canvasSpinnerTimeout);
      timeouts.current.canvasSpinnerTimeout = undefined;
    }
    if (timeouts.current.retryTimeout) {
      clearTimeout(timeouts.current.retryTimeout);
      timeouts.current.retryTimeout = undefined;
    }
    if (timeouts.current.finalFailureTimeout) {
      clearTimeout(timeouts.current.finalFailureTimeout);
      timeouts.current.finalFailureTimeout = undefined;
    }
  }, []);

  // Start timeout timers for generation - simplified to only handle canvas spinner
  const startTimeoutTimers = useCallback((generationParams: any) => {
    console.log('⏰ Starting 2-minute canvas timeout timer');
    
    // Clear any existing timers
    clearAllTimeouts();
    
    // 2-minute timeout: Hide canvas spinner, keep Lottie animation
    // Backend cron job will handle retries and final failure states
    timeouts.current.canvasSpinnerTimeout = setTimeout(() => {
      console.log('⏰ 2-minute timeout: Hiding canvas spinner (backend will handle retries)');
      dispatch(hideCanvasSpinner());
      dispatch(setTimeoutPhase('canvas_hidden'));
    }, 2 * 60 * 1000); // 2 minutes
  }, [dispatch, clearAllTimeouts]);

  // Note: Retry logic has been moved to backend cron job for better reliability

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((message: any) => {
    console.log('WebSocket message received:', message.type);
    
    // Only log tweak-related messages in detail
    if (message.data?.operationType === 'outpaint' || message.data?.operationType === 'inpaint' || message.data?.operationType === 'tweak') {
      console.log('⚡ TWEAK OPERATION MESSAGE:', message.data.operationType, 'ImageID:', message.data.imageId);
    }

    switch (message.type) {
      case 'generation_started':
        // Handle batch generation started - simplified approach
        console.log('✨ Generation batch started via WebSocket');
        
        // Update credits if provided in the WebSocket message
        if (typeof message.data.remainingCredits === 'number') {
          console.log('💳 WebSocket: Updating credits to:', message.data.remainingCredits);
          dispatch(updateCredits(message.data.remainingCredits));
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
          
          // Start timeout timers for tweak operations (outpaint/inpaint)
          if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint') {
            console.log('⏰ Starting timeout timers for tweak operation:', message.data.operationType);
            startTimeoutTimers({
              operationType: message.data.operationType,
              batchId: message.data.batchId,
              imageId: message.data.imageId,
              jobId: message.data.imageId // Use imageId as jobId for retry identification
            });
          }
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
          
          // Clear all timeout timers and reset timeout states on completion
          if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint') {
            console.log('⏰ Clearing timeout timers for completed tweak operation');
            clearAllTimeouts();
            dispatch(resetTimeoutStates());
          }
          
          // First update the image in the store
          dispatch(updateVariationFromWebSocket({
            batchId: parseInt(message.data.batchId) || message.data.batchId,
            imageId: imageId,
            variationNumber: message.data.variationNumber,
            imageUrl: message.data.imageUrl, // Use original URL for canvas display
            processedImageUrl: message.data.processedUrl, // Final processed URL for LORA training
            thumbnailUrl: message.data.thumbnailUrl,
            status: 'COMPLETED',
            runpodStatus: 'COMPLETED',
            operationType: message.data.operationType,
            originalBaseImageId: message.data.originalBaseImageId,
            // 🔥 ENHANCEMENT: Include prompt data for UI updates
            promptData: message.data.promptData
          }));
          
          // Handle pipeline coordination and state management for tweak operations
          if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint' || message.data.operationType === 'tweak') {
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
            
            // Refresh all tweak images to ensure the new image appears in history panel immediately
            console.log('🔄 WebSocket: Refreshing all tweak images for completed generation');
            dispatch(fetchAllTweakImages());
            // Also refresh all variations for the Gallery
            dispatch(fetchAllVariations({ page: 1, limit: 100 }));
            
            // 🔥 ENHANCEMENT: Auto-restore prompt if tweak completed with prompt data
            if (message.data.promptData?.prompt) {
              console.log('🔄 WebSocket: Auto-restoring tweak prompt from completed generation:', message.data.promptData.prompt.substring(0, 50) + '...');
              // Delay prompt restoration to ensure UI is ready
              setTimeout(() => {
                dispatch(setPrompt(message.data.promptData.prompt));
              }, 500);
            }
            
            // Only refresh tweak history if we have originalBaseImageId AND we're currently generating
            // This prevents unnecessary API calls when user is just browsing images
            if (message.data.originalBaseImageId) {
              console.log('🔄 WebSocket: Refreshing tweak history for completed generation. OriginalBaseImageId:', message.data.originalBaseImageId, 'ImageId:', imageId);
              dispatch(fetchTweakHistoryForImage({ 
                baseImageId: message.data.originalBaseImageId
              }));
            } else {
              console.log('⚠️ WebSocket: No originalBaseImageId in message, skipping tweak history refresh');
            }
          } else {
            // For CREATE module completions, refresh CREATE images and all variations
            console.log('🔄 WebSocket: Refreshing CREATE images for completed generation');
            dispatch(fetchInputAndCreateImages({ page: 1, limit: 50 }));
            // Also refresh all variations for the Gallery
            dispatch(fetchAllVariations({ page: 1, limit: 100 }));
          }
          
          // Then select the completed image after ensuring the image data is available
          // Use a longer delay for inpaint to ensure the store is fully updated
          const delayMs = message.data.operationType === 'inpaint' ? 1000 : 200;
          setTimeout(() => {
            // Use appropriate selector based on operation type
            if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint' || message.data.operationType === 'tweak') {
              console.log('🎯 Auto-selecting completed tweak image:', imageId, 'operation:', message.data.operationType);
              
              if (message.data.operationType === 'inpaint') {
                // For inpaint: clear drawn objects since they were used to create the mask
                dispatch(setSelectedBaseImageIdAndClearObjects(imageId));
              } else {
                // For outpaint: preserve canvas state (user might want to continue working)
                dispatch(setSelectedBaseImageIdSilent(imageId));
              }
            } else {
              // For regular generation, use setSelectedImage with type for CREATE page compatibility
              console.log('🎯 Auto-selecting completed generated image:', imageId);
              dispatch(setSelectedImage({ id: imageId, type: 'generated' }));
            }
          }, delayMs);
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
          if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint' || message.data.operationType === 'tweak') {
            // Clear timeout timers and reset timeout states on failure
            console.log('⏰ Clearing timeout timers for failed tweak operation');
            clearAllTimeouts();
            dispatch(resetTimeoutStates());
            dispatch(setIsGenerating(false));
            
            // Clean up pipeline state on failure
            const pipelineState = (window as any).tweakPipelineState;
            if (pipelineState) {
              console.log('❌ Pipeline failed at phase:', pipelineState.phase);
              delete (window as any).tweakPipelineState;
            }
            
            // Refresh both left panel data and tweak history (even failed ones to show status)
            dispatch(fetchInputAndCreateImages({ page: 1, limit: 50 }));
            
            // Refresh all tweak images to ensure failed state is shown in history panel
            console.log('🔄 WebSocket: Refreshing all tweak images for failed generation');
            dispatch(fetchAllTweakImages());
            // Also refresh all variations for the Gallery
            dispatch(fetchAllVariations({ page: 1, limit: 100 }));
            
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
          if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint' || message.data.operationType === 'tweak') {
            dispatch(setIsGenerating(false));
            
            // Refresh both left panel data and tweak history
            dispatch(fetchInputAndCreateImages({ page: 1, limit: 50 }));
            
            // Refresh all tweak images to ensure completed batch is shown in history panel
            console.log('🔄 WebSocket: Refreshing all tweak images for completed batch');
            dispatch(fetchAllTweakImages());
            // Also refresh all variations for the Gallery
            dispatch(fetchAllVariations({ page: 1, limit: 100 }));
            
            // Only refresh tweak history for batch completions that we were tracked
            if (message.data.originalBaseImageId) {
              console.log('🔄 WebSocket: Refreshing tweak history for completed batch:', message.data.originalBaseImageId);
              dispatch(fetchTweakHistoryForImage({ 
                baseImageId: message.data.originalBaseImageId
              }));
            }
          } else {
            // For CREATE module batch completions, also refresh data
            console.log('🔄 WebSocket: Refreshing CREATE images for completed batch');
            dispatch(fetchInputAndCreateImages({ page: 1, limit: 50 }));
            // Also refresh all variations for the Gallery
            dispatch(fetchAllVariations({ page: 1, limit: 100 }));
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
      console.log('📺 TWEAK WebSocket: Subscribing to generation updates for inputImageId:', inputImageId);
      console.log('🔍 TWEAK WebSocket: Will subscribe to client key gen_' + inputImageId);
      console.log('🔍 TWEAK WebSocket: Connection state -', { 
        isConnected, 
        inputImageId, 
        enabled,
        timestamp: new Date().toISOString()
      });
      
      const subscriptionMessage = {
        type: 'subscribe_generation',
        inputImageId: inputImageId
      };
      
      console.log('📤 TWEAK WebSocket: Sending subscription message:', subscriptionMessage);
      const success = sendMessage(subscriptionMessage);
      console.log('📤 TWEAK WebSocket: Subscription message sent successfully:', success);

      return () => {
        console.log('📺 TWEAK WebSocket: Unsubscribing from generation updates for inputImageId:', inputImageId);
        sendMessage({
          type: 'unsubscribe_generation',
          inputImageId: inputImageId
        });
      };
    } else {
      console.log('📺 TWEAK WebSocket: Not subscribing -', { 
        isConnected, 
        inputImageId, 
        enabled,
        reason: !isConnected ? 'not connected' : !inputImageId ? 'no inputImageId' : !enabled ? 'disabled' : 'unknown'
      });
    }
  }, [isConnected, inputImageId, enabled, sendMessage]);

  // Cleanup effect to clear timeouts on unmount or inputImageId change
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up timeout timers on unmount/change');
      clearAllTimeouts();
    };
  }, [inputImageId, clearAllTimeouts]);

  return {
    isConnected,
    sendMessage,
    // Expose timeout management functions for external use if needed
    startTimeoutTimers,
    clearAllTimeouts
  };
};