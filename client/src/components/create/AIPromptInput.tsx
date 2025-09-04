import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { WandSparkles, X, House, Sparkle, Cloudy, TreePalm } from 'lucide-react';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setSelectedMaskId, setMaskInput, clearMaskStyle, removeAIPromptMaterial, removeAIPromptMaterialLocal, generateAIPrompt, getSavedPrompt, clearSavedPrompt, setSavedPrompt } from '@/features/masks/maskSlice';
import ContextToolbar from './ContextToolbar';

interface AIPromptInputProps {
  editInspectorMinimized: boolean; // Whether the inspector is minimized
  handleSubmit: (userPrompt?: string, contextSelection?: string) => Promise<void> | void; // Function to handle form submission with user prompt and context
  setIsPromptModalOpen: (isOpen: boolean) => void;
  loading?: boolean;
  error?: string | null;
  inputImageId?: number; // Add inputImageId prop
}

const AIPromptInput: React.FC<AIPromptInputProps> = ({ 
  editInspectorMinimized,
  handleSubmit,
  setIsPromptModalOpen,
  loading = false,
  error,
  inputImageId
}) => {
  const dispatch = useAppDispatch();
  const selectedMaskId = useAppSelector(state => state.masks.selectedMaskId);
  const maskInputs = useAppSelector(state => state.masks.maskInputs);
  const aiPromptMaterials = useAppSelector(state => state.masks.aiPromptMaterials);
  
  const aiPromptLoading = useAppSelector(state => state.masks.aiPromptLoading);
  const savedPrompt = useAppSelector(state => state.masks.savedPrompt);
  
  const [prompt, setPrompt] = useState('');
  const [editingMaskId, setEditingMaskId] = useState<number | null>(null);
  const [localMaskInputs, setLocalMaskInputs] = useState<{[key: number]: string}>({});

  // Simply use the savedPrompt from Redux (loaded by CreatePage when base input image changes)
  useEffect(() => {
    if (savedPrompt) {
      setPrompt(savedPrompt);
    } else {
      // If no saved prompt exists, use empty string
      setPrompt('');
    }
  }, [savedPrompt]);

  // Get mask state from Redux
  const {
    masks,
    maskStatus,
    // loading: maskLoading,
  } = useAppSelector(state => state.masks);

  const hasVisibleMask = masks.some(mask => mask.isVisible === true);

  const handleMaskSelect = (maskId: number) => {
    // If clicking the image of the already selected mask and not editing, unselect
    if (selectedMaskId === maskId && editingMaskId !== maskId) {
      dispatch(setSelectedMaskId(null));
    } else {
      dispatch(setSelectedMaskId(maskId));
    }
    // When image is clicked, editing mode is off
    setEditingMaskId(null);
  };

  const handleInputChange = (maskId: number, value: { displayName: string; imageUrl: string | null, category: string }) => {
    // Update local state immediately for responsive UI
    setLocalMaskInputs(prev => ({
      ...prev,
      [maskId]: value.displayName
    }));
    
    // Update Redux state
    dispatch(setMaskInput({ maskId, value }));
  };

  const clearSelectMask = (maskId: number) => {
    // Clear local state
    setLocalMaskInputs(prev => ({
      ...prev,
      [maskId]: ''
    }));
    
    dispatch(setMaskInput({ maskId: maskId, value: { displayName: '', imageUrl: null, category: '' } }));
    dispatch(setSelectedMaskId(null));    
    dispatch(clearMaskStyle(maskId));
  };

  const handleRemoveMaterial = async (materialId: number) => {
    try {
      // 1. Immediately remove from local state for instant UI feedback
      dispatch(removeAIPromptMaterialLocal(materialId));
      
      // 2. Remove from backend (this will happen in background)
      // Only call backend if it's a real ID (positive) not temporary ID (negative)
      if (materialId > 0) {
        await dispatch(removeAIPromptMaterial(materialId)).unwrap();
      }
    } catch (error) {
      console.error('Failed to remove material from backend:', error);
      // Note: We don't revert the local removal since user expects it to be gone
    }
  };

  const handleGenerateAIPrompt = async () => {
    if (!inputImageId) return;
    
    try {
      // Sync local mask inputs to Redux before generating AI prompt
      Object.entries(localMaskInputs).forEach(([maskId, displayName]) => {
        dispatch(setMaskInput({ 
          maskId: parseInt(maskId), 
          value: { 
            displayName: displayName.trim(),
            imageUrl: maskInputs[parseInt(maskId)]?.imageUrl || null,
            category: maskInputs[parseInt(maskId)]?.category || ''
          }
        }));
      });
      
      // Collect AI prompt materials and format as comma-separated text
      const materialsTextArray = aiPromptMaterials.map(material => {
        // Include subcategory if available for better context
        if (material.subCategory?.displayName) {
          return `${material.subCategory.displayName} ${material.displayName}`;
        }
        return material.displayName;
      });
      const materialsText = materialsTextArray.join(', ').toUpperCase();
      
      console.log('🎨 Sending materials to backend:', materialsText);
      
      const result = await dispatch(generateAIPrompt({
        inputImageId,
        userPrompt: prompt,
        materialsText: materialsText, // Send materials text from frontend
        includeSelectedMaterials: false // Don't fetch from backend
      })).unwrap();
      
      // Update the prompt textarea with the generated prompt
      if (result.data.generatedPrompt) {
        setPrompt(result.data.generatedPrompt);
      }
    } catch (error) {
      console.error('Failed to generate AI prompt:', error);
    }
  };

  const getMaskIcon = (mask: any) => {
    // First check if there's a customization option with subCategory
    if (mask.customizationOption?.subCategory?.slug) {
      switch (mask.customizationOption.subCategory.slug) {
        case 'type':
          return <House className="w-6 h-6 text-white" />;
        case 'lighting':
          return <Sparkle className="w-6 h-6 text-white" />;
        case 'weather':
          return <Cloudy className="w-6 h-6 text-white" />;
        case 'context':
          return <TreePalm className="w-6 h-6 text-white" />;
        case 'style':
          return <Sparkle className="w-6 h-6 text-white" />;
        default:
          return <Sparkle className="w-6 h-6 text-white" />; // Default for customization options
      }
    }
    
    // Then check if there's a subCategory for the mask region itself
    if (mask.subCategory) {
      switch (mask.subCategory.slug || mask.subCategory.name) {
        case 'type':
          return <House className="w-6 h-6 text-white" />;
        case 'lighting':
          return <Sparkle className="w-6 h-6 text-white" />;
        case 'weather':
          return <Cloudy className="w-6 h-6 text-white" />;
        case 'context':
          return <TreePalm className="w-6 h-6 text-white" />;
        case 'walls':
          return <House className="w-6 h-6 text-white" />; // Use House icon for walls
        case 'floors':
          return <House className="w-6 h-6 text-white" />; // Use House icon for floors  
        case 'style':
          return <Sparkle className="w-6 h-6 text-white" />; // Use Sparkle for style
        default:
          return <House className="w-6 h-6 text-white" />; // Default fallback
      }
    }
    
    // Fallback to maskInputs category if no subCategory available
    const category = maskInputs[mask.id]?.category;
    switch (category) {
      case 'type':
        return <House className="w-6 h-6 text-white" />;
      case 'lighting':
        return <Sparkle className="w-6 h-6 text-white" />;
      case 'weather':
        return <Cloudy className="w-6 h-6 text-white" />;
      case 'context':
        return <TreePalm className="w-6 h-6 text-white" />;
      case 'walls':
        return <House className="w-6 h-6 text-white" />;
      case 'floors':
        return <House className="w-6 h-6 text-white" />;
      case 'style':
        return <Sparkle className="w-6 h-6 text-white" />;
      default:
        return <House className="w-6 h-6 text-white" />; // Default fallback
    }
  }

  return (
    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-xs">
      {/* Modal content */}
      <div className={`rounded-lg w-full max-w-6xl mx-4 overflow-hidden relative h-full flex ${(maskStatus === "none" || !editInspectorMinimized) && 'pr-[80px]'}`}>
        {/* Close button in the top-right corner */}
        <button 
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-black transition-colors cursor-pointer"
          onClick={() => setIsPromptModalOpen(false)}
        >
          <X className="h-8 w-8 text-white" />
        </button>

        {/* Left Panel - Picture Regions */}
        {
          (maskStatus !== "none" || maskStatus === 'processing') &&
            <div className="w-1/3 pt-20 pb-24 flex flex-col">
            <h3 className="text-white text-lg font-semibold mb-4">Picture Regions</h3>
            {maskStatus === 'completed' && masks.length > 0 ? (
              <div className="space-y-4 flex-1 overflow-y-auto hide-scrollbar">
                <div className="grid grid-cols-1 gap-3">
                  {masks.filter(mask => mask.isVisible !== false).map((mask, index) => {
                    const isSelected = selectedMaskId === mask.id;
                    return (
                      <div key={mask.id} className='flex items-center gap-3 text-white'>
                        <div className='flex items-center gap-1'>
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
                          {/* Show material/customization option if any exist */}
                          {
                            (mask.materialOption || mask.customizationOption || maskInputs[mask.id]?.imageUrl || maskInputs[mask.id]?.category) && (
                              <div
                                className={`relative rounded-lg overflow-hidden aspect-square cursor-pointer border-2 transition-all flex gap-4 flex-shrink-0 h-[70px] w-[68px] flex items-center justify-center ${
                                  mask.materialOption?.thumbnailUrl || mask.customizationOption?.thumbnailUrl || maskInputs[mask.id]?.imageUrl 
                                    ? 'bg-gray-200' 
                                    : ''
                                }`}
                                onClick={() => clearSelectMask(mask.id)}
                                title={`Clear ${mask.customText || mask.materialOption?.displayName || mask.customizationOption?.displayName || 'selection'}`}
                              >
                                {(mask.materialOption?.thumbnailUrl || mask.customizationOption?.thumbnailUrl || maskInputs[mask.id]?.imageUrl) ? (
                                  <img
                                    src={mask.materialOption?.thumbnailUrl || mask.customizationOption?.thumbnailUrl || maskInputs[mask.id]?.imageUrl || undefined}
                                    alt={`${mask.customText || mask.materialOption?.displayName || mask.customizationOption?.displayName || 'Region'} ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    {getMaskIcon(mask)}
                                  </div>
                                )}
                              </div>
                            )
                          }
                        </div>
                        <input
                          id={`mask-displayName-${mask.id}`}
                          className="uppercase bg-transparent px-2 py-1 text-white flex-1 w-auto ring-none focus:ring-none outline-none"
                          placeholder="Select from catalog or type"
                          value={(() => {
                            // Priority: local state > Redux state > existing mask data
                            const localValue = localMaskInputs[mask.id];
                            if (localValue !== undefined) {
                              return localValue;
                            }
                            
                            const reduxValue = maskInputs[mask.id]?.displayName;
                            if (reduxValue !== undefined) {
                              return reduxValue;
                            }
                            
                            return mask.customText || 
                              mask.materialOption?.displayName ||
                              mask.customizationOption?.displayName ||
                              '';
                          })()}
                          onFocus={() => {
                            dispatch(setSelectedMaskId(mask.id));
                            setEditingMaskId(mask.id);
                          }}
                          onBlur={() => setEditingMaskId(null)}
                          onChange={e => handleInputChange(mask.id, { 
                            displayName: e.target.value,
                            imageUrl: maskInputs[mask.id]?.imageUrl || null,
                            category: maskInputs[mask.id]?.category || ''
                          })}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : maskStatus === 'processing' ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-3 border-gray-600 border-t-white mx-auto mb-4"></div>
                <p className="text-white text-base font-medium">Generating regions...</p>
                <p className="text-gray-300 text-sm mt-2">Analyzing your image to detect editable areas</p>
                <div className="mt-4 flex justify-center">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            ) : maskStatus === 'failed' && (
              <div className="text-center py-8">
                <div className="text-red-400 text-sm mb-2">⚠️ Failed to generate regions</div>
                <p className="text-gray-500 text-xs text-white">Please try generating regions again from the Edit Inspector</p>
              </div>
            )}
            </div>
        }

        {/* Right Panel - Prompt Input */}
        <div className="flex-1 pt-20 pb-24 px-6 flex flex-col justify-center">
          <div className="max-w-2xl m-auto w-full flex flex-col flex-1 max-h-[470px] overflow-y-auto hide-scrollbar">
            {/* AI Prompt Materials Tags */}
            <div>
              {aiPromptMaterials.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {aiPromptMaterials.map(material => (
                      <div 
                        key={material.id} 
                        className="uppercase bg-transparent backdrop-blur-sm text-white text-sm py-2 px-3 rounded border border-white/50 flex items-center gap-2 shadow-lg transition-all duration-200"
                        style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)' }}
                      >
                        <span className=''>
                          {material.subCategory?.displayName ? `${material.subCategory.displayName} ${material.displayName}` : material.displayName}
                        </span>
                        <button
                          onClick={() => handleRemoveMaterial(material.id)}
                          className="text-gray-300 hover:text-white transition-colors"
                          style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)' }}
                          title="Remove material"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-4 flex-1 flex flex-col relative">
              <textarea
                id="prompt-input"
                className="flex-1 w-full text-white bg-transparent backdrop-blur-sm border border-white/50 border-2 rounded-lg py-4 px-4 focus:outline-none focus:border-white focus:backdrop-blur-md resize-none min-h-[200px] mb-0 uppercase placeholder:text-gray-300/80 shadow-lg transition-all duration-200 text-shadow-lg"
                style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)' }}
                placeholder="CREATE AN ARCHITECTURAL VISUALIZATION OF AVANT-GARDE INNOVATIVE INDUSTRIAL"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleGenerateAIPrompt();
                  }
                }}
                disabled={loading}
              />
              
              {error && (
                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-800">
                  {error}
                </div>
              )}

              {/* Generate AI Prompt Button */}
              <Button
                className="absolute h-auto bottom-0 right-0 bg-transparent hover:bg-transparent text-white flex items-center justify-center gap-2 hover:text-white group"
                onClick={handleGenerateAIPrompt}
                disabled={aiPromptLoading || !inputImageId}
              >
                {aiPromptLoading ? (
                  <div>
                    <div className="w-8 h-8 text-white animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                ) : (
                  <div className="group-hover:scale-110">
                    <WandSparkles className='size-6' />
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>

        <ContextToolbar 
          setIsPromptModalOpen={setIsPromptModalOpen} 
          onSubmit={async (userPrompt, contextSelection) => {
            // Sync local mask inputs to Redux before submission
            Object.entries(localMaskInputs).forEach(([maskId, displayName]) => {
              dispatch(setMaskInput({ 
                maskId: parseInt(maskId), 
                value: { 
                  displayName: displayName.trim(),
                  imageUrl: maskInputs[parseInt(maskId)]?.imageUrl || null,
                  category: maskInputs[parseInt(maskId)]?.category || ''
                }
              }));
            });
            
            // Update Redux store with current prompt before submission
            dispatch(setSavedPrompt(userPrompt));
            await handleSubmit(userPrompt, contextSelection);
          }}
          userPrompt={prompt}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default AIPromptInput;