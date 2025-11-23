import React, { useState, useRef } from "react";
import { CustomDialog } from "../ui/CustomDialog";
import { Upload, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { uploadInputImage } from "@/features/images/inputImagesSlice";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";

interface BaseImageSelectDialogProps {
  open: boolean;
  onClose: () => void;
  onImageSelect: (imageId: number, imageUrl: string) => void;
}

export function BaseImageSelectDialog({
  open,
  onClose,
  onImageSelect,
}: BaseImageSelectDialogProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();
  const inputImages = useAppSelector((state) => state.inputImages.images);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        setUploading(false);
        return;
      }

      // Upload the image
      const action = await dispatch(
        uploadInputImage({ file, uploadSource: "CREATE_MODULE" })
      );

      if (uploadInputImage.fulfilled.match(action)) {
        const res = action.payload as any;
        toast.success(`${file.name} uploaded successfully`);
        // Call callback with the uploaded image
        if (res?.id && res?.originalUrl) {
          onImageSelect(res.id, res.originalUrl);
          onClose();
        }
      } else {
        toast.error("Failed to upload image");
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

  const handleImageClick = (image: any) => {
    const imageUrl = image.originalUrl || image.imageUrl || image.processedUrl;
    if (imageUrl && image.id) {
      onImageSelect(image.id, imageUrl);
      onClose();
    }
  };

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title="Select or Upload Base Image"
      maxWidth="4xl"
      className="max-h-[90vh]"
    >
      <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
        <div className="space-y-6">
          {/* Description */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Upload a new image or select an existing one to use as base image for region generation
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
                    Drag & drop images here or
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
                    Upload images to use for region generation
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Existing Images Grid */}
          {inputImages.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Existing Images
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {inputImages.map((image: any) => {
                  const imageUrl = image.thumbnailUrl || image.imageUrl || image.originalUrl || image.processedUrl;
                  return (
                    <div
                      key={image.id}
                      className="group relative flex flex-col items-center gap-2 p-3 rounded-none border-2 border-gray-200 bg-white hover:border-primary-500 hover:shadow-md cursor-pointer transition-all"
                      onClick={() => handleImageClick(image)}
                    >
                      <div className="w-full aspect-square rounded-none overflow-hidden bg-gray-100 flex-shrink-0">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={`Image ${image.id}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            No preview
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium text-center text-gray-700 line-clamp-2 w-full">
                        Image {image.id}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </CustomDialog>
  );
}

