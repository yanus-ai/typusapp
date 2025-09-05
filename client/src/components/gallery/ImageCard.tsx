import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { LayoutType } from '@/pages/gallery/GalleryPage';
import { useNavigate } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import whiteSquareSpinner from '@/assets/animations/white-square-spinner.lottie';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setIsModalOpen } from '@/features/gallery/gallerySlice';

interface GalleryImage {
  id: number;
  imageUrl: string; // This is the original high-quality URL from API
  thumbnailUrl?: string;
  processedImageUrl?: string;
  createdAt: Date;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  moduleType?: 'CREATE' | 'TWEAK' | 'REFINE';
  originalInputImageId?: number;
  aiPrompt?: string;
}

interface ImageCardProps {
  image: GalleryImage;
  layout: LayoutType;
  onDownload: (imageUrl: string, imageId: number) => void;
  onShare: (imageUrl: string) => void;
  onTweakRedirect?: (imageId: number) => void; // Optional callback for Tweak redirection
  onCreateFromImage?: (imageId: number) => void; // Optional callback for Create from image
}

const ImageCard: React.FC<ImageCardProps> = ({
  image,
  layout,
  onDownload,
  onShare,
  onTweakRedirect,
  onCreateFromImage,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Get container classes based on layout and size
  const getContainerClasses = () => {
    const baseClasses = 'relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg';
    
    if (layout === 'square') {
      return `${baseClasses} aspect-square`;
    } else {
      // Full layout - masonry style with natural aspect ratio and column break behavior
      return `${baseClasses} mb-4 break-inside-avoid`;
    }
  };

  // Get image classes
  const getImageClasses = () => {
    if (layout === 'square') {
      return 'w-full h-full object-cover';
    } else {
      // Full layout shows images in their natural aspect ratio
      return 'w-full h-auto object-cover';
    }
  };

  const displayUrl = image.processedImageUrl || image.thumbnailUrl || image.imageUrl;
  const isProcessing = image.status === 'PROCESSING';

  return (
    <div
      className={getContainerClasses()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
          
          {/* Loading placeholder - only for completed images that haven't loaded yet */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
            </div>
          )}
        </>
      )}

      {isHovered && imageLoaded && !isProcessing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            console.log('🔄 Create from image clicked:', image.id);
            
            if (onCreateFromImage) {
              // Use callback if provided (modal context)
              onCreateFromImage(image.id);
            } else {
              // Navigate directly to Create page with the image ID
              navigate(`/create?imageId=${image.id}`);
            }
          }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xl px-4 font-bold tracking-wider opacity-90 hover:opacity-90 bg-black/50 hover:bg-black/80 px-2 py-1 rounded transition-all duration-200 cursor-pointer z-20"
          title="Create from this image"
        >
          +
        </button>
      )}

      {isHovered && imageLoaded && !isProcessing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            console.log('🔄 Edit button clicked for image:', image.id);
            
            if (onTweakRedirect) {
              // Use custom callback if provided (modal context)
              onTweakRedirect(image.id);
            } else {
              // Determine image type based on moduleType or originalInputImageId
              const imageType = image.originalInputImageId ? 'generated' : 'input';
              
              // Navigate directly to Edit page with the image ID and type
              navigate(`/edit?imageId=${image.id}&type=${imageType}`);
              
              // Close gallery modal if open
              dispatch(setIsModalOpen(false));
            }
          }}
          className="absolute bottom-3 left-3 text-white text-xs font-bold tracking-wider opacity-90 hover:opacity-90 bg-black/20 hover:bg-black/40 px-2 py-1 rounded transition-all duration-200 cursor-pointer z-20"
          title="Open in Edit module"
        >
          EDIT
        </button>
      )}

      {isHovered && imageLoaded && !isProcessing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            console.log('🔄 Upscale button clicked for image:', image.id);
            
            // Determine image type based on moduleType or originalInputImageId
            const imageType = image.originalInputImageId ? 'generated' : 'input';
            
            // Navigate directly to Refine page with the image ID and type
            navigate(`/refine?imageId=${image.id}&type=${imageType}`);
            
            // Close gallery modal if open
            dispatch(setIsModalOpen(false));
          }}
          className="absolute bottom-3 right-3 text-white text-xs font-bold tracking-wider opacity-90 hover:opacity-100 bg-black/20 hover:bg-black/40 px-2 py-1 rounded transition-all duration-200 cursor-pointer z-20"
          title="Open in Refine module"
        >
          UPSCALE
        </button>
      )}

      {/* Hover overlay with actions - only show when not processing */}
      {isHovered && imageLoaded && !isProcessing && (
        <div className="absolute top-3 right-3 flex items-center justify-center z-10">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onShare(image.processedImageUrl || image.imageUrl);
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
              className="bg-white/90 hover:bg-white text-gray-700 shadow-lg w-8 h-8 flex-shrink-0"
            >
              <Download className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCard;