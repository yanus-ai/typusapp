import React from 'react';
import { SLIDER_CONFIGS } from '@/constants/editInspectorSliders';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import {
  setVariations,
  setCreativity,
  setExpressivity,
  setResemblance,
} from '@/features/customization/customizationSlice';
import SliderSection from './SliderSection';

interface SettingsControlsProps {}

const SettingsControls: React.FC<SettingsControlsProps> = () => {
  const dispatch = useAppDispatch();
  
  const {
    variations,
    creativity,
    expressivity,
    resemblance,
    settingsLoading,
  } = useAppSelector(state => state.customization);


  const handleVariationsChange = (num: number) => {
    dispatch(setVariations(num));
  };

  const handleSliderChange = (type: string, value: number) => {
    switch (type) {
      case 'creativity':
        dispatch(setCreativity(value));
        break;
      case 'expressivity':
        dispatch(setExpressivity(value));
        break;
      case 'resemblance':
        dispatch(setResemblance(value));
        break;
    }
  };

  if (settingsLoading) {
    return (
      <div className="px-4 pb-4 flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        <span className="ml-2 text-sm text-gray-500">Loading settings...</span>
      </div>
    );
  }

  return (
    <>
      {/* Number of Variations */}
      <div className="px-4 pb-4">
        <h3 className="text-sm font-medium mb-2">Number of Variations</h3>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((num) => (
            <button
              key={num}
              className={`flex-1 py-2 px-3 rounded-none text-sm font-medium transition-colors ${
                variations === num
                  ? 'text-red-500 border border-red-200 bg-red-50 shadow-lg'
                  : 'text-gray-500 hover:text-black'
              }`}
              onClick={() => handleVariationsChange(num)}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
      
      {/* Sliders */}
      <SliderSection 
        title="Creativity" 
        value={creativity} 
        minValue={SLIDER_CONFIGS.creativity.min} 
        maxValue={SLIDER_CONFIGS.creativity.max} 
        onChange={(value) => handleSliderChange('creativity', value)}
      />
      <SliderSection 
        title="Expressivity" 
        value={expressivity} 
        minValue={SLIDER_CONFIGS.expressivity.min} 
        maxValue={SLIDER_CONFIGS.expressivity.max} 
        onChange={(value) => handleSliderChange('expressivity', value)}
      />
      <SliderSection 
        title="Resemblance" 
        value={resemblance} 
        minValue={SLIDER_CONFIGS.resemblance.min} 
        maxValue={SLIDER_CONFIGS.resemblance.max} 
        onChange={(value) => handleSliderChange('resemblance', value)}
      />
    </>
  );
};

export default SettingsControls;