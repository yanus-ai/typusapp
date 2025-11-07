import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SubCategorySelectorCompactProps {
  data: any;
  selectedCategory?: string;
  selectedOption?: string;
  onSelectionChange: (category: string, option: any) => void;
  getMaterialType?: (category: string) => string;
  getMaterialOption?: (category: string) => string;
}

const SubCategorySelectorCompact: React.FC<SubCategorySelectorCompactProps> = ({
  data,
  selectedCategory,
  selectedOption,
  onSelectionChange,
  getMaterialType,
  getMaterialOption
}) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const categories = Object.keys(data || {});
    if (categories.length > 0) {
      setActiveCategory(selectedCategory || categories[0]);
    }
  }, [data, selectedCategory]);

  const handleCategorySelect = (categoryId: string) => {
    setActiveCategory(categoryId);
  };

  const handleOptionSelect = (option: any) => {
    if (activeCategory) {
      onSelectionChange(activeCategory, option);
    }
  };

  const currentOptions = activeCategory ? data[activeCategory] : null;

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="text-xs text-gray-500 py-4 text-center">
        No options available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {/* Left Panel - Categories */}
      <div className="space-y-0.5 max-h-[150px] overflow-y-auto">
        {Object.keys(data).map((categoryKey) => (
          <button
            key={categoryKey}
            type="button"
            onClick={() => handleCategorySelect(categoryKey)}
            className={cn(
              "w-full px-1.5 py-1 rounded text-left text-[10px] font-medium transition-all capitalize",
              activeCategory === categoryKey
                ? "bg-gray-50 text-gray-700 border border-gray-200"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent"
            )}
          >
            {categoryKey.replace(/_/g, ' ').toLowerCase()}
          </button>
        ))}
      </div>

      {/* Right Panel - Options */}
      <div className="space-y-0.5 max-h-[150px] overflow-y-auto pr-1">
        {currentOptions && currentOptions.length > 0 ? (
          currentOptions.map((option: any) => {
            const materialType = getMaterialType ? getMaterialType(activeCategory || '') : '';
            const materialOption = getMaterialOption ? getMaterialOption(activeCategory || '') : '';
            
            const handleDragStart = (e: React.DragEvent) => {
              if (materialType && materialOption) {
                e.dataTransfer.setData('application/json', JSON.stringify({
                  option,
                  materialOption,
                  type: materialType
                }));
                e.dataTransfer.effectAllowed = 'copy';
              }
            };

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleOptionSelect(option)}
                draggable={!!(materialType && materialOption)}
                onDragStart={handleDragStart}
                className={cn(
                  "w-full px-1.5 py-1 rounded text-left text-[10px] transition-all",
                  "border hover:border-gray-300",
                  materialType && materialOption && "cursor-grab active:cursor-grabbing",
                  selectedOption === option.id
                    ? "bg-gray-50 text-gray-700 border-gray-200 font-medium"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                )}
              >
              {option.thumbnailUrl ? (
                <div className="flex items-center gap-1.5">
                  <img
                    src={option.thumbnailUrl}
                    alt={option.displayName || option.name}
                    className="w-6 h-6 rounded object-cover flex-shrink-0"
                  />
                  <span className="leading-tight line-clamp-1 capitalize">
                    {(option.displayName || option.name || "").toLowerCase()}
                  </span>
                </div>
              ) : (
                <span className="leading-tight line-clamp-1 capitalize">
                  {(option.displayName || option.name || "").toLowerCase()}
                </span>
              )}
            </button>
            );
          })
        ) : (
          <div className="text-[10px] text-gray-500 py-1 text-center">
            No options
          </div>
        )}
      </div>
    </div>
  );
};

export default SubCategorySelectorCompact;

