import React from "react";
import { PromptInputContainer } from "@/components/creation-prompt";
import { GenerationGrid, HistoryImage } from "./GenerationGrid";
import { cn } from "@/lib/utils";

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
  return (
    <>
      <div className="flex-1 flex gap-8 p-8 overflow-hidden container mx-auto max-w-7xl">
        <div className="flex-1 flex items-start">
          {prompt && (
            <div className="w-full">
              <p className="text-base text-gray-900 leading-relaxed font-medium rounded-xl border border-gray-200 p-4 bg-gray-50">
                {prompt}
              </p>
            </div>
          )}
        </div>

        <div className="max-w-full w-xl flex-shrink-0">
          <GenerationGrid
            images={images}
            onImageClick={onImageClick}
          />
        </div>
      </div>

      <div className={cn(
        "w-full flex items-center justify-center px-8",
        "animate-slide-down"
      )}>
        <div className="w-full max-w-5xl">
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

