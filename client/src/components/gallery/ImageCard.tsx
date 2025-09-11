import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2, Plus } from 'lucide-react';
import { LayoutType } from '@/pages/gallery/GalleryPage';
import { useNavigate, useLocation } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import whiteSquareSpinner from '@/assets/animations/white-square-spinner.lottie';
import smallSpinner from '@/assets/animations/small-spinner.lottie';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setIsModalOpen } from '@/features/gallery/gallerySlice';
import { useSmartImageSelection } from '@/utils/galleryImageSelection';
import { createInputImageFromExisting } from '@/features/images/inputImagesSlice';
import { fetchAllVariations } from '@/features/images/historyImagesSlice';
import toast from 'react-hot-toast';

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
  fileName?: string;
  createUploadId?: number;
  tweakUploadId?: number;
  refineUploadId?: number;
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
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { handleSmartImageSelection } = useSmartImageSelection();

  // Determine current page from URL path
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path.includes('/create') || path.includes('/dashboard')) return 'create';
    if (path.includes('/edit') || path.includes('/tweak')) return 'edit';
    if (path.includes('/refine') || path.includes('/upscale')) return 'refine';
    return 'create'; // default
  };

  const currentPage = getCurrentPage();

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
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <DotLottieReact
            src={smallSpinner}
            loop
            autoplay
            style={{ height: 35, width: 50 }}
          />
          <div className="text-black text-xs font-medium mt-2">Processing...</div>
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
            console.log('🔄 Smart image selection clicked:', image.id);
            
            if (onCreateFromImage) {
              // Use callback if provided (modal context with custom logic)
              onCreateFromImage(image.id);
            } else {
              // Use smart selection logic
              handleSmartImageSelection(image);
            }
          }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 p-3 rounded-full transition-all duration-200 cursor-pointer z-20 hover:scale-110"
          title="Smart select image"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Three action buttons: CREATE, EDIT, UPSCALE */}
      {isHovered && imageLoaded && !isProcessing && (
        <>
          {/* CREATE Button - Left */}
          <button
            disabled={currentPage === 'create'}
            onClick={async (e) => {
              e.stopPropagation();
              console.log('🔄 Create button clicked for image:', image.id);
              
              if (onCreateFromImage) {
                // Use callback if provided (modal context with custom logic)
                onCreateFromImage(image.id);
                return;
              }

              // Check if this is a CREATE module image or has createUploadId
              if (image.moduleType === 'CREATE' || image.createUploadId) {
                // Navigate directly - no conversion needed
                const imageId = image.createUploadId || image.id;
                const imageType = image.createUploadId ? 'input' : 'generated';
                
                console.log('✅ CREATE: Using existing image/input:', imageId, 'type:', imageType);
                navigate(`/create?imageId=${imageId}&type=${imageType}`);
                dispatch(setIsModalOpen(false));
                return;
              }

              // Need to convert from TWEAK/REFINE to CREATE
              try {
                console.log('🔄 CREATE: Converting TWEAK/REFINE image to input image for CREATE module');
                
                const fileName = image.fileName || `create-from-${image.id}.jpg`;
                const imageUrl = image.processedImageUrl || image.imageUrl;
                
                const result = await dispatch(createInputImageFromExisting({
                  imageUrl: imageUrl,
                  thumbnailUrl: image.thumbnailUrl,
                  fileName: fileName,
                  originalImageId: image.id,
                  uploadSource: 'CREATE_MODULE'
                }));

                if (createInputImageFromExisting.fulfilled.match(result)) {
                  const newInputImage = result.payload;
                  console.log('✅ CREATE: Conversion successful, navigating with input image:', newInputImage.id);
                  
                  // Navigate to Create page with the new input image
                  navigate(`/create?imageId=${newInputImage.id}&type=input`);
                  dispatch(setIsModalOpen(false));
                  
                  // Refresh gallery data to update tracking fields
                  dispatch(fetchAllVariations({ page: 1, limit: 100 }));
                  toast.success('Image converted for Create module!');
                } else {
                  throw new Error('Failed to convert image');
                }
              } catch (error) {
                console.error('❌ CREATE: Failed to convert image:', error);
                toast.error('Failed to convert image for Create module');
              }
            }}
            className={`absolute bottom-3 left-3 text-white text-xs font-bold tracking-wider opacity-90 hover:opacity-100 px-2 py-1 rounded transition-all duration-200 cursor-pointer z-20 ${
              currentPage === 'create' 
                ? 'bg-gray-500/50 opacity-50 cursor-not-allowed' 
                : 'bg-black/50 hover:bg-black/80'
            }`}
            title={currentPage === 'create' ? 'Currently in Create module' : 'Open in Create module'}
          >
            CREATE
          </button>

          {/* EDIT Button - Center */}
          <button
            disabled={currentPage === 'edit'}
            onClick={async (e) => {
              e.stopPropagation();
              console.log('🔄 Edit button clicked for image:', image.id);
              
              if (onTweakRedirect) {
                // Use custom callback if provided (modal context)
                onTweakRedirect(image.id);
                return;
              }

              // Check if this is CREATE/TWEAK module image or has tweakUploadId
              if (image.moduleType === 'CREATE' || image.moduleType === 'TWEAK' || image.tweakUploadId) {
                if (image.tweakUploadId) {
                  // Use existing input image
                  console.log('✅ EDIT: Using existing input image:', image.tweakUploadId);
                  navigate(`/edit?imageId=${image.tweakUploadId}&type=input`);
                  dispatch(setIsModalOpen(false));
                  toast.success('Using existing converted image for Edit module!');
                } else {
                  // Navigate directly with generated image
                  console.log('✅ EDIT: Using generated image directly:', image.id);
                  navigate(`/edit?imageId=${image.id}&type=generated`);
                  dispatch(setIsModalOpen(false));
                }
                return;
              }

              // Need to convert from REFINE to TWEAK
              try {
                console.log('🔄 EDIT: Converting REFINE image to input image for EDIT module');
                
                const fileName = image.fileName || `tweak-${image.id}.jpg`;
                const imageUrl = image.processedImageUrl || image.imageUrl;
                
                const result = await dispatch(createInputImageFromExisting({
                  imageUrl: imageUrl,
                  thumbnailUrl: image.thumbnailUrl,
                  fileName: fileName,
                  originalImageId: image.id,
                  uploadSource: 'TWEAK_MODULE'
                }));

                if (createInputImageFromExisting.fulfilled.match(result)) {
                  const newInputImage = result.payload;
                  console.log('✅ EDIT: Conversion successful, navigating with input image:', newInputImage.id);
                  
                  // Navigate to Edit page with the new input image
                  navigate(`/edit?imageId=${newInputImage.id}&type=input`);
                  dispatch(setIsModalOpen(false));
                  
                  // Refresh gallery data to update tracking fields
                  dispatch(fetchAllVariations({ page: 1, limit: 100 }));
                  toast.success('Image converted for Edit module!');
                } else {
                  throw new Error('Failed to convert image');
                }
              } catch (error) {
                console.error('❌ EDIT: Failed to convert image:', error);
                toast.error('Failed to convert image for Edit module');
              }
            }}
            className={`absolute bottom-3 right-1/2 translate-x-1/2 text-white text-xs font-bold tracking-wider opacity-90 hover:opacity-100 px-2 py-1 rounded transition-all duration-200 cursor-pointer z-20 ${
              currentPage === 'edit' 
                ? 'bg-gray-500/50 opacity-50 cursor-not-allowed' 
                : 'bg-black/50 hover:bg-black/80'
            }`}
            title={currentPage === 'edit' ? 'Currently in Edit module' : 'Open in Edit module'}
          >
            EDIT
          </button>

          {/* UPSCALE Button - Right */}
          <button
            disabled={currentPage === 'refine'}
            onClick={async (e) => {
              e.stopPropagation();
              console.log('🔄 Upscale button clicked for image:', image.id);
              
              // Check if this is REFINE module image or has refineUploadId
              if (image.moduleType === 'REFINE' || image.refineUploadId) {
                if (image.refineUploadId) {
                  // Use existing input image
                  console.log('✅ UPSCALE: Using existing input image:', image.refineUploadId);
                  navigate(`/upscale?imageId=${image.refineUploadId}&type=input`);
                  dispatch(setIsModalOpen(false));
                  toast.success('Using existing converted image for Refine module!');
                } else {
                  // Navigate directly with generated image
                  console.log('✅ UPSCALE: Using generated image directly:', image.id);
                  navigate(`/upscale?imageId=${image.id}&type=generated`);
                  dispatch(setIsModalOpen(false));
                }
                return;
              }

              // Need to convert from CREATE/TWEAK to REFINE
              try {
                console.log('🔄 UPSCALE: Converting CREATE/TWEAK image to input image for REFINE module');
                
                const fileName = image.fileName || `refine-${image.id}.jpg`;
                const imageUrl = image.processedImageUrl || image.imageUrl;
                
                const result = await dispatch(createInputImageFromExisting({
                  imageUrl: imageUrl,
                  thumbnailUrl: image.thumbnailUrl,
                  fileName: fileName,
                  originalImageId: image.id,
                  uploadSource: 'REFINE_MODULE'
                }));

                if (createInputImageFromExisting.fulfilled.match(result)) {
                  const newInputImage = result.payload;
                  console.log('✅ UPSCALE: Conversion successful, navigating with input image:', newInputImage.id);
                  
                  // Navigate to Upscale page with the new input image
                  navigate(`/upscale?imageId=${newInputImage.id}&type=input`);
                  dispatch(setIsModalOpen(false));
                  
                  // Refresh gallery data to update tracking fields
                  dispatch(fetchAllVariations({ page: 1, limit: 100 }));
                  toast.success('Image converted for Refine module!');
                } else {
                  throw new Error('Failed to convert image');
                }
              } catch (error) {
                console.error('❌ UPSCALE: Failed to convert image:', error);
                toast.error('Failed to convert image for Refine module');
              }
            }}
            className={`absolute bottom-3 right-3 text-white text-xs font-bold tracking-wider opacity-90 hover:opacity-100 px-2 py-1 rounded transition-all duration-200 cursor-pointer z-20 ${
              currentPage === 'refine' 
                ? 'bg-gray-500/50 opacity-50 cursor-not-allowed' 
                : 'bg-black/50 hover:bg-black/80'
            }`}
            title={currentPage === 'refine' ? 'Currently in Refine module' : 'Open in Refine module'}
          >
            UPSCALE
          </button>
        </>
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