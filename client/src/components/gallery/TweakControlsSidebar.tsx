import React, { useState, useEffect } from 'react';
import { RotateCcw, Palette } from 'lucide-react';

interface TweakControlsSidebarProps {
  selectedImage?: {
    id: number;
    prompt?: string;
    aiPrompt?: string; // 🔥 NEW: AI prompt from individual image
    variations?: number;
    settings?: {
      operationType?: string;
      maskKeyword?: string;
      negativePrompt?: string;
    };
  };
  selectedBatch?: {
    batchId: number;
    prompt?: string;
    settings?: {
      operationType?: string;
      maskKeyword?: string;
      negativePrompt?: string;
      variations: number;
    };
  };
  onRegenerate?: (settings: {
    variations: number;
    prompt?: string;
    negativePrompt?: string;
    maskKeyword?: string;
  }) => void;
  onCreateFromBatch?: (settings: {
    batchId: number;
    variations: number;
    prompt?: string;
    negativePrompt?: string;
    maskKeyword?: string;
  }) => void;
}

const TweakControlsSidebar: React.FC<TweakControlsSidebarProps> = ({ 
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
        prompt: selectedBatch.prompt || '',
        negativePrompt: selectedBatch.settings.negativePrompt || '',
        maskKeyword: selectedBatch.settings.maskKeyword || ''
      };
    }
    if (selectedImage) {
      return {
        variations: selectedImage.variations || 1,
        // 🔥 FIX: Prioritize aiPrompt over prompt
        prompt: selectedImage.aiPrompt || selectedImage.prompt || '',
        negativePrompt: selectedImage.settings?.negativePrompt || '',
        maskKeyword: selectedImage.settings?.maskKeyword || ''
      };
    }
    return {
      variations: 1,
      prompt: '',
      negativePrompt: 'saturated full colors, neon lights,blurry  jagged edges, noise, and pixelation, oversaturated, unnatural colors or gradients  overly smooth or plastic-like surfaces, imperfections. deformed, watermark, (face asymmetry, eyes asymmetry, deformed eyes, open mouth), low quality, worst quality, blurry, soft, noisy extra digits, fewer digits, and bad anatomy. Poor Texture Quality: Avoid repeating patterns that are noticeable and break the illusion of realism. ,sketch, graphite, illustration, Unrealistic Proportions and Scale:  incorrect proportions. Out of scale',
      maskKeyword: ''
    };
  };

  const initialSettings = getInitialSettings();
  const [variations, setVariations] = useState(initialSettings.variations);
  const [prompt, setPrompt] = useState(initialSettings.prompt);
  const [negativePrompt, setNegativePrompt] = useState(initialSettings.negativePrompt);
  const [maskKeyword, setMaskKeyword] = useState(initialSettings.maskKeyword);

  // Update state when selectedBatch or selectedImage changes
  useEffect(() => {
    const newSettings = getInitialSettings();
    setVariations(newSettings.variations);
    setPrompt(newSettings.prompt);
    setNegativePrompt(newSettings.negativePrompt);
    setMaskKeyword(newSettings.maskKeyword);
  }, [selectedBatch, selectedImage]);

  const handleCopyPrompt = async (promptText: string) => {
    try {
      await navigator.clipboard.writeText(promptText);
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
        prompt: prompt || selectedBatch.prompt,
        negativePrompt,
        maskKeyword,
      });
    } else if (onRegenerate) {
      // Regular regeneration for single images
      onRegenerate({
        variations,
        prompt: prompt || selectedImage?.prompt,
        negativePrompt,
        maskKeyword,
      });
    }
  };

  // Get operation type for display
  const operationType = selectedBatch?.settings?.operationType || selectedImage?.settings?.operationType || 'tweak';
  
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
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          }
          
          .black-slider::-moz-range-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #000000;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
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
                Tweak Batch {selectedBatch?.batchId}
              </span>
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                {operationType}
              </span>
            </>
          ) : selectedImage ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-900">
                Tweak Image {selectedImage.id}
              </span>
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                {operationType}
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
        
        {/* Number of Variations - Limited to 1-2 for tweak operations */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Number of Variations
          </label>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {[1, 2].map((num) => (
                <button
                  key={num}
                  onClick={() => setVariations(num)}
                  className={`flex-1 min-w-[60px] h-8 text-xs font-medium rounded transition-colors ${
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
          <div className="text-xs text-gray-500 mt-2">
            Tweak operations support up to 2 variations
          </div>
        </div>

        {/* Prompt */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Prompt</label>
            {prompt && (
              <button
                onClick={() => handleCopyPrompt(prompt)}
                className="text-xs text-black hover:text-gray-700 font-medium"
              >
                Copy
              </button>
            )}
          </div>
          <div className="space-y-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your tweak prompt..."
              className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-black focus:border-transparent"
              rows={3}
            />
          </div>
        </div>

        {/* Mask Keyword */}
        {(selectedBatch?.settings?.maskKeyword || selectedImage?.settings?.maskKeyword || maskKeyword) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Mask Keyword
            </label>
            <input
              type="text"
              value={maskKeyword}
              onChange={(e) => setMaskKeyword(e.target.value)}
              placeholder="Enter mask keyword..."
              className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <div className="text-xs text-gray-500 mt-2">
              Keyword used to identify the masked area
            </div>
          </div>
        )}

        {/* Negative Prompt */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Negative Prompt</label>
            {negativePrompt && (
              <button
                onClick={() => handleCopyPrompt(negativePrompt)}
                className="text-xs text-black hover:text-gray-700 font-medium"
              >
                Copy
              </button>
            )}
          </div>
          <div className="space-y-3">
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Enter what to avoid in the generation..."
              className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-black focus:border-transparent"
              rows={4}
            />
            <div className="text-xs text-gray-500">
              Describe what you want to avoid in the generated image
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={handleRerun}
            disabled={!prompt.trim()}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              prompt.trim()
                ? 'bg-black hover:bg-gray-800 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <RotateCcw size={16} />
            {isDisplayingBatch ? 'Create Again from Batch' : 'Regenerate Tweak'}
          </button>
          
          {!prompt.trim() && (
            <div className="text-xs text-gray-500 mt-2 text-center">
              Enter a prompt to enable regeneration
            </div>
          )}
        </div>

        {/* Operation Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Palette size={16} className="text-black" />
            <span className="text-sm font-medium text-gray-900">
              Operation: {operationType.charAt(0).toUpperCase() + operationType.slice(1)}
            </span>
          </div>
          <div className="text-xs text-gray-700">
            {operationType === 'inpaint' && 'Modifies selected areas based on your brush strokes and prompt'}
            {operationType === 'outpaint' && 'Extends the image beyond its current boundaries'}
            {operationType === 'tweak' && 'General tweaking operation to modify the image'}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TweakControlsSidebar;