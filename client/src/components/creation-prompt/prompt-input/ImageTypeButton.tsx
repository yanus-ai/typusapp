import { ImageIcon, Upload, Check } from "lucide-react";
import LightTooltip from "@/components/ui/light-tooltip";
import { CustomDialog } from "../ui/CustomDialog";
import { useState, useRef, useEffect } from "react";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { uploadInputImage, fetchInputImagesBySource } from "@/features/images/inputImagesSlice";
import { setSelectedImage } from "@/features/create/createUISlice";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface ImageTypeButtonProps {
  disabled?: boolean;
}

export function ImageTypeButton({ disabled = false }: ImageTypeButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();

  const inputImages = useAppSelector((state) => 
    state.inputImages.images.filter(img => img.uploadSource === 'CREATE_MODULE')
  );
  const inputImagesLoading = useAppSelector((state) => state.inputImages.loading);
  const selectedImageIdGlobal = useAppSelector((state) => state.createUI.selectedImageId);
  const selectedImageTypeGlobal = useAppSelector((state) => state.createUI.selectedImageType);

  // Load input images when dialog opens
  useEffect(() => {
    if (open) {
      dispatch(fetchInputImagesBySource({ uploadSource: 'CREATE_MODULE' }));
      // Set initial selection to current selected image if it's an input image
      if (selectedImageTypeGlobal === 'input' && selectedImageIdGlobal) {
        setSelectedImageId(selectedImageIdGlobal);
      }
    }
  }, [open, dispatch, selectedImageIdGlobal, selectedImageTypeGlobal]);

  const handleClick = () => setOpen(true);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const result = await dispatch(uploadInputImage({ 
        file, 
        uploadSource: 'CREATE_MODULE' 
      }));

      if (uploadInputImage.fulfilled.match(result)) {
        const newImage = result.payload as any;
        setSelectedImageId(newImage.id);
        dispatch(setSelectedImage({ id: newImage.id, type: 'input' }));
        toast.success('Image uploaded successfully');
      } else {
        toast.error('Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('An error occurred while uploading');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelect = (imageId: number) => {
    setSelectedImageId(imageId);
    dispatch(setSelectedImage({ id: imageId, type: 'input' }));
    setOpen(false);
    toast.success('Base image selected');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
  };

  return (
    <>
      <LightTooltip text="Add Image" direction="bottom">
        <button
          className={cn(
            "px-2 py-2 border border-transparent shadow-none bg-transparent rounded-none transition-colors flex items-center justify-center space-x-2 text-xs",
            disabled 
              ? "opacity-50 cursor-not-allowed" 
              : "hover:border-gray-200 hover:bg-gray-50 cursor-pointer"
          )}
          type="button"
          onClick={disabled ? undefined : handleClick}
          disabled={disabled}
          aria-label="Add image"
        >
          <ImageIcon size={16} />
          <span className="font-sans">Image</span>
        </button>
      </LightTooltip>
      <CustomDialog title="Select Base Image" open={open} onClose={() => setOpen(false)} maxWidth="lg">
        <div className="space-y-4">
          {/* Upload Section */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={uploading}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-none border-2 border-dashed transition-colors",
                "hover:border-primary-500 hover:bg-primary-50",
                uploading 
                  ? "border-gray-300 bg-gray-50 cursor-not-allowed" 
                  : "border-gray-300 bg-white cursor-pointer"
              )}
            >
              <Upload className={cn("w-4 h-4", uploading && "animate-pulse")} />
              <span className="text-sm font-medium">
                {uploading ? "Uploading..." : "Upload New Image"}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
              disabled={uploading}
            />
          </div>

          {/* Images Grid */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Recent Images ({inputImages.length})
            </h3>
            {inputImagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-none h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            ) : inputImages.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No images yet. Upload an image to get started.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                {inputImages.map((image) => {
                  const isSelected = selectedImageId === image.id;
                  return (
                    <div
                      key={image.id}
                      onClick={() => handleImageSelect(image.id)}
                      className={cn(
                        "relative group cursor-pointer rounded-none overflow-hidden border-2 transition-all",
                        "hover:border-primary-400 hover:shadow-md",
                        isSelected
                          ? "border-primary-500 shadow-md ring-2 ring-primary-200"
                          : "border-gray-200"
                      )}
                    >
                      <div className="aspect-square relative">
                        <img
                          src={image.thumbnailUrl || image.imageUrl}
                          alt={image.fileName}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
                            <div className="bg-primary-500 rounded-none p-1.5">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-xs text-white truncate">
                          {image.fileName}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-none hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {selectedImageId && (
              <button
                type="button"
                onClick={() => {
                  if (selectedImageId) {
                    handleImageSelect(selectedImageId);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-none hover:bg-primary-600 transition-colors"
              >
                Select
              </button>
            )}
          </div>
        </div>
      </CustomDialog>
    </>
  );
}
