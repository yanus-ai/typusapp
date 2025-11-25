import React, { useState, useRef } from "react";
import { CustomDialog } from "../ui/CustomDialog";
import { Upload, X, Loader2, InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import colormap1 from "@/assets/regions/colormap1.png";
import colormap2 from "@/assets/regions/colormap2.png";

interface ColorMapUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onColorMapSelect?: (file: File) => void;
}

interface ColorMapItem {
  id: string;
  file?: File;
  previewUrl: string;
  name: string;
  isExample: boolean;
}

export function ColorMapUploadDialog({
  open,
  onClose,
  onColorMapSelect,
}: ColorMapUploadDialogProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default example color maps
  const [colorMaps, setColorMaps] = useState<ColorMapItem[]>([
    {
      id: "example-1",
      previewUrl: colormap1,
      name: "Example Color Map 1",
      isExample: true,
    },
    {
      id: "example-2",
      previewUrl: colormap2,
      name: "Example Color Map 2",
      isExample: true,
    },
  ]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);

        // Add to color maps list
        const newColorMap: ColorMapItem = {
          id: `uploaded-${Date.now()}-${Math.random()}`,
          file,
          previewUrl,
          name: file.name,
          isExample: false,
        };

        setColorMaps((prev) => [...prev, newColorMap]);
        toast.success(`${file.name} uploaded successfully`);

        // Call callback if provided
        if (onColorMapSelect) {
          onColorMapSelect(file);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("An error occurred while uploading");
    } finally {
      setUploading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e.target.files);
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleColorMapClick = (colorMap: ColorMapItem) => {
    if (colorMap.isExample) {
      toast("This is an example. Please upload your own color map.", {
        icon: <InfoIcon size={16} />,
      });
      return;
    }

    if (colorMap.file && onColorMapSelect) {
      onColorMapSelect(colorMap.file);
      onClose();
    }
  };

  const handleRemoveColorMap = (id: string, previewUrl: string) => {
    // Revoke object URL to prevent memory leaks
    if (!previewUrl.includes("/assets/regions/")) {
      URL.revokeObjectURL(previewUrl);
    }
    setColorMaps((prev) => prev.filter((cm) => cm.id !== id));
    toast.success("Color map removed");
  };

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title="Upload Color Map"
      maxWidth="4xl"
      className="max-h-[90vh]"
    >
      <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
        <div className="space-y-6">
          {/* Description */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Upload a color map of your 3D model to create regions
            </p>
          </div>

          {/* Upload Area */}
          <div
            className={cn(
              "rounded-none border-2 border-dashed transition-colors",
              uploading
                ? "border-gray-300 bg-gray-50 cursor-not-allowed"
                : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 cursor-pointer"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!uploading) {
                e.currentTarget.classList.add("border-gray-400", "bg-gray-100");
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!uploading) {
                e.currentTarget.classList.remove("border-gray-400", "bg-gray-100");
              }
            }}
            onDrop={handleFileDrop}
            onClick={() => {
              if (!uploading) {
                fileInputRef.current?.click();
              }
            }}
          >
            <div className="flex flex-col items-center justify-center p-8">
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
                  <span className="text-sm text-gray-600">Uploading...</span>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 mb-1">
                    Drag & drop color maps here or
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="text-sm text-gray-900 font-medium hover:text-gray-700 underline"
                  >
                    browse files
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Upload color maps to use for region generation
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Color Maps Grid */}
          {colorMaps.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Color Maps
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {colorMaps.map((colorMap) => (
                  <div
                    key={colorMap.id}
                    className={cn(
                      "group relative flex flex-col items-center gap-2 p-3 rounded-none border-2 transition-all",
                      colorMap.isExample
                        ? "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm cursor-default"
                        : "border-gray-200 bg-white hover:border-primary-500 hover:shadow-md cursor-pointer"
                    )}
                    onClick={() => handleColorMapClick(colorMap)}
                  >
                    <div className="w-full aspect-square rounded-none overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={colorMap.previewUrl}
                        alt={colorMap.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <span className="text-xs font-medium text-center text-gray-700 line-clamp-2 w-full">
                      {colorMap.name}
                    </span>
                    {colorMap.isExample && (
                      <span className="text-[10px] text-gray-500">Example</span>
                    )}
                    {!colorMap.isExample && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveColorMap(colorMap.id, colorMap.previewUrl);
                        }}
                        className="absolute top-1 right-1 p-1 bg-black/70 rounded-none hover:bg-black/90 transition-colors opacity-0 group-hover:opacity-100 z-10"
                        aria-label="Remove color map"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </CustomDialog>
  );
}

