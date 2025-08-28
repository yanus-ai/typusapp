import React from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import {
  setSelection,
  toggleSection,
} from '@/features/customization/customizationSlice';
import { 
  addAIPromptMaterialLocal,
  updateMaskStyleLocal,
  setMaskInput,
  setSelectedMaskId,
} from '@/features/masks/maskSlice';
import CategorySelector from './CategorySelector';
import SubCategorySelector from './SubcategorySelector';
import ExpandableSection from './ExpandableSection';

interface MaterialCustomizationSettingsProps {
  selectedStyle: 'photorealistic' | 'art';
  inputImageId?: number;
}

const MaterialCustomizationSettings: React.FC<MaterialCustomizationSettingsProps> = ({
  selectedStyle,
  inputImageId
}) => {
  const dispatch = useAppDispatch();
  
  const {
    selections,
    expandedSections,
    availableOptions,
  } = useAppSelector(state => state.customization);

  const {
    selectedMaskId
  } = useAppSelector(state => state.masks);

  const currentExpandedSections: Record<string, boolean> = expandedSections[selectedStyle] as unknown as Record<string, boolean>;

  const handleSelectionChange = (category: string, value: any) => {
    dispatch(setSelection({ category, value }));
  };

  const handleSectionToggle = (section: string) => {
    dispatch(toggleSection(section));
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

  const handleMaterialSelect = (option: any, materialOption: string, type: string) => {
    if (selectedMaskId !== null) {
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

      const subCategoryInfo = getSubCategoryInfo(type);

      dispatch(setMaskInput({ maskId: selectedMaskId, value: { displayName, imageUrl, category } }));

      dispatch(updateMaskStyleLocal({
        maskId: selectedMaskId,
        materialOptionId,
        customizationOptionId,
        customText: displayName,
        subCategoryId: subCategoryInfo?.id,
      }));

      dispatch(setSelectedMaskId(null));
    } else if (inputImageId) {
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
        dispatch(addAIPromptMaterialLocal({
          inputImageId,
          materialOptionId,
          customizationOptionId,
          subCategoryId: subCategoryInfo.id,
          displayName,
          subCategoryName: subCategoryInfo.name,
          imageUrl
        }));
      }
    }
  };

  const currentData = selectedStyle === 'photorealistic' 
    ? availableOptions?.photorealistic 
    : availableOptions?.art;

  if (!currentData || !currentExpandedSections) {
    return null;
  }

  return (
    <>
      {selectedStyle === 'photorealistic' ? (
        <>
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
      ) : (
        <>
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
      )}
    </>
  );
};

export default MaterialCustomizationSettings;