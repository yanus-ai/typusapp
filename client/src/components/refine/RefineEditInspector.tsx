import React from 'react';
import { Button } from "@/components/ui/button";
import { SquarePen, ChevronDown, ChevronUp, ImageIcon, Palette } from 'lucide-react';
import { SLIDER_CONFIGS } from '@/constants/editInspectorSliders';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useCreditCheck } from '@/hooks/useCreditCheck';
import { 
  addAIPromptMaterialLocal,
  addAIPromptMaterial,
} from '@/features/masks/maskSlice';
import {
  setVariations,
  setCreativity,
  setExpressivity,
  setResemblance,
  setDynamics,
  setFractality,
  setSelection,
  toggleSection,
  setSelectedStyle,
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
    isGenerating,
    error,
    selectedImageId,
    selectedImageUrl
  } = useAppSelector(state => state.refine);

  // Get the current expanded sections based on selected style
  const currentExpandedSections: Record<string, boolean> = expandedSections[selectedStyle] as unknown as Record<string, boolean>;

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
      case 'dynamics':
        dispatch(setDynamics(value));
        break;
      case 'fractality':
        dispatch(setFractality(value));
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

  const getSubCategoryInfo = (type: string): { id: number; name: string } | undefined => {
    if (!availableOptions) return undefined;

    const styleOptions = selectedStyle === 'photorealistic'
      ? availableOptions.photorealistic
      : availableOptions.art;

    const subcategoryData = styleOptions[type];
    if (!subcategoryData) return undefined;

    if (Array.isArray(subcategoryData)) {
      const firstOption = subcategoryData[0];
      if (firstOption?.subCategory?.id) {
        return {
          id: firstOption.subCategory.id,
          name: firstOption.subCategory.displayName || type.charAt(0).toUpperCase() + type.slice(1)
        };
      }
      if (firstOption?.category?.id) {
        return {
          id: firstOption.category.id,
          name: type.charAt(0).toUpperCase() + type.slice(1)
        };
      }
      return undefined;
    }

    if (typeof subcategoryData === 'object') {
      for (const key in subcategoryData) {
        const arr = subcategoryData[key];
        if (Array.isArray(arr) && arr.length > 0) {
          const firstOption = arr[0];
          if (firstOption?.subCategory?.id) {
            return {
              id: firstOption.subCategory.id,
              name: firstOption.subCategory.displayName || type.charAt(0).toUpperCase() + type.slice(1)
            };
          }
          if (firstOption?.category?.id) {
            return {
              id: firstOption.category.id,
              name: type.charAt(0).toUpperCase() + type.slice(1)
            };
          }
        }
      }
      return undefined;
    }

    return undefined;
  };

  const handleMaterialSelect = async (option: any, materialOption: string, type: string) => {
    if (!inputImageId) return;
    
    const displayName = option.displayName || option.name;
    const imageUrl = option.thumbnailUrl || null;
    
    var materialOptionId;
    var customizationOptionId;

    if (materialOption === 'customization') {
      customizationOptionId = option.id;
    } else if (materialOption === 'material') {
      materialOptionId = option.id;
    }

    const subCategoryInfo = getSubCategoryInfo(type);

    if (subCategoryInfo) {
      // Always add to local state first for immediate UI feedback
      dispatch(addAIPromptMaterialLocal({
        inputImageId,
        materialOptionId,
        customizationOptionId,
        subCategoryId: subCategoryInfo.id,
        displayName,
        subCategoryName: subCategoryInfo.name,
        imageUrl
      }));

      // For refine uploaded images, also save to database in background
      dispatch(addAIPromptMaterial({
        inputImageId,
        materialOptionId,
        customizationOptionId,
        subCategoryId: subCategoryInfo.id,
        displayName,
      }));
    }
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

        {/* Advanced Settings */}
        <div className="my-2">
          <ExpandableSection 
            title="Advanced Settings" 
            expanded={currentExpandedSections.advanced || false} 
            onToggle={() => handleSectionToggle('advanced')} 
          >
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
          </ExpandableSection>
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
        
        {/* Always show all settings regardless of style */}
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
            {availableOptions?.art && (
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
            )}
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