import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LayoutType, ImageSizeType } from '@/pages/gallery/GalleryPage';

interface CustomizeViewSidebarProps {
  layout: LayoutType;
  imageSize: ImageSizeType;
  onLayoutChange: (layout: LayoutType) => void;
  onImageSizeChange: (size: ImageSizeType) => void;
}

const CustomizeViewSidebar: React.FC<CustomizeViewSidebarProps> = ({
  layout,
  imageSize,
  onLayoutChange,
  onImageSizeChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="w-[332px] flex flex-col">
      {/* Collapsible Card */}
      <div className="bg-white border border-gray-200 rounded-none shadow-sm">
        {/* Header - Clickable to toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-medium text-gray-900">Customize your view</h2>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {/* Collapsible Content */}
        {isExpanded && (
          <div className="p-6 space-y-6 border-t border-gray-100">
        {/* Layout Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4">Layout</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="layout"
                value="full"
                checked={layout === 'full'}
                onChange={() => onLayoutChange('full')}
                className="w-4 h-4 text-black border-gray-300 focus:ring-black accent-black"
              />
              <span className="text-sm text-gray-700">Full</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="layout"
                value="square"
                checked={layout === 'square'}
                onChange={() => onLayoutChange('square')}
                className="w-4 h-4 text-black border-gray-300 focus:ring-black accent-black"
              />
              <span className="text-sm text-gray-700">Square</span>
            </label>
          </div>
        </div>

        {/* Image Size Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4">Image Size</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="imageSize"
                value="large"
                checked={imageSize === 'large'}
                onChange={() => onImageSizeChange('large')}
                className="w-4 h-4 text-black border-gray-300 focus:ring-black accent-black"
              />
              <span className="text-sm text-gray-700">Large</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="imageSize"
                value="medium"
                checked={imageSize === 'medium'}
                onChange={() => onImageSizeChange('medium')}
                className="w-4 h-4 text-black border-gray-300 focus:ring-black accent-black"
              />
              <span className="text-sm text-gray-700">Medium</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="imageSize"
                value="small"
                checked={imageSize === 'small'}
                onChange={() => onImageSizeChange('small')}
                className="w-4 h-4 text-black border-gray-300 focus:ring-black accent-black"
              />
              <span className="text-sm text-gray-700">Small</span>
            </label>
          </div>
        </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomizeViewSidebar;