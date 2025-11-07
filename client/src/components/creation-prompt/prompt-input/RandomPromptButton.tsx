import LightTooltip from "@/components/ui/light-tooltip";
import { ShuffleIcon } from "lucide-react";

export function RandomPromptButton() {
  return (
    <LightTooltip text="Random Prompt" direction="bottom">
      <button
        className="px-2 py-2 border border-transparent hover:border-gray-200 shadow-none bg-transparent rounded-lg transition-colors hover:bg-gray-50 cursor-pointer flex items-center justify-center space-x-2 text-xs"
        tabIndex={0}
        type="button"
      >
        <ShuffleIcon size={16} />
      </button>
    </LightTooltip>
  );
}
