import React, { useRef, useState, useEffect } from 'react';
import { 
  Brush, 
  ImagePlus, 
  Sparkles, 
  Square,
  Play,
  Move,
  Pencil,
  Loader2
} from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import squareSpinner from '@/assets/animations/square-spinner.lottie';
import { useCreditCheck } from '@/hooks/useCreditCheck';


interface OutpaintValues {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface TweakToolbarProps {
  currentTool: 'select' | 'region' | 'cut' | 'add' | 'rectangle' | 'brush' | 'move' | 'pencil';
  onToolChange: (tool: 'select' | 'region' | 'cut' | 'add' | 'rectangle' | 'brush' | 'move' | 'pencil') => void;
  onGenerate: () => void;
  onAddImage?: (file: File) => void;
  prompt?: string;
  onPromptChange: (prompt: string) => void;
  variations?: number;
  onVariationsChange?: (variations: number) => void;
  disabled?: boolean;
  loading?: boolean;
  // New props for per-image generation tracking
  isGenerating?: boolean;
  selectedImageType?: 'input' | 'generated';
  selectedImageId?: number;
  generatingInputImageId?: number;
  operationType?: 'outpaint' | 'inpaint';
  // Outpaint pixel values
  outpaintValues?: OutpaintValues;
  onOutpaintValuesChange?: (values: OutpaintValues) => void;
}

const TweakToolbar: React.FC<TweakToolbarProps> = ({
  currentTool,
  onToolChange,
  onGenerate,
  onAddImage,
  prompt = '',
  onPromptChange,
  variations = 1,
  onVariationsChange,
  disabled = false,
  loading = false,
  // New props for per-image generation tracking
  isGenerating = false,
  selectedImageType,
  selectedImageId,
  generatingInputImageId,
  operationType = 'outpaint',
  // Outpaint pixel values
  outpaintValues = { top: 0, bottom: 0, left: 0, right: 0 },
  onOutpaintValuesChange
}) => {
  const addImageInputRef = useRef<HTMLInputElement>(null);
  const [showTools, setShowTools] = useState<boolean>(false);
  const [pipelinePhase, setPipelinePhase] = useState<string>('');
  const { checkCreditsBeforeAction } = useCreditCheck();
  
  // Determine if we should show generation loading for current image
  const shouldShowGenerationLoading = isGenerating && (
    // For input images: show loading if this specific input image is generating
    (selectedImageType === 'input' && selectedImageId === generatingInputImageId) ||
    // For generated images: show loading during immediate generation phase
    // (will be stopped by server response for generated images)
    (selectedImageType === 'generated')
  );

  // Check pipeline state for showing progress
  useEffect(() => {
    const checkPipeline = () => {
      const pipelineState = (window as any).tweakPipelineState;
      setPipelinePhase(pipelineState?.phase || '');
    };

    // Check every 500ms to update button text
    const interval = setInterval(checkPipeline, 500);
    return () => clearInterval(interval);
  }, []);
  
  const getPipelineText = () => {
    switch (pipelinePhase) {
      case 'OUTPAINT_STARTED': return 'Phase 1: Outpaint...';
      case 'INPAINT_STARTING': return 'Starting Phase 2...';
      case 'INPAINT_STARTED': return 'Phase 2: Inpaint...';
      default: return 'Generate';
    }
  };

  // Handle generate with credit check
  const handleGenerateWithCreditCheck = () => {
    // Check credits before proceeding with generation
    if (!checkCreditsBeforeAction(1)) {
      return; // Credit check handles the error display
    }

    // If credit check passes, proceed with original onGenerate
    onGenerate();
  };

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
    {
      id: 'pencil' as const,
      icon: Pencil,
      label: 'Pencil',
      onClick: () => onToolChange('pencil')
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
        <div className="flex flex-col gap-2 bg-white rounded-lg px-2 py-2 shadow-lg">
          <div className="flex gap-2 justify-between">
              <div className="flex gap-4 justify-between flex-1">
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
                            className={`flex items-center gap-2 py-1 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                              isActive 
                                ? 'text-red-500'
                                : 'text-gray-500 hover:text-black'
                            } disabled:opacity-50 disabled:cursor-not-allowed group px-3 py-2`}
                            title={button.label}
                          >
                            <div className={`flex items-center justify-center rounded-lg  transition-all`}>
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
                      placeholder={prompt ? "" : "Draw a region on your image and describe what you want to see in this area."}
                      className="w-full h-full min-h-24 px-3 py-2 bg-transparent border-none text-black placeholder-gray-400 text-sm focus:outline-none resize-none custom-scrollbar"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1">
                  <button 
                    onClick={() => onVariationsChange?.(1)}
                    className={`rounded-md flex-1 bg-white flex items-center justify-center text-xs font-bold transition-colors py-2 ${
                      variations === 1 
                        ? 'text-red-500 border border-red-200 bg-red-50 shadow-lg' 
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    1
                  </button>
                  <button 
                    onClick={() => onVariationsChange?.(2)}
                    className={`rounded-md flex-1 bg-white flex items-center justify-center text-xs font-bold transition-colors py-2 ${
                      variations === 2 
                        ? 'text-red-500 border border-red-200 bg-red-50 shadow-lg' 
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    2
                  </button>
                </div>
                
                <button
                  onClick={handleGenerateWithCreditCheck}
                  disabled={disabled || loading || shouldShowGenerationLoading}
                  className="flex h-full items-center gap-2 px-4 py-3 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                  title="Generate image"
                >
                  {(loading || shouldShowGenerationLoading) ? (
                    <DotLottieReact
                      src={squareSpinner}
                      loop
                      autoplay
                      style={{ height: 35, width: 50 }}
                    />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  <span>{(loading || shouldShowGenerationLoading || pipelinePhase) ? getPipelineText() : 'Generate'}</span>
                </button>
              </div>
            <div>
              <div>
              {/* Re Generate Button */}

            </div>
            </div>
          </div>

          {/* Outpaint Pixel Values - only show for outpaint operations */}
          {operationType === 'outpaint' && (
            <div className="flex flex-col gap-2 py-2 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-600">Outpaint Extensions (pixels):</span>
              <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col items-center">
                  <label className="text-xs text-gray-500 mb-1">Top</label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={outpaintValues.top}
                    onChange={(e) => onOutpaintValuesChange?.({
                      ...outpaintValues,
                      top: parseInt(e.target.value) || 0
                    })}
                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center focus:outline-none focus:border-red-300"
                  />
                </div>
                <div className="flex flex-col items-center">
                  <label className="text-xs text-gray-500 mb-1">Bottom</label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={outpaintValues.bottom}
                    onChange={(e) => onOutpaintValuesChange?.({
                      ...outpaintValues,
                      bottom: parseInt(e.target.value) || 0
                    })}
                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center focus:outline-none focus:border-red-300"
                  />
                </div>
                <div className="flex flex-col items-center">
                  <label className="text-xs text-gray-500 mb-1">Left</label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={outpaintValues.left}
                    onChange={(e) => onOutpaintValuesChange?.({
                      ...outpaintValues,
                      left: parseInt(e.target.value) || 0
                    })}
                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center focus:outline-none focus:border-red-300"
                  />
                </div>
                <div className="flex flex-col items-center">
                  <label className="text-xs text-gray-500 mb-1">Right</label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={outpaintValues.right}
                    onChange={(e) => onOutpaintValuesChange?.({
                      ...outpaintValues,
                      right: parseInt(e.target.value) || 0
                    })}
                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center focus:outline-none focus:border-red-300"
                  />
                </div>
              </div>
              <div className="flex gap-1 justify-center">
                <button
                  onClick={() => onOutpaintValuesChange?.({ top: 200, bottom: 200, left: 200, right: 200 })}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  200px All
                </button>
                <button
                  onClick={() => onOutpaintValuesChange?.({ top: 0, bottom: 0, left: 200, right: 0 })}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Left 200px
                </button>
                <button
                  onClick={() => onOutpaintValuesChange?.({ top: 0, bottom: 0, left: 0, right: 200 })}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Right 200px
                </button>
                <button
                  onClick={() => onOutpaintValuesChange?.({ top: 0, bottom: 0, left: 0, right: 0 })}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          <div className='flex items-center gap-3 justify-between'>
            <button
              key={"addObjects"}
              onClick={() => {
                setShowTools(true);
                onToolChange(currentTool === 'rectangle' || currentTool === 'brush' || currentTool === 'pencil' ? currentTool : 'rectangle');
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                currentTool === 'rectangle' || currentTool === 'brush' || currentTool === 'pencil'
                  ? 'text-red-500 border border-red-200 bg-red-50 shadow-lg' 
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive 
                      ? 'text-red-500 border border-red-200 bg-red-50 shadow-lg' 
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
export type { OutpaintValues };