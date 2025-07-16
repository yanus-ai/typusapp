import React from 'react';

interface SubCategorySelectorProps {
  data: any;
  selectedCategory?: string;
  selectedOption?: string;
  onSelectionChange: (category: string, option: string) => void;
}

const SubCategorySelector: React.FC<SubCategorySelectorProps> = ({
  data,
  selectedCategory,
  selectedOption,
  onSelectionChange
}) => {
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);

  // Initialize with first category and first option on mount
  React.useEffect(() => {
    const categories = Object.keys(data);
    if (categories.length > 0) {
      const firstCategory = categories[0];
      setActiveCategory(selectedCategory || firstCategory);
    }
  }, [data, selectedCategory, selectedOption, onSelectionChange]);

  const handleCategorySelect = (categoryId: string) => {
    setActiveCategory(categoryId);
  };

  const handleOptionSelect = (optionId: string) => {
    if (activeCategory) {
      onSelectionChange(activeCategory, optionId);
    }
  };

  const currentOptions = activeCategory ? data[activeCategory] : null;

  return (
    <div className="grid grid-cols-2 gap-3 pb-2 min-h-[504px]">
      {/* Left Panel - Categories */}
      <div className="overflow-y-auto py-2">
        {Object.keys(data).map((categoryKey) => (
          <button
            key={categoryKey}
            onClick={() => handleCategorySelect(categoryKey)}
            className={`w-full py-3 text-left text-xs font-medium transition-all cursor-pointer ${
              activeCategory === categoryKey
                ? 'font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {categoryKey.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Right Panel - Options with Images */}
      <div className="relative h-full overflow-hidden">
        {currentOptions ? (
          <div className="h-full overflow-y-auto absolute inset-0">
            <div className="grid grid-cols-1 gap-3 py-2">
              {currentOptions.map((option: any) => (
                <div
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  className={`relative cursor-pointer transition-all duration-200`}>
                  {/* Image */}
                  {option.thumbnailUrl && (
                    <div className={`aspect-square border w-[57px] h-[57px] mx-auto rounded-lg shadow overflow-hidden transition-all mb-2 hover:scale-105 ${
                      selectedOption === option.id
                        ? 'border-black border-2 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <img 
                        src={option.thumbnailUrl} 
                        alt={option.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback for missing images - show placeholder
                          e.currentTarget.src = '/images/placeholder.jpg';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Title Overlay */}
                  <div>
                    <p className={`text-xs text-center leading-tight uppercase line-clamp-2 ${
                      selectedOption === option.id
                        ? 'font-medium '
                        : 'font-normal text-gray-700'
                    }`}>
                      {option.displayName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p className="text-sm">Select a category to view options</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubCategorySelector;