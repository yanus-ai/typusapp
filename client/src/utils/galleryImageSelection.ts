import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setSelectedBaseImageIdAndClearObjects } from '@/features/tweak/tweakSlice';
import { setSelectedImage as setRefineSelectedImage } from '@/features/refine/refineSlice';
import { setIsModalOpen } from '@/features/gallery/gallerySlice';
import { createInputImageFromExisting } from '@/features/images/inputImagesSlice';
import { fetchAllVariations } from '@/features/images/historyImagesSlice';
import toast from 'react-hot-toast';

interface GalleryImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  processedImageUrl?: string;
  moduleType?: 'CREATE' | 'TWEAK' | 'REFINE';
  originalInputImageId?: number;
  fileName?: string;
  // Cross-module tracking fields
  createUploadId?: number;
  tweakUploadId?: number;
  refineUploadId?: number;
}

type CurrentPage = 'create' | 'edit' | 'upscale' | 'other';
type ImageSource = 'CREATE' | 'TWEAK' | 'REFINE';

export const getCurrentPageFromPath = (pathname: string): CurrentPage => {
  if (pathname.includes('/create')) return 'create';
  if (pathname.includes('/edit')) return 'edit';  
  if (pathname.includes('/upscale')) return 'upscale';
  return 'other';
};

export const getImageSource = (image: GalleryImage): ImageSource => {
  // Use moduleType if available, otherwise determine from originalInputImageId
  if (image.moduleType) {
    return image.moduleType;
  }
  // If no moduleType but has originalInputImageId, it's likely a generated image from CREATE
  return image.originalInputImageId ? 'CREATE' : 'CREATE';
};

export const useSmartImageSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const handleSmartImageSelection = async (image: GalleryImage) => {
    const currentPage = getCurrentPageFromPath(location.pathname);
    const imageSource = getImageSource(image);
    
    console.log('🎯 Smart image selection:', { 
      currentPage, 
      imageSource, 
      imageId: image.id,
      moduleType: image.moduleType 
    });

    try {
      switch (currentPage) {
        case 'create':
          await handleCreatePageSelection(image, imageSource);
          break;
        case 'edit':
          await handleEditPageSelection(image, imageSource);
          break;
        case 'upscale':
          await handleRefinePageSelection(image, imageSource);
          break;
        default:
          // For other pages, default to create page navigation
          navigate(`/create?imageId=${image.id}&type=generated`);
          dispatch(setIsModalOpen(false));
          break;
      }
    } catch (error) {
      console.error('❌ Error in smart image selection:', error);
      toast.error('Failed to select image. Please try again.');
    }
  };

  const handleCreatePageSelection = async (image: GalleryImage, imageSource: ImageSource) => {
    if (imageSource === 'CREATE') {
      // Same module - use image directly (stay on Create page)
      console.log('✅ Create page + CREATE image: Using image directly');
      if (image.createUploadId) {
        navigate(`/create?imageId=${image.createUploadId}&type=input`);
      } else {
        navigate(`/create?imageId=${image.id}&type=generated`);
      }
      dispatch(setIsModalOpen(false));
      // toast.success('Image selected for Create module!');
    } else {
      // Different module (TWEAK/REFINE) - create input image for CREATE_MODULE and stay on Create page
      console.log('🔄 Create page + TWEAK/REFINE image: Creating input image for CREATE_MODULE');
      
      // Check if already converted to avoid duplicate uploads
      if (image.createUploadId) {
        console.log('✅ Image already converted for CREATE module, using existing input image:', image.createUploadId);
        navigate(`/create?imageId=${image.createUploadId}&type=input`);
        dispatch(setIsModalOpen(false));
        // toast.success('Using existing converted image for Create module!');
        return;
      }

      // Create new input image for CREATE_MODULE
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
        // Stay on Create page with the new input image
        navigate(`/create?imageId=${newInputImage.id}&type=input`);
        dispatch(setIsModalOpen(false));
        // toast.success('Image converted for Create module!');
        
        // Refresh gallery data to update tracking fields
        dispatch(fetchAllVariations({ page: 1, limit: 100 }));
      } else {
        throw new Error('Failed to create input image for CREATE module');
      }
    }
  };

  const handleEditPageSelection = async (image: GalleryImage, imageSource: ImageSource) => {
    if (imageSource === 'TWEAK') {
      // Same module - show generated image in main canvas (stay on Edit page)
      console.log('✅ Edit page + TWEAK image: Showing generated image in main canvas');
      dispatch(setSelectedBaseImageIdAndClearObjects(image.id));
      dispatch(setIsModalOpen(false));
      // toast.success('Image selected for Edit module!');
    } else {
      // Different module (CREATE/REFINE) - create input image for TWEAK_MODULE and stay on Edit page
      console.log('🔄 Edit page + CREATE/REFINE image: Creating input image for TWEAK_MODULE');
      
      // Check if already converted to avoid duplicate uploads
      if (image.tweakUploadId) {
        console.log('✅ Image already converted for TWEAK module, using existing input image:', image.tweakUploadId);
        dispatch(setSelectedBaseImageIdAndClearObjects(image.tweakUploadId));
        dispatch(setIsModalOpen(false));
        // toast.success('Using existing converted image for Edit module!');
        return;
      }

      // Create new input image for TWEAK_MODULE
      const fileName = image.fileName || `tweak-from-${image.id}.jpg`;
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
        // Stay on Edit page with the new input image
        dispatch(setSelectedBaseImageIdAndClearObjects(newInputImage.id));
        dispatch(setIsModalOpen(false));
        // toast.success('Image converted for Edit module!');
        
        // Refresh gallery data to update tracking fields
        dispatch(fetchAllVariations({ page: 1, limit: 100 }));
      } else {
        throw new Error('Failed to create input image for TWEAK module');
      }
    }
  };

  const handleRefinePageSelection = async (image: GalleryImage, imageSource: ImageSource) => {
    if (imageSource === 'REFINE') {
      // Same module - show generated image (stay on Refine page)
      console.log('✅ Refine page + REFINE image: Showing generated image');
      const imageUrl = image.processedImageUrl || image.imageUrl;
      dispatch(setRefineSelectedImage({ 
        id: image.id, 
        url: imageUrl,
        type: 'generated' 
      }));
      dispatch(setIsModalOpen(false));
      // toast.success('Image selected for Refine module!');
    } else {
      // Different module (CREATE/TWEAK) - create input image for REFINE_MODULE and stay on Refine page
      console.log('🔄 Refine page + CREATE/TWEAK image: Creating input image for REFINE_MODULE');
      
      // Check if already converted to avoid duplicate uploads
      if (image.refineUploadId) {
        console.log('✅ Image already converted for REFINE module, using existing input image:', image.refineUploadId);
        dispatch(setRefineSelectedImage({ 
          id: image.refineUploadId, 
          url: image.imageUrl,
          type: 'input' 
        }));
        dispatch(setIsModalOpen(false));
        // toast.success('Using existing converted image for Refine module!');
        return;
      }

      // Create new input image for REFINE_MODULE
      const fileName = image.fileName || `refine-from-${image.id}.jpg`;
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
        // Stay on Refine page with the new input image
        dispatch(setRefineSelectedImage({ 
          id: newInputImage.id, 
          url: newInputImage.imageUrl,
          type: 'input' 
        }));
        dispatch(setIsModalOpen(false));
        // toast.success('Image converted for Refine module!');
        
        // Refresh gallery data to update tracking fields
        dispatch(fetchAllVariations({ page: 1, limit: 100 }));
      } else {
        throw new Error('Failed to create input image for REFINE module');
      }
    }
  };

  return { handleSmartImageSelection };
};
