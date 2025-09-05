// Slider configurations used across the application
// These values should match the EditInspector component

export const SLIDER_CONFIGS = {
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
  fractality: {
    min: 1,
    max: 5,
    default: 5,
  },
} as const;

export type SliderType = keyof typeof SLIDER_CONFIGS;

// Helper function to map slider values to RunPod API parameters
export const mapSliderToRunPodConfig = (sliderType: SliderType, value: number) => {
  const config = SLIDER_CONFIGS[sliderType];
  
  switch (sliderType) {
    case 'creativity':
      // Map creativity (0-8) to CFG scale for first sampler
      return value; // Maps 0-8 to CFG scale
    case 'expressivity':
      // Map expressivity (1-6) to CFG scale for second sampler
      return value; // Maps 1-6 to 1.5-9
    case 'resemblance':
      // Map resemblance (0-20) for image similarity control
      return value; // Direct value 0-20
    case 'dynamics':
      // Map dynamics (1-6) for dynamic control
      return value; // Direct value 1-6
    case 'fractality':
      // Map fractality (1-5) for fractal properties
      return value; // Direct value 1-5
    default:
      return value;
  }
};