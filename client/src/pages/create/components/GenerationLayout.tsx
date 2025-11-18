import React, { useMemo, useCallback } from "react";
import { PromptInputContainer } from "@/components/creation-prompt";
import { GenerationGrid, HistoryImage } from "./GenerationGrid";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { loadSettingsFromImage } from "@/features/customization/customizationSlice";
import { setSavedPrompt } from "@/features/masks/maskSlice";
import { setSelectedModel } from "@/features/tweak/tweakSlice";
import { ArrowDownCircle } from "lucide-react";
import { extractDisplaySettings } from "@/utils/imageSettingsUtils";

interface GenerationLayoutProps {
  prompt: string;
  images: HistoryImage[];
  isGenerating: boolean;
  onImageClick: (image: HistoryImage) => void;
  onGenerate: (
    userPrompt: string | null,
    contextSelection?: string,
    attachments?: { 
      baseImageUrl?: string; 
      referenceImageUrls?: string[]; 
      surroundingUrls?: string[]; 
      wallsUrls?: string[] 
    },
    options?: { size?: string; aspectRatio?: string }
  ) => void;
  onCreateRegions: () => void;
}

export const GenerationLayout: React.FC<GenerationLayoutProps> = ({
  prompt,
  images,
  isGenerating,
  onImageClick,
  onGenerate,
  onCreateRegions,
}) => {
  const dispatch = useAppDispatch();

  // Validate that all images belong to the same batch
  const batchValidation = useMemo(() => {
    if (images.length === 0) return { isValid: false, batchId: null };
    
    const batchIds = new Set(images.map(img => img.batchId).filter(Boolean));
    const firstBatchId = images[0]?.batchId;
    
    // All images should have the same batchId (they're from the same generation session)
    const isValid = batchIds.size === 1 && firstBatchId !== null && firstBatchId !== undefined;
    
    return {
      isValid,
      batchId: firstBatchId || null,
      uniqueBatchIds: Array.from(batchIds)
    };
  }, [images]);

  // Extract settings from the first image (all images in a batch share the same settings)
  const settings = useMemo(() => {
    if (images.length === 0) return null;
    
    // Warn if images don't belong to the same batch
    if (!batchValidation.isValid && images.length > 1) {
      console.warn('⚠️ GenerationLayout: Images from different batches detected!', {
        expectedBatchId: batchValidation.batchId,
        foundBatchIds: batchValidation.uniqueBatchIds,
        imageIds: images.map(img => ({ id: img.id, batchId: img.batchId, variationNumber: img.variationNumber }))
      });
    }
    
    const firstImage = images[0];
    
    const extracted = extractDisplaySettings(firstImage);
    if (!extracted) return null;
    
    // Verify all images share the same settings (optional validation)
    const allShareSameSettings = images.every(img => {
      if (!img.settingsSnapshot) return false;
      const snapshot = img.settingsSnapshot as any;
      const firstSnapshot = firstImage.settingsSnapshot as any;
      
      // Check key settings match
      return snapshot.model === firstSnapshot.model &&
             snapshot.size === firstSnapshot.size &&
             snapshot.aspectRatio === firstSnapshot.aspectRatio &&
             snapshot.variations === firstSnapshot.variations;
    });
    
    if (!allShareSameSettings && images.length > 1) {
      console.warn('⚠️ GenerationLayout: Images in batch have different settings!', {
        batchId: batchValidation.batchId,
        imageCount: images.length
      });
    }
    
    return {
      image: firstImage,
      settings: extracted.displaySettings,
      surroundingUrls: extracted.surroundingUrls,
      wallsUrls: extracted.wallsUrls,
      settingsToApply: extracted.settingsToApply,
      model: extracted.model,
      batchId: batchValidation.batchId,
      isValidBatch: batchValidation.isValid
    };
  }, [images, batchValidation]);

  // Handle clicking on settings to apply them
  const handleApplySettings = useCallback(() => {
    if (!settings?.image || !settings.settingsToApply) return;
    
    const image = settings.image;
    
    // Apply settings
    if (image.originalInputImageId) {
      dispatch(loadSettingsFromImage({
        inputImageId: image.originalInputImageId,
        imageId: image.id,
        isGeneratedImage: true,
        settings: settings.settingsToApply
      }));
    }
    
    // Set the saved prompt
    if (image.aiPrompt) {
      dispatch(setSavedPrompt(image.aiPrompt));
    }
    
    // Restore model setting if available
    if (settings.model) {
      dispatch(setSelectedModel(settings.model));
    }
  }, [settings, dispatch]);

  // Calculate total variations for grid layout
  const totalVariations = useMemo(() => {
    if (images.length === 0) return 0;
    const variationNumbers = images
      .map(img => img.variationNumber)
      .filter((num): num is number => num !== undefined && num !== null && num >= 1 && num <= 4);
    if (variationNumbers.length === 0) return 0;
    const maxVariation = Math.max(...variationNumbers);
    return Math.min(maxVariation, 4);
  }, [images]);

  return (
    <>
      <div className="flex flex-col gap-8 p-8 pb-96 overflow-y-auto hide-scroll container mx-auto max-w-7xl">
        <div className="flex-1 flex gap-10">
          {/* Left Column - Prompt & Settings */}
          <div className="flex-1 flex flex-col gap-5 min-w-0">
            {prompt && (
              <div className="w-full space-y-4">
                {/* Prompt Display */}
                <div className="relative">
                  {/* Textures at the top */}
                  {settings && (settings.surroundingUrls.length > 0 || settings.wallsUrls.length > 0) && (
                    <div className="mb-3 flex items-center gap-3">
                      {settings.surroundingUrls.length > 0 && (
                        <div className="flex items-center gap-1.5 rounded-xl border border-gray-200/60 py-1.5 px-2 bg-gradient-to-br from-gray-50 to-white shadow-sm">
                          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Surrounding:</span>
                          <div className="flex gap-1.5">
                            {settings.surroundingUrls.slice(0, 3).map((url: string, index: number) => (
                              <img
                                key={index}
                                src={url}
                                alt={`Surrounding ${index + 1}`}
                                className="w-8 h-8 rounded border border-gray-200 object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ))}
                            {settings.surroundingUrls.length > 3 && (
                              <div className="w-8 h-8 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                +{settings.surroundingUrls.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {settings.wallsUrls.length > 0 && (
                        <div className="flex items-center gap-1.5 rounded-xl border border-gray-200/60 py-1.5 px-2 bg-gradient-to-br from-gray-50 to-white shadow-sm">
                          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Walls:</span>
                          <div className="flex gap-1.5">
                            {settings.wallsUrls.slice(0, 3).map((url: string, index: number) => (
                              <img
                                key={index}
                                src={url}
                                alt={`Walls ${index + 1}`}
                                className="w-8 h-8 rounded border border-gray-200 object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ))}
                            {settings.wallsUrls.length > 3 && (
                              <div className="w-8 h-8 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                +{settings.wallsUrls.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <p className="text-[15px] text-gray-800 leading-relaxed font-medium rounded-xl border border-gray-200/60 p-5 bg-gradient-to-br from-gray-50 to-white shadow-sm">
                    {prompt}
                  </p>
                  {settings && settings.settings.length > 0 && (
                    <div className="flex items-center justify-between py-2">
                      {settings && (
                        <button
                          onClick={handleApplySettings}
                          role="button"
                          className="flex items-center gap-1.5 px-3 cursor-pointer py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200/60 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:shadow"
                        >
                          <ArrowDownCircle className="w-3.5 h-3.5" />
                          Apply Settings
                        </button>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {settings.settings.map((setting, index) => (
                          <div
                            key={index}
                            className="inline-flex text-xs items-center gap-2 px-2 py-1 leading-relaxed font-medium rounded-xl border border-gray-200/60 bg-gradient-to-br from-gray-50 to-white shadow-sm"
                          >
                            <span className="font-bold text-gray-900">{setting.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Image Grid */}
          <div className={cn(
            "flex-shrink-0 pb-16",
            totalVariations === 3 ? "w-[620px]" : totalVariations === 1 ? "w-[420px]" : "w-[520px]"
          )}>
            <GenerationGrid
              images={images}
              onImageClick={onImageClick}
              onGenerate={onGenerate}
              settings={settings}
              prompt={prompt}
              isGenerating={isGenerating}
            />
          </div>
        </div>
      </div>

      {/* Bottom - Prompt Input (Fixed) */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 w-full flex items-center justify-center px-8 pb-6 pt-4",
        "animate-slide-down"
      )}>
        <div className="w-full max-w-5xl pointer-events-auto">
          <PromptInputContainer 
            onGenerate={onGenerate} 
            onCreateRegions={onCreateRegions}
            isGenerating={isGenerating}
            isScaleDown
          />
        </div>
      </div>
    </>
  );
};

