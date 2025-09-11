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
      // Same module - check if we have a createUploadId to use as input, otherwise use as reference
      if (image.createUploadId) {
        console.log('✅ Create page + CREATE image: Using existing input image');
        navigate(`/create?imageId=${image.createUploadId}&type=input`);
        dispatch(setIsModalOpen(false));
      } else {
        console.log('✅ Create page + CREATE image: Using as reference image');
        navigate(`/create?imageId=${image.id}&type=generated`);
        dispatch(setIsModalOpen(false));
      }
    } else {
      // Different module (TWEAK/REFINE) - check if already converted to avoid duplicate uploads
      debugger
      if (image.createUploadId) {
        console.log('✅ Image already converted for CREATE module, using existing input image:', image.createUploadId);
        navigate(`/create?imageId=${image.createUploadId}&type=input`);
        dispatch(setIsModalOpen(false));
        // toast.success('Using existing converted image for Create module!');
        return;
      }

      // Create new input image if not already converted
      console.log('🔄 Create page + TWEAK/REFINE image: Creating new input image');
      
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
        // Navigate to Create page with the new input image parameters
        navigate(`/create?imageId=${newInputImage.id}&type=input`);
        dispatch(setIsModalOpen(false));
        // toast.success('Image converted and selected for Create module!');
        
        // Refresh gallery data to update tracking fields for next time
        dispatch(fetchAllVariations({ page: 1, limit: 100 }));
      } else {
        throw new Error('Failed to create input image');
      }
    }
  };

  const handleEditPageSelection = async (image: GalleryImage, imageSource: ImageSource) => {
    if (imageSource === 'CREATE' || imageSource === 'TWEAK') {
      // Compatible modules - select the image
      console.log('✅ Edit page + CREATE/TWEAK image: Selecting existing image');
      dispatch(setSelectedBaseImageIdAndClearObjects(image.id));
      dispatch(setIsModalOpen(false));
      // toast.success('Image selected for Edit module!');
    } else if (imageSource === 'REFINE') {
      // REFINE to TWEAK - check if already converted to avoid duplicate uploads
      if (image.tweakUploadId) {
        console.log('✅ Image already converted for EDIT module, using existing input image:', image.tweakUploadId);
        dispatch(setSelectedBaseImageIdAndClearObjects(image.tweakUploadId));
        dispatch(setIsModalOpen(false));
        // toast.success('Using existing converted image for Edit module!');
        return;
      }

      // Create new input image if not already converted
      console.log('🔄 Edit page + REFINE image: Creating new input image for tweak');
      
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
        dispatch(setSelectedBaseImageIdAndClearObjects(newInputImage.id));
        dispatch(setIsModalOpen(false));
        // toast.success('Image converted and selected for Edit module!');
        
        // Refresh gallery data to update tracking fields for next time
        dispatch(fetchAllVariations({ page: 1, limit: 100 }));
      } else {
        throw new Error('Failed to create tweak input image');
      }
    }
  };

  const handleRefinePageSelection = async (image: GalleryImage, imageSource: ImageSource) => {
    if (imageSource === 'REFINE') {
      // Same module - direct selection
      console.log('✅ Refine page + REFINE image: Direct selection');
      const imageUrl = image.processedImageUrl || image.imageUrl;
      dispatch(setRefineSelectedImage({ 
        id: image.id, 
        url: imageUrl,
        type: 'generated' 
      }));
      dispatch(setIsModalOpen(false));
      // toast.success('Image selected for Refine module!');
    } else {
      // Different module (CREATE/TWEAK) - check if already converted to avoid duplicate uploads
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

      // Create new input image if not already converted
      console.log('🔄 Refine page + CREATE/TWEAK image: Creating new input image for refine');
      
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
        dispatch(setRefineSelectedImage({ 
          id: newInputImage.id, 
          url: newInputImage.imageUrl,
          type: 'input' 
        }));
        dispatch(setIsModalOpen(false));
        // toast.success('Image converted and selected for Refine module!');
        
        // Refresh gallery data to update tracking fields for next time
        dispatch(fetchAllVariations({ page: 1, limit: 100 }));
      } else {
        throw new Error('Failed to create refine input image');
      }
    }
  };

  return { handleSmartImageSelection };
};
