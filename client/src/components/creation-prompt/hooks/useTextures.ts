import { useState, useEffect, useCallback } from "react";

export interface TextureItem {
  url: string;
  materialOptionId?: number;
  customizationOptionId?: number;
  displayName?: string;
  materialOption?: string; // 'material' | 'customization'
  type?: string; // category type like 'walls', 'context', etc.
}

export interface TextureBox {
  id: string;
  type: "surrounding" | "walls";
  textures: TextureItem[];
}

/**
 * Hook for managing texture boxes (surrounding and walls)
 * Handles image URLs, file uploads, drag & drop, and cleanup
 */
export function useTextures() {
  const [textureBoxes, setTextureBoxes] = useState<TextureBox[]>([]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      textureBoxes.forEach((box) => {
        box.textures.forEach((texture) => {
          if (texture.url.startsWith('blob:')) {
            URL.revokeObjectURL(texture.url);
          }
        });
      });
    };
  }, [textureBoxes]);

  const initializeTextureBoxes = useCallback(() => {
    // If boxes already exist, don't add duplicates
    if (textureBoxes.length > 0) {
      return;
    }

    // Add texture boxes for surrounding and walls
    const surroundingId = `surrounding-${Date.now()}`;
    const wallsId = `walls-${Date.now()}`;

    setTextureBoxes([
      { id: surroundingId, type: "surrounding", textures: [] },
      { id: wallsId, type: "walls", textures: [] },
    ]);
  }, [textureBoxes.length]);

  const addImagesToBox = useCallback((boxId: string, textures: TextureItem[]) => {
    setTextureBoxes((prev) =>
      prev.map((box) =>
        box.id === boxId
          ? { ...box, textures: [...box.textures, ...textures] }
          : box
      )
    );
  }, []);

  const removeImageFromBox = useCallback((boxId: string, index: number) => {
    setTextureBoxes((prev) => {
      const box = prev.find((b) => b.id === boxId);
      if (box) {
        const textureToRemove = box.textures[index];
        if (textureToRemove.url.startsWith('blob:')) {
          URL.revokeObjectURL(textureToRemove.url);
        }
        return prev.map((b) =>
          b.id === boxId
            ? { ...b, textures: b.textures.filter((_, i) => i !== index) }
            : b
        );
      }
      return prev;
    });
  }, []);

  const handleFileUpload = useCallback((boxId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const textures: TextureItem[] = Array.from(files)
      .filter(file => file.type.startsWith("image/"))
      .map(file => ({ url: URL.createObjectURL(file) }));

    if (textures.length > 0) {
      addImagesToBox(boxId, textures);
    }
  }, [addImagesToBox]);

  const handleFileDrop = useCallback((boxId: string, files: File[]) => {
    const textures: TextureItem[] = files.map(file => ({ url: URL.createObjectURL(file) }));
    addImagesToBox(boxId, textures);
  }, [addImagesToBox]);

  const handleUrlDrop = useCallback((boxId: string, texture: TextureItem) => {
    if (texture.url) {
      addImagesToBox(boxId, [texture]);
    }
  }, [addImagesToBox]);

  return {
    textureBoxes,
    initializeTextureBoxes,
    addImagesToBox,
    removeImageFromBox,
    handleFileUpload,
    handleFileDrop,
    handleUrlDrop,
  };
}

