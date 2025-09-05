import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { WandSparkles, X } from 'lucide-react';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { generateAIPrompt, setSavedPrompt, removeAIPromptMaterial, removeAIPromptMaterialLocal, getAIPromptMaterials } from '@/features/masks/maskSlice';
import ContextToolbar from '../create/ContextToolbar';

interface RefineAIPromptInputProps {
  editInspectorMinimized: boolean; // Whether the inspector is minimized
  handleSubmit: (userPrompt?: string, contextSelection?: string) => Promise<void> | void; // Function to handle form submission with user prompt and context
  setIsPromptModalOpen: (isOpen: boolean) => void;
  loading?: boolean;
  error?: string | null;
  inputImageId?: number; // Add inputImageId prop
}

const RefineAIPromptInput: React.FC<RefineAIPromptInputProps> = ({ 
  editInspectorMinimized,
  handleSubmit,
  setIsPromptModalOpen,
  loading = false,
  error,
  inputImageId
}) => {
  const dispatch = useAppDispatch();
  const aiPromptLoading = useAppSelector(state => state.masks.aiPromptLoading);
  const savedPrompt = useAppSelector(state => state.masks.savedPrompt);
  const aiPromptMaterials = useAppSelector(state => state.masks.aiPromptMaterials);
  
  const [prompt, setPrompt] = useState('');

  // Simply use the savedPrompt from Redux (loaded by RefinePage when base input image changes)
  useEffect(() => {
    if (savedPrompt) {
      setPrompt(savedPrompt);
      console.log('💬 REFINE: Using saved prompt from Redux:', savedPrompt.substring(0, 50) + '...');
    } else {
      // If no saved prompt exists, use empty string
      setPrompt('');
      console.log('💬 REFINE: No saved prompt available, using empty string');
    }
  }, [savedPrompt]);

  const handleRemoveMaterial = async (materialId: number) => {
    try {
      // 1. Immediately remove from local state for instant UI feedback
      dispatch(removeAIPromptMaterialLocal(materialId));
      
      // 2. Remove from backend (this will happen in background)
      // Only call backend if it's a real ID (positive) not temporary ID (negative)
      if (materialId > 0) {
        await dispatch(removeAIPromptMaterial(materialId)).unwrap();
        console.log('✅ Successfully removed material from backend:', materialId);
      }
    } catch (error) {
      console.error('❌ Failed to remove material from backend:', error);
      
      // Revert the local removal since backend failed by reloading the materials
      if (inputImageId) {
        console.log('🔄 Reloading AI materials from server due to backend error');
        dispatch(getAIPromptMaterials(inputImageId));
      }
    }
  };

  const handleGenerateAIPrompt = async () => {
    if (!inputImageId) return;
    
    try {
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

  return (
    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-xs">
      {/* Modal content */}
      <div className={`rounded-lg w-full max-w-6xl mx-4 overflow-hidden relative h-full flex px-[88px]`}>
        {/* Close button in the top-right corner */}
        <button 
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-black transition-colors cursor-pointer"
          onClick={() => setIsPromptModalOpen(false)}
        >
          <X className="h-8 w-8 text-white" />
        </button>

        {/* Main Panel - Prompt Input (No masks/materials sections) */}
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
                placeholder="ENHANCE THE LIGHTING AND ADD MORE ARCHITECTURAL DETAILS TO CREATE A MORE REFINED VISUALIZATION"
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  // Save to Redux state as user types
                  dispatch(setSavedPrompt(e.target.value));
                }}
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
      </div>

      <ContextToolbar 
        setIsPromptModalOpen={setIsPromptModalOpen} 
        onSubmit={async (userPrompt, contextSelection) => {
          // Update Redux store with current prompt before submission
          dispatch(setSavedPrompt(userPrompt));
          await handleSubmit(userPrompt, contextSelection);
        }}
        userPrompt={prompt}
        loading={loading}
        generateButtonText="Upscale"
      />
    </div>
  );
};

export default RefineAIPromptInput;