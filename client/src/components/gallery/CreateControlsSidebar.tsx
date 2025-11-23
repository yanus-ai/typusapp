import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { SLIDER_CONFIGS } from '@/constants/editInspectorSliders';

interface CreateControlsSidebarProps {
  selectedImage?: {
    id: number;
    prompt?: string;
    variations?: number;
    settings?: {
      creativity: number;
      expressivity: number;
      resemblance: number;
    };
  };
  selectedBatch?: {
    batchId: number;
    prompt?: string;
    settings?: {
      creativity: number;
      expressivity: number;
      resemblance: number;
      variations: number;
    };
  };
  onRegenerate?: (settings: {
    variations: number;
    creativity: number;
    expressivity: number;
    resemblance: number;
    prompt?: string;
  }) => void;
  onCreateFromBatch?: (settings: {
    batchId: number;
    variations: number;
    creativity: number;
    expressivity: number;
    resemblance: number;
    prompt?: string;
  }) => void;
}

const CreateControlsSidebar: React.FC<CreateControlsSidebarProps> = ({ 
  selectedImage, 
  selectedBatch,
  onRegenerate,
  onCreateFromBatch
}) => {
  // Initialize state based on selected batch or image (batch takes priority)
  const getInitialSettings = () => {
    if (selectedBatch?.settings) {
      return {
        variations: selectedBatch.settings.variations,
        creativity: selectedBatch.settings.creativity,
        expressivity: selectedBatch.settings.expressivity,
        resemblance: selectedBatch.settings.resemblance
      };
    }
    if (selectedImage?.settings) {
      return {
        variations: selectedImage.variations || 1,
        creativity: selectedImage.settings.creativity,
        expressivity: selectedImage.settings.expressivity,
        resemblance: selectedImage.settings.resemblance
      };
    }
    return {
      variations: 1,
      creativity: SLIDER_CONFIGS.creativity.default,
      expressivity: SLIDER_CONFIGS.expressivity.default,
      resemblance: SLIDER_CONFIGS.resemblance.default
    };
  };

  const initialSettings = getInitialSettings();
  const [variations, setVariations] = useState(initialSettings.variations);
  const [creativity, setCreativity] = useState(initialSettings.creativity);
  const [expressivity, setExpressivity] = useState(initialSettings.expressivity);
  const [resemblance, setResemblance] = useState(initialSettings.resemblance);

  // Update state when selectedBatch or selectedImage changes
  useEffect(() => {
    const newSettings = getInitialSettings();
    setVariations(newSettings.variations);
    setCreativity(newSettings.creativity);
    setExpressivity(newSettings.expressivity);
    setResemblance(newSettings.resemblance);
  }, [selectedBatch, selectedImage]);

  const handleCopyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      // TODO: Add toast notification
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  };

  const handleRerun = () => {
    if (selectedBatch && onCreateFromBatch) {
      // Create new input image from batch and start new generation
      onCreateFromBatch({
        batchId: selectedBatch.batchId,
        variations,
        creativity,
        expressivity,
        resemblance,
        prompt: selectedBatch.prompt || primaryPrompt,
      });
    } else if (onRegenerate) {
      // Regular regeneration for single images
      onRegenerate({
        variations,
        creativity,
        expressivity,
        resemblance,
        prompt: selectedBatch?.prompt || selectedImage?.prompt,
      });
    }
  };

  // Get prompt from batch or image (batch takes priority)
  const primaryPrompt = selectedBatch?.prompt || selectedImage?.prompt || "Create an architectural building in which there are some medieval textures are there And two womans are walking in mid street of that building front area.";
  
  // Determine what's currently selected for display
  const isDisplayingBatch = selectedBatch !== null;

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <style dangerouslySetInnerHTML={{
        __html: `
          .black-slider::-webkit-slider-thumb {
            appearance: none;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #000000;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          
          .black-slider::-moz-range-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #000000;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
        `
      }} />
      {/* Header showing what's selected */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          {isDisplayingBatch ? (
            <>
              <div className="w-2 h-2 bg-black rounded-full"></div>
              <span className="text-sm font-medium text-gray-900">
                Generation Batch {selectedBatch?.batchId}
              </span>
            </>
          ) : selectedImage ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-900">
                Image {selectedImage.id}
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-sm font-medium text-gray-500">
                No Selection
              </span>
            </>
          )}
        </div>
        {isDisplayingBatch && (
          <div className="text-xs text-gray-500">
            {selectedBatch?.settings ? 
              `${selectedBatch.settings.variations} variations • Settings loaded` :
              'Settings unavailable'
            }
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Number of Variations */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Number of Variations
          </label>
          <div className="flex items-center gap-4">
            <div className="flex-1 flex gap-1">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  onClick={() => setVariations(num)}
                  className={`flex-1 h-8 text-xs font-medium rounded transition-colors ${
                    variations === num
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Creativity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Creativity</label>
            <span className="text-sm text-gray-500">{creativity}</span>
          </div>
          <div className="relative">
            <input
              type="range"
              min={SLIDER_CONFIGS.creativity.min}
              max={SLIDER_CONFIGS.creativity.max}
              value={creativity}
              onChange={(e) => setCreativity(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-none appearance-none cursor-pointer slider black-slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{SLIDER_CONFIGS.creativity.min}</span>
              <span>{SLIDER_CONFIGS.creativity.max}</span>
            </div>
          </div>
        </div>

        {/* Expressivity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Expressivity</label>
            <span className="text-sm text-gray-500">{expressivity}</span>
          </div>
          <div className="relative">
            <input
              type="range"
              min={SLIDER_CONFIGS.expressivity.min}
              max={SLIDER_CONFIGS.expressivity.max}
              value={expressivity}
              onChange={(e) => setExpressivity(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-none appearance-none cursor-pointer slider black-slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{SLIDER_CONFIGS.expressivity.min}</span>
              <span>{SLIDER_CONFIGS.expressivity.max}</span>
            </div>
          </div>
        </div>

        {/* Resemblance */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Resemblance</label>
            <span className="text-sm text-gray-500">{resemblance}</span>
          </div>
          <div className="relative">
            <input
              type="range"
              min={SLIDER_CONFIGS.resemblance.min}
              max={SLIDER_CONFIGS.resemblance.max}
              value={resemblance}
              onChange={(e) => setResemblance(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-none appearance-none cursor-pointer slider black-slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{SLIDER_CONFIGS.resemblance.min}</span>
              <span>{SLIDER_CONFIGS.resemblance.max}</span>
            </div>
          </div>
        </div>

        {/* Prompt */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Prompt</h3>
            <button
              onClick={() => handleCopyPrompt(primaryPrompt)}
              className="text-xs text-black hover:text-gray-800 font-medium"
            >
              Copy Prompt
            </button>
          </div>
          <div className="bg-gray-100 rounded-none p-3 text-sm text-gray-700 mb-3">
            {primaryPrompt}
          </div>
          <button
            onClick={handleRerun}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-none text-sm font-medium transition-colors"
          >
            <RotateCcw size={16} />
            Rerun
          </button>
        </div>

      </div>
    </div>
  );
};

export default CreateControlsSidebar;