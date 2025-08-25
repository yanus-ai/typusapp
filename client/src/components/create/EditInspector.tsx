import React from 'react';
import { Button } from "@/components/ui/button";
import { SquarePen, ImageIcon, ChevronDown, Layers2, Palette, ChevronUp } from 'lucide-react';
import { SLIDER_CONFIGS } from '@/constants/editInspectorSliders';
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
} from '@/features/customization/customizationSlice';
import { 
  generateMasks, 
  setMaskInput,
  setSelectedMaskId,
  updateMaskStyleLocal,
  addAIPromptMaterialLocal,
} from '@/features/masks/maskSlice';
import CategorySelector from './CategorySelector';
import SubCategorySelector from './SubcategorySelector';
import SliderSection from './SliderSection';
import ExpandableSection from './ExpandableSection';
import { useMaskWebSocket } from '@/hooks/useMaskWebSocket';

interface EditInspectorProps {
  imageUrl?: string;
  processedUrl?: string;
  inputImageId?: number;
  setIsPromptModalOpen: (isOpen: boolean) => void;
  editInspectorMinimized: boolean;
  setEditInspectorMinimized: (editInspectorMinimized: boolean) => void;
}

const EditInspector: React.FC<EditInspectorProps> = ({ imageUrl, inputImageId, processedUrl, setIsPromptModalOpen, editInspectorMinimized, setEditInspectorMinimized }) => {
  const dispatch = useAppDispatch();

  console.log('🔍 EditInspector props:', {
    imageUrl,
    processedUrl,
    inputImageId,
    editInspectorMinimized
  });

  // WebSocket integration for mask updates
  useMaskWebSocket({
    inputImageId: inputImageId,
    enabled: !!inputImageId
  });

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

  const {
    masks,
    maskStatus,
    loading: masksLoading,
    selectedMaskId
  } = useAppSelector(state => state.masks);

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

  const handleSelectionChange = (category: string, value: any) => {
    dispatch(setSelection({ category, value }));
  };

  const handleSectionToggle = (section: string) => {
    dispatch(toggleSection(section));
  };

  // Mask-related handlers
  const handleGenerateRegions = async () => {
    if (!inputImageId || !imageUrl) {
      console.error('Missing inputImageId or imageUrl for mask generation');
      return;
    }

    try {
      setIsPromptModalOpen(true);
      // Use the processed image URL for mask generation, fallback to imageUrl if processedUrl is not available
      console.log('🔍 EditInspector mask generation URLs:', {
        processedUrl,
        imageUrl,
        inputImageId
      });
      
      const maskGenerationImageUrl = processedUrl || imageUrl;
      
      if (!maskGenerationImageUrl) {
        throw new Error('No image URL available for mask generation');
      }
      
      console.log('🚀 Using URL for mask generation:', maskGenerationImageUrl);
      
      await dispatch(generateMasks({
        inputImageId,
        imageUrl: maskGenerationImageUrl,
        callbackUrl: `${import.meta.env.VITE_API_URL}/masks/callback`
      })).unwrap();
      
      console.log('✅ Mask generation initiated successfully');
    } catch (error) {
      console.error('❌ Failed to generate masks:', error);
    }
  };

  // Helper function to render the Generate Regions button
  const renderGenerateRegionsButton = () => {
    const canGenerate = imageUrl && maskStatus !== 'processing';
    const hasExistingMasks = maskStatus === 'completed' && masks.length > 0;
    
    return (
      <Button 
        size="icon" 
        variant="secondary" 
        className="h-7 w-7 text-white !bg-white/10 backdrop-opacity-70 rounded-lg"
        onClick={handleGenerateRegions}
        disabled={!canGenerate || masksLoading}
        title={hasExistingMasks ? `View ${masks.length} Regions` : "Generate Regions"}
      >
        {masksLoading || maskStatus === 'processing' ? (
          <div className="h-3 w-3 animate-spin rounded-full border-[1px] border-white border-t-transparent" />
        ) : (
          <Layers2 className="h-3 w-3" />
        )}
      </Button>
    );
  };

  // Helper function to get subcategory info from availableOptions structure
  const getSubCategoryInfo = (type: string): { id: number; name: string } | undefined => {
    if (!availableOptions) return undefined;

    const styleOptions = selectedStyle === 'photorealistic'
      ? availableOptions.photorealistic
      : availableOptions.art;

    const subcategoryData = styleOptions[type];
    if (!subcategoryData) return undefined;

    // If it's an array (like type, style, weather, lighting)
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

    // If it's an object (like walls, floors, context)
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

  const handleMaterialSelect = (option: any, materialOption: string, type: string) => {
    if (selectedMaskId !== null) {
      // MODE 1: Mask is selected - Apply material to specific mask region
      const displayName = `${type} ${option.displayName || option.name}`;
      const imageUrl = option.thumbnailUrl || null;
      const category = type;

      var materialOptionId;
      var customizationOptionId;

      if (materialOption === 'customization') {
        customizationOptionId = option.id;
      } else if (materialOption === 'material') {
        materialOptionId = option.id;
      }

      // Get subcategory info for this type
      const subCategoryInfo = getSubCategoryInfo(type);

      // Update local UI state
      dispatch(setMaskInput({ maskId: selectedMaskId, value: { displayName, imageUrl, category } }));

      // Update mask style in Redux state only (no DB save until Generate button)
      dispatch(updateMaskStyleLocal({
        maskId: selectedMaskId,
        materialOptionId,
        customizationOptionId,
        customText: displayName,
        subCategoryId: subCategoryInfo?.id, // Pass the subcategory ID
      }));

      // Optionally, unselect mask after selection
      dispatch(setSelectedMaskId(null));
    } else if (inputImageId) {
      // MODE 2: No mask selected - Save for AI prompt generation
      const displayName = option.displayName || option.name;
      const imageUrl = option.thumbnailUrl || null;
      
      var materialOptionId;
      var customizationOptionId;

      if (materialOption === 'customization') {
        customizationOptionId = option.id;
      } else if (materialOption === 'material') {
        materialOptionId = option.id;
      }

      // Get subcategory info for this type
      const subCategoryInfo = getSubCategoryInfo(type);

      if (subCategoryInfo) {
        // Add to Redux state only (no DB save until Generate button)
        dispatch(addAIPromptMaterialLocal({
          inputImageId,
          materialOptionId,
          customizationOptionId,
          subCategoryId: subCategoryInfo.id,
          displayName,
          subCategoryName: subCategoryInfo.name, // This should be proper case like "Type", "Walls", etc.
          imageUrl
        }));
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

  const currentData = selectedStyle === 'photorealistic' 
    ? availableOptions?.photorealistic 
    : availableOptions?.art;

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
              {renderGenerateRegionsButton()}
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
                data={currentData.walls}
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
                data={currentData.floors}
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
                data={currentData.context}
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
                {currentData.style?.map((option: any) => (
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
                {currentData.weather?.map((option: any) => (
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
                {currentData.lighting?.map((option: any) => (
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
        ) : null}
      </div>
    </div>
  );
};

export default EditInspector;