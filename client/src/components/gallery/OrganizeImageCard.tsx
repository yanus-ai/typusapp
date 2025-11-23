import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2, Plus, Loader2 } from 'lucide-react';
import { LayoutType, ImageSizeType } from '@/pages/gallery/GalleryPage';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import whiteSquareSpinner from '@/assets/animations/white-square-spinner.lottie';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setMode } from '@/features/gallery/gallerySlice';
import loader from '@/assets/animations/loader.lottie';

interface GalleryImage {
  id: number;
  imageUrl: string; // This is the original hi  gh-quality URL from API
  thumbnailUrl?: string;
  processedImageUrl?: string;
  createdAt: Date;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  moduleType?: 'CREATE' | 'TWEAK' | 'REFINE';
  originalInputImageId?: number;
  aiPrompt?: string;
  fileName?: string;
  createUploadId?: number;
  tweakUploadId?: number;
  refineUploadId?: number;
  batchId?: number;
}

interface OrganizeImageCardProps {
  image: GalleryImage;
  layout: LayoutType;
  imageSize?: ImageSizeType; // Optional image size prop
  onDownload: (imageUrl: string, imageId: number) => void;
  onShare: (imageUrl: string, imageId: number) => void;
  onTweakRedirect?: (imageId: number) => void; // Optional callback for Tweak redirection
  onCreateFromImage?: (imageId: number) => void; // Optional callback for Create from image
  onBatchSelect?: (batchId: number, moduleType: 'CREATE' | 'TWEAK' | 'REFINE') => void; // Optional callback for batch selection
  isDownloading?: boolean; // New prop for download loading state
}

const OrganizeImageCard: React.FC<OrganizeImageCardProps> = ({
  image,
  layout,
  imageSize = 'medium', // Default to medium if not provided
  onDownload,
  onShare,
  onBatchSelect,
  isDownloading = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const dispatch = useAppDispatch();

  // Get module type display text and color
  const getModuleTypeInfo = () => {
    const moduleType = image.moduleType || 'CREATE'; // Default to CREATE if not specified
    switch (moduleType) {
      case 'CREATE':
        return { text: 'CREATE', color: 'bg-green-600' };
      case 'TWEAK':
        return { text: 'EDIT', color: 'bg-blue-600' };
      case 'REFINE':
        return { text: 'UPSCALE', color: 'bg-purple-600' };
      default:
        return { text: 'CREATE', color: 'bg-green-600' };
    }
  };

  const moduleInfo = getModuleTypeInfo();

  // Handle + button click to switch to appropriate gallery mode and show action buttons
  const handlePlusButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Switch to the appropriate gallery mode based on image module type
    const moduleType = image.moduleType || 'CREATE';
    switch (moduleType) {
      case 'CREATE':
        dispatch(setMode('create'));
        break;
      case 'TWEAK':
        dispatch(setMode('edit'));
        break;
      case 'REFINE':
        dispatch(setMode('upscale'));
        break;
      default:
        dispatch(setMode('create'));
        break;
    }
    
    // Call batch selection callback if batch ID exists
    if (image.batchId && onBatchSelect) {
      onBatchSelect(image.batchId, moduleType);
    }
  };

  // Get container classes based on layout and size
  const getContainerClasses = () => {
    const baseClasses = 'relative bg-gray-100 rounded-none overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg';
    
    if (layout === 'square') {
      // Square layout with flexible sizing based on imageSize
      if (imageSize === 'large') {
        return `${baseClasses} w-[680px] h-[680px]`;
      } else if (imageSize === 'medium') {
        return `${baseClasses} w-[332px] h-[332px]`;
      } else {
        // small size
        return `${baseClasses} w-[215px] h-[216px]`;
      }
    } else {
      // Full layout - masonry style with natural aspect ratio and column break behavior
      return `${baseClasses} mb-4 break-inside-avoid`;
    }
  };

  // Get image classes with size considerations
  const getImageClasses = () => {
    if (layout === 'square') {
      return 'w-full h-full object-cover';
    } else {
      // Full layout shows images in their natural aspect ratio
      // Add max height for large images
      const baseClasses = 'w-full object-cover';
      if (imageSize === 'large') {
        return `${baseClasses} h-auto max-h-[600px]`;
      }
      return `${baseClasses} h-auto`;
    }
  };

  // Always use processed imageURL for organize tab and upscale functionality
  const getDisplayUrl = () => {
    // Always prioritize processed image URL, fallback to original if not available
    return image.processedImageUrl || image.imageUrl;
  };

  const displayUrl = getDisplayUrl();
  const isProcessing = image.status === 'PROCESSING';

  return (
    <div
      className={getContainerClasses()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      {/* Show processing animation for PROCESSING status */}
      {isProcessing ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
          <DotLottieReact
            src={whiteSquareSpinner}
            loop
            autoplay
            style={{ height: 35, width: 50 }}
          />
          <div className="text-white text-xs font-medium mt-2">Processing...</div>
        </div>
      ) : (
        <>
          {/* Image */}
          <img
            src={displayUrl}
            alt={`Generated image ${image.id}`}
            className={getImageClasses()}
            onLoad={() => setImageLoaded(true)}
            style={{ display: imageLoaded ? 'block' : 'none' }}
          />
          
          {/* Loading placeholder - only after completion and before first paint */}
          {!imageLoaded && image.status === 'COMPLETED' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <DotLottieReact
                src={loader}
                autoplay
                loop
                style={{ transform: 'scale(3)', width: 48, height: 48 }}
              />
            </div>
          )}
        </>
      )}

      {isHovered && imageLoaded && !isProcessing && (
        <button
          onClick={handlePlusButtonClick}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 p-3 rounded-full transition-all duration-200 cursor-pointer z-20 hover:scale-110"
          title="Show actions and switch to appropriate mode"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Module Type Display and Batch ID */}
      {imageLoaded && !isProcessing && (
        /* Module Type Label - Tag style in top-left corner */
        <div className="absolute top-3 left-3 text-gray-700 text-xs font-medium tracking-wide px-3 py-1 rounded-full bg-gray-200 shadow-sm">
          {moduleInfo.text}
        </div>
      )}

      {/* Hover overlay with actions - only show when not processing */}
      {isHovered && imageLoaded && !isProcessing && (
        <div className="absolute top-3 right-3 flex items-center justify-center z-10">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onShare(image.processedImageUrl || image.imageUrl, image.id);
              }}
              className="bg-white/90 hover:bg-white text-gray-700 shadow-lg w-8 h-8 flex-shrink-0"
            >
              <Share2 className="w-3 h-3" />
            </Button>
            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(image.imageUrl, image.id); // Always use original high-quality URL for download
              }}
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
      )}
    </div>
  );
};

export default OrganizeImageCard;