// Slider configurations used across the application
// These values should match the EditInspector component

export const SLIDER_CONFIGS = {
  creativity: {
    min: 2,
    max: 4,
    default: 3,
  },
  expressivity: {
    min: 1,
    max: 6,
    default: 2,
  },
  resemblance: {
    min: 1,
    max: 10,
    default: 3,
  },
} as const;

export type SliderType = keyof typeof SLIDER_CONFIGS;

// Helper function to map slider values to RunPod API parameters
export const mapSliderToRunPodConfig = (sliderType: SliderType, value: number) => {
  const config = SLIDER_CONFIGS[sliderType];
  
  switch (sliderType) {
    case 'creativity':
      // Map creativity (2-4) to CFG scale for first sampler
      return value; // Maps 2-4 to 5-10
    case 'expressivity':
      // Map expressivity (1-6) to CFG scale for second sampler
      return value; // Maps 1-6 to 1.5-9
    case 'resemblance':
      // Resemblance can be used directly or with custom mapping
      return value; // Direct value 1-10
    default:
      return value;
  }
};