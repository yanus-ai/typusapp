import { useState, useEffect, useCallback } from "react";

export interface TextureBox {
  id: string;
  type: "surrounding" | "walls";
  imageUrls: string[];
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
        box.imageUrls.forEach((url) => {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
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
      { id: surroundingId, type: "surrounding", imageUrls: [] },
      { id: wallsId, type: "walls", imageUrls: [] },
    ]);
  }, [textureBoxes.length]);

  const addImagesToBox = useCallback((boxId: string, urls: string[]) => {
    setTextureBoxes((prev) =>
      prev.map((box) =>
        box.id === boxId
          ? { ...box, imageUrls: [...box.imageUrls, ...urls] }
          : box
      )
    );
  }, []);

  const removeImageFromBox = useCallback((boxId: string, index: number) => {
    setTextureBoxes((prev) => {
      const box = prev.find((b) => b.id === boxId);
      if (box) {
        const urlToRemove = box.imageUrls[index];
        if (urlToRemove.startsWith('blob:')) {
          URL.revokeObjectURL(urlToRemove);
        }
        return prev.map((b) =>
          b.id === boxId
            ? { ...b, imageUrls: b.imageUrls.filter((_, i) => i !== index) }
            : b
        );
      }
      return prev;
    });
  }, []);

  const handleFileUpload = useCallback((boxId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newUrls = Array.from(files)
      .filter(file => file.type.startsWith("image/"))
      .map(file => URL.createObjectURL(file));

    if (newUrls.length > 0) {
      addImagesToBox(boxId, newUrls);
    }
  }, [addImagesToBox]);

  const handleFileDrop = useCallback((boxId: string, files: File[]) => {
    const newUrls = files.map(file => URL.createObjectURL(file));
    addImagesToBox(boxId, newUrls);
  }, [addImagesToBox]);

  const handleUrlDrop = useCallback((boxId: string, url: string) => {
    if (url) {
      addImagesToBox(boxId, [url]);
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

