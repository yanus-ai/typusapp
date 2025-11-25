import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { setSelection } from "@/features/customization/customizationSlice";
import { useMemo } from "react";

export function useKeywords() {
  const { selections, availableOptions, selectedStyle } = useAppSelector(
    (state) => state.customization
  );
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

  const selectedKeywords: { category: string; label: string }[] = useMemo(() => {
    return Object.entries(selections).map(([category, value]) => {
      if (value !== undefined && value !== null) {
        const label = getSelectionLabel(category, value);
        if (label) {
          return { category, label };
        }
      }
    }).filter((keyword): keyword is { category: string; label: string } => keyword !== undefined);
  }, [selections, currentData]);

  return {
    selectedKeywords,
    getSelectionLabel,
    handleRemoveSelection,
    dispatch
  };
}