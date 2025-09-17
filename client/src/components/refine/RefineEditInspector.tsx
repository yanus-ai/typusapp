import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { SquarePen, ChevronDown, ChevronUp, Share2, Loader2 } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { REFINE_SLIDER_CONFIGS } from '@/constants/editInspectorSliders';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
// Using simple text array for AI materials instead of complex relationships
import {
  setCreativity,
  setResemblance,
  setDynamics,
  setTilingWidth,
  setTilingHeight,
  setFractility,
  setSelection,
  toggleSection,
  initializeRefineSettings,
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
  loading?: boolean;
  onShare?: (imageUrl: string) => void;
  onEdit?: (imageId?: number) => void;
  onCreate?: (imageId?: number) => void;
  imageId?: number;
}

const RefineEditInspector: React.FC<RefineEditInspectorProps> = ({
  imageUrl,
  editInspectorMinimized,
  setEditInspectorMinimized,
  loading = false,
  onShare,
  onEdit,
  onCreate,
  imageId
}) => {
  const dispatch = useAppDispatch();

  // State for hover detection
  const [isHoveringOverImage, setIsHoveringOverImage] = useState(false);
  const [isHoveringOverButtons, setIsHoveringOverButtons] = useState(false);

  // Initialize refine-specific slider defaults on mount
  React.useEffect(() => {
    dispatch(initializeRefineSettings());
  }, [dispatch]);

  // Redux selectors - Customization for Create-page style options
  const {
    selectedStyle,
    creativity,
    resemblance,
    dynamics,
    fractility,
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
      case 'tilingWidth':
        dispatch(setTilingWidth(value));
        break;
      case 'tilingHeight':
        dispatch(setTilingHeight(value));
        break;
      case 'fractility':
        dispatch(setFractility(value));
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

  const handleShare = async (shareImageUrl: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Refined Image',
          url: shareImageUrl,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareImageUrl);
        console.log('Image URL copied to clipboard');
      } catch (error) {
        console.log('Error copying to clipboard:', error);
      }
    }
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
        {/* Image Preview with Action Buttons */}
        <div className="p-4">
          <div
            className="relative rounded-md overflow-hidden h-[170px] w-[274px] bg-gray-200"
            onMouseEnter={() => setIsHoveringOverImage(true)}
            onMouseLeave={() => setIsHoveringOverImage(false)}
          >
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

            {/* Action buttons overlay with lottie animation - only when image exists */}
            {imageUrl && (
              <div className="absolute inset-0 pointer-events-none z-20">
                {/* Lottie animation when hovering over image but not over buttons */}
                {isHoveringOverImage && !isHoveringOverButtons && !loading && (
                  <div className="absolute inset-0 pointer-events-none">
                    <DotLottieReact
                      src="https://lottie.host/d44b4764-55a4-406e-a1d8-9deae78a5b3a/hcQJvTECay.lottie"
                      loop
                      autoplay
                      style={{
                        width: '100%',
                        height: '100%',
                        opacity: 0.6,
                      }}
                    />
                  </div>
                )}

                {/* Loading overlay */}
                {loading && (
                  <div className="absolute inset-0 pointer-events-none bg-black/20 flex items-center justify-center">
                    <div className="bg-white/90 rounded-lg p-2 flex items-center gap-2">
                      <Loader2 className="animate-spin" size={16} />
                      <span className="text-xs font-medium">Processing...</span>
                    </div>
                  </div>
                )}

                {/* Share button - top right */}
                <div className="absolute top-2 right-2 pointer-events-auto" onMouseEnter={() => setIsHoveringOverButtons(true)} onMouseLeave={() => setIsHoveringOverButtons(false)}>
                  {onShare && imageUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(imageUrl);
                      }}
                      className="bg-black/20 hover:bg-black/40 text-white p-1.5 rounded-md transition-all duration-200 cursor-pointer"
                      title="Share Image"
                    >
                      <Share2 size={12} />
                    </button>
                  )}
                </div>

                {/* Bottom-left: Edit button */}
                <div className="absolute bottom-2 left-2 pointer-events-auto" onMouseEnter={() => setIsHoveringOverButtons(true)} onMouseLeave={() => setIsHoveringOverButtons(false)}>
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(imageId);
                      }}
                      className="bg-black/20 hover:bg-black/40 text-white px-2 py-1 rounded-md text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer"
                      title="Edit Image"
                    >
                      EDIT
                    </button>
                  )}
                </div>

                {/* Bottom-right: Create button */}
                <div className="absolute bottom-2 right-2 pointer-events-auto" onMouseEnter={() => setIsHoveringOverButtons(true)} onMouseLeave={() => setIsHoveringOverButtons(false)}>
                  {onCreate && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreate(imageId);
                      }}
                      className="bg-black/20 hover:bg-black/40 text-white px-2 py-1 rounded-md text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer"
                      title="Create Image"
                    >
                      CREATE
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        


        {/* Scale Factor Selection */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-medium mb-2">Scale Factor</h3>
          <div className="flex gap-2">
            {[2, 3, 4].map((scale) => (
              <button
                key={scale}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  settings.scaleFactor === scale
                    ? 'text-red-500 border border-red-200 bg-red-50 shadow-lg'
                    : 'text-gray-500 hover:text-black'
                }`}
                onClick={() => handleScaleFactorChange(scale)}
              >
                {scale}x
              </button>
            ))}
          </div>
        </div>
        
        
        
        {/* Create-style Sliders */}
        <SliderSection 
          title="Creativity" 
          value={creativity} 
          minValue={REFINE_SLIDER_CONFIGS.creativity.min} 
          maxValue={REFINE_SLIDER_CONFIGS.creativity.max} 
          step={0.1}
          onChange={(value) => handleSliderChange('creativity', value)}
        />
        <SliderSection 
          title="Resemblance" 
          value={resemblance} 
          minValue={REFINE_SLIDER_CONFIGS.resemblance.min} 
          maxValue={REFINE_SLIDER_CONFIGS.resemblance.max} 
          step={0.1}
          onChange={(value) => handleSliderChange('resemblance', value)}
        />

        {/* Advanced Settings - Expandable */}
        <ExpandableSection
          title="Advanced Settings"
          expanded={currentExpandedSections.advanced}
          onToggle={() => handleSectionToggle('advanced')}
        >
          <div className="space-y-4 pb-4">
            <SliderSection
              title="Dynamics"
              value={dynamics}
              minValue={REFINE_SLIDER_CONFIGS.dynamics.min}
              maxValue={REFINE_SLIDER_CONFIGS.dynamics.max}
              step={1}
              onChange={(value) => handleSliderChange('dynamics', value)}
            />
            
            {/* Fractility Section - Single Slider */}
            <SliderSection
              title="Fractility"
              value={fractility}
              minValue={REFINE_SLIDER_CONFIGS.fractility.min}
              maxValue={REFINE_SLIDER_CONFIGS.fractility.max}
              step={1}
              onChange={(value) => handleSliderChange('fractility', value)}
              valueFormatter={(value) => {
                const option = REFINE_SLIDER_CONFIGS.fractility.allowedValues[value];
                return option ? option.label : '128X128';
              }}
            />
          </div>
        </ExpandableSection>

        {/* Match Color Toggle */}
        {/* <div className="px-4 pb-4">
          <h3 className="text-sm font-medium mb-2">Color Matching</h3>
          <div className="flex gap-2">
            <button
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                settings.matchColor
                  ? 'text-red-500 border border-red-200 bg-red-50 shadow-lg'
                  : 'text-gray-500 hover:text-black'
              }`}
              onClick={() => dispatch(toggleMatchColor())}
            >
              {settings.matchColor ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div> */}
        
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