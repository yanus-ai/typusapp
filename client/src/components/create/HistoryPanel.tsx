import React from 'react';
import { Images } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import squareSpinner from '@/assets/animations/square-spinner.lottie';
import loader from '@/assets/animations/loader.lottie';
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
  // Original input image that was used for generation
  originalInputImageId?: number;
}

interface HistoryPanelProps {
  images: HistoryImage[];
  selectedImageId?: number;
  onSelectImage: (imageId: number, sourceType?: 'input' | 'generated') => void;
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
  // Filter and sort images - show only CREATE module images that are completed or processing
  const displayImages = images
    .filter(image => {
      // If showAllImages is true, show all CREATE images regardless of status
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

    const handleClick = () => {
      if (image.status === 'PROCESSING' && image.originalInputImageId) {
        // For processing images, select the original base input image to show blurred base with loading state
        onSelectImage(image.originalInputImageId, 'input');
      } else {
        // For completed images, select the generated image itself
        onSelectImage(image.id, 'generated');
      }
    };

    return (
      <div
        key={image.id}
        className={`w-full cursor-pointer rounded-md overflow-hidden border-2 relative ${
          isSelected ? 'border-black' : 'border-transparent'
        }`}
        onClick={handleClick}
      >
        {imageUrl && image.status === 'COMPLETED' ? (  
          <img 
            src={imageUrl} 
            alt={`Generated image`}
            className="w-full h-[57px] w-[57px] object-cover"
            loading="lazy"
          />  
        ) : (
          <div className="w-full bg-white h-[57px] flex flex-col items-center justify-center relative rounded-md overflow-hidden">
            {image.status === 'PROCESSING' ? (
              <SimpleTooltip text="Generating..." direction="left">
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <DotLottieReact
                    src={loader}
                    loop
                    autoplay
                    style={{ transform: 'scale(2.5)' }}
                  />
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
    <div className="absolute top-1/2 right-3 -translate-y-1/2 h-auto shadow-lg bg-white rounded-md w-[88px] z-50">
      <div className='flex flex-col justify-center bg-white shadow-lg rounded-md max-h-[min(500px,calc(100vh-150px))] h-auto m-auto'>
        <div className="text-center py-4">
          <h2 className="text-sm">History</h2>
          <div className="border-b border-[#E3E3E3] border-2 mt-4 w-1/2 mx-auto" />
        </div>
        
        <div className="overflow-y-auto h-[calc(100%-53px)] pb-2 hide-scrollbar mb-2">
          {loading && images.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center pb-4">
              <DotLottieReact
                src={squareSpinner}
                autoplay
                loop
                style={{ width: 24, height: 24 }}
              />
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