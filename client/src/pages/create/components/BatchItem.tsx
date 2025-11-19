import React from "react";
import { GenerationGrid, HistoryImage } from "./GenerationGrid";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { loadSettingsFromImage } from "@/features/customization/customizationSlice";
import { setSavedPrompt } from "@/features/masks/maskSlice";
import { setSelectedModel } from "@/features/tweak/tweakSlice";
import { ArrowDownCircle } from "lucide-react";

interface BatchItemProps {
  batch: {
    id: number;
    prompt: string | null;
    createdAt: string;
    variations?: HistoryImage[];
  };
  images: HistoryImage[];
  prompt: string;
  settings: {
    image: HistoryImage;
    settings: Array<{ value: string }>;
    surroundingUrls: string[];
    wallsUrls: string[];
    settingsToApply: any;
    model?: string;
  } | null;
  isGenerating: boolean;
  onImageClick: (image: HistoryImage) => void;
  onGenerate: (
    userPrompt: string | null,
    contextSelection?: string,
    attachments?: {
      baseImageUrl?: string;
      referenceImageUrls?: string[];
      surroundingUrls?: string[];
      wallsUrls?: string[];
    },
    options?: { size?: string; aspectRatio?: string }
  ) => void;
}

export const BatchItem: React.FC<BatchItemProps> = ({
  images,
  prompt,
  settings,
  isGenerating,
  onImageClick,
  onGenerate,
}) => {
  const dispatch = useAppDispatch();

  // Calculate total variations for this batch
  let totalVariations = 0;
  if (images.length > 0) {
    const variationNumbers = images
      .map((img) => img.variationNumber)
      .filter((num): num is number => num !== undefined && num !== null && num >= 1 && num <= 4);
    if (variationNumbers.length > 0) {
      const maxVariation = Math.max(...variationNumbers);
      totalVariations = Math.min(maxVariation, 4);
    }
  }

  // Handle clicking on settings to apply them
  const handleApplySettings = () => {
    if (!settings?.image || !settings.settingsToApply) return;

    const image = settings.image;

    // Apply settings
    if (image.originalInputImageId) {
      dispatch(
        loadSettingsFromImage({
          inputImageId: image.originalInputImageId,
          imageId: image.id,
          isGeneratedImage: true,
          settings: settings.settingsToApply,
        })
      );
    }

    // Set the saved prompt
    if (image.aiPrompt) {
      dispatch(setSavedPrompt(image.aiPrompt));
    }

    // Restore model setting if available
    if (settings.model) {
      dispatch(setSelectedModel(settings.model));
    }
  };

  return (
    <div className="flex-1 flex gap-10 min-h-0">
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
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        Surrounding:
                      </span>
                      <div className="flex gap-1.5">
                        {settings.surroundingUrls.slice(0, 3).map((url: string, index: number) => (
                          <img
                            key={index}
                            src={url}
                            alt={`Surrounding ${index + 1}`}
                            className="w-8 h-8 rounded border border-gray-200 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
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
                              (e.target as HTMLImageElement).style.display = "none";
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
      <div
        className={cn(
          "flex-shrink-0 pb-16",
          totalVariations === 3 ? "w-[620px]" : totalVariations === 1 ? "w-[420px]" : "w-[520px]"
        )}
      >
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
  );
};

