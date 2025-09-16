// Slider configurations used across the application
// These values should match the EditInspector component

// Original configurations for Create page
export const CREATE_SLIDER_CONFIGS = {
  creativity: {
    min: 0,
    max: 8,
    default: 3,
  },
  expressivity: {
    min: 1,
    max: 6,
    default: 2,
  },
  resemblance: {
    min: 0,
    max: 20,
    default: 6,
  },
  dynamics: {
    min: 1,
    max: 6,
    default: 6,
  },
  tilingWidth: {
    min: 16,
    max: 256,
    default: 128,
    allowedValues: [16, 32, 48, 64, 80, 96, 112, 128, 144, 160, 176, 192, 208, 224, 240, 256],
  },
  tilingHeight: {
    min: 16,
    max: 256,
    default: 128,
    allowedValues: [16, 32, 48, 64, 80, 96, 112, 128, 144, 160, 176, 192, 208, 224, 240, 256],
  },
} as const;

// Refine-specific configurations for Refine/Upscale pages
export const REFINE_SLIDER_CONFIGS = {
  creativity: {
    min: 0,
    max: 0.7,
    default: 0.3,
  },
  resemblance: {
    min: 0,
    max: 3,
    default: 0.6,
  },
  dynamics: {
    min: 1,
    max: 50,
    default: 6,
  },
  tilingWidth: {
    min: 16,
    max: 208,
    default: 128,
    allowedValues: [16, 32, 48, 64, 80, 96, 112, 128, 144, 160, 176, 192, 208],
  },
  tilingHeight: {
    min: 16,
    max: 208,
    default: 128,
    allowedValues: [16, 32, 48, 64, 80, 96, 112, 128, 144, 160, 176, 192, 208],
  },
  // Combined tiling configuration for slider
  fractility: {
    min: 0,
    max: 12, // Index-based for the slider
    default: 7, // Index 7 = 128x128
    allowedValues: [
      { value: 16, label: "16X16", width: 16, height: 16 },
      { value: 32, label: "32X32", width: 32, height: 32 },
      { value: 48, label: "48X48", width: 48, height: 48 },
      { value: 64, label: "64X64", width: 64, height: 64 },
      { value: 80, label: "80X80", width: 80, height: 80 },
      { value: 96, label: "96X96", width: 96, height: 96 },
      { value: 112, label: "112X112", width: 112, height: 112 },
      { value: 128, label: "128X128", width: 128, height: 128 },
      { value: 144, label: "144X144", width: 144, height: 144 },
      { value: 160, label: "160X160", width: 160, height: 160 },
      { value: 176, label: "176X176", width: 176, height: 176 },
      { value: 192, label: "192X192", width: 192, height: 192 },
      { value: 208, label: "208X208", width: 208, height: 208 }
    ],
  },
} as const;

// Legacy export for backward compatibility (defaults to CREATE)
export const SLIDER_CONFIGS = CREATE_SLIDER_CONFIGS;

export type SliderType = keyof typeof CREATE_SLIDER_CONFIGS;

// Helper function to map slider values to RunPod API parameters
export const mapSliderToRunPodConfig = (sliderType: SliderType, value: number) => {
  switch (sliderType) {
    case 'creativity':
      // Map creativity to CFG scale for first sampler
      return value; // Direct value
    case 'expressivity':
      // Map expressivity to CFG scale for second sampler
      return value; // Direct value
    case 'resemblance':
      // Map resemblance for image similarity control
      return value; // Direct value
    case 'dynamics':
      // Map dynamics for dynamic control
      return value; // Direct value
    case 'tilingWidth':
      // Map tiling width for resolution control
      return value; // Direct value
    case 'tilingHeight':
      // Map tiling height for resolution control
      return value; // Direct value
    default:
      return value;
  }
};

// Helper function for Refine-specific mapping
export const mapRefineSliderToRunPodConfig = (sliderType: keyof typeof REFINE_SLIDER_CONFIGS, value: number) => {
  switch (sliderType) {
    case 'creativity':
      // Map creativity (0-10) for refine operations
      return value;
    case 'resemblance':
      // Map resemblance (0-30) for refine operations
      return value;
    case 'dynamics':
      // Map dynamics (1-10) for refine operations
      return value;
    case 'tilingWidth':
      // Map tiling width for refine operations
      return value;
    case 'tilingHeight':
      // Map tiling height for refine operations
      return value;
    default:
      return value;
  }
};