import React, { useRef } from 'react';
import { 
  MousePointer2, 
  Brush, 
  Scissors, 
  ImagePlus, 
  Play, 
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
  disabled?: boolean;
}

const TweakToolbar: React.FC<TweakToolbarProps> = ({
  currentTool,
  onToolChange,
  onGenerate,
  onReGenerate,
  onGallery,
  onAddImage,
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

  const actionButtons = [
    {
      id: 'generate',
      icon: Play,
      label: 'Generate',
      onClick: onGenerate,
      variant: 'primary' as const
    },
    {
      id: 'regenerate',
      icon: RotateCcw,
      label: 'Re Generate',
      onClick: onReGenerate,
      variant: 'secondary' as const
    },
    {
      id: 'gallery',
      icon: Images,
      label: 'Gallery',
      onClick: onGallery,
      variant: 'secondary' as const
    }
  ];

  return (
    <div className="bg-[#323232] rounded-lg absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      <div className="flex p-1 justify-center">
        <div className="rounded-lg px-1 flex gap-4 items-center">
          {/* Tool Buttons */}
          <div className="flex items-center gap-2">
            {toolButtons.map((button) => {
              const Icon = button.icon;
              const isActive = currentTool === button.id;
              
              return (
                <button
                  key={button.id}
                  onClick={button.onClick}
                  disabled={disabled}
                  className={`flex items-center px-4 py-4 rounded-lg text-sm h-auto text-white ${
                    isActive 
                      ? 'bg-[#191919] text-white hover:bg-[#191919]' 
                      : 'bg-transparent hover:bg-white/50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Icon size={16} />
                  <span className="ml-2">{button.label}</span>
                </button>
              );
            })}
          </div>

          <div className="border-e border-2 h-1/2 border-white rounded-md"></div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {actionButtons.map((button) => {
              const Icon = button.icon;
              
              return (
                <button
                  key={button.id}
                  onClick={button.onClick}
                  disabled={disabled || (button.id === 'regenerate' && !onReGenerate) || (button.id === 'gallery' && !onGallery)}
                  className="bg-black text-white px-4 py-4 rounded-lg text-sm h-auto hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Icon size={16} />
                  <span className="ml-2">{button.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hidden file input for Add Image */}
      <input
        ref={addImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleAddImageChange}
        className="hidden"
      />
    </div>
  );
};

export default TweakToolbar;