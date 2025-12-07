import { X } from "lucide-react";
import { useKeywords } from "../hooks/useKeywords";
import { cn } from "@/utils/helpers";

export default function Keywords() {
  const { selectedKeywords, handleRemoveKeyword } = useKeywords();

  return (
    <div
      className={cn("flex flex-wrap gap-2 py-1", {
        hidden: selectedKeywords.length === 0,
      })}
    >
      {selectedKeywords.map((keyword) => (
        <div
          key={keyword.id}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none bg-gray-100 border border-gray-200 text-xs"
        >
          <span className="text-gray-600 font-medium">{keyword.label}</span>
          <button
            type="button"
            onClick={() => handleRemoveKeyword(keyword)}
            className="ml-0.5 rounded-none p-0.5 hover:bg-gray-200 transition-colors focus:outline-none"
            aria-label={`Remove ${keyword.label}`}
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
        </div>
      ))}
    </div>
  );
}
