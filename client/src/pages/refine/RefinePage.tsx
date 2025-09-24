import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import { useCreditCheck } from '@/hooks/useCreditCheck';
import toast from 'react-hot-toast';
import axios from 'axios';
import MainLayout from "@/components/layout/MainLayout";
import RefineEditInspector from '@/components/refine/RefineEditInspector';
import RefineImageCanvas from '@/components/refine/RefineImageCanvas';
import HistoryPanel from '@/components/create/HistoryPanel';
import InputHistoryPanel from '@/components/create/InputHistoryPanel';
import RefineAIPromptInput from '@/components/refine/RefineAIPromptInput';
import FileUpload from '@/components/create/FileUpload';
import GalleryModal from '@/components/gallery/GalleryModal';

// Redux actions
import { uploadInputImage, fetchInputImagesBySource, createInputImageFromExisting } from '@/features/images/inputImagesSlice';
import { fetchAllVariations, addProcessingRefineVariations } from '@/features/images/historyImagesSlice';
import {
  setSelectedImage as setRefineSelectedImage,
  setIsPromptModalOpen as setRefineIsPromptModalOpen,
  setIsGenerating as setRefineIsGenerating,
} from '@/features/refine/refineSlice';
import {
  setSelectedImage,
  setIsPromptModalOpen,
  startGeneration,
  stopGeneration,
} from '@/features/refine/refineUISlice';
import { generateUpscale } from '@/features/upscale/upscaleSlice';
import { setIsModalOpen } from '@/features/gallery/gallerySlice';
import { initializeRefineSettings } from '@/features/customization/customizationSlice';
import { clearSavedPrompt, getInputImageSavedPrompt } from '@/features/masks/maskSlice';
import { fetchCurrentUser, updateCredits } from '@/features/auth/authSlice';

const RefinePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { checkCreditsBeforeAction } = useCreditCheck();

  // Local state for UI
  const [editInspectorMinimized, setEditInspectorMinimized] = useState(false);

  // Download progress state
  const [downloadingImageId, setDownloadingImageId] = useState<number | undefined>(undefined);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [imageObjectUrls, setImageObjectUrls] = useState<Record<number, string>>({});

  // Redux selectors - use refineUI for UI state, refine for settings
  const refineUIState = useAppSelector(state => state.refineUI);
  const refineState = useAppSelector(state => state.refine);

  const {
    selectedImageId,
    selectedImageType,
    isGenerating,
    isPromptModalOpen
  } = refineUIState;

  const {
    selectedImageUrl,
    settings,
    viewMode
  } = refineState;
  
  // Input images from REFINE_MODULE only - using inputImages slice
  const inputImages = useAppSelector(state => state.inputImages.images);
  const inputImagesLoading = useAppSelector(state => state.inputImages.loading);
  
  const historyImages = useAppSelector(state => state.historyImages.images);
  const historyImagesLoading = useAppSelector(state => state.historyImages.loading);

  // Filter history images by module type - only REFINE module
  const filteredHistoryImages = React.useMemo(() => {
    const filtered = historyImages.filter((image) =>
      image.moduleType === 'REFINE' && (
        image.status === 'COMPLETED' ||
        image.status === 'PROCESSING' ||
        !image.status
      )
    );
    return filtered;
  }, [historyImages]);

  // Check if we have input images to determine layout
  const hasInputImages = inputImages && inputImages.length > 0;
                      
  // InputHistoryPanel shows refine uploaded images (inputImages from REFINE_MODULE only)
  // HistoryPanel shows refine generated images (filteredHistoryImages from REFINE module only)
  
  // Gallery modal state
  const isGalleryModalOpen = useAppSelector(state => state.gallery.isModalOpen);
  
  // Get slider values from customization slice  
  const customizationState = useAppSelector(state => state.customization);
  const { creativity, resemblance, dynamics, tilingWidth, tilingHeight } = customizationState;

  // Get current functional input image ID for WebSocket filtering (same as CreatePage)
  const currentInputImageId = useMemo(() => {
    if (!selectedImageId || !selectedImageType) return undefined;

    if (selectedImageType === 'input') {
      return selectedImageId;
    } else if (selectedImageType === 'generated') {
      const generatedImage = historyImages.find(img => img.id === selectedImageId);
      return generatedImage?.originalInputImageId;
    }
    return undefined;
  }, [selectedImageId, selectedImageType, historyImages]);

  // Unified WebSocket connection - handles all real-time updates
  const { isConnected: isWebSocketConnected } = useUnifiedWebSocket({
    enabled: true,
    currentInputImageId
  });
  
  // Download image with progress tracking
  const downloadImageWithProgress = React.useCallback(async (imageUrl: string, imageId: number) => {
    // Check if we already have this image
    if (imageObjectUrls[imageId]) {
      return imageObjectUrls[imageId];
    }

    try {
      setDownloadingImageId(imageId);
      setDownloadProgress(0);

      const response = await axios.get(imageUrl, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            setDownloadProgress(progress);
          }
        }
      });

      // Create object URL from blob
      const objectUrl = URL.createObjectURL(response.data);

      // Store the object URL for future use
      setImageObjectUrls(prev => ({
        ...prev,
        [imageId]: objectUrl
      }));

      return objectUrl;
    } catch (error) {
      console.error('Failed to download image with progress:', error);
      // Fallback to original URL
      return imageUrl;
    } finally {
      setDownloadingImageId(undefined);
      setDownloadProgress(0);
    }
  }, [imageObjectUrls]);

  // Simple image selection function (same as CreatePage)
  const handleSelectImage = (imageId: number, sourceType: 'input' | 'generated') => {
    dispatch(setSelectedImage({ id: imageId, type: sourceType }));
  };

  // Enhanced image selection function for complex operations (kept for other uses)
  const selectImage = React.useCallback((imageId: number, imageType: 'input' | 'generated') => {
    console.log('🎯 Selecting image:', { imageId, imageType });
    console.log('🔍 Current selected state before selection:', {
      currentSelectedImageId: selectedImageId,
      currentSelectedImageUrl: selectedImageUrl,
      currentSelectedImageType: selectedImageType
    });

    let imageUrl: string | undefined;
    let baseInputImageId: number | undefined;

    if (imageType === 'input') {
      const inputImage = inputImages.find(img => img.id === imageId);
      imageUrl = inputImage?.originalUrl || inputImage?.imageUrl;
      baseInputImageId = imageId; // For input images, base = selected
      console.log('📄 Input image found:', inputImage ? 'Yes' : 'No', { imageUrl });
    } else {
      const historyImage = filteredHistoryImages.find(img => img.id === imageId);
      imageUrl = historyImage?.imageUrl || historyImage?.processedImageUrl;
      baseInputImageId = historyImage?.originalInputImageId;
      console.log('📄 History image found:', historyImage ? 'Yes' : 'No', { imageUrl });
    }

    if (imageUrl) {
      console.log('✅ Dispatching setSelectedImage with:', { id: imageId, url: imageUrl, type: imageType, baseInputImageId });
      // Update refineUI slice for UI state
      dispatch(setSelectedImage({ id: imageId, type: imageType, baseInputImageId }));
      // Update refine slice for URL and settings
      dispatch(setRefineSelectedImage({ id: imageId, url: imageUrl, type: imageType }));

      if (imageType === 'input') {
        dispatch(clearSavedPrompt());
      }
      dispatch(initializeRefineSettings());
    } else {
      console.error('❌ No imageUrl found for selection');
    }
  }, [inputImages, filteredHistoryImages, dispatch, selectedImageId, selectedImageUrl, selectedImageType]);

  // Load initial data
  useEffect(() => {
    const uploadSource = 'REFINE_MODULE';
    dispatch(fetchInputImagesBySource({ uploadSource }));
    dispatch(fetchAllVariations({ page: 1, limit: 100 }));
  }, [dispatch]);

  // Handle image data loading when selected via handleSelectImage OR WebSocket auto-selection
  useEffect(() => {
    if (selectedImageId && selectedImageType) {
      let imageUrl: string | undefined;

      if (selectedImageType === 'input') {
        const inputImage = inputImages.find(img => img.id === selectedImageId);
        imageUrl = inputImage?.originalUrl || inputImage?.imageUrl;

        if (imageUrl) {
          // For input images, use URL directly (no progress needed for thumbnails)
          dispatch(setRefineSelectedImage({ id: selectedImageId, url: imageUrl, type: selectedImageType }));
          dispatch(clearSavedPrompt());
          dispatch(initializeRefineSettings());
        }
      } else {
        // For generated images, ALWAYS download with progress tracking
        // This handles both manual clicks AND WebSocket auto-selections
        const historyImage = filteredHistoryImages.find(img => img.id === selectedImageId);
        imageUrl = historyImage?.imageUrl || historyImage?.processedImageUrl;

        if (imageUrl) {
          // Check if we already have this image cached
          if (imageObjectUrls[selectedImageId]) {
            // Use cached object URL - but still update Redux to ensure consistency
            dispatch(setRefineSelectedImage({
              id: selectedImageId,
              url: imageObjectUrls[selectedImageId],
              type: selectedImageType
            }));
            dispatch(initializeRefineSettings());
          } else {
            // Download with progress tracking (works for both manual + WebSocket selections)
            downloadImageWithProgress(imageUrl, selectedImageId).then((processedUrl) => {
              dispatch(setRefineSelectedImage({
                id: selectedImageId,
                url: processedUrl,
                type: selectedImageType
              }));
              dispatch(initializeRefineSettings());
            });
          }
        }
      }
    }
  }, [selectedImageId, selectedImageType, inputImages, filteredHistoryImages, dispatch, imageObjectUrls, downloadImageWithProgress]);

  // Handle URL parameters for image selection and auto-select last input image
  useEffect(() => {
    // Skip if data is still loading
    if (inputImagesLoading || historyImagesLoading) {
      return;
    }

    const imageIdParam = searchParams.get('imageId');
    const typeParam = searchParams.get('type');

    console.log('🔍 URL parameter effect running:', { 
      imageIdParam, 
      typeParam, 
      selectedImageId,
      inputImagesLength: inputImages.length,
      historyImagesLength: filteredHistoryImages.length
    });

    if (imageIdParam && typeParam) {
      const targetImageId = parseInt(imageIdParam);
      
      // Safety check: if this image is already selected, don't reprocess
      if (targetImageId === selectedImageId) {
        console.log('⚠️ Target image is already selected, clearing URL parameters without reprocessing');
        const currentPath = window.location.pathname;
        navigate(currentPath, { replace: true });
        return;
      }
      
      if (!isNaN(targetImageId)) {
        console.log('🔗 URL parameters found:', { imageId: targetImageId, type: typeParam });
        
        let imageFound = false;
        
        if (typeParam === 'input') {
          // Find in input images
          const inputImage = inputImages.find(img => img.id === targetImageId);
          if (inputImage) {
            console.log('✅ Found input image, selecting:', inputImage.id);
            selectImage(targetImageId, 'input');
            imageFound = true;
          } else {
            console.warn('❌ Input image not found with ID:', targetImageId);
          }
        } else if (typeParam === 'generated') {
          // Find in history images
          const historyImage = filteredHistoryImages.find(img => img.id === targetImageId);
          if (historyImage) {
            console.log('✅ Found history image, selecting:', historyImage.id);
            selectImage(targetImageId, 'generated');
            imageFound = true;
          } else {
            console.warn('❌ History image not found with ID:', targetImageId);
          }
        }
        
        // Remove URL parameters after successful selection to prevent continuous re-selection
        if (imageFound) {
          console.log('🧹 Removing URL parameters after successful image selection');
          console.log('🧹 Current URL before clearing:', window.location.href);
          
          // Use navigate to clear parameters instead of direct URL manipulation
          const currentPath = window.location.pathname;
          console.log('🧹 Navigating to clean path:', currentPath);
          
          // Use replace to avoid adding to history
          navigate(currentPath, { replace: true });
          
          console.log('🧹 URL after clearing:', window.location.href);
        }
      } else {
        console.warn('❌ Invalid imageId in URL:', imageIdParam);
      }
    } else {
      // No URL parameters - handle auto-selection for refine page
      if (inputImages.length > 0) {
        // Always auto-select the last (most recent) input image when there are no URL parameters
        // This ensures fresh selection when navigating from other modules
        const lastInputImage = inputImages[0]; // inputImages are sorted by createdAt desc
        
        // Only auto-select if no image is selected OR if the currently selected image doesn't exist in refine data
        const currentImageExistsInRefineData = selectedImageId && (
          inputImages.some(img => img.id === selectedImageId) || 
          filteredHistoryImages.some(img => img.id === selectedImageId)
        );
        
        // Don't auto-select any image if no URL params - let user choose manually
        if (!selectedImageId || !currentImageExistsInRefineData) {
          console.log('🎯 No auto-selection for refine page when no URL params - let user choose manually:', {
            lastInputImageId: lastInputImage.id,
            reason: !selectedImageId ? 'No image selected' : 'Current image not in refine data',
            currentSelectedImageId: selectedImageId,
            currentImageExistsInRefineData
          });
          // selectImage(lastInputImage.id, 'input');
        } else {
          console.log('🔄 Keeping current selection as it exists in refine data:', {
            selectedImageId,
            currentImageExistsInRefineData
          });
        }
      }
    }
  }, [searchParams, inputImages, filteredHistoryImages, inputImagesLoading, historyImagesLoading, selectedImageId, selectImage, navigate]);

  // Load AI materials when image is selected - simplified
  useEffect(() => {
    if (selectedImageId) {
      const isInputImage = inputImages.some(img => img.id === selectedImageId);
      if (isInputImage) {
        dispatch(getInputImageSavedPrompt(selectedImageId));
      }
    }
  }, [selectedImageId, inputImages, dispatch]);

  // Debug effect to track selectedImageId changes
  useEffect(() => {
    console.log('🔄 Selected image state changed:', {
      selectedImageId,
      selectedImageUrl,
      selectedImageType: refineState.selectedImageType
    });
  }, [selectedImageId, selectedImageUrl, refineState.selectedImageType]);

  
  // Handle image upload - simplified
  const handleImageUpload = async (file: File) => {
    try {
      console.log('📤 Starting image upload...');
      const uploadSource = 'REFINE_MODULE';
      const resultAction = await dispatch(uploadInputImage({ file, uploadSource }));

      if (uploadInputImage.fulfilled.match(resultAction)) {
        const uploadedImage = resultAction.payload;
        console.log('✅ Image uploaded successfully:', uploadedImage);
        
        // Select the uploaded image immediately
        const imageUrl = uploadedImage.originalUrl || uploadedImage.imageUrl;
        if (imageUrl) {
          dispatch(setSelectedImage({
            id: uploadedImage.id,
            type: 'input'
          }));
          console.log('✅ Image selected for display:', { id: uploadedImage.id, imageUrl });
        }
        
        // Refresh the images list
        dispatch(fetchInputImagesBySource({ uploadSource }));
        toast.success('Image uploaded successfully');
      } else {
        const errorMessage = resultAction.payload as string;
        toast.error(errorMessage || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('An unexpected error occurred during upload');
    }
  };

  const handleCloseGallery = () => {
    dispatch(setIsModalOpen(false));
  };

  // Handle submit for refine and upscale operations
  const handleSubmit = async () => {
    if (!selectedImageId) {
      toast.error('No image selected for processing');
      return;
    }

    // Get current image URL dynamically
    const currentImageUrl = getCurrentImageUrl();
    if (!currentImageUrl) {
      toast.error('Image URL not available for processing');
      return;
    }

    // Check credits before action (same as TweakPage)
    if (!checkCreditsBeforeAction(1)) {
      return; // Credit check handles the error display
    }

    // Detect if we're in upscale mode based on the current route
    const isUpscaleMode = location.pathname === '/upscale';

    try {
      // Determine the correct inputImageId based on selected image type (same as CreatePage)
      let targetInputImageId: number;
      if (selectedImageType === 'input') {
        targetInputImageId = selectedImageId;
      } else {
        // For generated images, use the original input image ID
        const generatedImage = filteredHistoryImages.find(img => img.id === selectedImageId);
        if (!generatedImage?.originalInputImageId) {
          toast.error('Cannot find original input image for this generated image');
          return;
        }
        targetInputImageId = generatedImage.originalInputImageId;
      }

      // Get current input image preview URL to save for generated images (same as CreatePage)
      const currentInputImage = inputImages.find(img => img.id === targetInputImageId);
      const inputImagePreviewUrl = currentInputImage?.originalUrl || currentInputImage?.imageUrl || '';

      // Use upscale API for upscale operations with correct parameters
      const upscaleResult = await dispatch(generateUpscale({
        imageId: selectedImageId,
        imageUrl: currentImageUrl,
        scale_factor: settings.scaleFactor, // Use scale factor from RefineEditInspector
        creativity: creativity, // Direct value from Creativity slider
        resemblance: resemblance, // Direct value from Resemblance slider
        prompt: '', // Empty prompt for now
        dynamic: dynamics, // Direct value from Dynamics slider
        tiling_width: tilingWidth, // Direct value from Tiling Width dropdown
        tiling_height: tilingHeight, // Direct value from Tiling Height dropdown
        variations: 1,
        savePrompt: true,
        preserveAIMaterials: true
      })).unwrap();

      const batchId = upscaleResult.batchId;
      const runpodJobs = upscaleResult.images?.map((img: any, index: number) => ({
        imageId: img.id,
        variationNumber: index + 1
      }));

      console.log('✅ Upscale operation started with slider values:', {
        scaleFactor: settings.scaleFactor,
        creativity,
        resemblance,
        dynamics,
        tilingWidth,
        tilingHeight
      });

      // Start generation tracking (same as CreatePage)
      if (batchId && inputImagePreviewUrl) {
        dispatch(startGeneration({
          batchId,
          inputImageId: targetInputImageId,
          inputImagePreviewUrl
        }));
      }

      // Update credits if provided in the response (same as TweakPage)
      if (upscaleResult?.remainingCredits !== undefined) {
        dispatch(updateCredits(upscaleResult.remainingCredits));
      } else {
        // Fallback: refresh user data to get updated credits
        dispatch(fetchCurrentUser());
      }

      // Add processing placeholders to history panel immediately for both modes
      if (batchId) {
        const imageIds = runpodJobs?.map((job: any) => job.imageId || (batchId * 1000 + job.variationNumber)) || [batchId * 1000 + 1];
        
        dispatch(addProcessingRefineVariations({
          batchId,
          totalVariations: 1,
          imageIds,
          operationType: 'unknown', // Both upscale and refine will show as REFINE operations
          originalInputImageId: selectedImageId // Pass the selected input image ID for relationship
        }));
      }

      // Close the prompt modal
      dispatch(setIsPromptModalOpen(false));
      dispatch(setRefineIsPromptModalOpen(false));

    } catch (error: any) {
      console.error(`❌ Failed to start ${isUpscaleMode ? 'upscale' : 'refine'} operation:`, error);
      toast.error(error || `Failed to start upscale operation`);

      // Reset generating state
      dispatch(stopGeneration());
    }
  };

  // Handle prompt modal toggle
  const handleTogglePromptModal = (isOpen: boolean) => {
    dispatch(setIsPromptModalOpen(isOpen));
    dispatch(setRefineIsPromptModalOpen(isOpen));
  };

  // Action button handlers for RefineImageCanvas
  const handleShare = async (imageUrl: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Refined Image',
          url: imageUrl,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(imageUrl);
        toast.success('Image URL copied to clipboard');
      } catch (error) {
        console.log('Error copying to clipboard:', error);
        toast.error('Failed to copy URL to clipboard');
      }
    }
  };

  const handleEdit = async (imageId?: number) => {
    console.log('🔵 EDIT BUTTON CLICKED (REFINE):', { imageId });

    if (imageId) {
      // For refine page, we need to convert the current refine result back to TWEAK module
      // This allows users to further edit the refined result
      try {
        const originalImageUrl = getOriginalImageUrlForConversion();
        if (!originalImageUrl) {
          toast.error('Original image URL not available for conversion');
          return;
        }

        const result = await dispatch(createInputImageFromExisting({
          imageUrl: originalImageUrl,
          thumbnailUrl: originalImageUrl,
          fileName: `edit-from-refine-${imageId}.jpg`,
          originalImageId: imageId,
          uploadSource: 'TWEAK_MODULE'
        }));

        if (createInputImageFromExisting.fulfilled.match(result)) {
          const newInputImage = result.payload;
          console.log('✅ Successfully created new TWEAK input image from refine:', newInputImage);

          toast.success('Image sent to Edit module');
          navigate(`/edit?imageId=${newInputImage.id}&type=input`);
        } else {
          console.error('❌ Failed to create new TWEAK input image:', result);
          throw new Error('Failed to convert refined image for Edit module');
        }
      } catch (error: any) {
        console.error('❌ EDIT button error:', error);
        toast.error('Failed to convert image for Edit module: ' + error.message);
      }
    } else {
      toast.error('No image selected for editing');
    }
  };

  const handleCreate = async (imageId?: number) => {
    console.log('🟢 CREATE BUTTON CLICKED (REFINE):', { imageId });

    if (imageId) {
      // For refine page, we convert the current refine result back to CREATE module
      // This allows users to use the refined result as a starting point for new generations
      try {
        const originalImageUrl = getOriginalImageUrlForConversion();
        if (!originalImageUrl) {
          toast.error('Original image URL not available for conversion');
          return;
        }

        const result = await dispatch(createInputImageFromExisting({
          imageUrl: originalImageUrl,
          thumbnailUrl: originalImageUrl,
          fileName: `create-from-refine-${imageId}.jpg`,
          originalImageId: imageId,
          uploadSource: 'CREATE_MODULE'
        }));

        if (createInputImageFromExisting.fulfilled.match(result)) {
          const newInputImage = result.payload;
          console.log('✅ Successfully created new CREATE input image from refine:', newInputImage);

          // toast.success('Image sent to Create module');
          navigate(`/create?imageId=${newInputImage.id}&type=input`);
        } else {
          console.error('❌ Failed to create new CREATE input image:', result);
          throw new Error('Failed to convert refined image for Create module');
        }
      } catch (error: any) {
        console.error('❌ CREATE button error:', error);
        toast.error('Failed to convert image for Create module: ' + error.message);
      }
    } else {
      toast.error('No image selected for creating');
    }
  };

  // Get current image URL for display - simplified
  const getCurrentImageUrl = () => {
    if (!selectedImageId) return undefined;

    // Use Redux state URL if available
    if (selectedImageUrl) {
      return selectedImageUrl;
    }

    // Check in input images
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      return inputImage.originalUrl || inputImage.imageUrl;
    }

    // Check in history images
    const historyImage = filteredHistoryImages.find(img => img.id === selectedImageId);
    if (historyImage) {
      return historyImage.imageUrl;
    }

    return undefined;
  };

  // Get original S3 URL for cross-module conversion (avoid blob URLs)
  const getOriginalImageUrlForConversion = () => {
    if (!selectedImageId) return undefined;

    // For input images, get original URL directly from database
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      return inputImage.originalUrl || inputImage.imageUrl;
    }

    // For history images, get the processed URL directly from database
    const historyImage = filteredHistoryImages.find(img => img.id === selectedImageId);
    if (historyImage) {
      return historyImage.processedImageUrl || historyImage.imageUrl;
    }

    return undefined;
  };

  // Get preview image URL - use dedicated previewUrl field
  const getPreviewImageUrl = () => {
    if (!selectedImageId) return undefined;

    // Check in input images for dedicated previewUrl field
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage && inputImage.previewUrl) {
      return inputImage.previewUrl;
    }

    // Check in history images for previewUrl
    const historyImage = filteredHistoryImages.find(img => img.id === selectedImageId);
    if (historyImage && historyImage.previewUrl) {
      return historyImage.previewUrl;
    }

    // Fallback to current image URL if no specific preview URL
    return getCurrentImageUrl();
  };

  // Get preview URL for RefineEditInspector - shows base image for generated images
  const getInspectorPreviewUrl = () => {
    if (!selectedImageId) return undefined;

    // For generated images (history images), show the original/base image as preview
    const historyImage = filteredHistoryImages.find(img => img.id === selectedImageId);
    if (historyImage) {
      return getOriginalImageUrl(); // This will return the base image
    }

    // For input images, show the image itself
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      return inputImage.previewUrl || inputImage.imageUrl;
    }

    // Fallback
    return getCurrentImageUrl();
  };

  // Get original image URL for before/after comparison
  const getOriginalImageUrl = () => {
    if (!selectedImageId) return undefined;

    // If current selection is an input image, it IS the original
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      return inputImage.originalUrl || inputImage.imageUrl;
    }

    // For generated images, find the original input image that was used
    const historyImage = filteredHistoryImages.find(img => img.id === selectedImageId);
    if (historyImage && historyImage.originalInputImageId) {
      // Look for the original input image
      const originalInputImage = inputImages.find(img => img.id === historyImage.originalInputImageId);
      if (originalInputImage) {
        return originalInputImage.originalUrl || originalInputImage.imageUrl;
      }
    }

    // Fallback: if no original found, use current image URL
    return getCurrentImageUrl();
  };

  // Get functional input image ID - simplified
  const getFunctionalInputImageId = () => {
    if (!selectedImageId) return undefined;
    
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      return selectedImageId;
    }
    
    const historyImage = filteredHistoryImages.find(img => img.id === selectedImageId);
    if (historyImage) {
      return historyImage.originalInputImageId;
    }
    
    return undefined;
  };

  // SIMPLIFIED EFFECT: Auto-select latest completed generation (same as CreatePage)
  useEffect(() => {
    // Don't auto-select if we have URL parameters (user is navigating with specific intent)
    const hasUrlParams = searchParams.get('imageId') || searchParams.get('fromBatch');
    if (hasUrlParams) {
      return;
    }

    if (filteredHistoryImages.length > 0) {
      const recent = filteredHistoryImages
        .filter(img => img.status === 'COMPLETED')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

      if (recent) {
        const isVeryRecent = Date.now() - recent.createdAt.getTime() < 30000; // 30 seconds
        if (isVeryRecent && selectedImageId !== recent.id) {
          console.log('🎯 Auto-selecting latest completed refine generation:', recent.id);
          selectImage(recent.id, 'generated');
        }
      }
    }
  }, [filteredHistoryImages, selectedImageId, searchParams, selectImage]);

  // Auto-set generating state if there are processing images on page load/reload (REFINE module only)
  useEffect(() => {
    const processingImages = filteredHistoryImages.filter(img => img.status === 'PROCESSING');

    if (processingImages.length > 0) {
      console.log('🔄 Found processing images on page load, setting generating state', {
        processingCount: processingImages.length,
        processingImages: processingImages.map(img => ({ id: img.id, status: img.status }))
      });

      if (!isGenerating) {
        dispatch(setRefineIsGenerating(true));
      }
    }
  }, [filteredHistoryImages, isGenerating, dispatch]);

  // Auto-detect completed operations and update generating state - enhanced like Create page
  useEffect(() => {
    if (!isGenerating) return;

    console.log('🔍 Auto-detection running:', {
      isGenerating,
      filteredHistoryImagesCount: filteredHistoryImages.length,
      processingCount: filteredHistoryImages.filter(img => img.status === 'PROCESSING').length,
      completedCount: filteredHistoryImages.filter(img => img.status === 'COMPLETED').length
    });

    // Check for recently completed operations (within last 30 seconds)
    const recentCompletedOperations = filteredHistoryImages.filter(img => {
      if (img.status !== 'COMPLETED') return false;

      const completedTime = new Date(img.createdAt).getTime();
      const thirtySecondsAgo = Date.now() - 30000;

      return completedTime > thirtySecondsAgo;
    });

    // If we have recent completions and no processing operations, stop generating state
    const processingOperations = filteredHistoryImages.filter(img => img.status === 'PROCESSING');

    if (recentCompletedOperations.length > 0 && processingOperations.length === 0) {
      console.log('🎉 Refine operation completed, stopping generating state', {
        recentCompletions: recentCompletedOperations.length,
        processingCount: processingOperations.length,
        recentImages: recentCompletedOperations.map(img => ({ id: img.id, status: img.status, createdAt: img.createdAt }))
      });

      dispatch(stopGeneration());
    }
  }, [filteredHistoryImages, isGenerating, dispatch]);

  // Fallback polling mechanism when WebSocket fails (same as Create page)
  useEffect(() => {
    if (isGenerating && !isWebSocketConnected) {
      console.log('📡 WebSocket disconnected, using fallback polling for refine operations');

      const timeoutId = setTimeout(() => {
        // Refresh all variations to check for completed items
        dispatch(fetchAllVariations({ page: 1, limit: 100 }));

        console.log('🔄 Fallback: Refreshed variations data during refine generation');
      }, 10000); // Poll every 10 seconds when WebSocket is disconnected

      return () => clearTimeout(timeoutId);
    }
  }, [isGenerating, isWebSocketConnected, dispatch]);

  // Cleanup object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      Object.values(imageObjectUrls).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, []); // Remove imageObjectUrls dependency to prevent premature cleanup

  return (
    <MainLayout>
      <div className="flex-1 flex overflow-hidden relative">
        {hasInputImages ? (
          <>
            <div className={`transition-all flex gap-3 z-100 pl-2 h-full ${editInspectorMinimized ? 'absolute top-0 left-0' : 'relative'}`}>
              <div>
                <InputHistoryPanel
                  images={inputImages}
                  selectedImageId={selectedImageType === 'input' ? selectedImageId : undefined}
                  onSelectImage={(imageId) => handleSelectImage(imageId, 'input')}
                  onUploadImage={handleImageUpload}
                  loading={inputImagesLoading}
                  error={null}
                />
              </div>

              <RefineEditInspector
                imageUrl={getPreviewImageUrl()}
                previewUrl={getInspectorPreviewUrl()}
                inputImageId={getFunctionalInputImageId()}
                processedUrl={getCurrentImageUrl()}
                setIsPromptModalOpen={handleTogglePromptModal}
                editInspectorMinimized={editInspectorMinimized}
                setEditInspectorMinimized={setEditInspectorMinimized}
                loading={historyImagesLoading}
                onShare={handleShare}
                onEdit={handleEdit}
                onCreate={handleCreate}
                imageId={selectedImageId || undefined}
              />
            </div>

            <div className={`flex-1 flex flex-col relative transition-all`}>
              <div className="flex-1 relative">
                {/* Show FileUpload if no image is selected, otherwise show RefineImageCanvas */}
                {!selectedImageId ? (
                  <div className="flex-1 flex items-center justify-center h-full">
                    <FileUpload
                      onUploadImage={handleImageUpload}
                      loading={inputImagesLoading}
                    />
                  </div>
                ) : (
                  <RefineImageCanvas
                    imageUrl={getCurrentImageUrl()}
                    originalImageUrl={getOriginalImageUrl()}
                    loading={false}
                    setIsPromptModalOpen={handleTogglePromptModal}
                    editInspectorMinimized={editInspectorMinimized}
                    viewMode={viewMode}
                    onShare={handleShare}
                    onEdit={handleEdit}
                    onCreate={handleCreate}
                    imageId={selectedImageId || undefined}
                  />
                )}

                {isPromptModalOpen && selectedImageId && (
                  <RefineAIPromptInput
                    handleSubmit={handleSubmit}
                    setIsPromptModalOpen={handleTogglePromptModal}
                    loading={historyImagesLoading}
                    inputImageId={getFunctionalInputImageId()}
                  />
                )}
              </div>

              <HistoryPanel
                images={filteredHistoryImages}
                selectedImageId={selectedImageType === 'generated' ? selectedImageId : undefined}
                onSelectImage={(imageId, sourceType = 'generated') => handleSelectImage(imageId, sourceType)}
                loading={historyImagesLoading}
                showAllImages={true}
                downloadingImageId={downloadingImageId}
                downloadProgress={downloadProgress}
              />
            </div>
          </>
        ) : (
          /* Show file upload section when no images exist */
          <div className="flex-1 flex items-center justify-center">
            <FileUpload
              onUploadImage={handleImageUpload}
              loading={inputImagesLoading}
            />
          </div>
        )}
        
        {/* Gallery Modal */}
        <GalleryModal 
          isOpen={isGalleryModalOpen}
          onClose={handleCloseGallery}
        />
      </div>
    </MainLayout>
  );
};

export default RefinePage;
