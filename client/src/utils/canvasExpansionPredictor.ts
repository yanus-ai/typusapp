/**
 * Client-Side Canvas Expansion Predictor
 *
 * Automatically calculates and extends canvas boundaries based on outpaint operation types.
 * Based on analysis of user outpainting patterns to provide consistent and predictable expansions.
 */

// Types for better TypeScript support
export interface ImageBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OutpaintBounds {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ExpansionResult {
  canvasBounds: ImageBounds;
  outpaintBounds: OutpaintBounds;
  expansions: OutpaintBounds;
  metadata: {
    operationType: string;
    intensity: string;
    directions: string[];
    ratiosUsed: Record<string, number>;
    predictedAt: string;
  };
}

// Expansion ratio constants derived from user data analysis
const EXPANSION_RATIOS = {
  // Right outpaint: Average 2.35%, standardized values
  RIGHT: {
    MINIMAL: 0.001,      // ~0.1% for micro-adjustments
    SMALL: 0.03,         // ~3% for moderate expansions
    MEDIUM: 0.07,        // ~7% for significant expansions
    LARGE: 0.10          // ~10% for major expansions
  },

  // Top outpaint: Average 8.79%, more consistent pattern
  TOP: {
    MINIMAL: 0.001,      // ~0.1% for micro-adjustments
    SMALL: 0.05,         // ~5% for small expansions
    MEDIUM: 0.09,        // ~9% for standard expansions (matches user data)
    LARGE: 0.12          // ~12% for large expansions
  },

  // Bottom outpaint: Average 1.96%, usually minimal
  BOTTOM: {
    MINIMAL: 0.001,      // ~0.1% for micro-adjustments
    SMALL: 0.02,         // ~2% for standard expansions (matches user data)
    MEDIUM: 0.05,        // ~5% for moderate expansions
    LARGE: 0.10          // ~10% when combined with top expansion
  },

  // Left outpaint: Assumed similar to right based on symmetry
  LEFT: {
    MINIMAL: 0.001,      // ~0.1% for micro-adjustments
    SMALL: 0.03,         // ~3% for moderate expansions
    MEDIUM: 0.07,        // ~7% for significant expansions
    LARGE: 0.10          // ~10% for major expansions
  }
} as const;

// Outpaint operation types with their typical expansion patterns
const OUTPAINT_MODES = {
  // Standard directional outpaints
  'right': { directions: ['RIGHT'], intensity: 'MEDIUM' },
  'left': { directions: ['LEFT'], intensity: 'MEDIUM' },
  'top': { directions: ['TOP'], intensity: 'MEDIUM' },
  'bottom': { directions: ['BOTTOM'], intensity: 'SMALL' },

  // Corner outpaints (combine two directions)
  'top-right': { directions: ['TOP', 'RIGHT'], intensity: 'MEDIUM' },
  'top-left': { directions: ['TOP', 'LEFT'], intensity: 'MEDIUM' },
  'bottom-right': { directions: ['BOTTOM', 'RIGHT'], intensity: 'SMALL' },
  'bottom-left': { directions: ['BOTTOM', 'LEFT'], intensity: 'SMALL' },

  // Edge cases
  'horizontal': { directions: ['LEFT', 'RIGHT'], intensity: 'MEDIUM' },
  'vertical': { directions: ['TOP', 'BOTTOM'], intensity: 'MEDIUM' },
  'all': { directions: ['TOP', 'BOTTOM', 'LEFT', 'RIGHT'], intensity: 'SMALL' }
} as const;

export type OutpaintOperationType = keyof typeof OUTPAINT_MODES;
export type IntensityLevel = 'MINIMAL' | 'SMALL' | 'MEDIUM' | 'LARGE';

/**
 * Predicts and calculates standardized canvas expansion based on operation type
 * @param operationType - The type of outpaint operation
 * @param originalImageBounds - Original image dimensions
 * @param intensity - Optional intensity override
 * @returns Predicted canvas bounds and outpaint bounds
 */
export function predictCanvasExpansion(
  operationType: OutpaintOperationType,
  originalImageBounds: ImageBounds,
  intensity?: IntensityLevel
): ExpansionResult {
  // Validate input
  if (!operationType || !originalImageBounds) {
    throw new Error('operationType and originalImageBounds are required');
  }

  if (!originalImageBounds.width || !originalImageBounds.height) {
    throw new Error('originalImageBounds must include width and height');
  }

  // Get operation configuration
  const operation = OUTPAINT_MODES[operationType];
  if (!operation) {
    throw new Error(`Unknown operation type: ${operationType}`);
  }

  // Use provided intensity or default from operation
  const useIntensity = intensity || operation.intensity;

  // Calculate expansion pixels for each direction
  const expansions: OutpaintBounds = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  };

  const ratiosUsed: Record<string, number> = {};

  for (const direction of operation.directions) {
    const ratio = EXPANSION_RATIOS[direction as keyof typeof EXPANSION_RATIOS][useIntensity];
    ratiosUsed[direction.toLowerCase()] = ratio;

    switch (direction) {
      case 'TOP':
      case 'BOTTOM':
        expansions[direction.toLowerCase() as 'top' | 'bottom'] = Math.round(originalImageBounds.height * ratio);
        break;
      case 'LEFT':
      case 'RIGHT':
        expansions[direction.toLowerCase() as 'left' | 'right'] = Math.round(originalImageBounds.width * ratio);
        break;
    }
  }

  // Calculate new canvas bounds
  const canvasBounds: ImageBounds = {
    x: originalImageBounds.x - expansions.left,
    y: originalImageBounds.y - expansions.top,
    width: originalImageBounds.width + expansions.left + expansions.right,
    height: originalImageBounds.height + expansions.top + expansions.bottom
  };

  // Calculate outpaint bounds (pixels to extend)
  const outpaintBounds: OutpaintBounds = {
    top: expansions.top,
    bottom: expansions.bottom,
    left: expansions.left,
    right: expansions.right
  };

  return {
    canvasBounds,
    outpaintBounds,
    expansions,
    metadata: {
      operationType,
      intensity: useIntensity,
      directions: operation.directions,
      ratiosUsed,
      predictedAt: new Date().toISOString()
    }
  };
}

/**
 * Detects the operation type based on which directions are being extended
 * This is useful when the user manually selects an area and we need to determine the operation type
 */
export function detectOperationType(
  originalBounds: ImageBounds,
  newBounds: ImageBounds,
  tolerance: number = 5
): OutpaintOperationType | null {
  // Calculate which directions are extended
  const extendedDirections: string[] = [];

  // Check top extension
  if (newBounds.y < originalBounds.y - tolerance) {
    extendedDirections.push('TOP');
  }

  // Check bottom extension
  if ((newBounds.y + newBounds.height) > (originalBounds.y + originalBounds.height) + tolerance) {
    extendedDirections.push('BOTTOM');
  }

  // Check left extension
  if (newBounds.x < originalBounds.x - tolerance) {
    extendedDirections.push('LEFT');
  }

  // Check right extension
  if ((newBounds.x + newBounds.width) > (originalBounds.x + originalBounds.width) + tolerance) {
    extendedDirections.push('RIGHT');
  }

  // Find matching operation type
  for (const [operationType, config] of Object.entries(OUTPAINT_MODES)) {
    const configDirections = [...config.directions].sort();
    const detectedDirections = [...extendedDirections].sort();

    if (JSON.stringify(configDirections) === JSON.stringify(detectedDirections)) {
      return operationType as OutpaintOperationType;
    }
  }

  // Handle special cases
  if (extendedDirections.includes('LEFT') && extendedDirections.includes('RIGHT') && extendedDirections.length === 2) {
    return 'horizontal';
  }

  if (extendedDirections.includes('TOP') && extendedDirections.includes('BOTTOM') && extendedDirections.length === 2) {
    return 'vertical';
  }

  if (extendedDirections.length === 4) {
    return 'all';
  }

  // Default to single direction if only one detected
  if (extendedDirections.length === 1) {
    const direction = extendedDirections[0].toLowerCase() as OutpaintOperationType;
    return direction;
  }

  return null;
}

/**
 * Auto-extends canvas boundaries when user makes a selection
 * This is the main function to use for automatically expanding canvas boundaries
 */
export function autoExtendCanvasBounds(
  operationType: OutpaintOperationType,
  originalImageBounds: ImageBounds,
  intensity?: IntensityLevel
): { canvasBounds: ImageBounds; outpaintBounds: OutpaintBounds } {
  const prediction = predictCanvasExpansion(operationType, originalImageBounds, intensity);

  console.log('🔮 Auto-extending canvas bounds:', {
    operationType,
    original: `${originalImageBounds.width}x${originalImageBounds.height}`,
    expanded: `${prediction.canvasBounds.width}x${prediction.canvasBounds.height}`,
    expansions: prediction.expansions,
    ratiosUsed: prediction.metadata.ratiosUsed
  });

  return {
    canvasBounds: prediction.canvasBounds,
    outpaintBounds: prediction.outpaintBounds
  };
}

/**
 * Get available operation types with their descriptions
 */
export function getAvailableOperations(): Record<OutpaintOperationType, {
  directions: string[];
  defaultIntensity: string;
  description: string;
}> {
  const result = {} as Record<OutpaintOperationType, {
    directions: string[];
    defaultIntensity: string;
    description: string;
  }>;

  for (const [key, operation] of Object.entries(OUTPAINT_MODES)) {
    result[key as OutpaintOperationType] = {
      directions: operation.directions,
      defaultIntensity: operation.intensity,
      description: `Expand ${operation.directions.join(' and ').toLowerCase()} with ${operation.intensity.toLowerCase()} intensity`
    };
  }

  return result;
}

/**
 * Get expansion ratio information for debugging/analysis
 */
export function getExpansionInfo() {
  return {
    expansionRatios: EXPANSION_RATIOS,
    operationModes: OUTPAINT_MODES,
    availableIntensities: ['MINIMAL', 'SMALL', 'MEDIUM', 'LARGE'] as const,
    description: 'Expansion ratios derived from user data analysis (14 outpaint operations)'
  };
}

/**
 * Utility function to calculate percentage expansion for display purposes
 */
export function calculateExpansionPercentages(
  originalBounds: ImageBounds,
  expansions: OutpaintBounds
): { width: number; height: number } {
  const widthExpansion = ((expansions.left + expansions.right) / originalBounds.width) * 100;
  const heightExpansion = ((expansions.top + expansions.bottom) / originalBounds.height) * 100;

  return {
    width: Number(widthExpansion.toFixed(2)),
    height: Number(heightExpansion.toFixed(2))
  };
}