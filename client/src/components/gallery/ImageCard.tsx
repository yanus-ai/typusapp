import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { LayoutType } from '@/pages/gallery/GalleryPage';

interface GalleryImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

interface ImageCardProps {
  image: GalleryImage;
  layout: LayoutType;
  onDownload: (imageUrl: string, imageId: number) => void;
  onShare: (imageUrl: string) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({
  image,
  layout,
  onDownload,
  onShare,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

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

  return (
    <div
      className={getContainerClasses()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <img
        src={displayUrl}
        alt={`Generated image ${image.id}`}
        className={getImageClasses()}
        onLoad={() => setImageLoaded(true)}
        style={{ display: imageLoaded ? 'block' : 'none' }}
      />
      
      {/* Loading placeholder */}
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
        </div>
      )}

      {/* TWEAK watermark (if this is a tweaked image) */}
      <div className="absolute bottom-3 left-3 text-white text-xs font-bold tracking-wider opacity-60">
        TWEAK
      </div>

      {/* Hover overlay with actions */}
      {isHovered && imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
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