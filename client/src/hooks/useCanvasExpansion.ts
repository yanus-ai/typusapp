import { useCallback } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import {
  autoExpandCanvasForOutpaint,
  detectAndExpandCanvas,
  setCanvasBounds
} from '@/features/tweak/tweakSlice';
import {
  OutpaintOperationType,
  IntensityLevel,
  predictCanvasExpansion,
  detectOperationType,
  getAvailableOperations,
  calculateExpansionPercentages,
  type ImageBounds
} from '@/utils/canvasExpansionPredictor';

/**
 * Custom hook for canvas expansion prediction and automatic boundary extension
 * This provides an easy interface for components to auto-expand canvas boundaries
 */
export function useCanvasExpansion() {
  const dispatch = useAppDispatch();
  const { canvasBounds, originalImageBounds } = useAppSelector(state => state.tweak);

  /**
   * Automatically expand canvas based on operation type
   * This is the main function to use when a user selects an outpaint operation
   */
  const expandCanvasForOperation = useCallback((
    operationType: OutpaintOperationType,
    intensity?: IntensityLevel
  ) => {
    dispatch(autoExpandCanvasForOutpaint({ operationType, intensity }));
  }, [dispatch]);

  /**
   * Detect operation type and auto-expand canvas based on manual selection
   * Useful when user manually selects an area and you want to standardize it
   */
  const expandCanvasFromSelection = useCallback((
    newBounds: ImageBounds,
    tolerance: number = 5,
    intensity?: IntensityLevel
  ) => {
    dispatch(detectAndExpandCanvas({ newBounds, tolerance, intensity }));
  }, [dispatch]);

  /**
   * Predict expansion without applying it (for previews)
   * Returns the predicted canvas bounds and metadata
   */
  const previewExpansion = useCallback((
    operationType: OutpaintOperationType,
    intensity?: IntensityLevel
  ) => {
    try {
      return predictCanvasExpansion(operationType, originalImageBounds, intensity);
    } catch (error) {
      console.error('Failed to preview expansion:', error);
      return null;
    }
  }, [originalImageBounds]);

  /**
   * Detect what operation type would match the current canvas bounds
   * Useful for understanding what expansion was applied
   */
  const detectCurrentOperation = useCallback((tolerance: number = 5) => {
    try {
      return detectOperationType(originalImageBounds, canvasBounds, tolerance);
    } catch (error) {
      console.error('Failed to detect operation:', error);
      return null;
    }
  }, [originalImageBounds, canvasBounds]);

  /**
   * Calculate expansion percentages for the current canvas
   * Returns width and height expansion percentages
   */
  const getCurrentExpansionPercentages = useCallback(() => {
    if (!originalImageBounds || !canvasBounds) return null;

    const expansions = {
      top: Math.max(0, originalImageBounds.y - canvasBounds.y),
      bottom: Math.max(0, (canvasBounds.y + canvasBounds.height) - (originalImageBounds.y + originalImageBounds.height)),
      left: Math.max(0, originalImageBounds.x - canvasBounds.x),
      right: Math.max(0, (canvasBounds.x + canvasBounds.width) - (originalImageBounds.x + originalImageBounds.width))
    };

    return calculateExpansionPercentages(originalImageBounds, expansions);
  }, [originalImageBounds, canvasBounds]);

  /**
   * Reset canvas to original image bounds
   * Useful for clearing any expansions
   */
  const resetCanvasToOriginal = useCallback(() => {
    if (originalImageBounds) {
      dispatch(setCanvasBounds(originalImageBounds));
    }
  }, [dispatch, originalImageBounds]);

  /**
   * Get available operation types with descriptions
   * Useful for building UI controls
   */
  const getOperationTypes = useCallback(() => {
    return getAvailableOperations();
  }, []);

  /**
   * Check if canvas has been expanded beyond original bounds
   */
  const isCanvasExpanded = useCallback(() => {
    if (!originalImageBounds || !canvasBounds) return false;

    return (
      canvasBounds.x < originalImageBounds.x ||
      canvasBounds.y < originalImageBounds.y ||
      canvasBounds.width > originalImageBounds.width ||
      canvasBounds.height > originalImageBounds.height
    );
  }, [originalImageBounds, canvasBounds]);

  /**
   * Get the current outpaint bounds (pixels extended in each direction)
   */
  const getCurrentOutpaintBounds = useCallback(() => {
    if (!originalImageBounds || !canvasBounds) return null;

    return {
      top: Math.max(0, originalImageBounds.y - canvasBounds.y),
      bottom: Math.max(0, (canvasBounds.y + canvasBounds.height) - (originalImageBounds.y + originalImageBounds.height)),
      left: Math.max(0, originalImageBounds.x - canvasBounds.x),
      right: Math.max(0, (canvasBounds.x + canvasBounds.width) - (originalImageBounds.x + originalImageBounds.width))
    };
  }, [originalImageBounds, canvasBounds]);

  return {
    // Main functions
    expandCanvasForOperation,
    expandCanvasFromSelection,
    previewExpansion,
    resetCanvasToOriginal,

    // Analysis functions
    detectCurrentOperation,
    getCurrentExpansionPercentages,
    getCurrentOutpaintBounds,
    isCanvasExpanded,

    // Utility functions
    getOperationTypes,

    // Current state
    canvasBounds,
    originalImageBounds,

    // Computed properties
    isExpanded: isCanvasExpanded(),
    currentExpansionPercentages: getCurrentExpansionPercentages(),
    currentOutpaintBounds: getCurrentOutpaintBounds(),
    currentOperationType: detectCurrentOperation()
  };
}