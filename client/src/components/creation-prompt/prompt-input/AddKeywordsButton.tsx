import { toggleCatalogOpen } from "@/features/create/createUISlice";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { Tag, X } from "lucide-react";

export function AddKeywordsButton() {
  const isCatalogOpen = useAppSelector((state) => state.createUI.isCatalogOpen);
  const dispatch = useAppDispatch();

  return (
    <button
      className="px-2 py-2 border border-transparent hover:border-gray-200 shadow-none bg-transparent rounded-none transition-colors hover:bg-gray-50 cursor-pointer flex items-center justify-center space-x-2 text-xs"
      type="button"
      onClick={() => dispatch(toggleCatalogOpen())}
      aria-label="Add keywords"
    >
      {isCatalogOpen ? <X size={16} /> : <Tag size={16} />}
      <span className="font-sans">
        {isCatalogOpen ? "Close Keywords" : "Add Keywords"}
      </span>
    </button>
  );
}
