import React from 'react';
import ImageCard from './ImageCard';
import { LayoutType, ImageSizeType } from '@/pages/gallery/GalleryPage';

interface GalleryImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

interface GalleryGridProps {
  images: GalleryImage[];
  layout: LayoutType;
  imageSize: ImageSizeType;
  loading: boolean;
  error: string | null;
  onDownload: (imageUrl: string, imageId: number) => void;
  onShare: (imageUrl: string) => void;
}

// Group images by date and sort by latest first
const groupImagesByDate = (images: GalleryImage[]) => {
  const groups: { [key: string]: GalleryImage[] } = {};
  
  images.forEach(image => {
    const date = new Date(image.createdAt);
    const dateKey = date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(image);
  });
  
  // Sort images within each date group by creation time (latest first)
  Object.keys(groups).forEach(dateKey => {
    groups[dateKey].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });
  
  return groups;
};

const GalleryGrid: React.FC<GalleryGridProps> = ({
  images,
  layout,
  imageSize,
  loading,
  error,
  onDownload,
  onShare,
}) => {
  // Get grid classes based on layout and size
  const getGridClasses = () => {
    if (layout === 'full') {
      // For masonry layout, we'll use CSS columns
      switch (imageSize) {
        case 'small':
          return 'columns-5 gap-4';
        case 'medium':
          return 'columns-4 gap-4';
        case 'large':
        default:
          return 'columns-3 gap-4';
      }
    } else { // square layout - uniform grid
      const baseClasses = 'grid gap-4';
      switch (imageSize) {
        case 'small':
          return `${baseClasses} grid-cols-6`;
        case 'medium':
          return `${baseClasses} grid-cols-5`;
        case 'large':
        default:
          return `${baseClasses} grid-cols-4`;
      }
    }
  };

  if (loading && images.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading images</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-2">No images found</p>
          <p className="text-gray-400 text-sm">Create some images to see them here</p>
        </div>
      </div>
    );
  }

  const groupedImages = groupImagesByDate(images);
  
  // Sort date groups by most recent date first
  const sortedDateEntries = Object.entries(groupedImages).sort(([dateA], [dateB]) => {
    const dateObjA = new Date(dateA);
    const dateObjB = new Date(dateB);
    return dateObjB.getTime() - dateObjA.getTime();
  });

  return (
    <div>
      {sortedDateEntries.map(([date, dateImages]) => (
        <div key={date} className="mb-8 pt-4">
          {/* Date Header */}
          <h2 className="text-sm font-medium text-gray-700 mb-4">{date}</h2>
          
          {/* Images Grid */}
          <div className={getGridClasses()}>
            {dateImages.map(image => (
              <ImageCard
                key={image.id}
                image={image}
                layout={layout}
                onDownload={onDownload}
                onShare={onShare}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GalleryGrid;