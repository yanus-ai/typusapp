import React, { useMemo, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { PromptInputContainer } from "@/components/creation-prompt";
import { HistoryImage } from "./GenerationGrid";
import { cn } from "@/lib/utils";
import { extractDisplaySettings } from "@/utils/imageSettingsUtils";
import { BatchItem } from "./BatchItem";

interface Batch {
  id: number;
  prompt: string | null;
  createdAt: string;
  variations?: HistoryImage[];
}

interface GenerationLayoutProps {
  batches: Batch[]; // Array of batches in the session
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

// Constants
const PROMPT_INPUT_HEIGHT = 295; // Height of fixed prompt input including padding

export const GenerationLayout: React.FC<GenerationLayoutProps> = ({
  batches = [],
  isGenerating,
  onImageClick,
  onGenerate,
  onCreateRegions,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const lastBatchCountRef = useRef<number>(0);

  // Process batches to extract images and settings, sorted with newest at bottom
  const processedBatches = useMemo(() => {
    if (!batches || batches.length === 0) return [];
    
    const processed = batches.map(batch => {
      const images = batch.variations || [];
      const firstImage = images[0];
      
      let settings = null;
      if (firstImage) {
        const extracted = extractDisplaySettings(firstImage);
        if (extracted) {
          settings = {
            image: firstImage,
            settings: extracted.displaySettings,
            surroundingUrls: extracted.surroundingUrls,
            wallsUrls: extracted.wallsUrls,
            settingsToApply: extracted.settingsToApply,
            model: extracted.model,
            batchId: batch.id,
            isValidBatch: true
          };
        }
      }

      return {
        batch,
        images,
        prompt: batch.prompt || '',
        settings
      };
    });
    
    // Sort by createdAt descending (newest last, so newest appears at bottom)
    return processed.sort((a, b) => {
      const dateA = new Date(a.batch.createdAt).getTime();
      const dateB = new Date(b.batch.createdAt).getTime();
      return dateA - dateB; // Oldest first, newest last
    });
  }, [batches]);

  // Virtualization setup (newest batches at bottom)
  const virtualizer = useVirtualizer({
    count: processedBatches.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      // Dynamic height estimation based on batch content
      const batch = processedBatches[index];
      if (!batch) return 600;
      
      const imageCount = batch.images?.length || 0;
      const hasPrompt = !!batch.prompt;
      const hasSettings = !!batch.settings;
      
      // Base height + prompt height + settings height + image grid height
      let estimatedHeight = 200; // Base padding/spacing
      if (hasPrompt) estimatedHeight += 150;
      if (hasSettings) estimatedHeight += 100;
      
      // Image grid height varies by variation count
      if (imageCount > 0) {
        const maxVariations = Math.min(imageCount, 4);
        if (maxVariations === 1) estimatedHeight += 500;
        else if (maxVariations === 2) estimatedHeight += 550;
        else if (maxVariations === 3) estimatedHeight += 600;
        else estimatedHeight += 650; // 4 variations
      }
      
      return estimatedHeight;
    },
    overscan: 3, // Render 3 extra items outside viewport for smooth scrolling
  });

  // Auto-scroll to bottom when new batches are added
  useEffect(() => {
    if (batches && batches.length > lastBatchCountRef.current && parentRef.current && processedBatches.length > 0) {
      // Scroll to the last index (newest batch at bottom)
      const lastIndex = processedBatches.length - 1; // Last index is the newest batch
      
      // Use a more reliable scroll method
      const scrollToBottom = () => {
        if (!parentRef.current) return;
        
        // Wait for virtualization to update
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!parentRef.current) return;
            
            // Scroll to the very bottom, accounting for prompt input
            const scrollHeight = parentRef.current.scrollHeight;
            const clientHeight = parentRef.current.clientHeight;
            const maxScroll = scrollHeight - clientHeight;
            
            parentRef.current.scrollTo({
              top: maxScroll - PROMPT_INPUT_HEIGHT / 2,
              behavior: 'smooth'
            });
          });
        });
      };
      
      // Try virtualizer scroll first, then fallback to direct scroll
      try {
        virtualizer.scrollToIndex(lastIndex, {
          align: 'end',
          behavior: 'smooth'
        });
        // Also ensure we're at the bottom after a delay
        setTimeout(scrollToBottom, 500);
      } catch (error) {
        // Fallback to direct scroll if virtualizer fails
        scrollToBottom();
      }
    }
    if (batches) {
      lastBatchCountRef.current = batches.length;
    }
  }, [batches?.length, processedBatches.length, virtualizer]);


  // Handle empty batches
  if (!batches || batches.length === 0) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-gray-500">No batches in this session</div>
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
  }


  return (
    <>
      <div 
        ref={parentRef}
        className="flex flex-col h-full flex-1 overflow-y-auto hide-scroll container mx-auto max-w-7xl"
      >
        <div className="px-8 pt-8 pb-4">
          <div
            className="py-12"
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const batchData = processedBatches[virtualRow.index];
              const { batch, images, prompt, settings } = batchData;
              const isLastBatch = virtualRow.index === processedBatches.length - 1; // Last index is the newest

              return (
                <div
                  key={batch.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  data-key={batch.id}
                  className="py-8"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                    willChange: "transform", // Optimize for scrolling performance
                  }}
                >
                  <BatchItem
                    batch={batch}
                    images={images}
                    prompt={prompt}
                    settings={settings}
                    isGenerating={isLastBatch ? isGenerating : false}
                    onImageClick={onImageClick}
                    onGenerate={onGenerate}
                  />
                </div>
              );
            })}
          </div>
        </div>
        {/* Bottom spacer to prevent batches from going under fixed prompt input */}
        <div 
          style={{ 
            height: `${PROMPT_INPUT_HEIGHT}px`,
            minHeight: `${PROMPT_INPUT_HEIGHT}px`,
            width: '100%',
            flexShrink: 0,
          }} 
        />
      </div>

      {/* Bottom - Prompt Input (Fixed) */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 w-full flex items-center justify-center px-8 pt-4",
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

