import React from 'react';
import { Images } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import whiteSquareSpinner from '@/assets/animations/white-square-spinner.lottie';
import SimpleTooltip from '@/components/ui/simple-tooltip';

interface HistoryImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  processedUrl?: string;
  createdAt: Date;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  batchId?: number;
  variationNumber?: number;
  runpodStatus?: string;
  moduleType?: 'CREATE' | 'TWEAK' | 'REFINE';
  // Cross-module tracking fields
  createUploadId?: number;
  tweakUploadId?: number;
  refineUploadId?: number;
}

interface HistoryPanelProps {
  images: HistoryImage[];
  selectedImageId?: number;
  onSelectImage: (imageId: number) => void;
  onConvertToInputImage?: (image: HistoryImage) => void;
  loading?: boolean;
  error?: string | null;
  showAllImages?: boolean; // When true, shows all images regardless of status
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  images, 
  selectedImageId,
  onSelectImage,
  loading = false,
  error = null,
  showAllImages = false
}) => {
  // Filter and sort images - show completed and processing images, or all images if showAllImages is true
  const displayImages = images
    .filter(image => {
      // If showAllImages is true, show all images regardless of status
      if (showAllImages) return true;
      
      // Always show completed images
      if (image.status === 'COMPLETED') return true;
      
      // Show processing images (they should remain visible during processing)
      if (image.status === 'PROCESSING') return true;
      
      return false;
    })
    .sort((a, b) => {
      // Sort by creation date (newest first), but keep processing images near the top
      if (a.status === 'PROCESSING' && b.status !== 'PROCESSING') return -1;
      if (b.status === 'PROCESSING' && a.status !== 'PROCESSING') return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const renderImage = (image: HistoryImage) => {
    const imageUrl = image.thumbnailUrl || image.imageUrl;
    const isSelected = selectedImageId === image.id;
    
    return (
      <div 
        key={image.id}
        className={`w-full cursor-pointer rounded-md overflow-hidden border-2 relative ${
          isSelected ? 'border-black' : 'border-transparent'
        }`}
        onClick={() => onSelectImage(image.id)}
      >
        {imageUrl && image.status === 'COMPLETED' ? (  
          <img 
            src={imageUrl} 
            alt={`Generated image`}
            className="w-full h-[57px] w-[57px] object-cover"
            loading="lazy"
          />  
        ) : (
          <div className="w-full bg-black h-[57px] flex flex-col items-center justify-center relative rounded-md">
            {image.status === 'PROCESSING' ? (
              <SimpleTooltip text="Processing" direction="left">
                <div className="w-full h-full flex flex-col items-center justify-center">
                  {/* <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-600 border-t-blue-500 mb-1"></div> */}
                  <DotLottieReact
                    src={whiteSquareSpinner}
                    loop
                    autoplay
                    style={{ height: 35, width: 50 }}
                  />
                  {/* Subtle border animation to indicate processing */}
                  <div className="absolute inset-0 border-2 border-black animate-pulse rounded-md"></div>
                </div>
              </SimpleTooltip>
            ) : image.status === 'FAILED' ? (
              <SimpleTooltip text="Failed to generate" direction="left">
                <div className="w-full h-full flex flex-col items-center justify-center text-red-400 text-xs">
                  ❌ Failed
                </div>
              </SimpleTooltip>
            ) : (
              <div className="text-gray-400 text-xs">Loading...</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="absolute top-1/2 right-3 -translate-y-1/2 h-auto shadow-lg bg-[#F1F1F1] rounded-md w-[88px] z-50">
      <div className='flex flex-col justify-center bg-[#F0F0F0] shadow-lg rounded-md max-h-[min(500px,calc(100vh-150px))] h-auto m-auto'>
        <div className="text-center py-4">
          <h2 className="text-sm">History</h2>
          <div className="border-b border-white border-2 mt-2 w-1/2 mx-auto" />
        </div>
        
        <div className="overflow-y-auto h-[calc(100%-53px)] pb-2 hide-scrollbar mb-2">
          {loading && images.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center pb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 mb-2"></div>
              <p className="text-xs text-gray-600">Loading...</p>
            </div>
          ) : displayImages.length > 0 ? (
            <div className="grid gap-2 px-1">
              {displayImages.map((image) => (
                <React.Fragment key={image.id}>
                  <div className="flex justify-center">
                    {renderImage(image)}
                  </div>
                </React.Fragment>
              ))}
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-center pb-4">
              <div className="text-red-500 text-xs mb-2">⚠️ Error</div>
              <p className="text-xs text-gray-600">{error}</p>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center pb-4">
              <Images />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPanel;