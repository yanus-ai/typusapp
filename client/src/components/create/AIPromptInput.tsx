import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
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
  // Change to single selection
  const [selectedMaskId, setSelectedMaskId] = useState<number | null>(null);
  // Store input value per mask
  const [maskInputs, setMaskInputs] = useState<{ [maskId: number]: string }>({});
  // Add this state to track if the textarea is being edited
  const [editingMaskId, setEditingMaskId] = useState<number | null>(null);

  // Get mask state from Redux
  const {
    masks,
    maskStatus,
    selectedMaskId: reduxSelectedMaskId,
    loading: masksLoading,
  } = useAppSelector(state => state.masks);

  const handleSubmit = () => {
    if (prompt.trim()) {
      onSubmit(prompt, selectedMaskId !== null ? [selectedMaskId] : []);
      setIsPromptModalOpen(false);
    }
  };

  // Only one mask can be selected at a time
  const handleMaskSelect = (maskId: number) => {
    // If clicking the image of the already selected mask and not editing, unselect
    if (selectedMaskId === maskId && editingMaskId !== maskId) {
      setSelectedMaskId(null);
    } else {
      setSelectedMaskId(maskId);
    }
    // When image is clicked, editing mode is off
    setEditingMaskId(null);
  };

  // Expose a setter for EditInspector to update input value for selected mask
  // (You can move this to Redux if you want global access)
  const setInputForSelectedMask = (value: string) => {
    if (selectedMaskId !== null) {
      setMaskInputs((prev) => ({
        ...prev,
        [selectedMaskId]: value,
      }));
      // TODO: Call API or dispatch Redux action to persist mapping here
    }
  };

  // Make this function available globally if needed
  // window.setInputForSelectedMask = setInputForSelectedMask;

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
            {maskStatus === 'completed' && masks.length > 0 ? (
              <div className="space-y-4 flex-1 overflow-y-auto hide-scrollbar">
                <div className="grid grid-cols-1 gap-3">
                  {masks.map((mask, index) => {
                    const isSelected = selectedMaskId === mask.id;
                    return (
                      <div key={mask.id} className='flex items-center gap-3 text-white'>
                        <div
                          className={`relative rounded-lg overflow-hidden aspect-square cursor-pointer border-2 transition-all flex gap-4 flex-shrink-0 ${
                            isSelected
                              ? 'border-black w-[163px] h-[159px]'
                              : 'border-gray-600 hover:border-gray-500 h-[70px] w-[68px]'
                          }`}
                          onClick={() => handleMaskSelect(mask.id)}
                        >
                          <img
                            src={mask.maskUrl}
                            alt={`Region ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        {/* Editable textarea field */}
                        <textarea
                          className="bg-transparent px-2 py-1 text-white flex-1 w-auto ring-none focus:ring-none outline-none resize-none min-h-[32px] max-h-[120px]"
                          placeholder="Select from catalog or type"
                          value={maskInputs[mask.id] || ''}
                          onFocus={() => {
                            setSelectedMaskId(mask.id);
                            setEditingMaskId(mask.id);
                          }}
                          onBlur={() => setEditingMaskId(null)}
                          onChange={e =>
                            setMaskInputs(prev => ({
                              ...prev,
                              [mask.id]: e.target.value,
                            }))
                          }
                        />
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