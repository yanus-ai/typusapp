import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { setSavedPrompt } from "@/features/masks/maskSlice";
import { useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { useKeywords } from "./useKeywords";
import { useTextures } from "./useTextures";
import { streamSSE, createStreamAbortController } from "@/utils/streamingUtils";

export function useRandomPrompt(setIsTyping: (isTyping: boolean) => void) {
  const { inputImageId } = useAppSelector(state => state.customization);
  const dispatch = useAppDispatch();
  const { selectedKeywords } = useKeywords();
  const { textureBoxes } = useTextures();
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<ReturnType<typeof createStreamAbortController> | null>(null);

  const handleRandomPrompt = useCallback(async () => {
    if (isGenerating) return;
    
    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setIsGenerating(true);
    setIsTyping(true);
    dispatch(setSavedPrompt(''));
    
    // Create new abort controller for this request
    abortControllerRef.current = createStreamAbortController();
    
    try {
      // Extract texture names from textureBoxes (walls and surrounding)
      const wallsBox = textureBoxes.find(box => box.type === "walls");
      const surroundingBox = textureBoxes.find(box => box.type === "surrounding");
      
      const textureNames: string[] = [];
      
      // Extract texture names from walls box
      if (wallsBox && wallsBox.textures.length > 0) {
        wallsBox.textures.forEach(texture => {
          if (texture.displayName) {
            textureNames.push(texture.displayName);
          }
        });
      }
      
      // Extract texture names from surrounding box
      if (surroundingBox && surroundingBox.textures.length > 0) {
        surroundingBox.textures.forEach(texture => {
          if (texture.displayName) {
            textureNames.push(texture.displayName);
          }
        });
      }
      
      // Combine all keywords: selected keywords + texture names
      const allKeywords = [
        ...selectedKeywords.map((kw) => kw.label),
        ...textureNames
      ].filter((name, index, self) => self.indexOf(name) === index); // Remove duplicates
      
      const keywordsText = allKeywords.length > 0
        ? allKeywords.join(', ')
        : '';
      
      const userPrompt = allKeywords.length > 0
        ? 'Create an Architectural Visualization'
        : '';
      
      // Stream the prompt generation using the reusable utility
      await streamSSE({
        url: '/ai-prompt/generate-stream',
        method: 'POST',
        body: {
          ...(inputImageId && { inputImageId }), // Only include if present
          userPrompt,
          materialsText: keywordsText,
          includeSelectedMaterials: false
        },
        signal: abortControllerRef.current.controller.signal,
        enableTypingEffect: true,
        typingSpeed: 15,
        onChunk: (_chunk, accumulated) => {
          dispatch(setSavedPrompt(accumulated));
        },
        onComplete: () => {
          setIsGenerating(false);
          setIsTyping(false);
          toast.success('Random prompt generated with selected keywords!');
        },
        onError: (error) => {
          console.error('Failed to generate random prompt:', error);
          toast.error(error.message || 'Failed to generate random prompt');
          setIsGenerating(false);
          setIsTyping(false);
        }
      });
    } catch (error: any) {
      // AbortError is handled by onError callback, but we check here too
      if (error.name !== 'AbortError') {
        console.error('Unexpected error:', error);
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [inputImageId, selectedKeywords, textureBoxes, dispatch, setIsTyping]);

  return {
    isGenerating,
    handleRandomPrompt
  };
}
