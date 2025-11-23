import { Tag, X } from "lucide-react";

export function AddKeywordsButton({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: () => void }) {
  return (
    <button
      className="px-2 py-2 border border-transparent hover:border-gray-200 shadow-none bg-transparent rounded-none transition-colors hover:bg-gray-50 cursor-pointer flex items-center justify-center space-x-2 text-xs"
      type="button"
      onClick={onOpenChange}
      aria-label="Add keywords"
    >
      {isOpen ? <X size={16} /> : <Tag size={16} /> }
      <span className="font-sans">{isOpen ? "Close Keywords" : "Add Keywords"}</span>
    </button>
  );
}

