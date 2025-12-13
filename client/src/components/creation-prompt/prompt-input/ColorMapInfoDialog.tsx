import { useState, useEffect } from "react";
import { CustomDialog } from "../ui/CustomDialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
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
  const { t } = useTranslation();
  const [dontShowAgainChecked, setDontShowAgainChecked] = useState(false);

  // Reset checkbox when dialog opens
  useEffect(() => {
    if (open) {
      setDontShowAgainChecked(false);
    }
  }, [open]);

  const handleClose = () => {
    // Save preference if checkbox is checked
    if (dontShowAgainChecked && onDontShowAgain) {
      onDontShowAgain();
    }
    onClose();
  };

  const title = t('create.colorMap.title');
  const instructionalText = t('create.colorMap.instructionalText');
  const dontShowAgainText = t('create.colorMap.dontShowAgain');
  const gotItText = t('create.colorMap.gotIt');

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
          <Button
            onClick={handleClose}
            size="sm"
            className={onDontShowAgain ? "ml-auto" : ""}
          >
            {gotItText}
          </Button>
        </div>
      </div>
    </CustomDialog>
  );
}

