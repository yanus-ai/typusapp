import { CustomDialog } from "../ui/CustomDialog";
import { Button } from "@/components/ui/button";
import { useClientLanguage } from "@/hooks/useClientLanguage";
import colormap1 from "@/assets/colormaps/colormap1.png";
import colormap2 from "@/assets/colormaps/colormap2.png";
import colormap3 from "@/assets/colormaps/colormap3.png";
import colormap4 from "@/assets/colormaps/colormap4.png";
import colormap5 from "@/assets/colormaps/colormap5.png";

interface ColorMapInfoDialogProps {
  open: boolean;
  onClose: () => void;
  onDontShowAgain?: () => void;
}

const colorMaps = [
  { id: 1, src: colormap1, alt: "Color Map Example 1" },
  { id: 2, src: colormap2, alt: "Color Map Example 2" },
  { id: 3, src: colormap3, alt: "Color Map Example 3" },
  { id: 4, src: colormap4, alt: "Color Map Example 4" },
  { id: 5, src: colormap5, alt: "Color Map Example 5" },
];

export function ColorMapInfoDialog({ open, onClose, onDontShowAgain }: ColorMapInfoDialogProps) {
  const language = useClientLanguage();
  const isGerman = language === 'de';

  const handleDontShowAgain = () => {
    if (onDontShowAgain) {
      onDontShowAgain();
    }
    onClose();
  };

  const title = isGerman ? "Farbkarten-Beispiele" : "Color Map Examples";
  const instructionalText = isGerman
    ? "Um die Regionen-Funktionen voll auszuschöpfen, laden Sie eine Farbkarte wie diese hoch. Sie erhalten vollständige Kontrolle über die separaten Farbregionen und können Texturen aus unserem Katalog anwenden. Wechseln Sie einfach Ihre Materialien zu klaren Farben und exportieren Sie ein Bild, oder verwenden Sie unsere Plugin-Integrationen."
    : "To fully take advantage of the region features, upload a color map like these. You will gain full control over the separate color regions and can apply textures from our catalog. Simply switch your materials to clear colors and export an image, or use our plugin integrations.";
  const dontShowAgainText = isGerman ? "Nicht mehr anzeigen" : "Don't show this again";
  const gotItText = isGerman ? "Verstanden" : "Got it";

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Color Map Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {colorMaps.map((colormap) => (
            <div
              key={colormap.id}
              className="relative aspect-video bg-gray-100 rounded-none overflow-hidden border border-gray-200"
            >
              <img
                src={colormap.src}
                alt={colormap.alt}
                className="w-full h-full object-contain"
              />
            </div>
          ))}
        </div>

        {/* Instructional Text */}
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-none">
          <p className="text-sm text-gray-700 leading-relaxed">
            {instructionalText}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={handleDontShowAgain}
            className="text-xs text-gray-600 hover:text-gray-900"
            size="sm"
          >
            {dontShowAgainText}
          </Button>
          <Button
            onClick={onClose}
            size="sm"
          >
            {gotItText}
          </Button>
        </div>
      </div>
    </CustomDialog>
  );
}

