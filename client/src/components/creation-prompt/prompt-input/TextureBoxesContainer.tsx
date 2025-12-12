import React from "react";
import { TextureBox } from "./TextureBox";
import { TextureBox as TextureBoxType, TextureItem } from "../hooks/useTextures";
import { useDragDrop } from "../hooks/useDragDrop";

interface TextureBoxesContainerProps {
  selectedModel: string;
  textureBoxes: TextureBoxType[];
  onFileUpload: (boxId: string, files: FileList | null) => void;
  onFileDrop: (boxId: string, files: File[]) => void;
  onUrlDrop: (boxId: string, texture: TextureItem) => void;
  onRemoveImage: (boxId: string, index: number) => void;
  onOpenCatalog?: () => void;
}

export function TextureBoxesContainer({
  selectedModel,
  textureBoxes,
  onFileUpload,
  onFileDrop,
  onUrlDrop,
  onRemoveImage,
  onOpenCatalog,
}: TextureBoxesContainerProps) {
  const { extractUrlFromDrag } = useDragDrop();

  const handleDrop = (boxId: string, e: React.DragEvent) => {
    // Handle file drops
    const files = e.dataTransfer?.files
      ? Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"))
      : [];
    if (files.length > 0) {
      onFileDrop(boxId, files);
      return;
    }

    // Handle material catalog drops (with metadata)
    try {
      const materialDataStr = e.dataTransfer.getData('application/json');
      if (materialDataStr) {
        const materialData = JSON.parse(materialDataStr);
        
        // Check if it's a material option from catalog
        if (materialData.option && (materialData.materialOption || materialData.type)) {
          const url = materialData.option.thumbnailUrl || materialData.option.imageUrl || extractUrlFromDrag(e);
          if (url) {
            const texture: TextureItem = {
              url,
              displayName: materialData.option.displayName || materialData.option.name,
              materialOptionId: materialData.materialOption === 'material' ? materialData.option.id : undefined,
              customizationOptionId: materialData.materialOption === 'customization' ? materialData.option.id : undefined,
              materialOption: materialData.materialOption,
              type: materialData.type,
            };
            onUrlDrop(boxId, texture);
            return;
          }
        }
      }
    } catch (error) {
      // Fall through to URL extraction
    }

    // Handle URL drops (fallback for custom images or URLs)
    const url = extractUrlFromDrag(e);
    if (url) {
      const texture: TextureItem = { url };
      onUrlDrop(boxId, texture);
    }
  };

  if (selectedModel === "sdxl") {
    return null;
  }

  return (
    <div className="flex-1 grid grid-cols-2 gap-2">
      {textureBoxes.map((box) => (
        <TextureBox
          key={box.id}
          box={box}
          onFileSelect={(files) => onFileUpload(box.id, files)}
          onDrop={(e) => handleDrop(box.id, e)}
          onRemoveImage={(index) => onRemoveImage(box.id, index)}
          onOpenCatalog={onOpenCatalog}
        />
      ))}
    </div>
  );
}

