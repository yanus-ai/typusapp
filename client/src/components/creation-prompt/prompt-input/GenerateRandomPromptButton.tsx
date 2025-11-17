import { WandSparkles } from "lucide-react";
import LightTooltip from "@/components/ui/light-tooltip";
import { useRandomPrompt } from "../hooks/useRandomPrompt";
import { TextureBox } from "../hooks/useTextures";

export default function GenerateRandomPromptButton({
  isTyping,
  setIsTyping,
  textureBoxes,
}: {
  isTyping: boolean;
  setIsTyping: (isTyping: boolean) => void;
  textureBoxes: TextureBox[];
}) {
  const { isGenerating, handleRandomPrompt } = useRandomPrompt(setIsTyping);

  return (
    <LightTooltip text="Generate Random Prompt" direction="top">
      <button
        className={`p-2 rounded-lg text-gray-500 hover:text-gray-700 transition-all duration-200 flex items-center justify-center ${
          isGenerating || isTyping
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:bg-gray-100"
        }`}
        type="button"
        onClick={() => handleRandomPrompt(textureBoxes)}
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
