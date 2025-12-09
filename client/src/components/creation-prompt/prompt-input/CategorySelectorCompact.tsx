import React from 'react';
import { cn } from '@/lib/utils';

interface CategorySelectorCompactProps {
  imageUrl?: string;
  title: string;
  selected: boolean;
  onSelect: () => void;
  className?: string;
  showImage?: boolean;
  draggable?: boolean;
  dragData?: {
    option: any;
    materialOption: string;
    type: string;
  };
}

const CategorySelectorCompact: React.FC<CategorySelectorCompactProps> = ({ 
  imageUrl, 
  title, 
  selected, 
  onSelect, 
  className,
  showImage = false,
  draggable = false,
  dragData
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    if (dragData) {
      e.dataTransfer.setData('application/json', JSON.stringify(dragData));
      e.dataTransfer.effectAllowed = 'copy';
    }
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      draggable={draggable && !!dragData}
      onDragStart={handleDragStart}
      className={cn(
        "w-full px-1 rounded border transition-all text-start",
        "hover:border-gray-300 hover:bg-gray-50",
        draggable && dragData && "cursor-grab active:cursor-grabbing",
        selected 
          ? "border-gray-300 bg-gray-50 text-primary-700 font-medium" 
          : "border-gray-200 bg-white text-gray-700",
        className
      )}
    >
      {showImage && imageUrl ? (
        <div className="flex items-center gap-2">
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-10 h-10 rounded object-cover flex-shrink-0"
          />
          <span className="text-sm leading-tight line-clamp-1 capitalize">{title.toLowerCase()}</span>
        </div>
      ) : (
        <span className="text-sm capitalize">{title.toLowerCase()}</span>
      )}
    </button>
  );
};

export default CategorySelectorCompact;

