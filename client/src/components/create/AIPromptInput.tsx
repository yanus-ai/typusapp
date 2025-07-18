import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Wand2, X } from 'lucide-react';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { selectMask, updateMaskStyle } from '@/features/masks/maskSlice';
import { fetchCustomizationOptions } from '@/features/customization/customizationSlice';

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
  const [selectedMaskId, setSelectedMaskId] = useState<number | null>(null);
  const [maskInputs, setMaskInputs] = useState<Record<number, string>>({});

  // Get mask state from Redux
  const {
    masks,
    maskStatus,
    loading: masksLoading,
  } = useAppSelector(state => state.masks);

  // Get customization options
  const { availableOptions, optionsLoading } = useAppSelector(state => state.customization);

  // Load customization options on mount
  useEffect(() => {
    if (!availableOptions) {
      dispatch(fetchCustomizationOptions());
    }
  }, [dispatch, availableOptions]);

  // Initialize mask inputs when masks are loaded
  useEffect(() => {
    if (masks.length > 0) {
      const initialInputs: Record<number, string> = {};
      masks.forEach(mask => {
        if (mask.materialOption) {
          initialInputs[mask.id] = mask.materialOption.displayName;
        } else {
          initialInputs[mask.id] = '';
        }
      });
      setMaskInputs(initialInputs);
    }
  }, [masks]);

  const handleSubmit = () => {
    if (prompt.trim()) {
      onSubmit(prompt, selectedMaskId ? [selectedMaskId] : []);
      setIsPromptModalOpen(false);
    }
  };

  const handleMaskSelect = (maskId: number) => {
    // Only one mask can be selected at a time
    setSelectedMaskId(selectedMaskId === maskId ? null : maskId);
  };

  const handleMaskInputChange = (maskId: number, value: string) => {
    setMaskInputs(prev => ({
      ...prev,
      [maskId]: value
    }));
  };

  const handleMaterialSelect = async (material: any, categoryType: 'material' | 'customization') => {
    if (!selectedMaskId) {
      alert('Please select a mask region first');
      return;
    }

    try {
      // Update the input field
      setMaskInputs(prev => ({
        ...prev,
        [selectedMaskId]: material.displayName
      }));

      // Update the mask style in the backend
      const updateData = categoryType === 'material' 
        ? { materialOptionId: material.id }
        : { customizationOptionId: material.id };

      await dispatch(updateMaskStyle({
        maskId: selectedMaskId,
        ...updateData
      })).unwrap();

      console.log('✅ Material assigned to mask successfully');
    } catch (error) {
      console.error('❌ Failed to assign material to mask:', error);
    }
  };

  // Helper function to convert RGB string to hex
  const rgbToHex = (rgbString: string) => {
    const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return '#000000';
    
    const [, r, g, b] = match;
    return '#' + [r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
  };

  // Render material options
  const renderMaterialOptions = () => {
    if (!availableOptions?.photorealistic?.walls) return null;

    const categories = ['brick', 'ceramics', 'concrete', 'glass', 'metal', 'stone', 'wood'];
    
    return (
      <div className="mt-6">
        <h4 className="text-white text-sm font-medium mb-3">Material Options</h4>
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {categories.map(category => {
            const categoryOptions = availableOptions.photorealistic.walls[category];
            if (!categoryOptions) return null;

            return (
              <div key={category} className="border-b border-gray-700 pb-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{category}</p>
                <div className="grid grid-cols-2 gap-2">
                  {categoryOptions.slice(0, 4).map((option: any) => (
                    <button
                      key={option.id}
                      onClick={() => handleMaterialSelect(option, 'material')}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-colors text-left disabled:opacity-50"
                      disabled={!selectedMaskId}
                    >
                      {option.thumbnailUrl && (
                        <img 
                          src={option.thumbnailUrl} 
                          alt={option.displayName}
                          className="w-8 h-8 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <span className="text-xs text-white truncate">{option.displayName}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-xs">
      {/* Modal content */}
      <div className="rounded-lg w-full mx-4 overflow-hidden relative h-full flex">
        {/* Close button in the top-right corner */}
        <button 
          className="absolute top-10 right-3 p-1 rounded-full hover:bg-black transition-colors cursor-pointer z-10"
          onClick={() => setIsPromptModalOpen(false)}
        >
          <X className="h-8 w-8 text-white" />
        </button>

        {/* Left Panel - Picture Regions & Materials */}
        {maskStatus !== "none" && (
          <div className="w-1/3 py-20 px-6 flex flex-col overflow-y-auto">
            <h3 className="text-white text-lg font-semibold mb-4">Picture Regions</h3>
            
            {/* Show masks if available */}
            {maskStatus === 'completed' && masks.length > 0 ? (
              <div className="space-y-4 flex-1">
                {/* Mask Grid */}
                <div className="space-y-3">
                  {masks.map((mask, index) => {
                    const isSelected = selectedMaskId === mask.id;
                    
                    return (
                      <div key={mask.id} className="space-y-2">
                        <div className="flex items-center gap-3 text-white">
                          <div
                            className={`relative rounded-lg overflow-hidden cursor-pointer border-2 transition-all flex-shrink-0 ${
                              isSelected
                                ? 'border-blue-500 ring-2 ring-blue-400/50 w-[80px] h-[80px]' 
                                : 'border-gray-600 hover:border-gray-500 h-[60px] w-[60px]'
                            }`}
                            onClick={() => handleMaskSelect(mask.id)}
                          >
                            <img
                              src={mask.maskUrl}
                              alt={`Region ${index + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            
                            {/* Color indicator */}
                            <div 
                              className="absolute top-1 right-1 w-3 h-3 rounded-full border border-white shadow-lg"
                              style={{ backgroundColor: rgbToHex(mask.color) }}
                            />
                            
                            {/* Selection indicator */}
                            {isSelected && (
                              <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <p className="text-xs text-gray-400 mb-1">Region {index + 1}</p>
                            <input
                              type="text"
                              value={maskInputs[mask.id] || ''}
                              onChange={(e) => handleMaskInputChange(mask.id, e.target.value)}
                              placeholder="Select material or type..."
                              className="w-full bg-gray-800 text-white text-sm border border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Selection Instructions */}
                <div className="text-gray-400 text-xs bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                  {selectedMaskId ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                      Region selected. Click materials below to assign.
                    </span>
                  ) : (
                    <span>💡 Select a region to assign materials from the catalog below.</span>
                  )}
                </div>

                {/* Material Options */}
                {!optionsLoading && renderMaterialOptions()}
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
        )}

        {/* Right Panel - Prompt Input */}
        <div className="flex-1 py-20 px-6 flex flex-col justify-center">
          <div className="max-w-2xl m-auto w-full flex flex-col flex-1 max-h-[470px]">
            <h2 className="text-white text-2xl font-bold mb-6 text-center">
              AI Prompt
            </h2>
            
            <div className="space-y-4 flex-1 flex flex-col">
              <textarea
                id="prompt-input"
                rows={8}
                className="flex-1 w-full bg-black text-white border border-gray-600 rounded-lg py-4 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-gray-400"
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
              
              {/* Show selection info */}
              {masks.length > 0 && (
                <div className="text-gray-400 text-sm bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                  {selectedMaskId ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                      Will transform selected region with assigned materials
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-gray-500 rounded-full"></span>
                      Will transform the entire image (no region selected)
                    </span>
                  )}
                </div>
              )}
              
              {error && (
                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-800">
                  {error}
                </div>
              )}

              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white mt-4 w-full flex items-center justify-center gap-2 py-3 text-lg font-medium disabled:opacity-50 transition-all duration-200 hover:scale-105 active:scale-95"
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
              
              <p className="text-gray-500 text-xs text-center">
                Press Ctrl+Enter to submit • {prompt.length} characters
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPromptInput;