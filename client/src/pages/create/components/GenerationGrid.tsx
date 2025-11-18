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

  // Calculate the number of variations based on images
  // Since images are already filtered by batch, we use the max variation number
  const totalVariations = useMemo(() => {
    if (images.length === 0) return 0;
    
    // Find all valid variation numbers from images (1-4)
    const variationNumbers = images
      .map(img => img.variationNumber)
      .filter((num): num is number => num !== undefined && num !== null && num >= 1 && num <= 4);
    
    if (variationNumbers.length === 0) {
      // If no valid variation numbers, return 0 (don't show any boxes)
      return 0;
    }
    
    // Use the maximum variation number to determine how many slots to show
    // This ensures we show slots for all variations (e.g., if we have variations 1,2,3, show 3 boxes)
    const maxVariation = Math.max(...variationNumbers);
    
    // Safety check: if we have fewer images than the max variation number suggests,
    // it might mean there are gaps or old images. In that case, use the actual count.
    // But if all variation numbers are consecutive starting from 1, use maxVariation.
    const sortedVariations = [...new Set(variationNumbers)].sort((a, b) => a - b);
    const isConsecutive = sortedVariations.length > 0 && 
      sortedVariations[0] === 1 && 
      sortedVariations[sortedVariations.length - 1] === sortedVariations.length;
    
    if (isConsecutive) {
      // All variations are consecutive starting from 1, use max variation number
      return Math.min(maxVariation, 4);
    } else {
      // Not consecutive - might have gaps or extra images, use the actual number of unique variations
      return Math.min(sortedVariations.length, 4);
    }
  }, [images]);

  // Create slots only for the number of variations
  const gridSlots = useMemo(() => {
    const slots: (HistoryImage | null)[] = [];
    
    // Fill slots with actual images based on variation number
    for (let i = 0; i < totalVariations; i++) {
      const image = images.find(img => img.variationNumber === i + 1);
      slots.push(image || null);
    }
    
    return slots;
  }, [images, totalVariations]);

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

  // Determine grid columns based on number of variations
  const gridCols = totalVariations === 3 ? 'grid-cols-3' : totalVariations === 1 ? 'grid-cols-1' : 'grid-cols-2';

  return (
    <>
      <div className={cn("grid gap-2", gridCols)}>
        {gridSlots.map((image, index) => {
          const isProcessing = image?.status === 'PROCESSING';
          const isCompleted = image?.status === 'COMPLETED' && image?.thumbnailUrl;
          const displayUrl = image?.thumbnailUrl || image?.imageUrl;
          const isEmpty = !image || (!isProcessing && !isCompleted);

          return (
            <div
              key={image?.id || `placeholder-${index}`}
              className={cn(
                "aspect-[4/3] transition-all duration-300 relative group rounded",
                isCompleted && "cursor-pointer hover:scale-[1.02] hover:shadow-lg",
                isEmpty && "bg-gray-50 border border-gray-200"
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
              {isProcessing ? (
                // Show skeleton only for processing images
                <ImageSkeleton />
              ) : isCompleted && displayUrl ? (
                // Show image for completed images
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
                // Empty slot - no skeleton, just empty box
                null
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

