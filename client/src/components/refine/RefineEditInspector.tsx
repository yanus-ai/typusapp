import React from 'react';
import { Button } from "@/components/ui/button";
import { SquarePen, ImageIcon, ChevronDown, Palette, ChevronUp, Sparkles, Zap } from 'lucide-react';
import { SLIDER_CONFIGS } from '@/constants/editInspectorSliders';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useCreditCheck } from '@/hooks/useCreditCheck';
import {
  setSelectedStyle,
  setVariations,
  setCreativity,
  setExpressivity,
  setResemblance,
  setSelection,
  toggleSection,
} from '@/features/customization/customizationSlice';
import {
  updateResolution,
  updateScaleFactor,
  updateAIStrength,
  updateResemblance as updateRefineResemblance,
  updateClarity,
  updateSharpness,
  toggleMatchColor,
  generateRefine
} from '@/features/refine/refineSlice';
import { fetchCurrentUser, updateCredits } from '@/features/auth/authSlice';
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
  inputImageId, 
  processedUrl, 
  setIsPromptModalOpen, 
  editInspectorMinimized, 
  setEditInspectorMinimized 
}) => {
  const dispatch = useAppDispatch();
  const { checkCreditsBeforeAction } = useCreditCheck();

  console.log('🔍 RefineEditInspector props:', {
    imageUrl,
    processedUrl,
    inputImageId,
    editInspectorMinimized
  });

  // Redux selectors - Customization for Create-page style options
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

  // Redux selectors - Refine specific settings
  const {
    settings,
    isGenerating,
    error,
    selectedImageId,
    selectedImageUrl
  } = useAppSelector(state => state.refine);

  // Get the current expanded sections based on selected style
  const currentExpandedSections: Record<string, boolean> = expandedSections[selectedStyle] as unknown as Record<string, boolean>;

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

  const handleRefineSliderChange = (type: string, value: number) => {
    switch (type) {
      case 'aiStrength':
        dispatch(updateAIStrength(value));
        break;
      case 'resemblance':
        dispatch(updateRefineResemblance(value));
        break;
      case 'clarity':
        dispatch(updateClarity(value));
        break;
      case 'sharpness':
        dispatch(updateSharpness(value));
        break;
    }
  };

  const handleSelectionChange = (category: string, value: any) => {
    dispatch(setSelection({ category, value }));
  };

  const handleSectionToggle = (section: string) => {
    dispatch(toggleSection(section));
  };

  const handleScaleFactorChange = (scaleFactor: number) => {
    dispatch(updateScaleFactor(scaleFactor));
  };

  const handleResolutionChange = (width: number, height: number) => {
    dispatch(updateResolution({ width, height }));
  };

  const handleGenerate = async () => {
    if (!selectedImageId || !selectedImageUrl) return;

    // Check credits before proceeding
    if (!checkCreditsBeforeAction(1)) {
      return; // Credit check handles the error display
    }

    try {
      const resultAction = await dispatch(generateRefine({
        imageId: selectedImageId,
        imageUrl: selectedImageUrl,
        settings,
        variations: 1
      }));
      
      if (generateRefine.fulfilled.match(resultAction)) {
        console.log('✅ Refine generation started successfully');
        
        // Update credits if provided in the response
        if (resultAction.payload?.remainingCredits !== undefined) {
          console.log('💳 Updating credits after refine:', resultAction.payload.remainingCredits);
          dispatch(updateCredits(resultAction.payload.remainingCredits));
        } else {
          // Fallback: refresh user data to get updated credits
          console.log('💳 Refreshing user data for updated credits');
          dispatch(fetchCurrentUser());
        }
      }
    } catch (error) {
      console.error('Failed to generate refine:', error);
    }
  };

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

  const resolutionPresets = [
    { label: '1K', width: 1024, height: 1024 },
    { label: '2K', width: 2048, height: 2048 },
    { label: '4K', width: 4096, height: 4096 },
  ];

  return (
    <div className={`shadow-lg h-full bg-gray-100 w-[322px] flex flex-col rounded-md custom-scrollbar transition-all ${editInspectorMinimized ? 'translate-y-[calc(100vh-122px)] absolute left-[100px]' : 'translate-y-0'}`}>
      <div className="p-4 border-b border-gray-200 flex justify-between items-center cursor-pointer" onClick={() => setEditInspectorMinimized(!editInspectorMinimized)}>
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

        {/* Scale Factor Selection */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-medium mb-2">Scale Factor</h3>
          <div className="flex gap-1 bg-[#EFECEC] rounded-xl p-1">
            {[1, 2, 3, 4].map((scale) => (
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

        {/* Refine-specific Sliders */}
        <SliderSection 
          title="AI Strength" 
          value={settings.aiStrength} 
          minValue={1} 
          maxValue={50} 
          onChange={(value) => handleRefineSliderChange('aiStrength', value)} 
        />
        <SliderSection 
          title="Clarity" 
          value={settings.clarity} 
          minValue={1} 
          maxValue={50} 
          onChange={(value) => handleRefineSliderChange('clarity', value)} 
        />
        <SliderSection 
          title="Sharpness" 
          value={settings.sharpness} 
          minValue={1} 
          maxValue={50} 
          onChange={(value) => handleRefineSliderChange('sharpness', value)} 
        />

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
        
        {/* Conditional Content Based on Style */}
        {selectedStyle === 'photorealistic' && currentData && currentExpandedSections ? (
          <>
            {/* Type Section */}
            <ExpandableSection 
              title="Type" 
              expanded={currentExpandedSections.type} 
              onToggle={() => handleSectionToggle('type')} 
            >
              <div className="grid grid-cols-2 gap-2 pb-4">
                {currentData.type?.map((option: any) => (
                  <CategorySelector
                    key={option.id}
                    title={option.name}
                    selected={selections.type === option.id}
                    onSelect={() => {
                      handleSelectionChange('type', option.id);
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
                data={currentData.walls}
                selectedCategory={selections.walls?.category}
                selectedOption={selections.walls?.option}
                onSelectionChange={(category, option) => {
                  handleSelectionChange('walls', { category, option: option.id });
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
                data={currentData.floors}
                selectedCategory={selections.floors?.category}
                selectedOption={selections.floors?.option}
                onSelectionChange={(category, option) => {
                  handleSelectionChange('floors', { category, option: option.id });
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
                data={currentData.context}
                selectedCategory={selections.context?.category}
                selectedOption={selections.context?.option}
                onSelectionChange={(category, option) => {
                  handleSelectionChange('context', { category, option: option.id });
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
                {currentData.style?.map((option: any) => (
                  <CategorySelector
                    key={option.id}
                    title={option.displayName}
                    imageUrl={option.thumbnailUrl}
                    selected={selections.style === option.id}
                    onSelect={() => {
                      handleSelectionChange('style', option.id);
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
                {currentData.weather?.map((option: any) => (
                  <CategorySelector
                    key={option.id}
                    title={option.name}
                    selected={selections.weather === option.id}
                    onSelect={() => {
                      handleSelectionChange('weather', option.id);
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
                {currentData.lighting?.map((option: any) => (
                  <CategorySelector
                    key={option.id}
                    title={option.name}
                    selected={selections.lighting === option.id}
                    onSelect={() => {
                      handleSelectionChange('lighting', option.id);
                    }}
                    showImage={false}
                    className="aspect-auto"
                  />
                ))}
              </div>
            </ExpandableSection>
          </>
        ) : selectedStyle === 'art' && currentData && currentExpandedSections ? (
          <>
            {/* Art Style Selection with Subcategories */}
            {Object.entries(currentData).map(([subcategoryKey, options]) => (
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
                        handleSelectionChange(subcategoryKey, option.id)
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
        ) : null}

        {/* Action Buttons */}
        <div className="px-4 pb-4 space-y-2">
          <Button 
            className="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500"
            onClick={() => setIsPromptModalOpen(true)}
            disabled={!selectedImageId || !selectedImageUrl}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Refine
            </div>
          </Button>
          
          <Button 
            className="w-full bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500"
            onClick={handleGenerate}
            disabled={!selectedImageId || !selectedImageUrl || isGenerating}
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Refining...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Refine Image
              </div>
            )}
          </Button>
        </div>

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