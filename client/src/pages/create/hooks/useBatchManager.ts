/**
 * Unified Batch Management Hook
 * 
 * This hook provides a clean interface for managing batch state, placeholders,
 * and session synchronization. It handles:
 * - Placeholder creation and cleanup
 * - Batch state synchronization
 * - Session refresh coordination
 */

import { useCallback, useRef, useEffect } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { addProcessingCreateVariations } from '@/features/images/historyImagesSlice';
import { startGeneration, stopGeneration } from '@/features/create/createUISlice';
import { getSession } from '@/features/sessions/sessionSlice';

interface BatchManagerOptions {
  onBatchCreated?: (batchId: number) => void;
  onBatchError?: (error: string) => void;
}

export const useBatchManager = (options: BatchManagerOptions = {}) => {
  const dispatch = useAppDispatch();
  const currentSession = useAppSelector(state => state.sessions.currentSession);
  const generatingBatchId = useAppSelector(state => state.createUI.generatingBatchId);
  
  // Track active placeholders to prevent duplicates
  const activePlaceholdersRef = useRef<Set<number>>(new Set());
  const sessionRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Create placeholders for a batch
   */
  const createPlaceholders = useCallback((
    batchId: number,
    totalVariations: number,
    prompt?: string,
    settingsSnapshot?: any,
    aspectRatio?: string
  ) => {
    // Prevent duplicate placeholders
    if (activePlaceholdersRef.current.has(batchId)) {
      console.warn(`Placeholders already exist for batch ${batchId}`);
      return;
    }

    const placeholderIds = Array.from({ length: totalVariations }, (_, i) => -(batchId + i));
    
    dispatch(addProcessingCreateVariations({
      batchId,
      totalVariations,
      imageIds: placeholderIds,
      prompt,
      settingsSnapshot,
      aspectRatio
    }));

    activePlaceholdersRef.current.add(batchId);
    
    dispatch(startGeneration({
      batchId,
      inputImageId: 0, // Will be updated when real batch is created
      inputImagePreviewUrl: ''
    }));
  }, [dispatch]);

  /**
   * Replace temp placeholders with real batch placeholders
   */
  const replacePlaceholders = useCallback((
    tempBatchId: number,
    realBatchId: number,
    totalVariations: number,
    imageIds: number[],
    prompt?: string,
    settingsSnapshot?: any,
    aspectRatio?: string,
    inputImageId?: number,
    inputImagePreviewUrl?: string
  ) => {
    // Remove temp placeholders
    dispatch(addProcessingCreateVariations({
      batchId: tempBatchId,
      totalVariations,
      imageIds: []
    }));
    activePlaceholdersRef.current.delete(tempBatchId);

    // Add real placeholders or use provided image IDs
    const idsToAdd = imageIds.length > 0 
      ? imageIds 
      : Array.from({ length: totalVariations }, (_, i) => -(realBatchId + i));

    dispatch(addProcessingCreateVariations({
      batchId: realBatchId,
      totalVariations,
      imageIds: idsToAdd,
      prompt,
      settingsSnapshot,
      aspectRatio
    }));

    activePlaceholdersRef.current.add(realBatchId);

    dispatch(startGeneration({
      batchId: realBatchId,
      inputImageId: inputImageId || 0,
      inputImagePreviewUrl: inputImagePreviewUrl || ''
    }));

    // Refresh session to include new batch
    refreshSession();
  }, [dispatch]);

  /**
   * Cleanup placeholders for a batch
   */
  const cleanupPlaceholders = useCallback((batchId: number) => {
    dispatch(stopGeneration());
    dispatch(addProcessingCreateVariations({
      batchId,
      totalVariations: 0,
      imageIds: []
    }));
    activePlaceholdersRef.current.delete(batchId);
  }, [dispatch]);

  /**
   * Refresh current session (debounced)
   */
  const refreshSession = useCallback(() => {
    if (!currentSession?.id) return;

    // Clear existing timeout
    if (sessionRefreshTimeoutRef.current) {
      clearTimeout(sessionRefreshTimeoutRef.current);
    }

    // Debounce session refresh to avoid excessive API calls
    sessionRefreshTimeoutRef.current = setTimeout(() => {
      dispatch(getSession(currentSession.id));
      sessionRefreshTimeoutRef.current = null;
    }, 500);
  }, [dispatch, currentSession?.id]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (sessionRefreshTimeoutRef.current) {
        clearTimeout(sessionRefreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    createPlaceholders,
    replacePlaceholders,
    cleanupPlaceholders,
    refreshSession,
    activeBatchId: generatingBatchId
  };
};

