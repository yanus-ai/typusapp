import React, { useRef, useState } from 'react';
import { 
  Brush, 
  ImagePlus, 
  Sparkles, 
  Square,
  Play,
  Move
} from 'lucide-react';

interface TweakToolbarProps {
  currentTool: 'select' | 'region' | 'cut' | 'add' | 'rectangle' | 'brush' | 'move';
  onToolChange: (tool: 'select' | 'region' | 'cut' | 'add' | 'rectangle' | 'brush' | 'move') => void;
  onGenerate: () => void;
  onAddImage?: (file: File) => void;
  prompt?: string;
  onPromptChange: (prompt: string) => void;
  disabled?: boolean;
}

const TweakToolbar: React.FC<TweakToolbarProps> = ({
  currentTool,
  onToolChange,
  onGenerate,
  onAddImage,
  prompt = '',
  onPromptChange,
  disabled = false
}) => {
  const addImageInputRef = useRef<HTMLInputElement>(null);
  const [showTools, setShowTools] = useState<boolean>(false);

  const handleAddImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAddImage) {
      onAddImage(file);
    }
  };

  // Left side tool buttons (always visible)
  const leftToolButtons = [
    {
      id: 'rectangle' as const,
      icon: Square,
      label: 'Rectangle',
      onClick: () => onToolChange('rectangle')
    },
    {
      id: 'brush' as const,
      icon: Brush,
      label: 'Brush',
      onClick: () => onToolChange('brush')
    },
  ];

  // Bottom toolbar buttons
  const bottomToolButtons = [
    {
      id: 'select' as const,
      icon: Play,
      label: 'Expand Border',
      onClick: () => {
        setShowTools(false);
        onToolChange('select');
      }
    },
    {
      id: 'move' as const,
      icon: Move,
      label: 'Move Objects',
      onClick: () => {
        setShowTools(false);
        onToolChange('move');
      }
    },
    {
      id: 'add' as const,
      icon: ImagePlus,
      label: 'Add Image',
      onClick: () => addImageInputRef.current?.click()
    }
  ];

  return (
    <>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div className="flex flex-col gap-2 bg-[#F0F0F0] backdrop-blur-sm rounded-lg px-2 py-2 shadow-lg">
          <div className="flex gap-2 justify-between">
              <div className="flex gap-2 justify-between flex-1">
                {/* Center Prompt Input */}
                {
                  showTools && (
                    <div className='flex gap-2 flex-col'>
                      {leftToolButtons.map((button) => {
                        const Icon = button.icon;
                        const isActive = currentTool === button.id;
                        
                        return (
                          <button
                            key={button.id}
                            onClick={button.onClick}
                            className={`flex items-center gap-2 px-3 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                              isActive 
                                ? 'text-black'
                                : 'text-gray-500 hover:text-black'
                            } disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm group`}
                            title={button.label}
                          >
                            <div className={`flex items-center justify-center w-8 h-8 rounded-lg backdrop-blur-sm ${isActive ? 'bg-white text-black' : 'bg-white/10 text-gray-500 '} group-hover:bg-white group-hover:text-black group-hover:shadow-lg transition-all`}>
                              <Icon size={16} />
                            </div>
                            <span className="whitespace-nowrap">{button.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )
                }
                <div className="flex-1">
                  <div className="bg-white backdrop-blur-sm rounded-lg shadow-lg h-full">
                    <textarea
                      value={prompt}
                      onChange={(e) => onPromptChange(e.target.value)}
                      placeholder="Draw a region on your image and describe what you want to see in this area."
                      className="w-full h-full min-h-24 px-3 py-2 bg-transparent border-none text-black placeholder-gray-400 text-sm focus:outline-none resize-none custom-scrollbar"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1">
                  <span className="bg-white text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                  <span className="bg-gray-200 text-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                </div>
                
                <button
                  onClick={onGenerate}
                  disabled={disabled}
                  className="flex h-full items-center gap-2 px-4 py-3 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                >
                  <Sparkles size={16} />
                  <span>Generate</span>
                </button>
              </div>
            <div>
              <div>
              {/* Re Generate Button */}

            </div>
            </div>
          </div>

          <div className='flex items-center gap-3 justify-between'>
            <button
              key={"addObjects"}
              onClick={() => {
                setShowTools(true);
                onToolChange(currentTool === 'rectangle' || currentTool === 'brush' ? currentTool : 'rectangle');
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                currentTool === 'rectangle' || currentTool === 'brush' 
                  ? 'bg-white text-black shadow-lg' 
                  : 'text-gray-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ImagePlus size={16} />
              <span>Add Objects</span>
            </button>
            
            {bottomToolButtons.map((button) => {
              const Icon = button.icon;
              const isActive = currentTool === button.id;
              
              return (
                <button
                  key={button.id}
                  onClick={button.onClick}
                  disabled={disabled}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive 
                      ? 'bg-white text-black shadow-lg' 
                      : 'text-gray-500'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Icon size={16} />
                  <span>{button.label}</span>
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
    </>
  );
};

export default TweakToolbar;