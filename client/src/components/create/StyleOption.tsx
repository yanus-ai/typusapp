import React from 'react';
import { cn } from '@/lib/utils';

interface StyleOptionProps {
  imageUrl?: string;
  title: string;
  selected: boolean;
  onSelect: () => void;
  className?: string;
  showImage?: boolean;
}

const StyleOption: React.FC<StyleOptionProps> = ({ 
  imageUrl, 
  title, 
  selected, 
  onSelect, 
  className,
  showImage = true 
}) => {
  return (
    <div 
      className={cn(
        "cursor-pointer rounded-lg border-2 transition-all duration-200 hover:scale-105",
        selected 
          ? "border-blue-500 bg-blue-50" 
          : "border-gray-200 hover:border-gray-300",
        className
      )}
      onClick={onSelect}
    >
      {showImage && imageUrl && (
        <div className="aspect-square w-full overflow-hidden rounded-t-md">
          <img 
            src={imageUrl} 
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              // Fallback for missing images
              e.currentTarget.src = '/images/placeholder.jpg';
            }}
          />
        </div>
      )}
      <div className="p-2">
        <p className={cn(
          "text-xs font-medium text-center leading-tight",
          selected ? "text-blue-700" : "text-gray-700"
        )}>
          {title}
        </p>
      </div>
    </div>
  );
};

export default StyleOption;