import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { LayoutType } from '@/pages/gallery/GalleryPage';
import { useNavigate } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import whiteSquareSpinner from '@/assets/animations/white-square-spinner.lottie';

interface GalleryImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  moduleType?: 'CREATE' | 'TWEAK' | 'REFINE';
}

interface ImageCardProps {
  image: GalleryImage;
  layout: LayoutType;
  onDownload: (imageUrl: string, imageId: number) => void;
  onShare: (imageUrl: string) => void;
  onTweakRedirect?: (imageId: number) => void; // Optional callback for Tweak redirection
}

const ImageCard: React.FC<ImageCardProps> = ({
  image,
  layout,
  onDownload,
  onShare,
  onTweakRedirect,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const navigate = useNavigate();

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

  const displayUrl = image.thumbnailUrl || image.imageUrl;
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

      {/* TWEAK watermark - only show when not processing */}
      {!isProcessing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            console.log('🔄 Redirecting to Tweak page with image:', image.id);
            
            if (onTweakRedirect) {
              // Use custom callback if provided
              onTweakRedirect(image.id);
            } else {
              // Default behavior: navigate to Tweak page with image ID as query param
              navigate(`/tweak?imageId=${image.id}`);
            }
          }}
          className="absolute bottom-3 left-3 text-white text-xs font-bold tracking-wider opacity-60 hover:opacity-90 bg-black/20 hover:bg-black/40 px-2 py-1 rounded transition-all duration-200 cursor-pointer z-20"
          title="Open in Tweak module"
        >
          TWEAK
        </button>
      )}

      {/* Hover overlay with actions - only show when not processing */}
      {isHovered && imageLoaded && !isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onShare(image.imageUrl);
              }}
              className="bg-white/90 hover:bg-white text-gray-700 shadow-lg"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(image.imageUrl, image.id);
              }}
              className="bg-white/90 hover:bg-white text-gray-700 shadow-lg"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCard;