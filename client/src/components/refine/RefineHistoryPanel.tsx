import React from 'react';
import { Images } from 'lucide-react';

interface RefineHistoryImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  batchId?: number;
  variationNumber?: number;
  runpodStatus?: string;
}

interface RefineHistoryPanelProps {
  images: RefineHistoryImage[];
  selectedImageId?: number;
  onSelectImage: (imageId: number) => void;
  onConvertToInputImage?: (image: RefineHistoryImage) => void;
  loading?: boolean;
  error?: string | null;
}

const RefineHistoryPanel: React.FC<RefineHistoryPanelProps> = ({ 
  images, 
  selectedImageId,
  onSelectImage,
  loading = false,
  error = null
}) => {
  // Filter and sort images - show completed and processing images
  const displayImages = images
    .filter(image => {
      // Always show completed images
      if (image.status === 'COMPLETED') return true;
      
      // Show processing images (they should remain visible during processing)
      if (image.status === 'PROCESSING') return true;
      
      // Hide failed images after a short time
      if (image.status === 'FAILED') {
        const timeSinceFailed = Date.now() - image.createdAt.getTime();
        return timeSinceFailed < 10000; // Show failed images for 10 seconds
      }
      
      return false;
    })
    .sort((a, b) => {
      // Sort by creation date (newest first), but keep processing images near the top
      if (a.status === 'PROCESSING' && b.status !== 'PROCESSING') return -1;
      if (b.status === 'PROCESSING' && a.status !== 'PROCESSING') return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  return (
    <div className="relative bg-[#F0F0F0] min-h-[120px] max-h-[280px] border-t border-gray-300 overflow-y-auto hide-scrollbar">
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-gray-900">
            Refined Images ({displayImages.length})
          </h3>
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
          )}
        </div>
        
        {error && (
          <div className="text-red-500 text-sm mb-3 p-2 bg-red-50 rounded">
            {error}
          </div>
        )}

        {displayImages.length > 0 ? (
          <div className="grid grid-cols-8 gap-2">
            {displayImages.map((image) => {
              const isProcessing = image.status === 'PROCESSING';
              const isFailed = image.status === 'FAILED';
              const isSelected = selectedImageId === image.id;
              
              return (
                <div
                  key={image.id}
                  className={`
                    relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all
                    ${isSelected 
                      ? 'border-black shadow-md' 
                      : isProcessing
                        ? 'border-blue-400 shadow-sm'
                        : isFailed 
                          ? 'border-red-400' 
                          : 'border-gray-300 hover:border-gray-400'
                    }
                    ${isProcessing ? 'animate-pulse' : ''}
                  `}
                  onClick={() => !isProcessing && !isFailed && onSelectImage(image.id)}
                  title={`Refined image from ${image.createdAt.toLocaleString()}`}
                >
                  <img
                    src={image.thumbnailUrl || image.imageUrl}
                    alt={`Refined image ${image.id}`}
                    className={`
                      w-full h-full object-cover transition-opacity
                      ${isProcessing ? 'opacity-60' : isFailed ? 'opacity-40' : 'opacity-100'}
                    `}
                    loading="lazy"
                  />
                  
                  {/* Status overlay */}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  
                  {isFailed && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                      <span className="text-white text-xs font-medium">Failed</span>
                    </div>
                  )}
                  
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-1 right-1">
                      <div className="w-2 h-2 bg-black rounded-full"></div>
                    </div>
                  )}
                  
                  {/* Variation number badge */}
                  {image.variationNumber && (
                    <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      {image.variationNumber}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 border-t-blue-500"></div>
            <span className="ml-2 text-sm text-gray-600">Loading refined images...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Images className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-gray-600 text-sm font-medium">No refined images yet</p>
            <p className="text-gray-500 text-xs mt-1">
              Refined images will appear here after processing
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RefineHistoryPanel;