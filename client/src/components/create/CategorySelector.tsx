import React from 'react';
import { cn } from '@/lib/utils';

interface CategorySelectorProps {
  imageUrl?: string;
  title: string;
  selected: boolean;
  onSelect: () => void;
  className?: string;
  showImage?: boolean;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ 
  imageUrl, 
  title, 
  selected, 
  onSelect, 
  className,
  showImage = true 
}) => {
  return (
    <div 
      className={cn("cursor-pointer", className)}
      onClick={onSelect}
    >
      {showImage && imageUrl && (
        <div className="aspect-square w-full rounded-t-md">
          <img 
            src={imageUrl} 
            alt={title}
            className={`w-full h-full object-cover rounded-none transition-all duration-200 hover:scale-105 ${
              selected 
                ? "border-primary border-2" 
                : "border-gray-200 hover:border-gray-300"
            }`}
            loading="lazy"
            onError={(e) => {
              // Fallback for missing images
              e.currentTarget.src = '/images/placeholder.jpg';
            }}
          />
        </div>
      )}
      <div className="py-2">
        <p className={cn(
          "text-xs font-medium text-center leading-tight line-clamp-2 uppercase",
          selected ? "text-primary font-semibold" : "text-gray-700"
        )}>
          {title}
        </p>
      </div>
    </div>
  );
};

export default CategorySelector;