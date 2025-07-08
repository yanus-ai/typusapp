import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SquarePen, ImageIcon, ChevronRight, Layers2, MinusIcon, Palette, Sparkle, Sparkles } from 'lucide-react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import {
  setSelectedStyle,
  setVariations,
  setCreativity,
  setExpressivity,
  setResemblance,
  setSelection,
  toggleSection,
  fetchCustomizationOptions
} from '@/features/customization/customizationslice';
import StyleOption from './StyleOption';
// import CategorySelector from './CategorySelector';

interface EditInspectorProps {
  imageUrl?: string;
}

const EditInspector: React.FC<EditInspectorProps> = ({ imageUrl }) => {
  const dispatch = useAppDispatch();
  
  // Redux selectors
  const {
    selectedStyle,
    variations,
    creativity,
    expressivity,
    resemblance,
    selections,
    expandedSections,
    availableOptions,
    optionsLoading
  } = useAppSelector(state => state.customization);
  
  const [minimized, setMinimized] = React.useState(false);

  // Load customization options on mount
  useEffect(() => {
    if (!availableOptions) {
      dispatch(fetchCustomizationOptions());
    }
  }, [dispatch, availableOptions]);

  const handleStyleChange = (style: 'photorealistic' | 'art') => {
    dispatch(setSelectedStyle(style));
  };

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

  const handleSelectionChange = (category: string, value: any) => {
    dispatch(setSelection({ category, value }));
  };

  const handleSectionToggle = (section: string) => {
    dispatch(toggleSection(section));
  };

  if (minimized) {
    return (
      <div className="h-full bg-gray-100 border-r border-gray-200 w-12 flex flex-col items-center py-4 rounded-md">
        <Button variant="ghost" size="icon" onClick={() => setMinimized(false)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (optionsLoading) {
    return (
      <div className="h-full bg-gray-100 border-r border-gray-200 min-w-[321px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2"></div>
      </div>
    );
  }

  const currentData = selectedStyle === 'photorealistic' 
    ? availableOptions?.photorealistic 
    : availableOptions?.art;

  return (
    <div className="h-full bg-gray-100 border-r border-gray-200 w-[322px] flex flex-col rounded-md custom-scrollbar">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="font-medium">Edit Inspector</h2>
        <Button variant="ghost" size="icon" onClick={() => setMinimized(true)}>
          <MinusIcon className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="overflow-y-auto flex-1">
        {/* Image Preview */}
        <div className="p-4">
          <div className="relative rounded-md overflow-hidden h-[170px] w-[274px] bg-gray-200">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt="Current preview" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-300 select-none">
                <span className="text-gray-500">No Image</span>
              </div>
            )}
            <div className="absolute bottom-2 right-2 flex gap-1">
              <Button size="icon" variant="secondary" className="h-7 w-7 text-white !bg-white/10 backdrop-opacity-70 rounded-lg">
                <Layers2 className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="secondary" className="h-7 w-7 text-white !bg-white/10 backdrop-opacity-70 rounded-lg">
                <SquarePen className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Style Selection */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-medium mb-2">Settings</h3>
          <div className="flex mb-4 bg-[#EFECEC] rounded-xl">
            <Button 
              className={`w-1/2 py-1.5 px-2 rounded-xl flex items-center justify-center gap-2 ${
                selectedStyle === 'photorealistic' 
                  ? 'bg-black text-white hover:bg-black hover:text-white' 
                  : 'bg-transparent text-gray-500 hover:bg-gray-[#EFECEC] hover:text-gray-500 shadow-none'
              }`}
              onClick={() => handleStyleChange('photorealistic')}
            >
              <ImageIcon size={18} />
              Photorealistic
            </Button>
            <Button
              className={`w-1/2 py-1.5 px-2 rounded-xl flex items-center justify-center gap-2 ${
                selectedStyle === 'art' 
                  ? 'bg-black text-white hover:bg-black hover:text-white' 
                  : 'bg-transparent text-gray-500 hover:bg-gray-[#EFECEC] hover:text-gray-500 shadow-none'
              }`}
              onClick={() => handleStyleChange('art')}
            >
              <Palette size={18} />
              Art
            </Button>
          </div>
        </div>
        
        {/* Number of Variations */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-medium mb-2">Number of Variations</h3>
          <div className="flex mb-4 bg-[#EFECEC] rounded-xl">
            {[1, 2, 3, 4].map((num) => (
              <Button 
                key={num}
                className={`flex-1 py-1.5 px-2 rounded-xl ${
                  variations === num 
                    ? 'bg-white text-black hover:bg-white hover:text-black' 
                    : 'bg-transparent text-gray-500 hover:bg-gray-[#EFECEC] hover:text-gray-500 shadow-none'
                }`}
                onClick={() => handleVariationsChange(num)}
              >
                {num}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Sliders */}
        <SliderSection 
          title="Creativity" 
          value={creativity} 
          onChange={(value) => handleSliderChange('creativity', value)} 
        />
        <SliderSection 
          title="Expressivity" 
          value={expressivity} 
          onChange={(value) => handleSliderChange('expressivity', value)} 
        />
        <SliderSection 
          title="Resemblance" 
          value={resemblance} 
          onChange={(value) => handleSliderChange('resemblance', value)} 
        />
        
        {/* Conditional Content Based on Style */}
        {selectedStyle === 'photorealistic' && currentData ? (
          <>
            {/* Type Section */}
            <ExpandableSection 
              title="Type" 
              expanded={expandedSections.type} 
              onToggle={() => handleSectionToggle('type')} 
            >
              <div className="grid grid-cols-2 gap-2 pb-4">
                {currentData.type?.map((option: any) => (
                  <StyleOption
                    key={option.id}
                    title={option.name}
                    selected={selections.type === option.id}
                    onSelect={() => handleSelectionChange('type', option.id)}
                    showImage={false}
                    className="aspect-auto"
                  />
                ))}
              </div>
            </ExpandableSection>
            
            {/* Walls Section */}
            <ExpandableSection 
              title="Walls" 
              expanded={expandedSections.walls} 
              onToggle={() => handleSectionToggle('walls')} 
            >
              <WallsFloorSelector
                data={currentData.walls}
                selectedCategory={selections.walls?.category}
                selectedOption={selections.walls?.option}
                onSelectionChange={(category, option) => 
                  handleSelectionChange('walls', { category, option })
                }
              />
            </ExpandableSection>
            
            {/* Floors Section */}
            <ExpandableSection 
              title="Floors" 
              expanded={expandedSections.floors} 
              onToggle={() => handleSectionToggle('floors')} 
            >
              <WallsFloorSelector
                data={currentData.floors}
                selectedCategory={selections.floors?.category}
                selectedOption={selections.floors?.option}
                onSelectionChange={(category, option) => 
                  handleSelectionChange('floors', { category, option })
                }
              />
            </ExpandableSection>
            
            {/* Context Section */}
            <ExpandableSection 
              title="Context" 
              expanded={expandedSections.context} 
              onToggle={() => handleSectionToggle('context')} 
            >
              <div className="grid grid-cols-2 gap-2 pb-4">
                {currentData.context?.map((option: any) => (
                  <StyleOption
                    key={option.id}
                    title={option.name}
                    selected={selections.context === option.id}
                    onSelect={() => handleSelectionChange('context', option.id)}
                    showImage={false}
                    className="aspect-auto"
                  />
                ))}
              </div>
            </ExpandableSection>
            
            {/* Style Section */}
            <ExpandableSection 
              title="Style" 
              expanded={expandedSections.style} 
              onToggle={() => handleSectionToggle('style')} 
            >
              <div className="grid grid-cols-2 gap-2 pb-4">
                {currentData.style?.map((option: any) => (
                  <StyleOption
                    key={option.id}
                    title={option.name}
                    selected={selections.style === option.id}
                    onSelect={() => handleSelectionChange('style', option.id)}
                    showImage={false}
                    className="aspect-auto"
                  />
                ))}
              </div>
            </ExpandableSection>
            
            {/* Weather Section */}
            <ExpandableSection 
              title="Weather" 
              expanded={expandedSections.weather} 
              onToggle={() => handleSectionToggle('weather')} 
            >
              <div className="grid grid-cols-2 gap-2 pb-4">
                {currentData.weather?.map((option: any) => (
                  <StyleOption
                    key={option.id}
                    title={option.name}
                    selected={selections.weather === option.id}
                    onSelect={() => handleSelectionChange('weather', option.id)}
                    showImage={false}
                    className="aspect-auto"
                  />
                ))}
              </div>
            </ExpandableSection>
            
            {/* Lighting Section */}
            <ExpandableSection 
              title="Lighting" 
              expanded={expandedSections.lighting} 
              onToggle={() => handleSectionToggle('lighting')} 
            >
              <div className="grid grid-cols-2 gap-2 pb-4">
                {currentData.lighting?.map((option: any) => (
                  <StyleOption
                    key={option.id}
                    title={option.name}
                    selected={selections.lighting === option.id}
                    onSelect={() => handleSelectionChange('lighting', option.id)}
                    showImage={false}
                    className="aspect-auto"
                  />
                ))}
              </div>
            </ExpandableSection>
          </>
        ) : selectedStyle === 'art' && currentData ? (
          /* Art Style Selection */
          <div className="px-4">
            <h3 className="text-sm font-medium mb-2">Art Style</h3>
            <div className="grid grid-cols-2 gap-2 pb-4">
              {currentData.map((option: any) => (
                <StyleOption
                  key={option.id}
                  title={option.name}
                  selected={selections.artStyle === option.id}
                  onSelect={() => handleSelectionChange('artStyle', option.id)}
                  showImage={false}
                  className="aspect-auto"
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// Helper Components
interface SliderSectionProps {
  title: string;
  value: number;
  onChange: (value: number) => void;
}

const SliderSection: React.FC<SliderSectionProps> = ({ title, value, onChange }) => (
  <div className="px-4 pb-4">
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-sm font-medium">{title}</h3>
      <span className="text-xs font-medium bg-white rounded-md py-2 px-2">{value}</span>
    </div>
    <div className="flex gap-2">
      <Sparkle size={12} className='text-[#807E7E] flex-shrink-0'/>
      <Slider
        value={[value]} 
        min={1} 
        max={5} 
        step={1} 
        onValueChange={(val) => onChange(val[0])}
        className="py-1"
      />
      <Sparkles size={12} className='text-[#807E7E] flex-shrink-0'/>
    </div>
  </div>
);

interface WallsFloorSelectorProps {
  data: any;
  selectedCategory?: string;
  selectedOption?: string;
  onSelectionChange: (category: string, option: string) => void;
}

const WallsFloorSelector: React.FC<WallsFloorSelectorProps> = ({
  data,
  selectedCategory,
  selectedOption,
  onSelectionChange
}) => {
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);

  // Initialize with first category and first option on mount
  React.useEffect(() => {
    const categories = Object.keys(data);
    if (categories.length > 0) {
      const firstCategory = categories[0];
      setActiveCategory(selectedCategory || firstCategory);
      
      // If no option is selected and we have options in the first category, select the first one
      if (!selectedOption && data[firstCategory] && data[firstCategory].length > 0) {
        const firstOption = data[firstCategory][0];
        onSelectionChange(selectedCategory || firstCategory, firstOption.id);
      }
    }
  }, [data, selectedCategory, selectedOption, onSelectionChange]);

  const handleCategorySelect = (categoryId: string) => {
    setActiveCategory(categoryId);
    
    // Auto-select first option when switching categories
    if (data[categoryId] && data[categoryId].length > 0) {
      const firstOption = data[categoryId][0];
      onSelectionChange(categoryId, firstOption.id);
    }
  };

  const handleOptionSelect = (optionId: string) => {
    if (activeCategory) {
      onSelectionChange(activeCategory, optionId);
    }
  };

  const currentOptions = activeCategory ? data[activeCategory] : null;

  return (
    <div className="grid grid-cols-2 gap-3 pb-2">
      {/* Left Panel - Categories */}
      <div className="overflow-y-auto py-2">
        {Object.keys(data).map((categoryKey) => (
          <button
            key={categoryKey}
            onClick={() => handleCategorySelect(categoryKey)}
            className={`w-full py-3 text-left text-xs font-medium transition-all cursor-pointer ${
              activeCategory === categoryKey
                ? 'font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {categoryKey.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Right Panel - Options with Images */}
      <div className="relative h-full overflow-hidden">
        {currentOptions ? (
          <div className="h-full overflow-y-auto absolute inset-0">
            <div className="grid grid-cols-1 gap-3 py-2">
              {currentOptions.map((option: any) => (
                <div
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  className={`relative cursor-pointer transition-all duration-200`}>
                  {/* Image */}
                  {option.imageUrl && (
                    <div className={`aspect-square border w-[57px] h-[57px] mx-auto rounded-lg shadow overflow-hidden transition-all mb-2 hover:scale-105 ${
                      selectedOption === option.id
                        ? 'border-black border-2 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <img 
                        src={option.imageUrl} 
                        alt={option.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback for missing images - show placeholder
                          e.currentTarget.src = '/images/placeholder.jpg';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Title Overlay */}
                  <div>
                    <p className={`text-xs text-center leading-tight uppercase line-clamp-2 ${
                      selectedOption === option.id
                        ? 'font-medium '
                        : 'font-normal text-gray-700'
                    }`}>
                      {option.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p className="text-sm">Select a category to view options</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface ExpandableSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = ({ title, expanded, onToggle, children }) => {
  return (
    <div className="px-4 border-t border-gray-200">
      <div 
        className="py-3 flex justify-between items-center cursor-pointer"
        onClick={onToggle}
      >
        <h3 className="text-sm font-medium">{title}</h3>
        <ChevronRight 
          className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} 
        />
      </div>
      {expanded && children && <div>{children}</div>}
    </div>
  );
};

export default EditInspector;