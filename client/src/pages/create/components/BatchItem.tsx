import React from "react";
import { GenerationGrid, HistoryImage } from "./GenerationGrid";
import { useTranslation } from "@/hooks/useTranslation";

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
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex justify-between gap-10 min-h-0">
      {/* Left Column - Prompt & Settings */}
      <div className="w-1/4 flex flex-col gap-5 min-w-0">
        {prompt && (
          <div className="w-full space-y-4">
            {/* Prompt Display */}
            <div className="relative">
              {/* Base Image */}
              {settings && settings.image?.settingsSnapshot?.baseImageUrl && (
                <div className="mb-1 relative">
                  <img
                    src={settings.image.settingsSnapshot.baseImageUrl}
                    alt={t('create.baseImage')}
                    className="w-16 h-16 rounded border border-gray-200 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
              {/* Textures at the top */}
              {settings && (settings.surroundingUrls.length > 0 || settings.wallsUrls.length > 0) && (
                <div className="mb-3 flex items-center gap-3">
                  {settings.surroundingUrls.length > 0 && (
                    <div className="flex items-center gap-1.5 rounded-none border border-gray-200/60 py-1.5 px-2 bg-gradient-to-br from-gray-50 to-white shadow-sm">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        {t('create.surrounding')}
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
                    <div className="flex items-center gap-1.5 rounded-none border border-gray-200/60 py-1.5 px-2 bg-gradient-to-br from-gray-50 to-white shadow-sm">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('create.walls')}</span>
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

              <div className="rounded-none border border-gray-200/60 p-5 bg-gradient-to-br from-gray-50 to-white shadow-sm">
                <p className="text-sm text-gray-950 max-h-[200px] overflow-y-auto custom-scrollbar-prompt">
                  {prompt}
                </p>
              </div>
              {settings && settings.settings.length > 0 && (
                <div className="flex items-center justify-end py-2">
                  <div className="flex flex-wrap flex-row-reverse gap-2">
                    {settings.settings.map((setting, index) => (
                      <div
                        key={index}
                        className="inline-flex text-xs items-center gap-2 px-2 py-1 leading-relaxed font-medium rounded-none border border-gray-200/60 bg-gradient-to-br from-gray-50 to-white shadow-sm"
                      >
                        <span className="text-gray-600">{setting.value}</span>
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
      <div className="w-3/4">
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

