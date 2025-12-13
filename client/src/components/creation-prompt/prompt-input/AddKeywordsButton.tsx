import { useAppSelector } from "@/hooks/useAppSelector";
import { Tag, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { createPortal } from "react-dom";
import CatalogDialog from "./CatalogDialog";
import { useState } from "react";

export function AddKeywordsButton() {
  const { t } = useTranslation();
  const isCatalogOpen = useAppSelector((state) => state.createUI.isCatalogOpen);
  const [isCatalogDialogOpen, setIsCatalogDialogOpen] = useState(false);

  return (
    <>
      <button
        className="px-2 py-2 border border-transparent hover:border-gray-200 shadow-none bg-transparent rounded-none transition-colors hover:bg-gray-50 cursor-pointer flex items-center justify-center space-x-2 text-xs"
        type="button"
        onClick={() => setIsCatalogDialogOpen(true)}
        aria-label={t("create.keywords.addKeywords")}
      >
        {isCatalogOpen ? <X size={16} /> : <Tag size={16} />}
        <span className="font-sans">
          {isCatalogOpen
            ? t("create.keywords.closeCatalog")
            : t("create.keywords.openCatalog")}
        </span>
      </button>
      {createPortal(
        <CatalogDialog
          open={isCatalogDialogOpen}
          onClose={() => setIsCatalogDialogOpen(false)}
        />,
        document.body
      )}
    </>
  );
}
