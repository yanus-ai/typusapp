import React from 'react';
import { Slider } from "@/components/ui/slider";
import { Sparkle, Sparkles } from 'lucide-react';

interface SliderSectionProps {
  title: string;
  value: number;
  minValue: number;
  maxValue: number;
  onChange: (value: number) => void;
}

const SliderSection: React.FC<SliderSectionProps> = ({ title, value, minValue, maxValue, onChange }) => (
  <div className="px-4 pb-4">
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-sm font-medium">{title}</h3>
      <span className="text-xs font-medium bg-white rounded-md py-2 px-2">{value}</span>
    </div>
    <div className="flex gap-2">
      <Sparkle size={12} className='text-[#807E7E] flex-shrink-0'/>
      <Slider
        value={[value]} 
        min={minValue} 
        max={maxValue} 
        step={1} 
        onValueChange={(val) => onChange(val[0])}
        className="py-1"
      />
      <Sparkles size={12} className='text-[#807E7E] flex-shrink-0'/>
    </div>
  </div>
);

export default SliderSection;