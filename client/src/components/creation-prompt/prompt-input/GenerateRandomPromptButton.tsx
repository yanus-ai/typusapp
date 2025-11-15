import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { setSavedPrompt, generateAIPrompt } from "@/features/masks/maskSlice";
import { WandSparkles } from "lucide-react";
import LightTooltip from "@/components/ui/light-tooltip";
import { useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";

export default function GenerateRandomPromptButton({ isTyping, setIsTyping }: { isTyping: boolean, setIsTyping: (isTyping: boolean) => void }) {
  const { inputImageId } = useAppSelector(state => state.customization);
  const dispatch = useAppDispatch();
  const [isGenerating, setIsGenerating] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Streaming/typing effect function
  const streamText = useCallback((text: string, speed: number = 20) => {
    // Clear any existing typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Clear the prompt first
    dispatch(setSavedPrompt(''));
    isTypingRef.current = true;
    setIsTyping(true);
    
    let currentIndex = 0;
    let currentText = '';
    
    const typeNextChar = () => {
      if (currentIndex < text.length) {
        const nextChar = text[currentIndex];
        currentText += nextChar;
        dispatch(setSavedPrompt(currentText));
        currentIndex++;
        
        // Variable speed: faster for spaces and punctuation, slower for regular chars
        const delay = nextChar === ' ' || nextChar === '.' || nextChar === ',' 
          ? speed * 0.5 
          : speed;
        
        typingTimeoutRef.current = setTimeout(typeNextChar, delay);
      } else {
        // Typing complete
        isTypingRef.current = false;
        setIsTyping(false);
        setIsGenerating(false);
        typingTimeoutRef.current = null;
      }
    };
    
    // Start typing after a small delay
    typingTimeoutRef.current = setTimeout(typeNextChar, 100);
  }, [dispatch]);

  const handleRandomPrompt = async () => {
    if (isGenerating || isTyping || isTypingRef.current) return;
    
    setIsGenerating(true);
    
    // Clear any existing typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    isTypingRef.current = false;
    setIsTyping(false);
    
    try {
      // Random architectural style keywords
      const styles = [
        'Avant-Garde Innovative Industrial',
        'Modern Minimalist Contemporary',
        'Brutalist Concrete Architecture',
        'Futuristic Sustainable Design',
        'Classical Elegant Structure',
        'Organic Biophilic Architecture',
        'Postmodern Eclectic Building',
        'High-Tech Glass Facade',
        'Vernacular Regional Design',
        'Deconstructivist Geometric Form'
      ];
      
      // Random materials (2-3 materials)
      const materials = [
        'WOOD', 'CONCRETE', 'METAL', 'GLASS', 'STONE', 
        'MARBLE', 'STEEL', 'BRICK', 'PLASTER', 'CERAMICS', 
        'TERRAZZO', 'LIGHTING'
      ];
      
      const randomStyle = styles[Math.floor(Math.random() * styles.length)];
      const shuffledMaterials = materials.sort(() => 0.5 - Math.random());
      const selectedMaterials = shuffledMaterials.slice(0, Math.floor(Math.random() * 2) + 2); // 2-3 materials
      const materialsText = selectedMaterials.join(', ');
      
      // Use inputImageId if available, otherwise generate without it
      if (inputImageId) {
        // Backend API call
        const result = await dispatch(generateAIPrompt({
          inputImageId: inputImageId,
          userPrompt: `Create an Architectural Visualization of ${randomStyle}`,
          materialsText: materialsText,
          includeSelectedMaterials: false
        })).unwrap();
        
        if (result.data?.generatedPrompt) {
          // Stream the backend response
          streamText(result.data.generatedPrompt, 15); // Slightly faster for backend
          toast.success('Random prompt generated!');
        }
      } else {
        // Fallback: Generate a simple random prompt without API call
        const fallbackPrompts = [
          `Create an Architectural Visualization of ${randomStyle} featuring ${materialsText.toLowerCase()} materials with ultra-realistic details, clear contours, resembling a high-quality photograph taken with a Canon 5D. Octane rendering enhances the realism, with a view in 8K resolution for the highest level of detail.`,
          `Generate an architectural visualization showcasing ${randomStyle} design principles, incorporating ${materialsText.toLowerCase()} elements. The visualization should feature ultra-realistic details, crisp lines, and professional photography quality with Canon 5D aesthetics and Octane rendering in 8K resolution.`,
          `Create a stunning architectural visualization of ${randomStyle} architecture using ${materialsText.toLowerCase()} materials. The design should exhibit ultra-realistic rendering with clear contours, high detail photography style, Canon 5D quality, and Octane rendering at 8K resolution for maximum visual impact.`
        ];
        
        const randomPrompt = fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
        // Stream the fallback prompt
        streamText(randomPrompt, 20);
        toast.success('Random prompt generated!');
      }
    } catch (error: any) {
      console.error('Failed to generate random prompt:', error);
      toast.error(error?.message || 'Failed to generate random prompt');
      isTypingRef.current = false;
      setIsTyping(false);
      setIsGenerating(false);
      // Clear any pending typing
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
    // Note: isGenerating will be set to false when typing completes (in streamText)
  }

  return (
    <LightTooltip text="Generate Random Prompt" direction="top">
      <button
        className={`p-2 rounded-lg text-gray-500 hover:text-gray-700 transition-all duration-200 flex items-center justify-center ${
          isGenerating || isTyping
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:bg-gray-100"
        }`}
        type="button"
        onClick={handleRandomPrompt}
        disabled={isGenerating || isTyping}
        aria-label="Generate Random Prompt"
      >
        <WandSparkles
          size={18}
          className={`transition-transform ${
            isGenerating || isTyping ? "animate-pulse" : "hover:scale-110"
          }`}
        />
      </button>
    </LightTooltip>
  );
}
