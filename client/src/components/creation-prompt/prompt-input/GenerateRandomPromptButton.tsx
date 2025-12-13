import { WandSparkles } from "lucide-react";
import LightTooltip from "@/components/ui/light-tooltip";
import { useRandomPrompt } from "../hooks/useRandomPrompt";
import { useTranslation } from "@/hooks/useTranslation";

export default function GenerateRandomPromptButton({
  isTyping,
  setIsTyping,
}: {
  isTyping: boolean;
  setIsTyping: (isTyping: boolean) => void;
}) {
  const { t } = useTranslation();
  const { isGenerating, handleRandomPrompt } = useRandomPrompt(setIsTyping);

  return (
    <LightTooltip text={t('create.randomPrompt.generatePrompt')} direction="top">
      <button
        className={`p-2 rounded-none text-gray-500 hover:text-gray-700 transition-all duration-200 flex items-center justify-center ${
          isGenerating || isTyping
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:bg-gray-100"
        }`}
        type="button"
        onClick={handleRandomPrompt}
        disabled={isGenerating || isTyping}
        aria-label={t('create.randomPrompt.generatePromptAria')}
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
