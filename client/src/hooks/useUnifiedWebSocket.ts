import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAppSelector } from '@/hooks/useAppSelector';
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
import { setSelectedImage, stopGeneration, setIsPromptModalOpen, setIsCatalogOpen } from '@/features/create/createUISlice';
import { setSelectedImage as setSelectedImageRefine, setIsGenerating as setIsGeneratingRefine } from '@/features/refine/refineSlice';
import { setSelectedImage as setSelectedImageRefineUI, stopGeneration as stopGenerationRefineUI } from '@/features/refine/refineUISlice';
import { setSelectedImage as setSelectedImageTweakUI, stopGeneration as stopGenerationTweakUI } from '@/features/tweak/tweakUISlice';
import { updateCredits, fetchCurrentUser } from '@/features/auth/authSlice';
import {
  setIsGenerating,
  setSelectedBaseImageIdSilent,
  setSelectedBaseImageIdAndClearObjects,
  setPrompt,
  hideCanvasSpinner,
  setTimeoutPhase,
  resetTimeoutStates,
  generateInpaint,
  setCanvasBounds,
  setOriginalImageBounds,
  setZoom,
  setPan,
  setSelectedModel
} from '@/features/tweak/tweakSlice';
import { setMaskGenerationProcessing, setMaskGenerationComplete, setMaskGenerationFailed, getMasks, getAIPromptMaterials, setSavedPrompt } from '@/features/masks/maskSlice';
import { getSession } from '@/features/sessions/sessionSlice';

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

  // Track recently-notified image IDs to prevent duplicate toasts
  const recentlyNotifiedImages = useRef(new Set<number | string>());
  // Read currently selected model from tweak slice to filter toasts
  const selectedModel = useAppSelector(state => state.tweak.selectedModel);
  // Get current session for refreshing when CREATE variations complete
  const currentSession = useAppSelector(state => state.sessions.currentSession);

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
    try {
      console.log('🔗 Unified WebSocket received:', { type: message.type, data: message.data });

      // Safety check: ensure message has required structure
      if (!message || typeof message !== 'object') {
        console.warn('⚠️ Invalid WebSocket message structure:', message);
        return;
      }

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
          const batchId = message.data.batchId !== undefined 
            ? (parseInt(message.data.batchId) || message.data.batchId)
            : undefined;
          
          dispatch(updateVariationFromWebSocket({
            batchId: batchId,
            imageId: parseInt(message.data.imageId) || message.data.imageId,
            variationNumber: message.data.variationNumber,
            status: 'PROCESSING',
            runpodStatus: message.data.runpodStatus
          }));

          // Start timeout timers for tweak operations
          if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint') {
            startTimeoutTimers({
              operationType: message.data.operationType,
              batchId: batchId,
              imageId: message.data.imageId,
              jobId: message.data.imageId
            });
          }
        }
        break;

      case 'variation_progress':
        if (message.data) {
          const batchId = message.data.batchId !== undefined 
            ? (parseInt(message.data.batchId) || message.data.batchId)
            : undefined;
          
          dispatch(updateVariationFromWebSocket({
            batchId: batchId,
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
      case 'masks_started':
        handleMasksStarted(message);
        break;
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

      // Image tagging messages
      case 'image_tagging_started':
        handleImageTaggingStarted(message);
        break;

      case 'image_tags_completed':
        handleImageTagsCompleted(message);
        break;

      case 'image_tagging_failed':
        handleImageTaggingFailed(message);
        break;

      default:
        console.log('⚠️ Unhandled message type:', message.type);
        break;
      }
    } catch (error: any) {
      console.error('❌ Error handling WebSocket message:', {
        error: error.message,
        stack: error.stack,
        messageType: message?.type,
        messageData: message?.data,
        fullMessage: message
      });
      // Don't rethrow - just log the error to prevent app crash
    }
  }, [dispatch, startTimeoutTimers, clearAllTimeouts]);

  // Handle variation completion
  const handleVariationCompleted = useCallback((message: WebSocketMessage) => {
    if (!message.data) return;

    const imageId = parseInt(message.data.imageId) || message.data.imageId;
    
    // Safely get batchId with fallback
    const batchId = message.data.batchId !== undefined 
      ? (parseInt(message.data.batchId) || message.data.batchId)
      : undefined;

    // Clear timeout timers for tweak operations
    if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint') {
      clearAllTimeouts();
      dispatch(resetTimeoutStates());
    }

    // Update the image in store
    dispatch(updateVariationFromWebSocket({
      batchId: batchId,
      imageId: imageId,
      variationNumber: message.data.variationNumber,
      imageUrl: message.data.imageUrl,
      processedImageUrl: message.data.processedUrl,
      thumbnailUrl: message.data.thumbnailUrl,
      status: 'COMPLETED',
      runpodStatus: 'COMPLETED',
      operationType: message.data.operationType,
      moduleType: message.data.moduleType || message.data.batch?.moduleType,
      originalBaseImageId: message.data.originalBaseImageId,
      promptData: message.data.promptData,
      previewUrl: message.data.previewUrl
    }));

    // Update credits if provided in the message
    if (typeof message.data?.remainingCredits === 'number') {
      dispatch(updateCredits(message.data.remainingCredits));
    } else {
      // Fallback: refresh user data to get updated credits
      dispatch(fetchCurrentUser());
    }

    // Handle pipeline coordination for tweak operations
    const moduleType = message.data.moduleType || message.data.batch?.moduleType;
    const operationType = message.data.operationType;
    // Include flux_edit in tweak operations check
    const isTweakOp = moduleType === 'TWEAK' || (operationType && (operationType === 'outpaint' || operationType === 'inpaint' || operationType === 'tweak' || operationType === 'flux_edit'));
    
    if (isTweakOp) {
      handleTweakPipeline(message, imageId);
    } else {
      // For CREATE module completions (including flux_edit when moduleType is CREATE)
      // Don't stop generation immediately - let the page.tsx logic handle it after verifying images have URLs
      // This prevents stopping too early if WebSocket message arrives before image URLs are ready
      dispatch(fetchInputAndCreateImages({ page: 1, limit: 100 }));
      dispatch(fetchAllVariations({ page: 1, limit: 100 }));
      
      console.log('🔄 Refreshing current session:', currentSession?.id);
      // This ensures session images update as variations complete
      if (currentSession?.id) {
        // Immediate refresh
        dispatch(getSession(currentSession.id));
        
        // Also refresh after a delay to ensure backend has processed everything
        setTimeout(() => {
          dispatch(getSession(currentSession.id));
        }, 1000);
      }
      
      // Schedule another fetch after a delay to ensure we get the latest data
      setTimeout(() => {
        dispatch(fetchAllVariations({ page: 1, limit: 100 }));
      }, 2000);
      
      // Auto-select completed CREATE image and close modal
      const currentPath = window.location.pathname;
      if (currentPath === '/create' && imageId) {
        setTimeout(() => {
          dispatch(setSelectedImage({ id: imageId, type: 'generated' }));
          dispatch(setIsPromptModalOpen(false)); // Close modal to show generated image
          console.log('🎯 Auto-selected completed CREATE image and closed modal (handleVariationCompleted):', { imageId, moduleType, operationType });
        }, 500);
      }
    }

    // Auto-select completed image - Use small delay to ensure image is in store
    if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint' || message.data.operationType === 'tweak') {

      console.log('🎯 Auto-selecting completed image:', {
        imageId,
        operationType: message.data.operationType,
        originalBaseImageId: message.data.originalBaseImageId || message.data.originalInputImageId
      });

      // Enhanced auto-selection with proper data refresh sequence
      console.log('🔄 Step 1: Refreshing data before auto-selection...');

      // First, ensure the data is fresh in the store
      dispatch(fetchAllTweakImages());
      dispatch(fetchAllVariations({ page: 1, limit: 100 }));

      // Then perform auto-selection after data is likely to be updated
      setTimeout(() => {
        console.log('🔄 Step 2: Starting auto-selection process...');

        // Update tweak slice for canvas operations (matching manual selection)
        if (message.data.operationType === 'inpaint') {
          console.log('🎯 Dispatching setSelectedBaseImageIdAndClearObjects for inpaint');
          dispatch(setSelectedBaseImageIdAndClearObjects(imageId));
        } else {
          console.log('🎯 Dispatching setSelectedBaseImageIdSilent for outpaint/tweak');
          dispatch(setSelectedBaseImageIdSilent(imageId));
        }

        // Update tweakUI slice for visual selection in TweakPage (matching manual selection exactly)
        console.log('🎯 Dispatching setSelectedImageTweakUI with params:', {
          id: imageId,
          type: 'generated',
          baseInputImageId: message.data.originalBaseImageId || message.data.originalInputImageId
        });

        dispatch(setSelectedImageTweakUI({
          id: imageId,
          type: 'generated',
          baseInputImageId: message.data.originalBaseImageId || message.data.originalInputImageId
        }));

        console.log('✅ Auto-selection actions dispatched for image:', imageId);

        // Additional debugging: Log what should happen next
        setTimeout(() => {
          console.log('🔍 Auto-selection verification - Image should now be selected in TweakPage');
        }, 100);

      }, 1000); // Longer delay to ensure data fetch completes

      // Reset canvas bounds using predicted dimensions (faster and more accurate)
      if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint') {
        console.log('🔄 Canvas bounds reset - Starting reset for:', {
          operationType: message.data.operationType,
          imageUrl: message.data.imageUrl,
          imageId: imageId,
          predictedDimensions: message.data.predictedDimensions,
          originalDimensions: message.data.originalDimensions,
          dimensions: message.data.dimensions
        });

        // Use predicted dimensions if available, otherwise fall back to dimensions field, then image loading
        let width: number | undefined;
        let height: number | undefined;

        if (message.data.predictedDimensions) {
          width = message.data.predictedDimensions.width;
          height = message.data.predictedDimensions.height;
        } else if (message.data.dimensions) {
          width = message.data.dimensions.width;
          height = message.data.dimensions.height;
        }

        if (width && height) {
          console.log('📐 Canvas bounds reset - Using provided dimensions:', {
            dimensions: `${width}x${height}`,
            source: message.data.predictedDimensions ? 'predictedDimensions' : 'dimensions'
          });

          const newBounds = { x: 0, y: 0, width, height };

          // Reset both original and canvas bounds to the new image size
          dispatch(setOriginalImageBounds(newBounds));
          dispatch(setCanvasBounds(newBounds));

          // Reset zoom and pan to default state
          dispatch(setZoom(1));
          dispatch(setPan({ x: 0, y: 0 }));

          console.log('✅ Canvas bounds reset - Dispatched with provided dimensions and reset zoom/pan');
        } else {
          // Fallback: Load actual image to get dimensions (slower)
          console.log('⚠️ No dimensions provided, falling back to image loading...');

          if (message.data.imageUrl) {
            const tempImg = new Image();
            tempImg.onload = () => {
              console.log('🖼️ Canvas bounds reset - Image loaded with dimensions:', {
                width: tempImg.width,
                height: tempImg.height,
                imageUrl: message.data.imageUrl
              });

              const newBounds = { x: 0, y: 0, width: tempImg.width, height: tempImg.height };

              dispatch(setOriginalImageBounds(newBounds));
              dispatch(setCanvasBounds(newBounds));

              // Reset zoom and pan to default state
              dispatch(setZoom(1));
              dispatch(setPan({ x: 0, y: 0 }));

              console.log('✅ Canvas bounds reset - Dispatched with actual dimensions and reset zoom/pan');
            };

            tempImg.onerror = (error) => {
              console.error('❌ Canvas bounds reset - Failed to load image:', error, 'URL:', message.data.imageUrl);
            };

            tempImg.src = message.data.imageUrl;
            console.log('🔄 Canvas bounds reset - Started loading image:', message.data.imageUrl);
          }
        }
      } else {
        console.log('🚫 Canvas bounds reset - Skipped (not outpaint/inpaint):', {
          operationType: message.data.operationType
        });
      }
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
            dispatch(stopGenerationTweakUI());
            delete (window as any).tweakPipelineState;
          }
        } catch (error) {
          console.error('❌ Phase 2 error:', error);
          dispatch(setIsGenerating(false));
          dispatch(stopGenerationTweakUI());
          delete (window as any).tweakPipelineState;
        }
      }, 500);

    } else if (pipelineState &&
               pipelineState.phase === 'INPAINT_STARTED' &&
               message.data.operationType === 'inpaint') {

      // Phase 2 complete, pipeline finished
      dispatch(setIsGenerating(false));
      dispatch(stopGenerationTweakUI());
      delete (window as any).tweakPipelineState;

    } else {
      // Single operation - DON'T stop generation immediately
      // Let the batch completion check in TweakPage handle stopping
      // This ensures generation continues until ALL variations are complete
      console.log('🔄 Flux/Tweak variation completed - refreshing data but keeping generation state active until batch completes');
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

    const batchId = message.data.batchId !== undefined 
      ? (parseInt(message.data.batchId) || message.data.batchId)
      : undefined;

    dispatch(updateVariationFromWebSocket({
      batchId: batchId,
      imageId: parseInt(message.data.imageId) || message.data.imageId,
      variationNumber: message.data.variationNumber,
      status: 'FAILED',
      runpodStatus: 'FAILED'
    }));

    // Update credits if provided; otherwise refresh
    if (typeof message.data?.remainingCredits === 'number') {
      dispatch(updateCredits(message.data.remainingCredits));
    } else {
      dispatch(fetchCurrentUser());
    }

    // Handle failure for tweak operations
    if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint' || message.data.operationType === 'tweak') {
      clearAllTimeouts();
      dispatch(resetTimeoutStates());
      // Clear generation state in both tweak slices
      dispatch(setIsGenerating(false)); // tweakSlice
      dispatch(stopGenerationTweakUI()); // tweakUISlice

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

    const batchId = message.data.batchId !== undefined 
      ? (parseInt(message.data.batchId) || message.data.batchId)
      : undefined;

    if (!batchId) {
      console.warn('⚠️ Batch completion message missing batchId:', message);
      return;
    }

    dispatch(updateBatchCompletionFromWebSocket({
      batchId: batchId,
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
      dispatch(setIsGenerating(false)); // tweakSlice
      dispatch(stopGenerationTweakUI()); // tweakUISlice
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
      
      // CRITICAL: Refresh session when batch completes (for CREATE module)
      // Use sessionId from notification if available, otherwise use currentSession
      const sessionIdToRefresh = message.data.sessionId || currentSession?.id;
      if (sessionIdToRefresh) {
        // Immediate refresh
        dispatch(getSession(sessionIdToRefresh));
        
        // Also refresh after a delay to ensure backend has processed everything
        setTimeout(() => {
          dispatch(getSession(sessionIdToRefresh));
        }, 1000);
      }
    }

    // Update credits if provided in the message
    if (typeof message.data?.remainingCredits === 'number') {
      dispatch(updateCredits(message.data.remainingCredits));
    } else {
      // Fallback: refresh user data to get updated credits
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, currentSession]);

  // Handle user-based notifications
  const handleUserNotification = useCallback((message: WebSocketMessage) => {
    console.log('🔍 DEBUG: handleUserNotification called with message:', {
      type: message.type,
      data: message.data,
      hasImageUrl: !!message.data?.imageUrl,
      operationType: message.data?.operationType
    });

    if (!message.data) return;

    const imageId = parseInt(message.data.imageId) || message.data.imageId;

    // Clear timeout states for tweak operations
    if (message.data.operationType === 'outpaint' || message.data.operationType === 'inpaint') {
      dispatch(resetTimeoutStates());
    }

    // Safely get batchId with fallback
    const batchId = message.data.batchId !== undefined 
      ? (parseInt(message.data.batchId) || message.data.batchId)
      : undefined;

    // Update the image in the store
    dispatch(updateVariationFromWebSocket({
      batchId: batchId,
      imageId: imageId,
      variationNumber: message.data.variationNumber,
      imageUrl: message.data.imageUrl,
      processedImageUrl: message.data.processedImageUrl,
      thumbnailUrl: message.data.thumbnailUrl,
      status: 'COMPLETED',
      runpodStatus: 'COMPLETED',
      operationType: message.data.operationType,
      moduleType: message.data.moduleType || message.data.batch?.moduleType,
      originalBaseImageId: message.data.originalBaseImageId,
      promptData: message.data.promptData
    }));

    // Show a small success toast with friendly model name when available, but dedupe by imageId
    try {
      const variationNumber = message.data.variationNumber || 1;
      const safeBatchId = message.data.batchId !== undefined ? message.data.batchId : 'unknown';
      const imageKey = imageId || `${safeBatchId}-${variationNumber}`;

      // If we've already shown a toast for this image recently, skip
      if (recentlyNotifiedImages.current.has(imageKey)) {
        console.log('Skipping duplicate notification for image:', imageKey);
      } else {
        const modelValue = (message.data.model || '').toString();
        const modelDisplayName = message.data.modelDisplayName || modelValue;

        // If a model is selected in the UI, only show toasts for that model
        let shouldShow = true;
        try {
          if (selectedModel && selectedModel.length > 0) {
            const normalize = (s: any) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '');

            const sel = normalize(selectedModel);
            const msgModel = normalize(modelValue);
            const msgDisplay = normalize(modelDisplayName);

            // Show if normalized model or display name contains the normalized selected model
            shouldShow = msgModel.includes(sel) || msgDisplay.includes(sel) ||
              // fallback heuristics for loose matches (e.g., 'nano' vs 'nanobananapro')
              (sel.includes('nano') && (msgModel.includes('nano') || msgDisplay.includes('nano'))) ||
              (sel.includes('flux') && (msgModel.includes('flux') || msgDisplay.includes('flux'))) ||
              (sel.includes('seedream') && (msgModel.includes('seedream') || msgDisplay.includes('seedream'))) ||
              (msgModel.includes('seedream') && sel.includes('nano')); // Allow seedream notifications when nano is selected (Create page dynamic model)
          }
        } catch (e) {
          shouldShow = true;
        }

        if (shouldShow) {
          // Suppress notifications on Create page, but allow on Edit page
          const currentPath = window.location.pathname;
          const isCreatePage = currentPath === '/create';
          
          if (!isCreatePage) {
            const friendlyName = (typeof modelDisplayName === 'string' && modelDisplayName.length > 0)
              ? modelDisplayName
              : (() => {
                  const m = (modelValue || '').toString().toLowerCase();
                  if (m.includes('nano')) return 'Google Nano Banana Pro';
                  if (m.includes('sdxl')) return 'SDXL';
                  if (m.includes('flux')) return 'Flux Konect';
                  return 'Model';
                })();

            toast.success(`${friendlyName} ${variationNumber} generated`);

            // Mark as notified and expire after 30s to allow future notifications
            recentlyNotifiedImages.current.add(imageKey);
            setTimeout(() => {
              recentlyNotifiedImages.current.delete(imageKey);
            }, 30000);
          } else {
            // On Create page, suppress notification but still mark as notified to prevent duplicates
            recentlyNotifiedImages.current.add(imageKey);
            setTimeout(() => {
              recentlyNotifiedImages.current.delete(imageKey);
            }, 30000);
            console.log('Notification suppressed - on Create page');
          }
        } else {
          console.log('Notification suppressed due to selected model filter:', { selectedModel, modelValue, modelDisplayName });
        }
      }
    } catch (err) {
      console.warn('Failed to show generation toast:', err);
    }

    // Determine module type and handle accordingly
    const moduleType = message.data.moduleType || message.data.batch?.moduleType;
    const operationType = message.data.operationType;
    const isTweakOperation = moduleType === 'TWEAK' || operationType === 'outpaint' || operationType === 'inpaint' || operationType === 'tweak' || operationType === 'flux_edit';

    if (isTweakOperation) {
      // DON'T stop generation immediately - let batch completion check handle it
      // This ensures generation continues until ALL variations in the batch are complete
      console.log('🔄 TWEAK variation completed - refreshing data but keeping generation state active until batch completes', {
        imageId,
        batchId: message.data.batchId,
        operationType
      });

      dispatch(fetchInputAndCreateImages({ page: 1, limit: 100 }));
      dispatch(fetchAllTweakImages());
      dispatch(fetchAllVariations({ page: 1, limit: 100 }));

      // Auto-restore prompt if available
      if (message.data.promptData?.prompt) {
        setTimeout(() => {
          dispatch(setPrompt(message.data.promptData.prompt));
        }, 500);
      }

      // Auto-select the completed image with enhanced selection logic
      setTimeout(() => {
        console.log('🎯 Auto-selecting completed tweak image:', {
          imageId,
          operationType,
          originalBaseImageId: message.data.originalBaseImageId
        });

        // Update tweak slice for canvas operations (inpaint clears objects, others don't)
        if (operationType === 'inpaint') {
          console.log('🎯 Dispatching setSelectedBaseImageIdAndClearObjects for inpaint');
          dispatch(setSelectedBaseImageIdAndClearObjects(imageId));
        } else if (operationType === 'outpaint' || operationType === 'flux_edit' || operationType === 'tweak') {
          console.log('🎯 Dispatching setSelectedBaseImageIdSilent for outpaint/tweak/flux_edit');
          dispatch(setSelectedBaseImageIdSilent(imageId));
        }

        // CRUCIAL: Also update tweakUI slice for visual selection in TweakPage
        console.log('🎯 Dispatching setSelectedImageTweakUI for UI selection');
        dispatch(setSelectedImageTweakUI({
          id: imageId,
          type: 'generated',
          baseInputImageId: message.data.originalBaseImageId || message.data.originalInputImageId
        }));

        console.log('✅ Auto-selection completed for tweak image:', imageId);
      }, operationType === 'inpaint' ? 1000 : 500); // Increased delay to ensure data is ready
    } else {
      // For CREATE module completions and upscale operations
      // Don't stop generation immediately - let the page.tsx logic handle it after verifying images have URLs
      // This prevents stopping too early if WebSocket message arrives before image URLs are ready
      dispatch(fetchInputAndCreateImages({ page: 1, limit: 100 }));
      dispatch(fetchAllVariations({ page: 1, limit: 100 }));
      
      // CRITICAL: Refresh session to ensure batches are updated
      // Use sessionId from notification if available, otherwise use currentSession
      const sessionIdToRefresh = message.data.sessionId || message.data.batch?.sessionId || currentSession?.id;
      if (sessionIdToRefresh) {
        // Immediate refresh
        dispatch(getSession(sessionIdToRefresh));
        
        // Also refresh after a delay to ensure backend has processed everything
        setTimeout(() => {
          dispatch(getSession(sessionIdToRefresh));
        }, 1000);
      }
      
      // Schedule another fetch after a delay to ensure we get the latest data
      setTimeout(() => {
        dispatch(fetchAllVariations({ page: 1, limit: 100 }));
      }, 2000);
      
      // Auto-select completed CREATE image after data refresh and close modal
      const currentPath = window.location.pathname;
      if (currentPath === '/create' && imageId) {
        setTimeout(() => {
          dispatch(setSelectedImage({ id: imageId, type: 'generated' }));
          dispatch(setIsPromptModalOpen(false)); // Close modal to show generated image
          console.log('🎯 Auto-selected completed CREATE image and closed modal (handleUserNotification):', { imageId, moduleType, operationType });
        }, 500);
      }
    }

    // Update credits if provided in the message, otherwise refresh user data
    if (typeof message.data?.remainingCredits === 'number') {
      dispatch(updateCredits(message.data.remainingCredits));
    } else {
      // Fallback: refresh user data to get updated credits
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, currentSession]);

  // Handle mask generation start
  const handleMasksStarted = useCallback((message: WebSocketMessage) => {
    console.log('🚀 Masks generation started:', message.data);
    console.log('🔍 Current state:', {
      messageInputImageId: message.inputImageId,
      currentInputImageId: currentInputImageId,
      currentPath: window.location.pathname
    });

    // Set the mask status to 'processing' to trigger loading animation
    // For Revit masks, we want to show loading regardless of current image selection
    if (message.inputImageId) {
      dispatch(setMaskGenerationProcessing({
        inputImageId: message.inputImageId,
        type: message.data?.type || 'standard'
      }));
      console.log(`🚀 Mask generation started for image ${message.inputImageId} (current: ${currentInputImageId})`);

      // If user is on Create page and no current image is selected, set this as current
      if (window.location.pathname === '/create' && !currentInputImageId) {
        console.log('🔄 Setting current input image for Create page navigation');
        // This might require additional action to set the current image in the Create page
      }
    } else {
      console.log(`🚫 No inputImageId in masks_started message`);
    }
  }, [dispatch, currentInputImageId]);

  // Handle mask completion
  const handleMasksCompleted = useCallback((message: WebSocketMessage) => {
    console.log('✅ Masks completed:', message.data);
    console.log('🔍 Completion state:', {
      messageInputImageId: message.inputImageId,
      currentInputImageId: currentInputImageId,
      currentPath: window.location.pathname
    });

    // Process completion for Revit masks regardless of current image selection
    if (message.inputImageId) {
      // Check if hasInputImage is false (indicated by presence of keywords and generatedPrompt)
      const hasKeywords = message.data?.keywords && Array.isArray(message.data.keywords) && message.data.keywords.length > 0;
      const hasGeneratedPrompt = message.data?.generatedPrompt && typeof message.data.generatedPrompt === 'string';
      const hasInputImage = !!message.data?.hasInputImage; // If keywords are present, hasInputImage is false

      if (hasInputImage) {
        // When hasInputImage is true: set model to nano banana, apply generated prompt, and handle keywords
        console.log('🎭 hasInputImage=true detected, setting nano banana model and applying prompt/keywords');
        dispatch(setSelectedModel('nanobanana'));
        
        // Apply generated prompt if available
        if (hasGeneratedPrompt) {
          dispatch(setSavedPrompt(message.data.generatedPrompt));
          console.log('✅ Generated prompt applied:', message.data.generatedPrompt.substring(0, 50) + '...');
        }
        
        // Keywords are already saved as AI materials in the backend, will be fetched below
        if (hasKeywords) {
          console.log('📝 Keywords received:', message.data.keywords);
        }
      } else {
        if (message.data?.masks && message.data?.maskCount) {
          dispatch(setMaskGenerationComplete({
            maskCount: message.data.maskCount,
            masks: message.data.masks
          }));
        }

        // When hasInputImage is true: set SDXL model (existing behavior)
        dispatch(setSelectedModel('sdxl'));

        // Open the catalog to show mask regions
        dispatch(setIsCatalogOpen(true));
        
        // Set mask generation processing
        dispatch(setMaskGenerationProcessing({ inputImageId: message.inputImageId }));

        // Refresh masks and AI prompt materials (includes keywords when hasInputImage=false)
        dispatch(getMasks(message.inputImageId));
      }

      dispatch(setSelectedImage({ id: message.inputImageId, type: 'input' }));      
      try {
        dispatch(fetchInputImagesBySource({ uploadSource: 'CREATE_MODULE' })).then(() => {
          dispatch(setSelectedImage({ id: message.inputImageId, type: 'input' }));      
        });
      } catch {
        // Do nothing
      }
      dispatch(getAIPromptMaterials(message.inputImageId));

      console.log(`✅ Processed mask completion for image ${message.inputImageId} (current: ${currentInputImageId})`);
    } else {
      console.log(`🚫 No inputImageId in masks_completed message`);
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
    const batchId = message.data.batchId !== undefined 
      ? (parseInt(message.data.batchId) || message.data.batchId)
      : undefined;

    dispatch(updateVariationFromWebSocket({
      batchId: batchId,
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

    // Update credits if provided in the message, otherwise refresh user data
    if (typeof message.data?.remainingCredits === 'number') {
      dispatch(updateCredits(message.data.remainingCredits));
    } else {
      // Fallback: refresh user data to get updated credits
      dispatch(fetchCurrentUser());
    }
  }, [dispatch]);

  // Handle refine/upscale failure
  const handleRefineUpscaleFailed = useCallback((message: WebSocketMessage) => {
    if (!message.data) return;

    const batchId = message.data.batchId !== undefined 
      ? (parseInt(message.data.batchId) || message.data.batchId)
      : undefined;

    dispatch(updateVariationFromWebSocket({
      batchId: batchId,
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

    const batchId = message.data.batchId !== undefined 
      ? (parseInt(message.data.batchId) || message.data.batchId)
      : undefined;

    dispatch(updateVariationFromWebSocket({
      batchId: batchId,
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

    const batchId = message.data.batchId !== undefined 
      ? (parseInt(message.data.batchId) || message.data.batchId)
      : undefined;

    console.log('📊 Processing variation status update:', {
      imageId: message.data.imageId,
      batchId: batchId,
      status: message.data.status,
      runpodStatus: message.data.runpodStatus,
      operationType: message.data.operationType
    });

    dispatch(updateVariationFromWebSocket({
      batchId: batchId,
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

  // Handle image tagging started
  const handleImageTaggingStarted = useCallback((message: WebSocketMessage) => {
    if (!message.data) return;

    const { inputImageId } = message.data;

    console.log('🏷️ Image tagging started:', { inputImageId });

    // Update the Redux store to mark tagging as processing
    if (inputImageId) {
      dispatch(updateImageTags({
        inputImageId,
        tags: [], // Clear existing tags
        taggingStatus: 'processing'
      }));
      console.log('✅ Tagging status set to processing for inputImageId:', inputImageId);
    }
  }, [dispatch]);

  // Handle image tagging failed
  const handleImageTaggingFailed = useCallback((message: WebSocketMessage) => {
    if (!message.data) return;

    const { inputImageId, error } = message.data;

    console.log('❌ Image tagging failed:', { inputImageId, error });

    // Update the Redux store to mark tagging as failed
    if (inputImageId) {
      dispatch(updateImageTags({
        inputImageId,
        tags: [], // Clear any partial tags
        taggingStatus: 'failed'
      }));
      console.log('✅ Tagging status set to failed for inputImageId:', inputImageId);
    }
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
      dispatch(updateImageTags({
        inputImageId,
        tags,
        taggingStatus: 'completed'
      }));
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