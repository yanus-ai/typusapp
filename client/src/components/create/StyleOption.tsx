import React from 'react';

interface StyleOptionProps {
  imageUrl: string;
  title: string;
  selected: boolean;
  onSelect: () => void;
}

const StyleOption: React.FC<StyleOptionProps> = ({ 
  imageUrl, 
  title, 
  selected,
  onSelect 
}) => {
  return (
    <div 
      className={`flex flex-col items-center cursor-pointer ${selected ? 'ring-2 ring-blue-500' : ''}`}
      onClick={onSelect}
    >
      <div className="rounded-lg overflow-hidden mb-1 size-[57px]">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>
      <span className="text-xs text-center">{title}</span>
    </div>
  );
};

export default StyleOption;