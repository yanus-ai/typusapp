import React from 'react';
import { Button } from "@/components/ui/button";
import { SquarePen, ChevronDown, ChevronUp } from 'lucide-react';
import { SLIDER_CONFIGS } from '@/constants/editInspectorSliders';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
// Using simple text array for AI materials instead of complex relationships
import {
  setCreativity,
  setResemblance,
  setDynamics,
  setFractality,
  setSelection,
  toggleSection,
} from '@/features/customization/customizationSlice';
import {
  addLocalMaterial,
} from '@/features/refine/refineMaterialsSlice';
import {
  updateScaleFactor,
  toggleMatchColor
} from '@/features/refine/refineSlice';
import CategorySelector from '../create/CategorySelector';
import SubCategorySelector from '../create/SubcategorySelector';
import SliderSection from '../create/SliderSection';
import ExpandableSection from '../create/ExpandableSection';

interface RefineEditInspectorProps {
  imageUrl?: string;
  processedUrl?: string;
  inputImageId?: number;
  setIsPromptModalOpen: (isOpen: boolean) => void;
  editInspectorMinimized: boolean;
  setEditInspectorMinimized: (editInspectorMinimized: boolean) => void;
}

const RefineEditInspector: React.FC<RefineEditInspectorProps> = ({
  imageUrl,
  editInspectorMinimized,
  setEditInspectorMinimized
}) => {
  const dispatch = useAppDispatch();
  // Redux selectors - Customization for Create-page style options
  const {
    selectedStyle,
    creativity,
    resemblance,
    dynamics,
    fractality,
    selections,
    expandedSections,
    availableOptions,
    optionsLoading
  } = useAppSelector(state => state.customization);

  // Redux selectors - Refine specific settings
  const {
    settings,
    error
  } = useAppSelector(state => state.refine);

  // Get the current expanded sections based on selected style
  const currentExpandedSections: Record<string, boolean> = expandedSections[selectedStyle] as unknown as Record<string, boolean>;


  const handleSliderChange = (type: string, value: number) => {
    switch (type) {
      case 'creativity':
        dispatch(setCreativity(value));
        break;
      case 'resemblance':
        dispatch(setResemblance(value));
        break;
      case 'dynamics':
        dispatch(setDynamics(value));
        break;
      case 'fractality':
        dispatch(setFractality(value));
        break;
    }
  };


  // Simple material selection handlers
  const handleSectionToggle = (section: string) => {
    dispatch(toggleSection(section));
  };

  const handleSelectionChange = (category: string, value: any) => {
    dispatch(setSelection({ category, value }));
  };

  const handleMaterialSelect = (option: any, type: string, subcategory?: string) => {
    // Convert the selected option to a simple text string
    let materialText = '';

    if (type === 'customization') {
      // For customization options like Type, Style, Weather, Lighting
      // Include subcategory prefix to match Create page format
      const subcategoryPrefix = subcategory ? subcategory.toUpperCase() : '';
      const optionName = option.displayName;
      materialText = subcategoryPrefix ? `${subcategoryPrefix} ${optionName}` : optionName;
    } else if (type === 'material') {
      // For material options like Walls, Floors, Context
      // Include subcategory prefix to match Create page format  
      const subcategoryPrefix = subcategory ? subcategory.toUpperCase() : '';
      const optionName = option.displayName;
      materialText = subcategoryPrefix ? `${subcategoryPrefix} ${optionName}` : optionName;
    }

    if (materialText) {
      // Add to local materials array (no API call)
      dispatch(addLocalMaterial(materialText));
    }
  };

  const handleScaleFactorChange = (scaleFactor: number) => {
    dispatch(updateScaleFactor(scaleFactor));
  };


  if (optionsLoading) {
    return (
      <div className="h-full bg-gray-100 border-r border-gray-200 min-w-[321px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2"></div>
      </div>
    );
  }


  return (
    <div className={`h-full bg-site-white w-[322px] flex flex-col rounded-md custom-scrollbar transition-all ${editInspectorMinimized ? 'translate-y-[calc(100vh-122px)] absolute left-[100px]' : 'translate-y-0'}`}>
      <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => setEditInspectorMinimized(!editInspectorMinimized)}>
        <h2 className="font-medium">Edit Inspector</h2>
        <Button variant="ghost" size="icon">
          {
            editInspectorMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
          }
        </Button>
      </div>
      
      <div className="overflow-y-auto flex-1 my-2">
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
                <SquarePen className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        


        {/* Scale Factor Selection */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-medium mb-2">Scale Factor</h3>
          <div className="flex gap-1 bg-[#EFECEC] rounded-xl p-1">
            {[2, 3, 4].map((scale) => (
              <Button 
                key={scale}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs ${
                  settings.scaleFactor === scale 
                    ? 'bg-white text-black hover:bg-white hover:text-black shadow-sm' 
                    : 'bg-transparent text-gray-500 hover:bg-gray-200/50 hover:text-gray-600 shadow-none'
                }`}
                onClick={() => handleScaleFactorChange(scale)}
              >
                {scale}x
              </Button>
            ))}
          </div>
        </div>
        
        
        
        {/* Create-style Sliders */}
        <SliderSection 
          title="Creativity" 
          value={creativity} 
          minValue={SLIDER_CONFIGS.creativity.min} 
          maxValue={SLIDER_CONFIGS.creativity.max} 
          onChange={(value) => handleSliderChange('creativity', value)}
        />
        <SliderSection 
          title="Resemblance" 
          value={resemblance} 
          minValue={SLIDER_CONFIGS.resemblance.min} 
          maxValue={SLIDER_CONFIGS.resemblance.max} 
          onChange={(value) => handleSliderChange('resemblance', value)}
        />

        {/* Advanced Settings - Always Expanded */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-medium mb-3">Advanced Settings</h3>
          <div className="space-y-4">
            <SliderSection
              title="Dynamics"
              value={dynamics}
              minValue={SLIDER_CONFIGS.dynamics.min}
              maxValue={SLIDER_CONFIGS.dynamics.max}
              onChange={(value) => handleSliderChange('dynamics', value)}
            />
            <SliderSection
              title="Fractality"
              value={fractality}
              minValue={SLIDER_CONFIGS.fractality.min}
              maxValue={SLIDER_CONFIGS.fractality.max}
              onChange={(value) => handleSliderChange('fractality', value)}
            />
          </div>
        </div>

        {/* Match Color Toggle */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-medium mb-2">Color Matching</h3>
          <div className="flex bg-[#EFECEC] rounded-xl p-1">
            <Button 
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs ${
                settings.matchColor 
                  ? 'bg-white text-black hover:bg-white hover:text-black shadow-sm' 
                  : 'bg-transparent text-gray-500 hover:bg-gray-200/50 hover:text-gray-600 shadow-none'
              }`}
              onClick={() => dispatch(toggleMatchColor())}
            >
              {settings.matchColor ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </div>
        
        {/* Material Selection UI (same as Create page, but saves as simple text) */}
        {currentExpandedSections && (
          <>
            {/* Show photorealistic options if available */}
            {availableOptions?.photorealistic && (
              <>
                {/* Type Section */}
                <ExpandableSection
                  title="Type"
                  expanded={currentExpandedSections.type}
                  onToggle={() => handleSectionToggle('type')}
                >
                  <div className="grid grid-cols-2 gap-2 pb-4">
                    {availableOptions.photorealistic.type?.map((option: any) => (
                      <CategorySelector
                        key={option.id}
                        title={option.name}
                        selected={selections.type === option.id}
                        onSelect={() => {
                          handleSelectionChange('type', option.id);
                          handleMaterialSelect(option, 'customization', 'type');
                        }}
                        showImage={false}
                        className="aspect-auto"
                      />
                    ))}
                  </div>
                </ExpandableSection>

                {/* Walls Section */}
                <ExpandableSection
                  title="Walls"
                  expanded={currentExpandedSections.walls}
                  onToggle={() => handleSectionToggle('walls')}
                >
                  <SubCategorySelector
                    data={availableOptions.photorealistic.walls}
                    selectedCategory={selections.walls?.category}
                    selectedOption={selections.walls?.option}
                    onSelectionChange={(category, option) => {
                      handleSelectionChange('walls', { category, option: option.id });
                      handleMaterialSelect(option, 'material', 'walls');
                    }}
                  />
                </ExpandableSection>

                {/* Floors Section */}
                <ExpandableSection
                  title="Floors"
                  expanded={currentExpandedSections.floors}
                  onToggle={() => handleSectionToggle('floors')}
                >
                  <SubCategorySelector
                    data={availableOptions.photorealistic.floors}
                    selectedCategory={selections.floors?.category}
                    selectedOption={selections.floors?.option}
                    onSelectionChange={(category, option) => {
                      handleSelectionChange('floors', { category, option: option.id });
                      handleMaterialSelect(option, 'material', 'floors');
                    }}
                  />
                </ExpandableSection>

                {/* Context Section */}
                <ExpandableSection
                  title="Context"
                  expanded={currentExpandedSections.context}
                  onToggle={() => handleSectionToggle('context')}
                >
                  <SubCategorySelector
                    data={availableOptions.photorealistic.context}
                    selectedCategory={selections.context?.category}
                    selectedOption={selections.context?.option}
                    onSelectionChange={(category, option) => {
                      handleSelectionChange('context', { category, option: option.id });
                      handleMaterialSelect(option, 'material', 'context');
                    }}
                  />
                </ExpandableSection>

                {/* Style Section */}
                <ExpandableSection
                  title="Style"
                  expanded={currentExpandedSections.style}
                  onToggle={() => handleSectionToggle('style')}
                >
                  <div className="grid grid-cols-3 gap-2 pb-4">
                    {availableOptions.photorealistic.style?.map((option: any) => (
                      <CategorySelector
                        key={option.id}
                        title={option.displayName}
                        imageUrl={option.thumbnailUrl}
                        selected={selections.style === option.id}
                        onSelect={() => {
                          handleSelectionChange('style', option.id);
                          handleMaterialSelect(option, 'customization', 'style');
                        }}
                        showImage={true}
                        className="aspect-auto"
                      />
                    ))}
                  </div>
                </ExpandableSection>

                {/* Weather Section */}
                <ExpandableSection
                  title="Weather"
                  expanded={currentExpandedSections.weather}
                  onToggle={() => handleSectionToggle('weather')}
                >
                  <div className="grid grid-cols-2 gap-2 pb-4">
                    {availableOptions.photorealistic.weather?.map((option: any) => (
                      <CategorySelector
                        key={option.id}
                        title={option.name}
                        selected={selections.weather === option.id}
                        onSelect={() => {
                          handleSelectionChange('weather', option.id);
                          handleMaterialSelect(option, 'customization', 'weather');
                        }}
                        showImage={false}
                        className="aspect-auto"
                      />
                    ))}
                  </div>
                </ExpandableSection>

                {/* Lighting Section */}
                <ExpandableSection
                  title="Lighting"
                  expanded={currentExpandedSections.lighting}
                  onToggle={() => handleSectionToggle('lighting')}
                >
                  <div className="grid grid-cols-2 gap-2 pb-4">
                    {availableOptions.photorealistic.lighting?.map((option: any) => (
                      <CategorySelector
                        key={option.id}
                        title={option.name}
                        selected={selections.lighting === option.id}
                        onSelect={() => {
                          handleSelectionChange('lighting', option.id);
                          handleMaterialSelect(option, 'customization', 'lighting');
                        }}
                        showImage={false}
                        className="aspect-auto"
                      />
                    ))}
                  </div>
                </ExpandableSection>
              </>
            )}

            {/* Show art options if available */}
            {/* {availableOptions?.art && (
              <>
                {Object.entries(availableOptions.art).map(([subcategoryKey, options]) => (
                  <ExpandableSection
                    key={subcategoryKey}
                    title={subcategoryKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    expanded={currentExpandedSections[subcategoryKey]}
                    onToggle={() => handleSectionToggle(subcategoryKey)}
                  >
                    <div className="grid grid-cols-3 gap-2 pb-4">
                      {(options as any[]).map((option: any) => (
                        <CategorySelector
                          key={option.id}
                          title={option.displayName}
                          selected={selections[subcategoryKey] === option.id}
                          onSelect={() => {
                            handleSelectionChange(subcategoryKey, option.id);
                            handleMaterialSelect(option, 'customization', subcategoryKey);
                          }}
                          showImage={option.thumbnailUrl ? true : false}
                          imageUrl={option.thumbnailUrl}
                          className="aspect-auto"
                        />
                      ))}
                    </div>
                  </ExpandableSection>
                ))}
              </>
            )} */}
          </>
        )}

        {/* Error Display */}
        {error && (
          <div className="px-4 pb-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RefineEditInspector;