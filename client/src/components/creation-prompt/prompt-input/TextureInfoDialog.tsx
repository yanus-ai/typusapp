import { useState, useEffect } from "react";
import { CustomDialog } from "../ui/CustomDialog";
import { Button } from "@/components/ui/button";
import { useClientLanguage } from "@/hooks/useClientLanguage";

interface TextureInfoDialogProps {
  open: boolean;
  onClose: () => void;
  onOpenCatalog: () => void;
  onDontShowAgain?: () => void;
  onUploadOwnTexture?: () => void;
  exampleImageUrl?: string;
}

const EXAMPLE_TEXTURE_URL = "https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/thumbnails/162434e1-e809-426a-989a-dceaa70629ea.png";

export function TextureInfoDialog({ 
  open, 
  onClose, 
  onOpenCatalog,
  onDontShowAgain,
  onUploadOwnTexture,
  exampleImageUrl = EXAMPLE_TEXTURE_URL 
}: TextureInfoDialogProps) {
  const language = useClientLanguage();
  const isGerman = language === 'de';
  const [dontShowAgainChecked, setDontShowAgainChecked] = useState(false);

  // Reset checkbox when dialog opens
  useEffect(() => {
    if (open) {
      setDontShowAgainChecked(false);
    }
  }, [open]);

  const handleOpenCatalog = () => {
    // Save preference if checkbox is checked
    if (dontShowAgainChecked && onDontShowAgain) {
      onDontShowAgain();
    }
    onOpenCatalog();
    onClose();
  };

  const handleUploadOwnTexture = () => {
    // Save preference if checkbox is checked
    if (dontShowAgainChecked && onDontShowAgain) {
      onDontShowAgain();
    }
    if (onUploadOwnTexture) {
      onUploadOwnTexture();
    }
    onClose();
  };

  const title = isGerman ? "Texturen hinzufügen" : "Add Textures";
  const mainText = isGerman
    ? "Sie können entweder Ihre eigenen Texturproben hochladen oder einfach Texturen aus unserem Katalog per Drag & Drop hinzufügen."
    : "You can either upload your own texture samples or simply drag and drop textures from our catalog.";
  const additionalText = isGerman
    ? "Öffnen Sie den Katalog, indem Sie auf \"Katalog öffnen\" klicken"
    : "Open up the catalog by clicking on \"Open Catalog\"";
  const openCatalogText = isGerman ? "Katalog öffnen" : "Open Catalog";
  const uploadOwnText = isGerman ? "Eigene Textur hochladen" : "Upload own texture";
  const dontShowAgainText = isGerman ? "Nicht mehr anzeigen" : "Don't show this again";

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Main Text */}
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-none">
          <p className="text-sm text-gray-700 leading-relaxed">
            {mainText}
          </p>
        </div>

        {/* Example Image */}
        <div className="flex justify-center">
          <div className="relative w-20 h-20 rounded overflow-hidden border border-gray-200 bg-gray-100">
            <img
              src={exampleImageUrl}
              alt="Example texture"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Additional Text */}
        <div className="text-center">
          <p className="text-xs text-gray-600">
            {additionalText}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          {onDontShowAgain && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgainChecked}
                onChange={(e) => setDontShowAgainChecked(e.target.checked)}
                className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
              />
              <span className="text-xs text-gray-600">
                {dontShowAgainText}
              </span>
            </label>
          )}
          <div className="flex items-center gap-3 ml-auto">
            <Button
              variant="outline"
              onClick={handleUploadOwnTexture}
              size="sm"
            >
              {uploadOwnText}
            </Button>
            <Button
              onClick={handleOpenCatalog}
              size="sm"
            >
              {openCatalogText}
            </Button>
          </div>
        </div>
      </div>
    </CustomDialog>
  );
}

