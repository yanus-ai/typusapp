import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { WandSparkles, X } from 'lucide-react';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { generateAIPrompt, setSavedPrompt } from '@/features/masks/maskSlice';
import { getRefineMaterials, removeLocalMaterial, removeMaterialLocal, saveLocalMaterials } from '@/features/refine/refineMaterialsSlice';
import ContextToolbar from './ContextToolbar';
import ImageTaggingStatus from '../common/ImageTaggingStatus';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loader from '@/assets/animations/loader.lottie';
import LightTooltip from '../ui/light-tooltip';
import { useTranslation } from '@/hooks/useTranslation';

interface RefineAIPromptInputProps {
  editInspectorMinimized?: boolean; // Whether the inspector is minimized
  handleSubmit: (userPrompt?: string, contextSelection?: string) => Promise<void> | void; // Function to handle form submission with user prompt and context
  setIsPromptModalOpen: (isOpen: boolean) => void;
  imageTags?: any[]; // Tags associated with the image
  imageTagsLoading?: boolean; // Loading state for image tags
  imageTaggingStatus?: 'processing' | 'completed' | 'failed'; // Tagging status for the image
  loading?: boolean;
  error?: string | null;
  inputImageId?: number; // Add inputImageId prop
}

const RefineAIPromptInput: React.FC<RefineAIPromptInputProps> = ({
  handleSubmit,
  setIsPromptModalOpen,
  imageTags,
  imageTagsLoading = false,
  imageTaggingStatus,
  loading = false,
  error,
  inputImageId
}) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const aiPromptLoading = useAppSelector(state => state.masks.aiPromptLoading);
  const savedPrompt = useAppSelector(state => state.masks.savedPrompt);
  
  // Use combined refine materials (saved + local)
  const savedMaterials = useAppSelector(state => state.refineMaterials.materials);
  const localMaterials = useAppSelector(state => state.refineMaterials.localMaterials);
  const refineMaterials = [...savedMaterials, ...localMaterials];

  // DEBUG: Log materials to help debug the React error
  console.log('🔍 DEBUG - RefineAIPromptInput materials:', {
    savedMaterials,
    localMaterials,
    refineMaterials,
    firstMaterialType: typeof refineMaterials?.[0],
    firstMaterial: refineMaterials?.[0]
  });
  
  const [prompt, setPrompt] = useState('');

  // Load refine materials when inputImageId changes
  useEffect(() => {
    if (inputImageId) {
      dispatch(getRefineMaterials(inputImageId));
    }
  }, [inputImageId, dispatch]);

  // Simply use the savedPrompt from Redux (loaded by RefinePage when base input image changes)
  useEffect(() => {
    if (savedPrompt) {
      setPrompt(savedPrompt);
    } else {
      // If no saved prompt exists, use empty string
      setPrompt('');
    }
  }, [savedPrompt]);

  const handleRemoveMaterial = (material: string) => {
    // IMPORTANT: Only remove materials locally - no API calls to database
    // Materials will be automatically saved to database when user:
    // 1. Clicks "Generate AI Prompt" button (calls saveLocalMaterials)
    // 2. Clicks "Upscale" button from ContextToolbar (calls saveLocalMaterials)
    
    // Check if it's a local material (not yet saved to database)
    if (localMaterials.includes(material)) {
      // Remove from local materials
      dispatch(removeLocalMaterial(material));
    } else if (savedMaterials.includes(material)) {
      // For saved materials, remove them locally from the saved materials array
      // This will remove them from Redux state without making an API call
      dispatch(removeMaterialLocal(material));
    } else {
      console.warn('⚠️ Material not found in local or saved materials:', material);
    }
  };

  const handleGenerateAIPrompt = async () => {
    if (!inputImageId) return;

    try {
      // First, save any local materials to the database
      await dispatch(saveLocalMaterials(inputImageId)).unwrap();
      console.log('✅ Local materials saved before AI prompt generation');

      // Use combined materials (saved + local) array as comma-separated text
      // Ensure materials are converted to strings before joining
      const materialsText = refineMaterials.map(material => {
        if (typeof material === 'string') {
          return material;
        } else if (typeof material === 'object' && material) {
          // Extract displayName, name, or fallback to JSON
          return ('displayName' in material ? String((material as any).displayName) :
                  'name' in material ? String((material as any).name) :
                  JSON.stringify(material));
        }
        return String(material);
      }).join(', ').toUpperCase();

      const result = await dispatch(generateAIPrompt({
        inputImageId,
        userPrompt: prompt,
        materialsText: materialsText,
        includeSelectedMaterials: false,
        systemPromptName: 'image-refinement' // Use refine-specific system prompt
      })).unwrap();

      // Update the prompt textarea with the generated prompt
      if (result.data.generatedPrompt) {
        setPrompt(result.data.generatedPrompt);
      }
    } catch (error) {
      console.error('Failed to generate AI prompt:', error);
    }
  };

  // Skeleton loader component for image tags
  const ImageTagSkeleton = () => (
    <div className="uppercase bg-transparent backdrop-blur-sm text-white text-sm py-2 px-3 rounded border border-white/50 inline-flex items-center gap-2 mr-2 mb-2 shadow-lg transition-all duration-200 animate-pulse">
      <div className="bg-white/20 rounded h-4 w-20"></div>
    </div>
  );

  return (
    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-xs">
      {/* Modal content */}
      <div className={`rounded-none w-full max-w-6xl mx-4 overflow-hidden relative h-full flex px-[88px]`}>
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
            {/* AI Refine Materials Tags */}
            <div>
              {/* Image Tagging Status */}
              <ImageTaggingStatus
                taggingStatus={imageTaggingStatus}
                tags={imageTags?.map(tagObj => ({ tag: tagObj.tag, confidence: tagObj.confidence || 0 })) || []}
                className="mb-2"
              />

              {(imageTagsLoading || imageTaggingStatus === 'processing') ? (
                // Show skeleton loaders while tags are loading or being processed
                Array.from({ length: 3 }).map((_, index) => (
                  <ImageTagSkeleton key={`skeleton-${index}`} />
                ))
              ) : (
                // Show actual tags only when tagging is completed or not processing
                imageTags?.map((tagObj, index) => (
                  <div
                    key={`${tagObj.tag}-${index}`}
                    className="uppercase bg-transparent backdrop-blur-sm text-white text-sm py-2 px-3 rounded border border-white/50 inline-flex items-center gap-2 mr-2 mb-2 shadow-lg transition-all duration-200"
                    style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)' }}
                  >
                    <span className=''>
                      {tagObj.tag}
                    </span>
                  </div>
                ))
              )}

              {refineMaterials.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {refineMaterials.map((material, index) => {
                      // Safety check: ensure material is a string
                      const materialText = typeof material === 'string' ? material : 
                                         (typeof material === 'object' && material ? 
                                          ('displayName' in material ? String((material as any).displayName) :
                                           'name' in material ? String((material as any).name) :
                                           JSON.stringify(material)) : 'Invalid Material');
                      
                      return (
                        <div 
                          key={`${materialText}-${index}`}
                          className="uppercase bg-transparent backdrop-blur-sm text-white text-sm py-2 px-3 rounded border border-white/50 flex items-center gap-2 shadow-lg transition-all duration-200"
                          style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)' }}
                        >
                          <span className=''>
                            {materialText}
                          </span>
                          <button
                            onClick={() => handleRemoveMaterial(typeof material === 'string' ? material : materialText)}
                            className="text-gray-300 hover:text-white transition-colors"
                            style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)' }}
                            title={t('refine.promptInput.removeMaterial')}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-4 flex-1 flex flex-col relative">
              <textarea
                id="prompt-input"
                className="flex-1 w-full text-white bg-transparent backdrop-blur-sm border-white/50 border-2 rounded-none py-4 px-4 focus:outline-none focus:border-white focus:backdrop-blur-md resize-none min-h-[200px] mb-0 uppercase placeholder:text-gray-300/80 shadow-lg transition-all duration-200 text-shadow-lg"
                style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)' }}
                placeholder={t('refine.promptPlaceholder')}
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
                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-none border border-red-800">
                  {error}
                </div>
              )}

              {/* Generate AI Prompt Button */}
              <div className="absolute h-auto bottom-0 right-0">
                <LightTooltip text={t('refine.promptInput.generatePrompt')} direction='bottom'>
                  <Button
                    className="h-auto bg-transparent hover:bg-transparent text-white flex items-center justify-center gap-2 hover:text-white group"
                    onClick={handleGenerateAIPrompt}
                    disabled={aiPromptLoading || !inputImageId}
                  >
                    {aiPromptLoading ? (
                      <div>
                        <DotLottieReact
                          src={loader}
                          autoplay
                          loop
                          style={{ transform: 'scale(3)', width: 24, height: 24 }}
                        />
                      </div>
                    ) : (
                      <div className="group-hover:scale-110">
                        <WandSparkles className='size-6' />
                      </div>
                    )}
                  </Button>
                </LightTooltip>
              </div>
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
        generateButtonText={t('refine.upscale')}
      />
    </div>
  );
};

export default RefineAIPromptInput;