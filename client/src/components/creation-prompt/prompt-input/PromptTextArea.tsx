import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { setSavedPrompt } from "@/features/masks/maskSlice";
import { Wand2 } from "lucide-react";
import LightTooltip from "@/components/ui/light-tooltip";

export function PromptTextArea() {
  const { savedPrompt } = useAppSelector(state => state.masks);
  const dispatch = useAppDispatch();

  const handleChange = (newValue: string) => {
    dispatch(setSavedPrompt(newValue));
  }

  const handleRandomPrompt = () => {
    // TODO: Implement random prompt generation
  }

  return (
    <div className="relative w-full">
      <textarea
        className="mb-0 min-h-14! h-14 w-full flex-1 resize-none border-none bg-transparent px-1.5 pt-0.5 pb-0 text-black outline-none placeholder:text-neutral-400 hover:resize-y sm:h-14"
        name="prompt"
        aria-label="Prompt"
        value={savedPrompt || ''}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Create an Architectural Visualization of Avant-Garde Innovative Industrial"
      />
      <div className="absolute bottom-3 right-3">
        <LightTooltip text="Craft a Prompt" direction="top">
          <button
            className="p-1.5 border border-transparent hover:border-gray-200 shadow-none bg-transparent rounded-lg transition-colors cursor-pointer flex items-center justify-center"
            type="button"
            onClick={handleRandomPrompt}
            aria-label="Random Prompt"
          >
            <Wand2 size={16} className="text-gray-600" />
          </button>
        </LightTooltip>
      </div>
    </div>
  )
}