import React, { useState, useEffect, useRef } from 'react';
import { Download, Share2, ImageIcon, Plus, Loader2 } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import squareSpinner from '@/assets/animations/square-spinner.lottie';
import whiteSquareSpinner from '@/assets/animations/white-square-spinner.lottie';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setIsModalOpen } from '@/features/gallery/gallerySlice';
import { createInputImageFromExisting } from '@/features/images/inputImagesSlice';
import { fetchAllVariations, fetchInputAndCreateImages } from '@/features/images/historyImagesSlice';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface UpscaleModeImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  processedImageUrl?: string;
  createdAt: Date;
  prompt?: string;
  batchId?: number;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createUploadId?: number;
  tweakUploadId?: number;
  refineUploadId?: number;
  originalInputImageId?: number;
}

interface ImageBatch {
  batchId: number;
  images: UpscaleModeImage[];
  prompt?: string;
  createdAt: Date;
}

interface UpscaleModeViewProps {
  images: UpscaleModeImage[];
  inputImages?: any[]; // Original input images to find base image URLs
  onDownload: (imageUrl: string, imageId: number) => void;
  onShare: (imageUrl: string) => void;
  onImageSelect?: (image: UpscaleModeImage) => void;
  selectedBatchId?: number | null;
  activeTab?: 'create' | 'edit' | 'upscale'; // New prop to track active gallery tab
  downloadingImages?: Set<number>; // New prop for tracking download states
}

const UpscaleModeView: React.FC<UpscaleModeViewProps> = ({
  images,
  inputImages = [],
  onDownload,
  onShare,
  onImageSelect,
  selectedBatchId,
  activeTab = 'upscale',
  downloadingImages = new Set()
}) => {
  const [localSelectedBatchId, setLocalSelectedBatchId] = useState<number | null>(null);
  const batchRefs = useRef<{ [key: number]: HTMLElement | null }>({});
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Helper function to get the original base input image URL for a generated image
  const getOriginalBaseImageUrl = (image: UpscaleModeImage): string | undefined => {
    if (image.originalInputImageId && inputImages.length > 0) {
      const originalInputImage = inputImages.find(input => input.id === image.originalInputImageId);
      return originalInputImage?.originalUrl || originalInputImage?.imageUrl;
    }
    return undefined;
  };

  // Group images by batch, then by date
  const groupImagesByBatch = (images: UpscaleModeImage[]) => {
    const batches: { [key: number]: UpscaleModeImage[] } = {};

    images.forEach(image => {
      // Use a unique identifier for images without batchId (using negative numbers)
      const batchId = image.batchId || -image.id;

      if (!batches[batchId]) {
        batches[batchId] = [];
      }
      batches[batchId].push(image);
    });

    return batches;
  };

  const groupBatchesByDate = (batches: { [key: number]: UpscaleModeImage[] }) => {
    const dateGroups: { [key: string]: ImageBatch[] } = {};

    Object.entries(batches).forEach(([batchIdStr, batchImages]) => {
      const batchId = parseInt(batchIdStr);
      if (batchImages.length === 0) return;

      // Use the most recent image's creation date for sorting (latest first)
      const mostRecentDate = new Date(Math.max(...batchImages.map(img => new Date(img.createdAt).getTime())));
      const dateKey = mostRecentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Sort images within batch by creation time (latest first)
      const sortedImages = batchImages.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const batch: ImageBatch = {
        batchId,
        images: sortedImages,
        prompt: sortedImages[0]?.prompt,
        createdAt: mostRecentDate
      };

      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = [];
      }
      dateGroups[dateKey].push(batch);
    });

    // Sort batches within each date group by creation time (latest first)
    Object.keys(dateGroups).forEach(dateKey => {
      dateGroups[dateKey].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return dateGroups;
  };

  const batches = groupImagesByBatch(images);
  const groupedBatches = groupBatchesByDate(batches);

  // Sort date groups by most recent date first
  const sortedDateEntries = Object.entries(groupedBatches).sort(([dateA], [dateB]) => {
    const dateObjA = new Date(dateA);
    const dateObjB = new Date(dateB);
    return dateObjB.getTime() - dateObjA.getTime();
  });

  // Scroll to selected batch when selectedBatchId changes (from organize tab navigation)
  useEffect(() => {
    if (selectedBatchId && batchRefs.current[selectedBatchId]) {
      const element = batchRefs.current[selectedBatchId];
      if (element) {
        // Set local selected state to match the incoming selectedBatchId
        setLocalSelectedBatchId(selectedBatchId);

        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [selectedBatchId]);

  // Scroll to locally selected batch when it changes
  useEffect(() => {
    if (localSelectedBatchId !== null && batchRefs.current[localSelectedBatchId]) {
      const element = batchRefs.current[localSelectedBatchId];
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [localSelectedBatchId]);

  const handleBatchSelect = (batch: ImageBatch) => {
    const newSelectedId = localSelectedBatchId === batch.batchId ? null : batch.batchId;
    setLocalSelectedBatchId(newSelectedId);
  };

  if (images.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <div className="text-gray-400 mb-2">No upscaled images yet</div>
          <div className="text-sm text-gray-500">
            Create some images and use the upscale feature to see them here
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto hide-scrollbar">
      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-medium text-gray-600 mb-6">Upscale Mode Creations</h2>
          
          {sortedDateEntries.map(([date, dateBatches]) => (
            <div key={date} className="mb-8">
              <h3 className="text-sm font-medium text-gray-500 mb-4">{date}</h3>

            <div className="gap-4 flex flex-wrap justify-start">
              {dateBatches.map((batch) => (
                <div
                  key={batch.batchId}
                  ref={(el) => { batchRefs.current[batch.batchId] = el; }}
                  onClick={() => handleBatchSelect(batch)}
                  className={`relative rounded-lg transition-all duration-200 cursor-pointer space-y-4 ${
                    localSelectedBatchId === batch.batchId
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >                  
                  {/* Images Grid - Large image layout like organize */}
                  <div className="flex flex-wrap gap-4">
                    {batch.images.map((image) => (
                      <UpscaleModeImageCard
                        key={image.id}
                        image={image}
                        activeTab={activeTab}
                        onDownload={onDownload}
                        onShare={onShare}
                        onImageSelect={onImageSelect}
                        dispatch={dispatch}
                        navigate={navigate}
                        isDownloading={downloadingImages.has(image.id)}
                        getOriginalBaseImageUrl={getOriginalBaseImageUrl}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            </div>
          ))}

          {images.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">No upscaled images yet</div>
              <div className="text-sm text-gray-500">Images upscaled in Upscale mode will appear here</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Custom ImageCard component for UpscaleModeView with context-aware button logic
interface UpscaleModeImageCardProps {
  image: UpscaleModeImage;
  activeTab: 'create' | 'edit' | 'upscale';
  onDownload: (imageUrl: string, imageId: number) => void;
  onShare: (imageUrl: string) => void;
  onImageSelect?: (image: UpscaleModeImage) => void;
  dispatch: any;
  navigate: any;
  isDownloading?: boolean;
  getOriginalBaseImageUrl: (image: UpscaleModeImage) => string | undefined;
}

const UpscaleModeImageCard: React.FC<UpscaleModeImageCardProps> = ({
  image,
  activeTab,
  onDownload,
  onShare,
  onImageSelect,
  dispatch,
  navigate,
  isDownloading = false,
  getOriginalBaseImageUrl,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const displayUrl = image.processedImageUrl || image.imageUrl;
  const isProcessing = image.status === 'PROCESSING';

  // Handle + button click (tab-aware)
  const handlePlusClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      if (activeTab === 'upscale') {
        // Upscale tab active - select UPSCALE image directly for Upscale page
        dispatch(setIsModalOpen(false));
        navigate(`/upscale?imageId=${image.id}&type=generated`);
      } else if (activeTab === 'create') {
        // Create tab active - this shouldn't happen in UpscaleModeView, but handle gracefully
      } else if (activeTab === 'edit') {
        // Edit tab active - this shouldn't happen in UpscaleModeView, but handle gracefully
      }
    } catch (error) {
      console.error('❌ Plus button error:', error);
      toast.error('Failed to select image. Please try again.');
    }
  };

  // Handle CREATE button click
  const handleCreateClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      if (image.createUploadId) {
        dispatch(setIsModalOpen(false));
        navigate(`/create?imageId=${image.createUploadId}&type=input`);
        // toast.success('Using existing converted image for Create module!');
      } else {
        const result = await dispatch(createInputImageFromExisting({
          imageUrl: image.imageUrl, // Always use high-definition imageUrl
          thumbnailUrl: image.thumbnailUrl,
          fileName: `create-from-${image.id}.jpg`,
          originalImageId: image.id,
          uploadSource: 'CREATE_MODULE',
          previewUrl: getOriginalBaseImageUrl(image) // ALWAYS use original base input image as preview
        }));
        
        if (createInputImageFromExisting.fulfilled.match(result)) {
          const newInputImage = result.payload;
          dispatch(setIsModalOpen(false));
          
          // Refresh input images for Create page to find the new image
          dispatch(fetchInputAndCreateImages({ page: 1, limit: 100, uploadSource: 'CREATE_MODULE' }));
          dispatch(fetchAllVariations({ page: 1, limit: 100 }));
          
          navigate(`/create?imageId=${newInputImage.id}&type=input`);
          // toast.success('Image converted for Create module!');
        } else {
          throw new Error('Failed to convert image');
        }
      }
    } catch (error) {
      console.error('❌ CREATE button error:', error);
      toast.error('Failed to convert image for Create module');
    }
  };

  // Handle EDIT button click
  const handleEditClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      if (image.tweakUploadId) {
        dispatch(setIsModalOpen(false));
        navigate(`/edit?imageId=${image.tweakUploadId}&type=input`);
        // toast.success('Using existing converted image for Edit module!');
      } else {
        const result = await dispatch(createInputImageFromExisting({
          imageUrl: image.imageUrl, // Always use high-definition imageUrl
          thumbnailUrl: image.thumbnailUrl,
          fileName: `tweak-from-${image.id}.jpg`,
          originalImageId: image.id,
          uploadSource: 'TWEAK_MODULE',
          previewUrl: getOriginalBaseImageUrl(image) // ALWAYS use original base input image as preview
        }));
        
        if (createInputImageFromExisting.fulfilled.match(result)) {
          const newInputImage = result.payload;
          dispatch(setIsModalOpen(false));
          
          // Refresh input images for Edit page to find the new image
          dispatch(fetchInputAndCreateImages({ page: 1, limit: 100, uploadSource: 'TWEAK_MODULE' }));
          dispatch(fetchAllVariations({ page: 1, limit: 100 }));
          
          navigate(`/edit?imageId=${newInputImage.id}&type=input`);
          // toast.success('Image converted for Edit module!');
        } else {
          throw new Error('Failed to convert image');
        }
      }
    } catch (error) {
      console.error('❌ EDIT button error:', error);
      toast.error('Failed to convert image for Edit module');
    }
  };

  // Handle UPSCALE button click
  const handleUpscaleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // UPSCALE image to UPSCALE page - use directly for further upscaling
      dispatch(setIsModalOpen(false));
      navigate(`/upscale?imageId=${image.id}&type=generated`);
      // toast.success('Image selected for Upscale module!');
    } catch (error) {
      console.error('❌ UPSCALE button error:', error);
      toast.error('Failed to navigate to Upscale module');
    }
  };

  return (
    <div
      className="group border-2 relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg w-[680px] h-[680px] border-gray-200 hover:border-gray-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        const isImageProcessing = image.status === 'PROCESSING';
        !isImageProcessing && onImageSelect?.(image);
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
          {/* Image - Use original high-quality URL for large display */}
          <img
            src={displayUrl}
            alt={`Upscaled image ${image.id}`}
            className="w-full h-full object-cover"
            onLoad={() => setImageLoaded(true)}
            style={{ display: imageLoaded ? 'block' : 'none' }}
          />

          {/* Loading placeholder - only for completed images that haven't loaded yet */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <DotLottieReact
                src={squareSpinner}
                autoplay
                loop
                style={{ width: 48, height: 48 }}
              />
            </div>
          )}
        </>
      )}

      {/* Plus button (context-aware) */}
      {isHovered && imageLoaded && !isProcessing && (
        <button
          onClick={handlePlusClick}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 p-3 rounded-full transition-all duration-200 cursor-pointer z-20 hover:scale-110"
          title="Select for current page"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Action buttons: CREATE, EDIT, UPSCALE */}
      {isHovered && imageLoaded && !isProcessing && (
        <>
          {/* CREATE Button - Left */}
          <button
            disabled={false}
            onClick={handleCreateClick}
            className="absolute bottom-3 left-3 text-white text-xs font-bold tracking-wider opacity-90 hover:opacity-100 px-2 py-1 rounded transition-all duration-200 cursor-pointer z-20 bg-black/50 hover:bg-black/80"
            title="Convert and open in Create module"
          >
            CREATE
          </button>

          {/* EDIT Button - Center */}
          <button
            disabled={false}
            onClick={handleEditClick}
            className="absolute bottom-3 right-1/2 translate-x-1/2 text-white text-xs font-bold tracking-wider opacity-90 hover:opacity-100 px-2 py-1 rounded transition-all duration-200 cursor-pointer z-20 bg-black/50 hover:bg-black/80"
            title="Convert and open in Edit module"
          >
            EDIT
          </button>

          {/* UPSCALE Button - Right */}
          <button
            disabled={activeTab === 'upscale'}
            onClick={handleUpscaleClick}
            className={`absolute bottom-3 right-3 text-white text-xs font-bold tracking-wider opacity-90 hover:opacity-100 px-2 py-1 rounded transition-all duration-200 cursor-pointer z-20 ${
              activeTab === 'upscale' 
                ? 'bg-gray-500/50 opacity-50 cursor-not-allowed' 
                : 'bg-black/50 hover:bg-black/80'
            }`}
            title={activeTab === 'upscale' ? 'Upscale tab is active - plus button opens in Upscale page' : 'Open in Upscale module'}
          >
            UPSCALE
          </button>
        </>
      )}

      {/* Hover overlay with download/share actions */}
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
                onDownload(image.imageUrl, image.id);
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

export default UpscaleModeView;