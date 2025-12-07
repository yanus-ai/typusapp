import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { setSelection } from "@/features/customization/customizationSlice";
import { removeAIPromptMaterialLocal } from "@/features/masks/maskSlice";
import { useMemo } from "react";

export interface KeywordItem {
  id: string;
  category: string;
  label: string;
  type: 'customization' | 'aiMaterial';
  materialId?: number; // For AI materials
}

export function useKeywords() {
  const { selections, availableOptions, selectedStyle } = useAppSelector(
    (state) => state.customization
  );
  const aiPromptMaterials = useAppSelector((state) => state.masks.aiPromptMaterials);
  const dispatch = useAppDispatch();

  const currentData = selectedStyle === "photorealistic"
    ? availableOptions?.photorealistic
    : availableOptions?.art;

  const getSelectionLabel = (category: string, value: any): string | null => {
    if (!value || !currentData) return null;

    const categoryData = (currentData as any)[category];
    if (!categoryData) return null;

    // Handle simple string selections (type, style, weather, lighting)
    if (typeof value === 'string' || typeof value === 'number') {
      if (Array.isArray(categoryData)) {
        const option = categoryData.find((opt: any) => opt.id === value);
        return option?.displayName || option?.name || null;
      }
    }

    // Handle complex selections (walls, floors, context with category/option)
    if (typeof value === 'object' && value.option) {
      if (typeof categoryData === 'object' && !Array.isArray(categoryData)) {
        const categoryKey = value.category;
        const categoryArray = categoryData[categoryKey];
        if (Array.isArray(categoryArray)) {
          const option = categoryArray.find((opt: any) => opt.id === value.option);
          return option?.displayName || option?.name || null;
        }
      }
    }

    return null;
  };

  const handleRemoveSelection = (category: string) => {
    dispatch(setSelection({ category, value: undefined }));
  };

  const handleRemoveAIMaterial = (materialId: number) => {
    dispatch(removeAIPromptMaterialLocal(materialId));
  };

  const handleRemoveKeyword = (keyword: KeywordItem) => {
    if (keyword.type === 'customization') {
      handleRemoveSelection(keyword.category);
    } else if (keyword.type === 'aiMaterial' && keyword.materialId !== undefined) {
      handleRemoveAIMaterial(keyword.materialId);
    }
  };

  const selectedKeywords: KeywordItem[] = useMemo(() => {
    const customizationKeywords: KeywordItem[] = [];
    Object.entries(selections).forEach(([category, value]) => {
      if (value !== undefined && value !== null) {
        const label = getSelectionLabel(category, value);
        if (label) {
          customizationKeywords.push({
            id: `customization-${category}`,
            category,
            label,
            type: 'customization' as const
          });
        }
      }
    });

    // Add AI materials as keywords
    const aiMaterialKeywords: KeywordItem[] = aiPromptMaterials.map((material) => {
      const displayName = material.subCategory?.displayName
        ? `${material.subCategory.displayName} ${material.displayName}`
        : material.displayName;
      return {
        id: `aimaterial-${material.id}`,
        category: 'materials',
        label: displayName,
        type: 'aiMaterial' as const,
        materialId: material.id
      };
    });

    return [...customizationKeywords, ...aiMaterialKeywords];
  }, [selections, currentData, aiPromptMaterials]);

  return {
    selectedKeywords,
    getSelectionLabel,
    handleRemoveSelection,
    handleRemoveKeyword,
    dispatch
  };
}