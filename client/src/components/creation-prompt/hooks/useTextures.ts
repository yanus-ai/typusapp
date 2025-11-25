import { useEffect, useCallback } from "react";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import {
  TextureItem,
  TextureBox,
  initializeTextureBoxes,
  addTexturesToBox,
  removeTextureFromBox,
} from "@/features/customization/customizationSlice";

// Re-export types for convenience
export type { TextureItem, TextureBox };

/**
 * Hook for managing texture boxes (surrounding and walls)
 * Handles image URLs, file uploads, drag & drop, and cleanup
 */
export function useTextures() {
  const dispatch = useAppDispatch();
  const textureBoxes = useAppSelector((state) => state.customization.textureBoxes);

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

  const initializeTextureBoxesCallback = useCallback(() => {
    dispatch(initializeTextureBoxes());
  }, [dispatch]);

  const addImagesToBox = useCallback((boxId: string, textures: TextureItem[]) => {
    dispatch(addTexturesToBox({ boxId, textures }));
  }, [dispatch]);

  const removeImageFromBox = useCallback((boxId: string, index: number) => {
    dispatch(removeTextureFromBox({ boxId, index }));
  }, [dispatch]);

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
    initializeTextureBoxes: initializeTextureBoxesCallback,
    addImagesToBox,
    removeImageFromBox,
    handleFileUpload,
    handleFileDrop,
    handleUrlDrop,
  };
}

