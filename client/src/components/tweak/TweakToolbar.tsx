import React, { useRef } from 'react';
import { 
  MousePointer2, 
  Brush, 
  Scissors, 
  ImagePlus, 
  Sparkles, 
  RotateCcw,
  Images
} from 'lucide-react';

interface TweakToolbarProps {
  currentTool: 'select' | 'region' | 'cut' | 'add';
  onToolChange: (tool: 'select' | 'region' | 'cut' | 'add') => void;
  onGenerate: () => void;
  onReGenerate?: () => void;
  onGallery?: () => void;
  onAddImage?: (file: File) => void;
  prompt?: string;
  onPromptChange?: (prompt: string) => void;
  disabled?: boolean;
}

const TweakToolbar: React.FC<TweakToolbarProps> = ({
  currentTool,
  onToolChange,
  onGenerate,
  onReGenerate,
  onGallery,
  onAddImage,
  prompt = '',
  onPromptChange,
  disabled = false
}) => {
  const addImageInputRef = useRef<HTMLInputElement>(null);

  const handleAddImageClick = () => {
    if (onAddImage) {
      addImageInputRef.current?.click();
    }
  };

  const handleAddImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAddImage) {
      onAddImage(file);
    }
  };

  const toolButtons = [
    {
      id: 'select' as const,
      icon: MousePointer2,
      label: 'Select',
      onClick: () => onToolChange('select')
    },
    {
      id: 'region' as const,
      icon: Brush,
      label: 'Change Region',
      onClick: () => onToolChange('region')
    },
    {
      id: 'cut' as const,
      icon: Scissors,
      label: 'Cut Objects',
      onClick: () => onToolChange('cut')
    },
    {
      id: 'add' as const,
      icon: ImagePlus,
      label: 'Add Image',
      onClick: handleAddImageClick
    }
  ];


  return (
    <>
      {/* Main Toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-2 shadow-lg">
          {/* Tool Buttons */}
          {toolButtons.map((button) => {
            const Icon = button.icon;
            const isActive = currentTool === button.id;
            
            return (
              <button
                key={button.id}
                onClick={button.onClick}
                disabled={disabled}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive 
                    ? 'bg-gray-100 text-gray-900' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Icon size={16} />
                <span>{button.label}</span>
              </button>
            );
          })}

          {/* Generate Button */}
          <button
            onClick={onGenerate}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <Sparkles size={16} />
            <span>Generate</span>
          </button>

          {/* Re Generate Button */}
          {onReGenerate && (
            <button
              onClick={onReGenerate}
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <RotateCcw size={16} />
              <span>Re Generate</span>
            </button>
          )}

          {/* Gallery Button */}
          {onGallery && (
            <button
              onClick={onGallery}
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Images size={16} />
              <span>Gallery</span>
            </button>
          )}
        </div>
      </div>

      {/* Prompt Input - Bottom Center (when needed) */}
      {onPromptChange && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 w-96">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200">
            <input
              type="text"
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder="Describe what you want to generate..."
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Hidden file input for Add Image */}
      <input
        ref={addImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleAddImageChange}
        className="hidden"
      />
    </>
  );
};

export default TweakToolbar;