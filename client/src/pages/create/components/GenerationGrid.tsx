import React, { useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ImageSkeleton } from "./ImageSkeleton";
import { Share2, Download, Loader2, DownloadCloud, RotateCcw, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { createInputImageFromExisting } from "@/features/images/inputImagesSlice";
import { fetchAllVariations, fetchInputAndCreateImages, HistoryImage } from "@/features/images/historyImagesSlice";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { downloadImage } from "@/utils/downloadUtils";
import JSZip from "jszip";
import { loadSettingsFromImage } from "@/features/customization/customizationSlice";
import { setSavedPrompt } from "@/features/masks/maskSlice";
import { setSelectedModel } from "@/features/tweak/tweakSlice";
import { useAppSelector } from "@/hooks/useAppSelector";
import { ImageLightbox } from "./ImageLightbox";

export type { HistoryImage };

interface GenerationGridProps {
  images: HistoryImage[];
  onImageClick?: (image: HistoryImage) => void;
  onShare?: (imageUrl: string, imageId: number) => void;
  onDownload?: (imageUrl: string, imageId: number) => void;
  isSharing?: boolean;
  isDownloading?: boolean;
  isGenerating?: boolean;
  onGenerate?: (
    userPrompt: string | null,
    contextSelection?: string,
    attachments?: { 
      baseImageUrl?: string; 
      referenceImageUrls?: string[]; 
      surroundingUrls?: string[]; 
      wallsUrls?: string[] 
    },
    options?: { size?: string; aspectRatio?: string }
  ) => void;
  settings?: {
    image: HistoryImage;
    settingsToApply: any;
    model?: string;
    surroundingUrls: string[];
    wallsUrls: string[];
  } | null;
  prompt?: string;
}

export const GenerationGrid: React.FC<GenerationGridProps> = ({ 
  images, 
  onImageClick,
  onShare,
  onDownload,
  isSharing = false,
  isDownloading = false,
  isGenerating = false,
  onGenerate,
  settings,
  prompt
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<HistoryImage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const expectedVariations = useAppSelector(state => state.customization.variations);
  
  // Calculate total variations: use max variation number from images, or fallback when generating
  const totalVariations = useMemo(() => {
    if (images.length > 0) {
      const maxVariation = Math.max(...images.map(img => img.variationNumber || 0).filter(v => v >= 1 && v <= 4));
      return maxVariation > 0 ? Math.min(maxVariation, 4) : 0;
    }
    // When generating but no images yet, show skeletons based on customization state
    return isGenerating ? Math.min(expectedVariations || 2, 4) : 0;
  }, [images, isGenerating, expectedVariations]);

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

  // Extract aspect ratio from the first image's settings snapshot
  const aspectRatio = useMemo(() => {
    if (images.length === 0) return '4/3'; // Default fallback
    
    const firstImage = images[0];
    if (!firstImage?.settingsSnapshot) return '4/3';
    
    const snapshot = firstImage.settingsSnapshot as any;
    const aspectRatioValue = snapshot.aspectRatio;
    
    if (!aspectRatioValue) return '4/3';
    
    // Convert aspect ratio string to CSS aspect ratio
    // Handle "Match Input" and other special cases
    if (aspectRatioValue === 'Match Input' || aspectRatioValue === 'match_input_image') {
      return '4/3'; // Default when matching input
    }
    
    // Convert common aspect ratios to CSS format
    const aspectRatioMap: Record<string, string> = {
      '16:9': '16/9',
      '9:16': '9/16',
      '1:1': '1/1',
      '4:3': '4/3',
      '3:4': '3/4',
    };
    
    return aspectRatioMap[aspectRatioValue] || aspectRatioValue.replace(':', '/') || '4/3';
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

  const handleDownload = useCallback(async (e: React.MouseEvent, image: HistoryImage) => {
    e.stopPropagation();
    
    if (onDownload && !isDownloading) {
      onDownload(image.imageUrl || image.processedImageUrl || '', image.id);
      return;
    }
    
    // Fallback: use reusable download utility
    const imageUrl = image.processedImageUrl || image.imageUrl || image.thumbnailUrl;
    if (!imageUrl) {
      toast.error('Image URL is missing');
      return;
    }

    try {
      await downloadImage(imageUrl, `image-${image.id}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download image');
    }
  }, [onDownload, isDownloading]);

  // Download all images as zip
  const handleDownloadAll = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isDownloadingAll || images.length === 0) return;
    
    setIsDownloadingAll(true);
    
    try {
      const zip = new JSZip();
      const completedImages = images.filter(img => 
        img.status === 'COMPLETED' && (img.imageUrl || img.processedImageUrl || img.thumbnailUrl)
      );
      
      if (completedImages.length === 0) {
        toast.error('No completed images to download');
        setIsDownloadingAll(false);
        return;
      }
      
      // Fetch all images and add to zip
      const imagePromises = completedImages.map(async (image, index) => {
        const imageUrl = image.processedImageUrl || image.imageUrl || image.thumbnailUrl;
        if (!imageUrl) return null;
        
        try {
          const response = await fetch(imageUrl);
          if (!response.ok) throw new Error('Failed to fetch');
          
          const blob = await response.blob();
          
          // Determine extension
          let extension = 'png';
          if (blob.type.includes('jpeg') || blob.type.includes('jpg')) {
            extension = 'jpg';
          } else if (blob.type.includes('webp')) {
            extension = 'webp';
          }
          
          const fileName = `variation-${image.variationNumber || index + 1}.${extension}`;
          zip.file(fileName, blob);
          return fileName;
        } catch (error) {
          console.error(`Failed to fetch image ${image.id}:`, error);
          return null;
        }
      });
      
      await Promise.all(imagePromises);
      
      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      
      // Download zip
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `generated-images-${images[0]?.batchId || Date.now()}.zip`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(zipUrl);
      toast.success(`Downloaded ${completedImages.length} image(s) as ZIP`);
    } catch (error) {
      console.error('Failed to download all images:', error);
      toast.error('Failed to download images');
    } finally {
      setIsDownloadingAll(false);
    }
  }, [images, isDownloadingAll]);

  // Reuse parameters - apply settings to input
  const handleReuseParameters = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!settings?.image || !settings.settingsToApply) {
      toast.error('Settings not available');
      return;
    }
    
    const image = settings.image;
    
    // Apply settings
    if (image.originalInputImageId) {
      dispatch(loadSettingsFromImage({
        inputImageId: image.originalInputImageId,
        imageId: image.id,
        isGeneratedImage: true,
        settings: settings.settingsToApply
      }));
    }
    
    // Set the saved prompt
    if (image.aiPrompt) {
      dispatch(setSavedPrompt(image.aiPrompt));
    }
    
    // Restore model setting if available
    if (settings.model) {
      dispatch(setSelectedModel(settings.model));
    }
    
    toast.success('Parameters applied to input');
  }, [settings, dispatch]);

  // Retry - regenerate with same parameters
  const handleRetry = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!onGenerate || !settings?.image) {
      toast.error('Cannot retry: settings not available');
      return;
    }
    
    const image = settings.image;
    const snapshot = image.settingsSnapshot as any;
    const attachments = snapshot?.attachments;
    
    // Build attachments from settings
    const attachmentUrls = {
      baseImageUrl: attachments?.baseAttachmentUrl,
      referenceImageUrls: attachments?.referenceImageUrls,
      surroundingUrls: settings.surroundingUrls,
      wallsUrls: settings.wallsUrls
    };
    
    // Build options from settings
    const options = {
      size: snapshot?.size,
      aspectRatio: snapshot?.aspectRatio
    };
    
    // Regenerate with same prompt and settings
    onGenerate(
      image.aiPrompt || prompt || null,
      image.contextSelection,
      attachmentUrls,
      options
    );
    
    toast.success('Regenerating with same parameters...');
  }, [onGenerate, settings, prompt]);

  const handleImageClick = useCallback((image: HistoryImage) => {
    setSelectedImage(image);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedImage(null);
  }, []);

  // Determine grid columns based on number of variations
  const gridCols = useMemo(() => {
    if (aspectRatio === '9/16') return 'grid-cols-4'
    if (aspectRatio === '1/1') {
      if (totalVariations > 1) {
        return `grid-cols-${totalVariations}`
      } else {
        return 'grid-cols-2'
      }
    }
    return 'grid-cols-2'
  }, [totalVariations]);

  return (
    <>
      <div className="group" role="button">
        <div 
          className={cn("grid gap-2 relative", gridCols)}
        >        
          {gridSlots.map((image, index) => {
            const isProcessing = image?.status === 'PROCESSING' || (isGenerating && !image);
            const isCompleted = image?.status === 'COMPLETED' && image?.thumbnailUrl;
            const displayUrl = image?.thumbnailUrl || image?.imageUrl;

            return (
              <div
                key={image?.id || `placeholder-${index}`}
                className={cn(
                  "transition-all duration-300 relative group rounded",
                  isCompleted && "cursor-pointer",
                  !isProcessing && !isCompleted && "bg-gray-50 border border-gray-200"
                )}
                style={{ aspectRatio }}
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
                  <ImageSkeleton aspectRatio={aspectRatio} />
                ) : isCompleted && displayUrl ? (
                  // Show image for completed images
                  <>
                    <img
                      src={displayUrl}
                      alt={`Variation ${index + 1}`}
                      className="w-full h-full object-contain rounded"
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

        {/* Hover Actions Bar */}
        {images.length > 0 && (
          <div className="flex items-center justify-end py-2 gap-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
            <button
              onClick={handleDownloadAll}
              disabled={isDownloadingAll}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 outline-none rounded-lg hover:bg-gray-100 transition-all cursor-pointer",
                isDownloadingAll && "opacity-50 cursor-not-allowed"
              )}
            >
              {isDownloadingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <DownloadCloud className="w-3.5 h-3.5" />
                  Download All
                </>
              )}
            </button>
            
            {settings && (
              <button
                onClick={handleReuseParameters}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 outline-none rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                Reuse Parameters
              </button>
            )}
            
            {onGenerate && settings && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 outline-none rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      <ImageLightbox
        isOpen={dialogOpen}
        image={selectedImage}
        onClose={closeDialog}
      />
    </>
  );
};

