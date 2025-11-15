import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ImageSkeleton } from "./ImageSkeleton";
import { Share2, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { createInputImageFromExisting } from "@/features/images/inputImagesSlice";
import { fetchAllVariations, fetchInputAndCreateImages } from "@/features/images/historyImagesSlice";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export interface HistoryImage {
  id: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  processedImageUrl?: string;
  createdAt: Date | string;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  batchId?: number;
  variationNumber?: number;
  moduleType?: 'CREATE' | 'TWEAK' | 'REFINE';
  aiPrompt?: string;
  aiMaterials?: any[];
  tweakUploadId?: number;
  refineUploadId?: number;
}

interface GenerationGridProps {
  images: HistoryImage[];
  onImageClick?: (image: HistoryImage) => void;
  onShare?: (imageUrl: string, imageId: number) => void;
  isSharing?: boolean;
}

export const GenerationGrid: React.FC<GenerationGridProps> = ({ 
  images, 
  onImageClick,
  onShare,
  isSharing = false
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

  const handleEditClick = async (e: React.MouseEvent, image: HistoryImage) => {
    e.stopPropagation();
    
    try {
      if (image.tweakUploadId) {
        navigate(`/edit?imageId=${image.tweakUploadId}&type=input`);
      } else {
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
          
          // Refresh input images for Edit page to find the new image
          dispatch(fetchInputAndCreateImages({ page: 1, limit: 100, uploadSource: 'TWEAK_MODULE' }));
          dispatch(fetchAllVariations({ page: 1, limit: 100 }));
          
          navigate(`/edit?imageId=${newInputImage.id}&type=input`);
        } else {
          throw new Error('Failed to convert image');
        }
      }
    } catch (error) {
      console.error('❌ EDIT button error:', error);
      toast.error('Failed to convert image for Edit module');
    }
  };

  const handleUpscaleClick = async (e: React.MouseEvent, image: HistoryImage) => {
    e.stopPropagation();
    
    try {
      if (image.refineUploadId) {
        navigate(`/upscale?imageId=${image.refineUploadId}&type=input`);
      } else {
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
      }
    } catch (error) {
      console.error('❌ UPSCALE button error:', error);
      toast.error('Failed to convert image for Refine module');
    }
  };

  const handleShare = (e: React.MouseEvent, image: HistoryImage) => {
    e.stopPropagation();
    if (onShare && !isSharing) {
      onShare(image.processedImageUrl || image.imageUrl || '', image.id);
    }
  };

  const handleImageClick = (image: HistoryImage) => {
    setSelectedImage(image);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedImage(null);
  };

  const imageUrl = selectedImage?.processedImageUrl || selectedImage?.imageUrl || selectedImage?.thumbnailUrl;

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {gridSlots.map((image, index) => (
          <div
            key={image?.id || `placeholder-${index}`}
            className={cn(
              "aspect-[4/3] transition-all duration-300 relative group",
              image?.status === 'COMPLETED' && image?.thumbnailUrl
                ? "cursor-pointer hover:scale-[1.02] hover:shadow-lg"
                : ""
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (image && image.status === 'COMPLETED') {
                handleImageClick(image);
                onImageClick?.(image);
              }
            }}
            onMouseEnter={() => image?.status === 'COMPLETED' && setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {image?.status === 'COMPLETED' && image?.thumbnailUrl ? (
              <>
                <img
                  src={image.thumbnailUrl || image.imageUrl}
                  alt={`Variation ${index + 1}`}
                  className="w-full h-full object-cover rounded"
                />
                
                {/* Action buttons: EDIT, UPSCALE */}
                {hoveredIndex === index && (
                  <>
                    {/* EDIT Button - Bottom Left */}
                    <button
                      onClick={(e) => handleEditClick(e, image)}
                      className="absolute bottom-3 left-3 text-white text-xs font-bold tracking-wider opacity-90 hover:opacity-100 px-2 py-1 rounded transition-all duration-200 cursor-pointer z-20 bg-black/50 hover:bg-black/80"
                      title="Convert and open in Edit module"
                    >
                      EDIT
                    </button>

                    {/* UPSCALE Button - Bottom Right */}
                    <button
                      onClick={(e) => handleUpscaleClick(e, image)}
                      className="absolute bottom-3 right-3 text-white text-xs font-bold tracking-wider opacity-90 hover:opacity-100 px-2 py-1 rounded transition-all duration-200 cursor-pointer z-20 bg-black/50 hover:bg-black/80"
                      title="Convert and open in Refine module"
                    >
                      UPSCALE
                    </button>
                  </>
                )}

                {/* Share button - Top Right */}
                {hoveredIndex === index && (
                  <div className="absolute top-3 right-3 flex items-center justify-center z-10">
                    <Button
                      variant="secondary"
                      onClick={(e) => handleShare(e, image)}
                      disabled={isSharing}
                      className={`bg-white/90 hover:bg-white text-gray-700 shadow-lg w-8 h-8 flex-shrink-0 ${
                        isSharing ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                      }`}
                    >
                      {isSharing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Share2 className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <ImageSkeleton />
            )}
          </div>
        ))}
      </div>

      {/* Image Dialog */}
      {dialogOpen && selectedImage && imageUrl && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-opacity duration-200"
            onClick={closeDialog}
            aria-hidden="true"
          />
          
          {/* Dialog */}
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
              {/* Close button */}
              <button
                onClick={closeDialog}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg shadow-lg transition-all hover:scale-110"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>

              {/* Image */}
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

