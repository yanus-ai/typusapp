import { useMemo } from "react";
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
import { useDisclosure } from '@reactuses/core'
import { AddKeywordsButton } from "./AddKeywordsButton";
import { cn } from "@/lib/utils";

export function PromptInputContainer() {
  const { baseImageUrl } = useBaseImage();
  const { selectedModel } = useAppSelector((state) => state.tweak);
  const { isOpen, onOpen, onOpenChange } = useDisclosure({ defaultOpen: false })
  const {
    textureBoxes,
    initializeTextureBoxes,
    removeImageFromBox,
    handleFileUpload,
    handleFileDrop,
    handleUrlDrop,
  } = useTextures();
  const dispatch = useAppDispatch();

  const handleTexturesClick = () => {
    onOpen();
    initializeTextureBoxes();
  };

  const isCatalogOpen = useMemo(() => isOpen, [isOpen]);

  return (
    <div className="mb-8 h-fit max-w-full transition-[width] duration-150 ease-out sm:mb-0 sm:min-h-[180px] w-5xl">
      <div className="border-gray-300 relative space-y-1 rounded-3xl border-[0.5px] bg-white p-3 pt-1.5 shadow-lg transition-shadow duration-200 ease-out has-[textarea:focus]:shadow-[0px_0px_0px_3px_rgb(235,235,235)]">
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isCatalogOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="flex flex-row w-full gap-4 pb-4">
            {selectedModel === "sdxl" && <RegionsWrapper />}
            <MaterialCustomizationSettingsCompact />
          </div>
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
            <div className="flex-shrink-0">
              <AddKeywordsButton isOpen={isOpen} onOpenChange={onOpenChange} />
            </div>
          )}
          <Keywords />
        </div>
        <PromptTextArea />
        <div className="flex items-end justify-between">
          <ActionButtonsGroup onTexturesClick={handleTexturesClick} />
          <GenerateButton />
        </div>
      </div>
    </div>
  );
}
