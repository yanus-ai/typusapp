import { useCallback, useRef } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useWebSocket } from './useWebSocket';
import {
  updateVariationFromWebSocket,
  updateBatchCompletionFromWebSocket,
  fetchAllTweakImages,
  fetchAllVariations,
  fetchInputAndCreateImages,
  fetchTweakHistoryForImage
} from '@/features/images/historyImagesSlice';
import { fetchInputImagesBySource, updateImageTags } from '@/features/images/inputImagesSlice';
import { setSelectedImage, stopGeneration } from '@/features/create/createUISlice';
import { setSelectedImage as setSelectedImageRefine, setIsGenerating as setIsGeneratingRefine } from '@/features/refine/refineSlice';
import { setSelectedImage as setSelectedImageRefineUI, stopGeneration as stopGenerationRefineUI } from '@/features/refine/refineUISlice';
import { updateCredits } from '@/features/auth/authSlice';
import {
  setIsGenerating,
  setSelectedBaseImageIdSilent,
  setSelectedBaseImageIdAndClearObjects,
  setPrompt,
  hideCanvasSpinner,
  setTimeoutPhase,
  resetTimeoutStates,
  generateInpaint
} from '@/features/tweak/tweakSlice';
import { setMaskGenerationComplete, setMaskGenerationFailed, getMasks, getAIPromptMaterials } from '@/features/masks/maskSlice';

interface UseUnifiedWebSocketOptions {
  enabled?: boolean;
  currentInputImageId?: number;
}

interface WebSocketMessage {
  type: string;
  data?: any;
  inputImageId?: number;
  error?: string;
  message?: string;
  timestamp?: string;
}

export const useUnifiedWebSocket = ({ enabled = true, currentInputImageId }: UseUnifiedWebSocketOptions = {}) => {
  const dispatch = useAppDispatch();

  // Connection quality tracking
  const connectionQuality = useRef({
    isHealthy: true,
    disconnectionCount: 0,
    lastDisconnection: 0,
    criticalOperationActive: false
  });

  // Timeout management for tweak operations
  const timeouts = useRef<{
    canvasSpinnerTimeout?: NodeJS.Timeout;
    retryTimeout?: NodeJS.Timeout;
    finalFailureTimeout?: NodeJS.Timeout;
  }>({});

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

  // Start timeout timers for generation
  const startTimeoutTimers = useCallback((_generationParams: any) => {
    clearAllTimeouts();

    // 2-minute timeout: Hide canvas spinner, keep Lottie animation
    timeouts.current.canvasSpinnerTimeout = setTimeout(() => {
      dispatch(hideCanvasSpinner());
      dispatch(setTimeoutPhase('canvas_hidden'));
    }, 2 * 60 * 1000); // 2 minutes
  }, [dispatch, clearAllTimeouts]);

  // Unified message handler for all WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    console.log('🔗 Unified WebSocket received:', { type: message.type, data: message.data });

    switch (message.type) {
      // Connection messages
      case 'connected':
        console.log('✅ Unified WebSocket connected successfully');
        break;

      case 'error':
        console.error('❌ Unified WebSocket error:', message.message);
        break;

      // Credit updates
      case 'credit_update':
        if (typeof message.data?.credits === 'number') {
          dispatch(updateCredits(message.data.credits));
        }
        break;

      // Generation lifecycle messages
      case 'generation_started':
        console.log('🚀 Generation started:', message.data);
        if (typeof message.data?.remainingCredits === 'number') {
          dispatch(updateCredits(message.data.remainingCredits));
        }
        break;

      case 'variation_started':
        if (message.data) {
          dispatch(updateVariationFromWebSocket({
            batchId: parseInt(message.data.batchId) || message.data.batchId,
            imageId: parseInt(message.data.imageId) || message.data.imageId,
            variationNumber: message.data.variationNumber,
            status: 'PROCESSING',
            runpodStatus: message.data.runpodStatus
          }));

          // Start timeout timers for tweak operations
          if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint') {
            startTimeoutTimers({
              operationType: message.data.operationType,
              batchId: message.data.batchId,
              imageId: message.data.imageId,
              jobId: message.data.imageId
            });
          }
        }
        break;

      case 'variation_progress':
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
        handleVariationCompleted(message);
        break;

      case 'variation_failed':
        handleVariationFailed(message);
        break;

      case 'batch_completed':
        handleBatchCompleted(message);
        break;

      // User-based notifications (unified approach)
      case 'user_variation_completed':
      case 'user_image_completed':
        handleUserNotification(message);
        break;

      // Mask generation messages
      case 'masks_completed':
        handleMasksCompleted(message);
        break;

      case 'masks_failed':
        handleMasksFailed(message);
        break;

      // Refine/Upscale messages
      case 'refine_generation_started':
      case 'upscale_generation_started':
        console.log('🚀 Refine/Upscale generation started:', message.data);
        if (typeof message.data?.remainingCredits === 'number') {
          dispatch(updateCredits(message.data.remainingCredits));
        }
        break;

      case 'refine_image_completed':
      case 'upscale_completed':
        handleRefineUpscaleCompleted(message);
        break;

      case 'refine_image_failed':
      case 'upscale_failed':
        handleRefineUpscaleFailed(message);
        break;

      case 'refine_image_status_update':
      case 'upscale_processing':
        handleRefineUpscaleProgress(message);
        break;

      case 'variation_status_update':
        handleVariationStatusUpdate(message);
        break;

      // Image tagging completion
      case 'image_tags_completed':
        handleImageTagsCompleted(message);
        break;

      default:
        console.log('⚠️ Unhandled message type:', message.type);
        break;
    }
  }, [dispatch, startTimeoutTimers, clearAllTimeouts]);

  // Handle variation completion
  const handleVariationCompleted = useCallback((message: WebSocketMessage) => {
    if (!message.data) return;

    const imageId = parseInt(message.data.imageId) || message.data.imageId;

    // Clear timeout timers for tweak operations
    if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint') {
      clearAllTimeouts();
      dispatch(resetTimeoutStates());
    }

    // Update the image in store
    dispatch(updateVariationFromWebSocket({
      batchId: parseInt(message.data.batchId) || message.data.batchId,
      imageId: imageId,
      variationNumber: message.data.variationNumber,
      imageUrl: message.data.imageUrl,
      processedImageUrl: message.data.processedUrl,
      thumbnailUrl: message.data.thumbnailUrl,
      status: 'COMPLETED',
      runpodStatus: 'COMPLETED',
      operationType: message.data.operationType,
      originalBaseImageId: message.data.originalBaseImageId,
      promptData: message.data.promptData
    }));

    // Handle pipeline coordination for tweak operations
    if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint' || message.data.operationType === 'tweak') {
      handleTweakPipeline(message, imageId);
    } else {
      // For CREATE module completions
      dispatch(stopGeneration());
      dispatch(fetchInputAndCreateImages({ page: 1, limit: 100 }));
      dispatch(fetchAllVariations({ page: 1, limit: 100 }));
    }

    // Auto-select completed image
    if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint' || message.data.operationType === 'tweak') {
      const delayMs = message.data.operationType === 'inpaint' ? 1000 : 200;
      setTimeout(() => {
        if (message.data.operationType === 'inpaint') {
          dispatch(setSelectedBaseImageIdAndClearObjects(imageId));
        } else {
          dispatch(setSelectedBaseImageIdSilent(imageId));
        }
      }, delayMs);
    } else {
      // Immediate selection for upscale and other operations
      dispatch(setSelectedImage({ id: imageId, type: 'generated' }));
    }
  }, [dispatch, clearAllTimeouts]);

  // Handle tweak pipeline logic
  const handleTweakPipeline = useCallback((message: WebSocketMessage, imageId: number) => {
    const pipelineState = (window as any).tweakPipelineState;

    if (pipelineState &&
        pipelineState.phase === 'OUTPAINT_STARTED' &&
        pipelineState.needsInpaint &&
        message.data.operationType === 'outpaint') {

      // Phase 1 complete, start Phase 2 (Inpaint)
      (window as any).tweakPipelineState = {
        ...pipelineState,
        phase: 'INPAINT_STARTING',
        outpaintResultImageId: imageId,
        outpaintResultImageUrl: message.data.imageUrl
      };

      const inpaintParams = {
        ...pipelineState.inpaintParams,
        baseImageId: imageId,
        baseImageUrl: message.data.imageUrl
      };

      setTimeout(async () => {
        try {
          const result = await dispatch(generateInpaint(inpaintParams) as any);

          if (generateInpaint.fulfilled.match(result)) {
            (window as any).tweakPipelineState.phase = 'INPAINT_STARTED';
          } else {
            console.error('❌ Phase 2 failed: Inpaint generation failed:', result.error);
            dispatch(setIsGenerating(false));
            delete (window as any).tweakPipelineState;
          }
        } catch (error) {
          console.error('❌ Phase 2 error:', error);
          dispatch(setIsGenerating(false));
          delete (window as any).tweakPipelineState;
        }
      }, 500);

    } else if (pipelineState &&
               pipelineState.phase === 'INPAINT_STARTED' &&
               message.data.operationType === 'inpaint') {

      // Phase 2 complete, pipeline finished
      dispatch(setIsGenerating(false));
      delete (window as any).tweakPipelineState;

    } else {
      // Single operation - reset generating state normally
      dispatch(setIsGenerating(false));
    }

    // Always refresh data
    dispatch(fetchInputAndCreateImages({ page: 1, limit: 100 }));
    dispatch(fetchAllTweakImages());
    dispatch(fetchAllVariations({ page: 1, limit: 100 }));

    // Auto-restore prompt if available
    if (message.data.promptData?.prompt) {
      setTimeout(() => {
        dispatch(setPrompt(message.data.promptData.prompt));
      }, 500);
    }

    // Refresh tweak history if needed
    if (message.data.originalBaseImageId) {
      dispatch(fetchTweakHistoryForImage({
        baseImageId: message.data.originalBaseImageId
      }));
    }
  }, [dispatch]);

  // Handle variation failure
  const handleVariationFailed = useCallback((message: WebSocketMessage) => {
    if (!message.data) return;

    dispatch(updateVariationFromWebSocket({
      batchId: parseInt(message.data.batchId) || message.data.batchId,
      imageId: parseInt(message.data.imageId) || message.data.imageId,
      variationNumber: message.data.variationNumber,
      status: 'FAILED',
      runpodStatus: 'FAILED'
    }));

    // Handle failure for tweak operations
    if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint' || message.data.operationType === 'tweak') {
      clearAllTimeouts();
      dispatch(resetTimeoutStates());
      dispatch(setIsGenerating(false));

      // Clean up pipeline state
      if ((window as any).tweakPipelineState) {
        delete (window as any).tweakPipelineState;
      }

      // Refresh data
      dispatch(fetchInputAndCreateImages({ page: 1, limit: 100 }));
      dispatch(fetchAllTweakImages());
      dispatch(fetchAllVariations({ page: 1, limit: 100 }));

      if (message.data.originalBaseImageId) {
        dispatch(fetchTweakHistoryForImage({
          baseImageId: message.data.originalBaseImageId
        }));
      }
    } else {
      // For CREATE module failures
      dispatch(stopGeneration());
    }
  }, [dispatch, clearAllTimeouts]);

  // Handle batch completion
  const handleBatchCompleted = useCallback((message: WebSocketMessage) => {
    if (!message.data) return;

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

    // Reset generating state and refresh data
    if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint' || message.data.operationType === 'tweak') {
      dispatch(setIsGenerating(false));
      dispatch(fetchInputAndCreateImages({ page: 1, limit: 100 }));
      dispatch(fetchAllTweakImages());
      dispatch(fetchAllVariations({ page: 1, limit: 100 }));

      if (message.data.originalBaseImageId) {
        dispatch(fetchTweakHistoryForImage({
          baseImageId: message.data.originalBaseImageId
        }));
      }
    } else {
      dispatch(stopGeneration());
      dispatch(fetchInputAndCreateImages({ page: 1, limit: 100 }));
      dispatch(fetchAllVariations({ page: 1, limit: 100 }));
    }
  }, [dispatch]);

  // Handle user-based notifications
  const handleUserNotification = useCallback((message: WebSocketMessage) => {
    if (!message.data) return;

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

    // Determine module type and handle accordingly
    const moduleType = message.data.moduleType || message.data.batch?.moduleType;
    const operationType = message.data.operationType;
    const isTweakOperation = moduleType === 'TWEAK' || operationType === 'outpaint' || operationType === 'inpaint' || operationType === 'tweak';

    if (isTweakOperation) {
      dispatch(setIsGenerating(false));
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
      // For CREATE module completions and upscale operations
      dispatch(fetchInputAndCreateImages({ page: 1, limit: 50 }));
      dispatch(fetchAllVariations({ page: 1, limit: 100 }));

      // Auto-select for upscale operations
      if (operationType === 'upscale') {
        const currentPath = window.location.pathname;
        if (currentPath === '/upscale') {
          // Use refineUISlice action for upscale page
          dispatch(setSelectedImageRefineUI({ id: imageId, type: 'generated' }));
        } else {
          // Use createUISlice action for other pages
          dispatch(setSelectedImage({ id: imageId, type: 'generated' }));
        }
      }
    }
  }, [dispatch]);

  // Handle mask completion
  const handleMasksCompleted = useCallback((message: WebSocketMessage) => {
    console.log('✅ Masks completed:', message.data);

    // Fixed filtering - process if message has inputImageId and it matches current (or current is undefined during load)
    if (message.inputImageId && (message.inputImageId === currentInputImageId || !currentInputImageId)) {
      if (message.data?.masks && message.data?.maskCount) {
        dispatch(setMaskGenerationComplete({
          maskCount: message.data.maskCount,
          masks: message.data.masks
        }));
      }

      // Refresh masks and AI prompt materials
      dispatch(getMasks(message.inputImageId));
      dispatch(getAIPromptMaterials(message.inputImageId));

      console.log(`✅ Processed mask completion for image ${message.inputImageId} (current: ${currentInputImageId})`);
    } else {
      console.log(`🚫 Ignoring mask completion - image ${message.inputImageId} doesn't match current ${currentInputImageId}`);
    }
  }, [dispatch, currentInputImageId]);

  // Handle mask failure
  const handleMasksFailed = useCallback((message: WebSocketMessage) => {
    console.error('❌ Masks failed:', message.error);

    // Fixed filtering - process if message has inputImageId and it matches current (or current is undefined during load)
    if (message.inputImageId && (message.inputImageId === currentInputImageId || !currentInputImageId)) {
      dispatch(setMaskGenerationFailed(message.error || 'Mask generation failed'));
      console.log(`✅ Processed mask failure for image ${message.inputImageId} (current: ${currentInputImageId})`);
    } else {
      console.log(`🚫 Ignoring mask failure - image ${message.inputImageId} doesn't match current ${currentInputImageId}`);
    }
  }, [dispatch, currentInputImageId]);

  // Handle refine/upscale completion
  const handleRefineUpscaleCompleted = useCallback((message: WebSocketMessage) => {
    if (!message.data) return;

    const imageId = parseInt(message.data.imageId) || message.data.imageId;

    dispatch(updateVariationFromWebSocket({
      batchId: parseInt(message.data.batchId) || message.data.batchId,
      imageId: imageId,
      variationNumber: 1,
      imageUrl: message.data.imageUrl || message.data.processedImageUrl,
      processedImageUrl: message.data.processedImageUrl || message.data.imageUrl,
      thumbnailUrl: message.data.thumbnailUrl,
      status: 'COMPLETED',
      runpodStatus: 'COMPLETED',
      operationType: message.data.operationType || (message.type.includes('upscale') ? 'upscale' : 'refine'),
      originalBaseImageId: message.data.originalBaseImageId || message.data.originalInputImageId
    }));

    console.log('🎉 Refine/Upscale operation completed:', {
      imageId,
      operationType: message.data.operationType,
      type: message.type
    });

    // Stop refine generation state (both slices)
    dispatch(setIsGeneratingRefine(false));
    dispatch(stopGenerationRefineUI());

    // Refresh data based on current page
    const currentPath = window.location.pathname;
    if (currentPath === '/refine' || currentPath === '/upscale') {
      dispatch(fetchInputImagesBySource({ uploadSource: 'REFINE_MODULE' }));
    } else {
      dispatch(fetchInputAndCreateImages({ page: 1, limit: 100 }));
    }

    dispatch(fetchAllVariations({ page: 1, limit: 100 }));

    // Auto-select the completed image
    const imageUrl = message.data.imageUrl || message.data.processedImageUrl;
    if (currentPath === '/upscale') {
      dispatch(setSelectedImageRefine({ id: imageId, url: imageUrl, type: 'generated' }));
    } else if (currentPath === '/refine') {
      // For refine page, update refineUI slice (not create slice) to trigger our download progress system
      dispatch(setSelectedImageRefineUI({ id: imageId, type: 'generated' }));
    } else {
      dispatch(setSelectedImage({ id: imageId, type: 'generated' }));
    }
  }, [dispatch]);

  // Handle refine/upscale failure
  const handleRefineUpscaleFailed = useCallback((message: WebSocketMessage) => {
    if (!message.data) return;

    dispatch(updateVariationFromWebSocket({
      batchId: parseInt(message.data.batchId) || message.data.batchId,
      imageId: parseInt(message.data.imageId) || message.data.imageId,
      variationNumber: 1,
      status: 'FAILED',
      runpodStatus: 'FAILED',
      operationType: message.data.operationType || (message.type.includes('upscale') ? 'upscale' : 'refine'),
      originalBaseImageId: message.data.originalBaseImageId
    }));

    console.log('❌ Refine/Upscale operation failed:', {
      imageId: message.data.imageId,
      error: message.data.error
    });

    // Stop refine generation state (both slices)
    dispatch(setIsGeneratingRefine(false));
    dispatch(stopGenerationRefineUI());

    // Refresh data to show failed state
    dispatch(fetchInputAndCreateImages({ page: 1, limit: 100 }));
    dispatch(fetchAllVariations({ page: 1, limit: 100 }));
  }, [dispatch]);

  // Handle refine/upscale progress
  const handleRefineUpscaleProgress = useCallback((message: WebSocketMessage) => {
    if (!message.data) return;

    dispatch(updateVariationFromWebSocket({
      batchId: parseInt(message.data.batchId) || message.data.batchId,
      imageId: parseInt(message.data.imageId) || message.data.imageId,
      variationNumber: 1,
      status: message.data.status || 'PROCESSING',
      runpodStatus: message.data.status || 'PROCESSING',
      operationType: message.data.operationType || (message.type.includes('upscale') ? 'upscale' : 'refine'),
      originalBaseImageId: message.data.originalBaseImageId
    }));
  }, [dispatch]);

  // Handle variation status updates (for intermediate status changes)
  const handleVariationStatusUpdate = useCallback((message: WebSocketMessage) => {
    console.log('🔔 Received variation_status_update message:', message);

    if (!message.data) {
      console.log('❌ No data in variation_status_update message');
      return;
    }

    console.log('📊 Processing variation status update:', {
      imageId: message.data.imageId,
      status: message.data.status,
      runpodStatus: message.data.runpodStatus,
      operationType: message.data.operationType
    });

    dispatch(updateVariationFromWebSocket({
      batchId: parseInt(message.data.batchId) || message.data.batchId,
      imageId: parseInt(message.data.imageId) || message.data.imageId,
      variationNumber: message.data.variationNumber || 1,
      status: message.data.status,
      runpodStatus: message.data.runpodStatus,
      operationType: message.data.operationType
    }));

    console.log('✅ Variation status updated via WebSocket:', {
      imageId: message.data.imageId,
      status: message.data.status,
      runpodStatus: message.data.runpodStatus
    });
  }, [dispatch]);

  // Handle image tags completion
  const handleImageTagsCompleted = useCallback((message: WebSocketMessage) => {
    if (!message.data) return;

    const { inputImageId, tagCount, tags } = message.data;

    console.log('🏷️ Image tags completed:', {
      inputImageId,
      tagCount,
      tags: tags?.slice(0, 5) // Log first 5 tags
    });

    // Immediately update the specific image's tags in Redux store for instant UI update
    if (inputImageId && tags && Array.isArray(tags)) {
      dispatch(updateImageTags({ inputImageId, tags }));
      console.log('✅ Tags updated immediately in Redux store for inputImageId:', inputImageId);
    }

    // Also refresh input images to ensure consistency across all modules
    dispatch(fetchInputImagesBySource({ uploadSource: 'REFINE_MODULE' }));

    // Refresh input images for the current module if different
    const currentPath = window.location.pathname;
    if (currentPath === '/create') {
      dispatch(fetchInputImagesBySource({ uploadSource: 'CREATE_MODULE' }));
    } else if (currentPath === '/edit' || currentPath === '/tweak') {
      dispatch(fetchInputImagesBySource({ uploadSource: 'TWEAK_MODULE' }));
    }

    console.log('🎉 Image tags updated via WebSocket - immediate display enabled');
  }, [dispatch]);

  // Create the WebSocket connection
  const { isConnected, sendMessage } = useWebSocket(
    `${import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3000/ws'}`,
    {
      onMessage: handleWebSocketMessage,
      onConnect: () => {
        connectionQuality.current.isHealthy = true;
        console.log('🔗 Unified WebSocket connected');

        // Reset disconnection count if stable for 60 seconds
        const now = Date.now();
        if (now - connectionQuality.current.lastDisconnection > 60000) {
          connectionQuality.current.disconnectionCount = 0;
        }
      },
      onDisconnect: () => {
        connectionQuality.current.isHealthy = false;
        connectionQuality.current.disconnectionCount++;
        connectionQuality.current.lastDisconnection = Date.now();

        if (connectionQuality.current.disconnectionCount > 3) {
          console.warn('⚠️ Unified WebSocket connection unstable - multiple disconnections:', {
            disconnectionCount: connectionQuality.current.disconnectionCount,
            criticalOperationActive: connectionQuality.current.criticalOperationActive
          });
        }
      },
      onError: (error) => {
        console.error('❌ Unified WebSocket error:', error);
        connectionQuality.current.isHealthy = false;
      }
    }
  );

  return {
    isConnected: enabled ? isConnected : false,
    sendMessage,
    connectionQuality: connectionQuality.current,
    clearAllTimeouts
  };
};