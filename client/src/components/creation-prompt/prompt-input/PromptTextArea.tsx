import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { setSavedPrompt } from "@/features/masks/maskSlice";

export function PromptTextArea() {
  const { savedPrompt } = useAppSelector(state => state.masks);
  const dispatch = useAppDispatch();

  const handleChange = (newValue: string) => {
    dispatch(setSavedPrompt(newValue));
  }

  return (
    <textarea
      className="mb-0 min-h-14! h-14 w-full flex-1 resize-none border-none bg-transparent px-1.5 pt-0.5 pb-0 text-black outline-none placeholder:text-neutral-400 hover:resize-y sm:h-14"
      name="prompt"
      aria-label="Prompt"
      value={savedPrompt || ''}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="Create an Architectural Visualization of Avant-Garde Innovative Industrial"
    />
  )
}