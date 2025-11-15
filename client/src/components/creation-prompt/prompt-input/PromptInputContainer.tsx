import { useMemo, useEffect, useState } from "react";
import { PromptTextArea } from "./PromptTextArea";
import { ActionButtonsGroup } from "./ActionButtonsGroup";
import { GenerateButton } from "./GenerateButton";
import { X } from "lucide-react";
import Keywords from "./Keywords";
import MaterialCustomizationSettingsCompact from "./MaterialCustomizationSettingsCompact";
import RegionsWrapper from "./RegionsWrapper";
import { TextureBoxesContainer } from "./TextureBoxesContainer";
import { useBaseImage } from "../hooks/useBaseImage";
import { useTextures } from "../hooks/useTextures";
import { setSelectedImage } from "@/features/create/createUISlice";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { AddKeywordsButton } from "./AddKeywordsButton";
import { cn } from "@/lib/utils";
import GenerateRandomPromptButton from "./GenerateRandomPromptButton";

interface PromptInputContainerProps {
  onGenerate?: (
    userPrompt: string | null,
    contextSelection?: string,
    attachments?: { baseImageUrl?: string; referenceImageUrls?: string[]; surroundingUrls?: string[]; wallsUrls?: string[] },
    options?: { size?: string; aspectRatio?: string }
  ) => void;
  onCreateRegions?: () => void;
  isGenerating?: boolean;
}

export function PromptInputContainer({ onGenerate, onCreateRegions, isGenerating = false }: PromptInputContainerProps) {
  const { baseImageUrl, selectedImageId, selectedImageType, historyImages, inputImages } = useBaseImage();
  const { selectedModel } = useAppSelector((state) => state.tweak);
  const savedPrompt = useAppSelector((state) => state.masks.savedPrompt);
  const { maskStatus } = useAppSelector((state) => state.masks);
  const {
    textureBoxes,
    initializeTextureBoxes,
    removeImageFromBox,
    handleFileUpload,
    handleFileDrop,
    handleUrlDrop,
    addImagesToBox,
  } = useTextures();
  const dispatch = useAppDispatch();
  const [catalogOpen, setCatalogOpen] = useState<boolean | null>(null); // null = auto, true/false = explicit
  const [pendingAttachments, setPendingAttachments] = useState<{ surroundingUrls: string[]; wallsUrls: string[] } | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Restore base image from generated image when selected
  useEffect(() => {
    if (selectedImageType === 'generated' && selectedImageId) {
      const generatedImage = historyImages.find(img => img.id === selectedImageId);
      if (generatedImage?.settingsSnapshot) {
        const settingsSnapshot = generatedImage.settingsSnapshot as any;
        if (settingsSnapshot?.attachments) {
          const att = settingsSnapshot.attachments;
          
          // Restore base image if available
          if (att.baseAttachmentUrl) {
            // Try to find the input image by URL
            const matchingInput = inputImages.find((img: any) => 
              img.originalUrl === att.baseAttachmentUrl || 
              img.imageUrl === att.baseAttachmentUrl ||
              img.processedUrl === att.baseAttachmentUrl
            );
            if (matchingInput) {
              dispatch(setSelectedImage({ id: matchingInput.id, type: 'input' }));
            }
          }
          
          // Store texture URLs to restore when boxes are ready
          const surroundingUrls = att.surroundingUrls || (att.textureUrls ? att.textureUrls.slice(0, Math.floor(att.textureUrls.length / 2)) : []);
          const wallsUrls = att.wallsUrls || (att.textureUrls ? att.textureUrls.slice(Math.floor(att.textureUrls.length / 2)) : []);
          
          if (surroundingUrls.length > 0 || wallsUrls.length > 0) {
            setPendingAttachments({ surroundingUrls, wallsUrls });
            // Initialize texture boxes if not already initialized
            if (textureBoxes.length === 0) {
              initializeTextureBoxes();
            }
          } else {
            setPendingAttachments(null);
          }
        }
      }
    } else {
      setPendingAttachments(null);
    }
  }, [selectedImageId, selectedImageType, historyImages, inputImages, dispatch, textureBoxes.length, initializeTextureBoxes]);

  // Restore texture images when boxes are ready and we have pending attachments
  useEffect(() => {
    if (pendingAttachments && textureBoxes.length > 0) {
      const surroundingBox = textureBoxes.find(box => box.type === "surrounding");
      const wallsBox = textureBoxes.find(box => box.type === "walls");
      
      // Only add if boxes are empty (to avoid duplicates)
      if (surroundingBox && pendingAttachments.surroundingUrls.length > 0 && surroundingBox.imageUrls.length === 0) {
        addImagesToBox(surroundingBox.id, pendingAttachments.surroundingUrls);
      }
      if (wallsBox && pendingAttachments.wallsUrls.length > 0 && wallsBox.imageUrls.length === 0) {
        addImagesToBox(wallsBox.id, pendingAttachments.wallsUrls);
      }
      
      // Clear pending attachments after restoring
      setPendingAttachments(null);
    }
  }, [pendingAttachments, textureBoxes, addImagesToBox]);

  const isCatalogOpen = useMemo(
    () => {
      // If catalogOpen is explicitly set (true/false), use that value
      if (catalogOpen !== null) {
        return catalogOpen;
      }
      // Otherwise, auto-show catalog if texture boxes exist or if SDXL model is selected
      return (textureBoxes.length > 0 && selectedModel !== "sdxl") || selectedModel === "sdxl";
    },
    [catalogOpen, textureBoxes.length, selectedModel]
  );

  // Show regions panel only when:
  // 1. SDXL model is selected
  // 2. Base image is uploaded
  // 3. User has clicked "Create Regions" (maskStatus is 'processing' or 'completed')
  const shouldShowRegionsPanel = useMemo(
    () => {
      return selectedModel === "sdxl" && 
             baseImageUrl && 
             (maskStatus === "processing" || maskStatus === "completed");
    },
    [selectedModel, baseImageUrl, maskStatus]
  );

  const handleTexturesClick = () => {
    // Toggle catalog: if currently open, close it; otherwise, open it
    const currentlyOpen = isCatalogOpen;
    if (currentlyOpen) {
      // Close the catalog explicitly
      setCatalogOpen(false);
    } else {
      // Open the catalog explicitly and initialize texture boxes if needed
      if (textureBoxes.length === 0) {
        initializeTextureBoxes();
      }
      setCatalogOpen(true);
    }
  };

  // Prepare attachments from texture boxes
  const attachments = useMemo(() => {
    const surroundingBox = textureBoxes.find(box => box.type === "surrounding");
    const wallsBox = textureBoxes.find(box => box.type === "walls");
    
    return {
      baseImageUrl: baseImageUrl,
      surroundingUrls: surroundingBox?.imageUrls || [],
      wallsUrls: wallsBox?.imageUrls || [],
      referenceImageUrls: [] // Not used in new create flow
    };
  }, [textureBoxes, baseImageUrl]);

  // Handle generate button click
  const handleGenerateClick = () => {
    if (!onGenerate) return;
    
    // Get options from ActionButtonsGroup state (we'll need to lift this state or use Redux)
    // For now, use defaults
    const options = {
      size: "1K", // Default, can be enhanced later
      aspectRatio: "16:9" // Default, can be enhanced later
    };

    onGenerate(
      savedPrompt,
      undefined, // contextSelection
      attachments,
      options
    );
  };

  return (
    <div className="mb-8 h-fit max-w-full transition-[width] duration-150 ease-out sm:mb-0 sm:min-h-[180px] w-full">
      <div className="border-gray-300 relative space-y-1 rounded-3xl border-[0.5px] bg-white p-3 pt-1.5 shadow-lg transition-shadow duration-200 ease-out has-[textarea:focus]:shadow-[0px_0px_0px_3px_rgb(235,235,235)]">
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isCatalogOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          {(isCatalogOpen || shouldShowRegionsPanel) ? (
            <div className="flex flex-row w-full gap-4 pb-4">
              {shouldShowRegionsPanel && <RegionsWrapper />}
              {isCatalogOpen && <MaterialCustomizationSettingsCompact />}
            </div>
          ) : (
            ""
          )}
        </div>
        {(baseImageUrl || textureBoxes.length > 0) && (
          <div className="flex gap-2 flex-wrap mb-2">
            {baseImageUrl && (
              <div className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
                <img
                  src={baseImageUrl}
                  alt="Base image preview"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => {
                    dispatch(
                      setSelectedImage({ id: undefined, type: undefined })
                    );
                  }}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  aria-label="Remove base image"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
            <TextureBoxesContainer
              selectedModel={selectedModel}
              textureBoxes={textureBoxes}
              onFileUpload={handleFileUpload}
              onFileDrop={handleFileDrop}
              onUrlDrop={handleUrlDrop}
              onRemoveImage={removeImageFromBox}
            />
          </div>
        )}
        <div className="flex flex-row gap-2 items-center">
          {selectedModel !== 'sdxl' && (
            <div className="flex-shrink-0 flex flex-row items-center">
              <AddKeywordsButton isOpen={isCatalogOpen} onOpenChange={() => setCatalogOpen(e => !e)} />
              <GenerateRandomPromptButton isTyping={isTyping} setIsTyping={setIsTyping} />
            </div>
          )}
          <Keywords />
        </div>
        <PromptTextArea isTyping={isTyping} />
        <div className="flex items-end justify-between">
          <ActionButtonsGroup 
            onTexturesClick={handleTexturesClick}
            onCreateRegionsClick={onCreateRegions}
          />
          <GenerateButton 
            onClick={handleGenerateClick}
            isGenerating={isGenerating}
            disabled={isGenerating || !savedPrompt?.trim() || selectedModel === 'sdxl'}
          />
        </div>
      </div>
    </div>
  );
}
