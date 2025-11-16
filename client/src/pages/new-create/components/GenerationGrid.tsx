import React, { useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ImageSkeleton } from "./ImageSkeleton";
import { Share2, Download, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { createInputImageFromExisting } from "@/features/images/inputImagesSlice";
import { fetchAllVariations, fetchInputAndCreateImages, HistoryImage } from "@/features/images/historyImagesSlice";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export type { HistoryImage };

interface GenerationGridProps {
  images: HistoryImage[];
  onImageClick?: (image: HistoryImage) => void;
  onShare?: (imageUrl: string, imageId: number) => void;
  onDownload?: (imageUrl: string, imageId: number) => void;
  isSharing?: boolean;
  isDownloading?: boolean;
}

export const GenerationGrid: React.FC<GenerationGridProps> = ({ 
  images, 
  onImageClick,
  onShare,
  onDownload,
  isSharing = false,
  isDownloading = false
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<HistoryImage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Ensure we always show 4 slots (2x2 grid)
  const gridSlots = useMemo(() => {
    const slots: (HistoryImage | null)[] = [];
    
    // Fill slots with actual images
    for (let i = 0; i < 4; i++) {
      const image = images.find(img => img.variationNumber === i + 1);
      slots.push(image || null);
    }
    
    return slots;
  }, [images]);

  const handleEditClick = useCallback(async (e: React.MouseEvent, image: HistoryImage) => {
    e.stopPropagation();
    
    try {
      if (image.tweakUploadId) {
        navigate(`/edit?imageId=${image.tweakUploadId}&type=input`);
        return;
      }

      if (!image.imageUrl) {
        toast.error('Image URL is missing');
        return;
      }

      const result = await dispatch(createInputImageFromExisting({
        imageUrl: image.imageUrl,
        thumbnailUrl: image.thumbnailUrl,
        fileName: `tweak-from-${image.id}.jpg`,
        originalImageId: image.id,
        uploadSource: 'TWEAK_MODULE',
        currentPrompt: image.aiPrompt,
        currentAIMaterials: image.aiMaterials
      }));
      
      if (createInputImageFromExisting.fulfilled.match(result)) {
        const newInputImage = result.payload;
        dispatch(fetchInputAndCreateImages({ page: 1, limit: 100, uploadSource: 'TWEAK_MODULE' }));
        dispatch(fetchAllVariations({ page: 1, limit: 100 }));
        navigate(`/edit?imageId=${newInputImage.id}&type=input`);
      } else {
        throw new Error('Failed to convert image');
      }
    } catch (error) {
      toast.error('Failed to convert image for Edit module');
    }
  }, [dispatch, navigate]);

  const handleUpscaleClick = useCallback(async (e: React.MouseEvent, image: HistoryImage) => {
    e.stopPropagation();
    
    try {
      if (image.refineUploadId) {
        navigate(`/upscale?imageId=${image.refineUploadId}&type=input`);
        return;
      }

      if (!image.imageUrl) {
        toast.error('Image URL is missing');
        return;
      }

      const result = await dispatch(createInputImageFromExisting({
        imageUrl: image.imageUrl,
        thumbnailUrl: image.thumbnailUrl,
        fileName: `refine-from-${image.id}.jpg`,
        originalImageId: image.id,
        uploadSource: 'REFINE_MODULE',
        currentPrompt: image.aiPrompt,
        currentAIMaterials: image.aiMaterials
      }));
      
      if (createInputImageFromExisting.fulfilled.match(result)) {
        const newInputImage = result.payload;
        navigate(`/upscale?imageId=${newInputImage.id}&type=input`);
        dispatch(fetchAllVariations({ page: 1, limit: 100 }));
      } else {
        throw new Error('Failed to convert image');
      }
    } catch (error) {
      toast.error('Failed to convert image for Refine module');
    }
  }, [dispatch, navigate]);

  const handleShare = useCallback((e: React.MouseEvent, image: HistoryImage) => {
    e.stopPropagation();
    if (onShare && !isSharing && image.imageUrl) {
      onShare(image.processedImageUrl || image.imageUrl, image.id);
    }
  }, [onShare, isSharing]);

  const handleDownload = useCallback((e: React.MouseEvent, image: HistoryImage) => {
    e.stopPropagation();
    if (onDownload && !isDownloading) {
      onDownload(image.imageUrl || image.processedImageUrl || '', image.id);
    } else {
      // Fallback: direct download
      const imageUrl = image.processedImageUrl || image.imageUrl || image.thumbnailUrl;
      if (imageUrl) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `image-${image.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }, [onDownload, isDownloading]);

  const handleImageClick = useCallback((image: HistoryImage) => {
    setSelectedImage(image);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedImage(null);
  }, []);

  const imageUrl = selectedImage 
    ? (selectedImage.processedImageUrl || selectedImage.imageUrl || selectedImage.thumbnailUrl)
    : undefined;

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {gridSlots.map((image, index) => {
          const isCompleted = image?.status === 'COMPLETED' && image?.thumbnailUrl;
          const displayUrl = image?.thumbnailUrl || image?.imageUrl;

          return (
            <div
              key={image?.id || `placeholder-${index}`}
              className={cn(
                "aspect-[4/3] transition-all duration-300 relative group",
                isCompleted && "cursor-pointer hover:scale-[1.02] hover:shadow-lg"
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (image && image.status === 'COMPLETED') {
                  handleImageClick(image);
                  onImageClick?.(image);
                }
              }}
              onMouseEnter={() => isCompleted && setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {isCompleted && displayUrl ? (
                <>
                  <img
                    src={displayUrl}
                    alt={`Variation ${index + 1}`}
                    className="w-full h-full object-cover rounded"
                  />
                  
                  {hoveredIndex === index && (
                    <>
                      <button
                        onClick={(e) => handleEditClick(e, image)}
                        className="absolute bottom-3 left-3 text-white text-xs font-bold tracking-wider opacity-90 hover:opacity-100 px-2 py-1 rounded transition-all duration-200 cursor-pointer z-20 bg-black/50 hover:bg-black/80"
                        title="Convert and open in Edit module"
                      >
                        EDIT
                      </button>

                      <button
                        onClick={(e) => handleUpscaleClick(e, image)}
                        className="absolute bottom-3 right-3 text-white text-xs font-bold tracking-wider opacity-90 hover:opacity-100 px-2 py-1 rounded transition-all duration-200 cursor-pointer z-20 bg-black/50 hover:bg-black/80"
                        title="Convert and open in Refine module"
                      >
                        UPSCALE
                      </button>

                      <div className="absolute top-3 right-3 flex items-center justify-center z-10">
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={(e) => handleShare(e, image)}
                            disabled={isSharing}
                            className={cn(
                              "bg-white/90 hover:bg-white text-gray-700 shadow-lg w-8 h-8 flex-shrink-0",
                              isSharing ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                            )}
                          >
                            {isSharing ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Share2 className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={(e) => handleDownload(e, image)}
                            disabled={isDownloading}
                            className="bg-white/90 hover:bg-white text-gray-700 shadow-lg w-8 h-8 flex-shrink-0 disabled:opacity-50"
                          >
                            {isDownloading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <ImageSkeleton />
              )}
            </div>
          );
        })}
      </div>

      {dialogOpen && selectedImage && imageUrl && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-opacity duration-200"
            onClick={closeDialog}
            aria-hidden="true"
          />
          
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
          >
            <div
              className="relative w-full h-full max-w-[95vw] max-h-[95vh] flex items-center justify-center pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeDialog}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg shadow-lg transition-all hover:scale-110"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>

              <img
                src={imageUrl}
                alt={`Variation ${selectedImage.variationNumber || ''}`}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </>
      )}
    </>
  );
};

