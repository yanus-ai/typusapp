import React, { useRef, useState } from "react";
import { LayersIcon, X } from "lucide-react";
import LightTooltip from "@/components/ui/light-tooltip";
import { TextureBox as TextureBoxType } from "../hooks/useTextures";
import { TextureInfoDialog } from "./TextureInfoDialog";

interface TextureBoxProps {
  box: TextureBoxType;
  onFileSelect: (files: FileList | null) => void;
  onDrop: (e: React.DragEvent) => void;
  onRemoveImage: (index: number) => void;
  onOpenCatalog?: () => void;
}

const TEXTURE_INFO_DIALOG_PREFERENCE_KEY = "texture_info_dialog_dont_show";

export function TextureBox({
  box,
  onFileSelect,
  onDrop,
  onRemoveImage,
  onOpenCatalog,
}: TextureBoxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = `texture-input-${box.id}`;
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop(e);
  };

  const handleClick = () => {
    // For walls type, show info dialog first if user hasn't opted out
    if (box.type === 'walls' && onOpenCatalog) {
      const dontShow = localStorage.getItem(TEXTURE_INFO_DIALOG_PREFERENCE_KEY);
      if (dontShow !== "true") {
        setShowInfoDialog(true);
        return;
      }
      // If user opted out, open file picker directly
      inputRef.current?.click();
      return;
    }
    // For surrounding or if no catalog handler, open file picker
    inputRef.current?.click();
  };

  const handleDontShowAgain = () => {
    localStorage.setItem(TEXTURE_INFO_DIALOG_PREFERENCE_KEY, "true");
    setShowInfoDialog(false);
  };

  const handleOpenCatalog = () => {
    if (onOpenCatalog) {
      onOpenCatalog();
    }
    setShowInfoDialog(false);
  };

  const label = box.type === "surrounding" ? "Surrounding" : "Walls";

  return (
    <>
      <LightTooltip text={label} direction="bottom">
        <div
          className="min-h-20 min-w-24 w-auto rounded-none border-2 border-dashed border-gray-300 bg-gray-50 flex-shrink-0 cursor-pointer hover:border-gray-400 transition-colors relative overflow-hidden p-1"
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          title={label}
        >
        {box.textures && box.textures.length > 0 ? (
          <div className="flex flex-row gap-1 w-full h-full overflow-x-auto">
            {box.textures.map((texture, idx) => (
              <div
                key={idx}
                className="relative flex-shrink-0 w-16 h-16 rounded overflow-hidden bg-gray-100"
              >
                <img
                  src={texture.url}
                  alt={texture.displayName || `${box.type} ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 rounded-none hover:bg-black/90 transition-colors z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveImage(idx);
                  }}
                  title="Remove"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {/* Persistent plus button to indicate more uploads allowed */}
            <button
              type="button"
              className="flex-shrink-0 w-16 h-16 rounded border border-dashed border-gray-400 flex items-center justify-center hover:border-gray-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              title={label}
            >
              <div className="w-5 h-5 rounded-none bg-gray-200 text-gray-600 flex items-center justify-center">
                <span className="text-sm leading-none">+</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-16">
            <div className="flex flex-col items-center gap-1">
              <LayersIcon className="size-6 text-gray-600" />
              <span className="text-[10px] uppercase tracking-wide text-gray-500 text-center px-1">
                {box.type === 'walls' ? 'add wall textures' : 'add surrounding textures'}
              </span>
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            onFileSelect(e.target.files);
            if (e.target) e.target.value = '';
          }}
        />
      </div>
    </LightTooltip>
    {box.type === 'walls' && onOpenCatalog && (
      <TextureInfoDialog
        open={showInfoDialog}
        onClose={() => setShowInfoDialog(false)}
        onOpenCatalog={handleOpenCatalog}
        onDontShowAgain={handleDontShowAgain}
        onUploadOwnTexture={() => {
          setShowInfoDialog(false);
          // Small delay to ensure dialog closes before file picker opens
          setTimeout(() => {
            inputRef.current?.click();
          }, 100);
        }}
      />
    )}
    </>
  );
}

