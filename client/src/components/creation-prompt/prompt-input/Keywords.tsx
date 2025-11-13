import { X } from "lucide-react";
import { useKeywords } from "../hooks/useKeywords";
import { cn } from "@/utils/helpers";

export default function Keywords() {
  const { selectedKeywords, handleRemoveSelection } = useKeywords();

  return (
    <div
      className={cn("flex flex-wrap gap-2 py-1", {
        hidden: selectedKeywords.length === 0,
      })}
    >
      {selectedKeywords.map(({ category, label }) => (
        <div
          key={category}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-xs"
        >
          <span className="text-gray-600 font-medium">{label}</span>
          <button
            type="button"
            onClick={() => handleRemoveSelection(category)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-gray-200 transition-colors focus:outline-none"
            aria-label={`Remove ${label}`}
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
        </div>
      ))}
    </div>
  );
}
