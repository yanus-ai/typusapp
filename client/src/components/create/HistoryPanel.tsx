import React from 'react';
import { Images } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import squareSpinner from '@/assets/animations/square-spinner.lottie';
import loader from '@/assets/animations/loader.lottie';
import LightTooltip from '@/components/ui/light-tooltip';
import { getDisplayStatus } from '@/utils/statusHelpers';

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
  onDeleteImage?: (imageId: number) => void;
  onConvertToInputImage?: (image: HistoryImage) => void;
  loading?: boolean;
  error?: string | null;
  showAllImages?: boolean; // When true, shows all images regardless of status
  downloadingImageId?: number; // ID of image being downloaded
  downloadProgress?: number; // Progress percentage (0-100)
  currentStep?: number;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  currentStep,
  images,
  selectedImageId,
  onSelectImage,
  onDeleteImage,
  loading = false,
  error = null,
  showAllImages = false,
  downloadingImageId,
  downloadProgress
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
    const isDownloading = downloadingImageId === image.id;

    const handleClick = () => {
      if (image.status === 'PROCESSING' && image.originalInputImageId) {
        // For processing images, select the original base input image to show blurred base with loading state
        onSelectImage(image.originalInputImageId, 'input');
      } else {
        // For completed images, select the generated image itself
        onSelectImage(image.id, 'generated');
      }
    };

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDeleteImage?.(image.id);
    };

    return (
      <div
        key={image.id}
        className={`w-full cursor-pointer rounded-md overflow-hidden border-2 relative group ${
          isSelected ? 'border-black' : 'border-transparent'
        }`}
        onClick={handleClick}
      >
        {imageUrl && image.status === 'COMPLETED' ? (
          <>
            <img
              src={imageUrl}
              alt={`Generated image`}
              className="h-[57px] w-full object-cover"
              loading="lazy"
            />
            {/* Download Progress Overlay */}
            {isDownloading && downloadProgress !== undefined && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-white text-xs font-medium text-center">
                  <div>{Math.round(downloadProgress)}%</div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full bg-white h-[57px] flex flex-col items-center justify-center relative rounded-md overflow-hidden">
            {image.status === 'PROCESSING' ? (
              <LightTooltip text={getDisplayStatus(image.runpodStatus, image.status)} direction="left">
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <DotLottieReact
                    src={loader}
                    loop
                    autoplay
                    style={{ transform: 'scale(2.5)' }}
                  />
                </div>
              </LightTooltip>
            ) : image.status === 'FAILED' ? (
              <LightTooltip text={getDisplayStatus(image.runpodStatus, image.status)} direction="left">
                <div className="w-full h-full flex flex-col items-center justify-center text-red-400 text-xs">
                  ❌ Failed
                </div>
              </LightTooltip>
            ) : (
              <div className="text-gray-400 text-xs">Loading...</div>
            )}
          </div>
        )}

          {/* Delete button - shows on hover */}
          <button
            onClick={handleDelete}
            className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete image"
          >
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
      </div>
    );
  };

  return (
    <div className={`${currentStep === 3 ? 'z-[1000]' : 'z-50'} absolute top-1/2 right-3 -translate-y-1/2 h-auto shadow-lg bg-white rounded-md w-[88px]`}>
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