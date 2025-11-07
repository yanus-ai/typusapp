import React from "react";
import { TextureBox } from "./TextureBox";
import { TextureBox as TextureBoxType } from "../hooks/useTextures";
import { useDragDrop } from "../hooks/useDragDrop";

interface TextureBoxesContainerProps {
  selectedModel: string;
  textureBoxes: TextureBoxType[];
  onFileUpload: (boxId: string, files: FileList | null) => void;
  onFileDrop: (boxId: string, files: File[]) => void;
  onUrlDrop: (boxId: string, url: string) => void;
  onRemoveImage: (boxId: string, index: number) => void;
}

export function TextureBoxesContainer({
  selectedModel,
  textureBoxes,
  onFileUpload,
  onFileDrop,
  onUrlDrop,
  onRemoveImage,
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

    // Handle URL drops from catalog
    const url = extractUrlFromDrag(e);
    if (url) {
      onUrlDrop(boxId, url);
    }
  };

  if (selectedModel === "sdxl" || textureBoxes.length === 0) {
    return null;
  }

  return (
    <>
      {textureBoxes.map((box) => (
        <TextureBox
          key={box.id}
          box={box}
          onFileSelect={(files) => onFileUpload(box.id, files)}
          onDrop={(e) => handleDrop(box.id, e)}
          onRemoveImage={(index) => onRemoveImage(box.id, index)}
        />
      ))}
    </>
  );
}

