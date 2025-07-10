import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { SquarePen, ImageIcon, ChevronRight, Layers2, MinusIcon, Palette } from 'lucide-react';
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
} from '@/features/customization/customizationSlice';
import CategorySelector from './CategorySelector';
import SubCategorySelector from './SubcategorySelector';
import SliderSection from './SliderSection';
import ExpandableSection from './ExpandableSection';

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
              <div className="grid grid-cols-3 gap-2 pb-4">
                {currentData.type?.map((option: any) => (
                  <CategorySelector
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
              <SubCategorySelector
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
              <SubCategorySelector
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
              <SubCategorySelector
                data={currentData.context}
                selectedCategory={selections.context}
                selectedOption={selections.context}
                onSelectionChange={(category, option) => 
                  handleSelectionChange('context', { category, option })
                }
              />
            </ExpandableSection>
            
            {/* Style Section */}
            <ExpandableSection 
              title="Style" 
              expanded={expandedSections.style} 
              onToggle={() => handleSectionToggle('style')} 
            >
              <div className="grid grid-cols-3 gap-2 pb-4">
                {currentData.style?.map((option: any) => (
                  <CategorySelector
                    key={option.id}
                    title={option.name}
                    imageUrl={option.imageUrl}
                    selected={selections.style === option.id}
                    onSelect={() => handleSelectionChange('style', option.id)}
                    showImage={true}
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
              <div className="grid grid-cols-3 gap-2 pb-4">
                {currentData.weather?.map((option: any) => (
                  <CategorySelector
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
              <div className="grid grid-cols-3 gap-2 pb-4">
                {currentData.lighting?.map((option: any) => (
                  <CategorySelector
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
          /* Art Style Selection with Subcategories */
          <div className="px-4">
            <h3 className="text-sm font-medium mb-2">Art Style</h3>
            <div className="space-y-4">
              {Object.entries(currentData).map(([subcategoryKey, options]) => (
                <div key={subcategoryKey}>
                  <h4 className="text-xs font-medium mb-2 text-gray-600 uppercase">
                    {subcategoryKey.replace('-', ' ')}
                  </h4>
                  <div className="grid grid-cols-3 gap-2 pb-4">
                    {(options as any[]).map((option: any) => (
                      <CategorySelector
                        key={option.id}
                        title={option.displayName}
                        selected={selections[subcategoryKey] === option.id}
                        onSelect={() => handleSelectionChange(subcategoryKey, option.id)}
                        showImage={option.imageUrl ? true : false}
                        imageUrl={option.imageUrl}
                        className="aspect-auto"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default EditInspector;