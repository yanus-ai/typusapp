import { useMemo, useEffect, useState } from "react";
import { PromptTextArea } from "./PromptTextArea";
import { ActionButtonsGroup } from "./ActionButtonsGroup";
import { GenerateButton } from "./GenerateButton";
import Keywords from "./Keywords";
import MaterialCustomizationSettingsCompact from "./MaterialCustomizationSettingsCompact";
import RegionsWrapper from "./RegionsWrapper";
import { TextureBoxesContainer } from "./TextureBoxesContainer";
import { useBaseImage } from "../hooks/useBaseImage";
import { useTextures } from "../hooks/useTextures";
import { setSelectedImage, setIsCatalogOpen } from "@/features/create/createUISlice";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { AddKeywordsButton } from "./AddKeywordsButton";
import { cn } from "@/lib/utils";
import GenerateRandomPromptButton from "./GenerateRandomPromptButton";
import { useCreatePageHandlers } from "@/pages/create/hooks/useCreatePageHandlers";
import { ImageTypeButton } from "./ImageTypeButton";

interface PromptInputContainerProps {
  onGenerate?: (
    userPrompt: string | null,
    contextSelection?: string,
    attachments?: { baseImageUrl?: string; referenceImageUrls?: string[]; surroundingUrls?: string[]; wallsUrls?: string[] },
  ) => void;
  onCreateRegions?: () => void;
  onNewSession?: () => void;
  isGenerating?: boolean;
  isScaleDown?: boolean;
}

export function PromptInputContainer({ onGenerate, isGenerating = false, isScaleDown = false }: PromptInputContainerProps) {
  const { baseImageUrl, selectedImageId, selectedImageType, historyImages, inputImages } = useBaseImage();
  const { selectedModel } = useAppSelector((state) => state.tweak);
  const savedPrompt = useAppSelector((state) => state.masks.savedPrompt);
  const { masks } = useAppSelector((state) => state.masks);
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
  const isCatalogOpen = useAppSelector((state) => state.createUI.isCatalogOpen);
  const [pendingAttachments, setPendingAttachments] = useState<{ surroundingUrls: string[]; wallsUrls: string[] } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const { handleGenerateWithCurrentState } = useCreatePageHandlers();

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

  // 
  useEffect(() => {
    if (selectedModel !== 'sdxl') {
      initializeTextureBoxes();
    }
  }, [selectedModel, initializeTextureBoxes]);

  // Restore texture images when boxes are ready and we have pending attachments
  useEffect(() => {
    if (pendingAttachments && textureBoxes.length > 0) {
      const surroundingBox = textureBoxes.find(box => box.type === "surrounding");
      const wallsBox = textureBoxes.find(box => box.type === "walls");
      
      // Only add if boxes are empty (to avoid duplicates)
      if (surroundingBox && pendingAttachments.surroundingUrls.length > 0 && surroundingBox.textures.length === 0) {
        const textures = pendingAttachments.surroundingUrls.map(url => ({ url }));
        addImagesToBox(surroundingBox.id, textures);
      }
      if (wallsBox && pendingAttachments.wallsUrls.length > 0 && wallsBox.textures.length === 0) {
        const textures = pendingAttachments.wallsUrls.map(url => ({ url }));
        addImagesToBox(wallsBox.id, textures);
      }
      
      // Clear pending attachments after restoring
      setPendingAttachments(null);
    }
  }, [pendingAttachments, textureBoxes, addImagesToBox]);

  const shouldShowRegionsPanel = useMemo(
    () => selectedModel === "sdxl" && masks.length > 0,
    [masks, selectedModel]
  );

  // Prepare attachments from texture boxes
  const attachments = useMemo(() => {
    const surroundingBox = textureBoxes.find(box => box.type === "surrounding");
    const wallsBox = textureBoxes.find(box => box.type === "walls");
    
    return {
      baseImageUrl: baseImageUrl,
      surroundingUrls: surroundingBox?.textures.map(t => t.url) || [],
      wallsUrls: wallsBox?.textures.map(t => t.url) || [],
      referenceImageUrls: [] // Not used in new create flow
    };
  }, [textureBoxes, baseImageUrl]);

  // Handle generate button click
  const handleGenerateClick = () => {
    if (!onGenerate) return;
    dispatch(setIsCatalogOpen(false));
    if (selectedModel === 'sdxl') {
      handleGenerateWithCurrentState(savedPrompt);
    } else {
      onGenerate(
        savedPrompt,
        undefined, // contextSelection
        attachments
      );
    }
  };

  return (
    <div className={cn(
      "h-fit max-w-full transition-all duration-300 ease-out py-2",
      { 'scale-95': isScaleDown }
    )}>
      <div className="border-gray-300 relative space-y-1 rounded-none border-[0.5px] bg-white p-3 pt-1.5 shadow-lg transition-shadow duration-200 ease-out has-[textarea:focus]:shadow-[0px_0px_0px_3px_rgb(235,235,235)]">
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isCatalogOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className={cn(
            "transition-opacity duration-300 flex flex-row w-full gap-4 pb-4",
            isCatalogOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            {shouldShowRegionsPanel && <RegionsWrapper />}
            <MaterialCustomizationSettingsCompact />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap mb-2">
          <ImageTypeButton />
          {selectedModel !== 'sdxl' && (
            <TextureBoxesContainer
              selectedModel={selectedModel}
              textureBoxes={textureBoxes}
              onFileUpload={handleFileUpload}
              onFileDrop={handleFileDrop}
              onUrlDrop={handleUrlDrop}
              onRemoveImage={removeImageFromBox}
            />
          )}
        </div>
        <div className="flex flex-row gap-2 items-center">
          <div className="flex-shrink-0 flex flex-row items-center">
            <AddKeywordsButton />
            <GenerateRandomPromptButton isTyping={isTyping} setIsTyping={setIsTyping} />
          </div>
          <Keywords />
        </div>
        <PromptTextArea isTyping={isTyping} />
        <div className="flex items-end justify-between">
          <ActionButtonsGroup />
          <GenerateButton 
            onClick={handleGenerateClick}
            isGenerating={isGenerating}
            disabled={isGenerating || !savedPrompt?.trim()}
          />
        </div>
      </div>
    </div>
  );
}
