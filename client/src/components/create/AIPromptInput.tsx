import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wand2, X } from 'lucide-react';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { selectMask, updateMaskStyle } from '@/features/masks/maskSlice';

interface AIPromptInputProps {
  onSubmit: (prompt: string, selectedMasks?: number[]) => void;
  setIsPromptModalOpen: (isOpen: boolean) => void;
  loading?: boolean;
  error?: string | null;
}

const AIPromptInput: React.FC<AIPromptInputProps> = ({ 
  onSubmit, 
  setIsPromptModalOpen, 
  loading = false,
  error 
}) => {
  const dispatch = useAppDispatch();
  const [prompt, setPrompt] = useState('CREATE AN ARCHITECTURAL VISUALIZATION OF AVANT-GARDE INNOVATIVE INDUSTRIAL');
  const [selectedMasks, setSelectedMasks] = useState<number[]>([]);

  // Get mask state from Redux
  const {
    masks,
    maskStatus,
    selectedMaskId,
    loading: masksLoading,
  } = useAppSelector(state => state.masks);

  const handleSubmit = () => {
    if (prompt.trim()) {
      onSubmit(prompt, selectedMasks);
      setIsPromptModalOpen(false);
    }
  };

  const handleMaskToggle = (maskId: number) => {
    setSelectedMasks(prev => {
      if (prev.includes(maskId)) {
        return prev.filter(id => id !== maskId);
      } else {
        return [...prev, maskId];
      }
    });
  };

  const handleSelectAllMasks = () => {
    if (selectedMasks.length === masks.length) {
      setSelectedMasks([]);
    } else {
      setSelectedMasks(masks.map(mask => mask.id));
    }
  };

  // Helper function to convert RGB string to hex
  const rgbToHex = (rgbString: string) => {
    const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return '#000000';
    
    const [, r, g, b] = match;
    return '#' + [r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
  };

  return (
    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-xs">
      {/* Modal content */}
      <div className="rounded-lg w-full mx-4 overflow-hidden relative h-full flex">
        {/* Close button in the top-right corner */}
        <button 
          className="absolute top-10 right-3 p-1 rounded-full hover:bg-black transition-colors cursor-pointer"
          onClick={() => setIsPromptModalOpen(false)}
        >
          <X className="h-8 w-8 text-white" />
        </button>

        {/* Left Panel - Picture Regions */}
        {
          maskStatus !== "none" &&
            <div className="w-1/3 py-20 px-6 flex flex-col">
            <h3 className="text-white text-lg font-semibold mb-4">Picture Regions</h3>
            
            {/* Show masks if available */}
            {maskStatus === 'completed' && masks.length > 0 ? (
              <div className="space-y-4 flex-1 overflow-y-auto hide-scrollbar">
                {/* Mask Grid */}
                <div className="grid grid-cols-1 gap-3">
                  {masks.map((mask, index) => {
                    const isSelected = selectedMasks.includes(mask.id);
                    
                    return (
                      <div className='flex items-center gap-3 text-white'>
                        <div
                          key={mask.id}
                          className={`relative rounded-lg overflow-hidden aspect-square cursor-pointer border-2 transition-all flex gap-4 flex-shrink-0 ${
                            isSelected
                              ? 'border-black w-[163px] h-[159px]' 
                              : 'border-gray-600 hover:border-gray-500 h-[70px] w-[68px]'
                          }`}
                          onClick={() => handleMaskToggle(mask.id)}
                        >
                          <img
                            src={mask.maskUrl}
                            alt={`Region ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />                    
                        </div>
                        <p>
                          SELECT FROM CATALOG OR TYPE
                        </p>    
                      </div>
                    );
                  })}
                </div>              
              </div>
            ) : maskStatus === 'processing' ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-600 border-t-blue-500 mx-auto mb-3"></div>
                <p className="text-gray-300 text-sm">Generating regions...</p>
                <p className="text-gray-500 text-xs mt-1">Please wait while we analyze your image</p>
              </div>
            ) : maskStatus === 'failed' && (
              <div className="text-center py-8">
                <div className="text-red-400 text-sm mb-2">⚠️ Failed to generate regions</div>
                <p className="text-gray-500 text-xs">Please try generating regions again from the Edit Inspector</p>
              </div>
            )}
            </div>
        }

        {/* Right Panel - Prompt Input */}
        <div className="flex-1 py-20 px-6 flex flex-col justify-center">
          <div className="max-w-2xl m-auto w-full flex flex-col flex-1 max-h-[470px]">
            <div className="space-y-4 flex-1 flex flex-col ">
              <textarea
                id="prompt-input"
                className="flex-1 w-full bg-black text-white border border-gray-600 rounded-lg py-4 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe the architectural visualization you want to create..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleSubmit();
                  }
                }}
                disabled={loading}
              />
              
              {error && (
                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-800">
                  {error}
                </div>
              )}

              <Button
                className="bg-black text-white mt-4 w-full flex items-center justify-center gap-2 border border-white hover:text-white"
                onClick={handleSubmit}
                disabled={loading || !prompt.trim()}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Wand2 className="h-5 w-5" />
                    Create
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPromptInput;