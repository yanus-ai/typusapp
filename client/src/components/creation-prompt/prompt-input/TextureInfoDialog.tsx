import { CustomDialog } from "../ui/CustomDialog";
import { Button } from "@/components/ui/button";
import { useClientLanguage } from "@/hooks/useClientLanguage";

interface TextureInfoDialogProps {
  open: boolean;
  onClose: () => void;
  onOpenCatalog: () => void;
  onDontShowAgain?: () => void;
  exampleImageUrl?: string;
}

const EXAMPLE_TEXTURE_URL = "https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/thumbnails/162434e1-e809-426a-989a-dceaa70629ea.png";

export function TextureInfoDialog({ 
  open, 
  onClose, 
  onOpenCatalog,
  onDontShowAgain,
  exampleImageUrl = EXAMPLE_TEXTURE_URL 
}: TextureInfoDialogProps) {
  const language = useClientLanguage();
  const isGerman = language === 'de';

  const handleOpenCatalog = () => {
    onOpenCatalog();
    onClose();
  };

  const handleDontShowAgain = () => {
    if (onDontShowAgain) {
      onDontShowAgain();
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
  const gotItText = isGerman ? "Verstanden" : "Got it";

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
            <Button
              variant="ghost"
              onClick={handleDontShowAgain}
              className="text-xs text-gray-600 hover:text-gray-900"
              size="sm"
            >
              {isGerman ? "Nicht mehr anzeigen" : "Don't show this again"}
            </Button>
          )}
          <div className="flex items-center gap-3 ml-auto">
            <Button
              variant="outline"
              onClick={onClose}
              size="sm"
            >
              {gotItText}
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

