import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { setSavedPrompt } from "@/features/masks/maskSlice";
import { useRef, useEffect } from "react";

export function PromptTextArea({ isTyping }: { isTyping: boolean }) {
  const { savedPrompt } = useAppSelector(state => state.masks);
  const dispatch = useAppDispatch();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const handleChange = (newValue: string) => {
    // Don't allow manual changes while typing
    if (!isTypingRef.current && !isTyping) {
      dispatch(setSavedPrompt(newValue));
    }
  }

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height based on scrollHeight, with min and max constraints
      const scrollHeight = textarea.scrollHeight;
      const minHeight = 20; // Single row height (text-base + padding)
      const maxHeight = minHeight * 5; // Max height before scrolling
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [savedPrompt]);

  return (
    <div className="w-full">
      <div className="flex items-start gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          className="prompt-textarea-scrollbar mb-0 w-full flex-1 resize-none border-none bg-transparent pl-3 pr-3 py-2 text-black outline-none placeholder:text-neutral-400 text-base leading-relaxed overflow-y-auto"
          style={{
            minHeight: '20px',
            maxHeight: '200px',
          }}
          name="prompt"
          aria-label="Prompt"
          value={savedPrompt || ''}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Create an Architectural Visualization of Avant-Garde Innovative Industrial"
          readOnly={isTyping}
        />
      </div>
    </div>
  )
}