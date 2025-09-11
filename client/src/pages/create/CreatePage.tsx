import React, { useEffect, useState, useRef } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useMaskWebSocket } from '@/hooks/useMaskWebSocket';
import { useUserWebSocket } from '@/hooks/useUserWebSocket';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import MainLayout from "@/components/layout/MainLayout";
import EditInspector from '@/components/create/EditInspector';
import ImageCanvas from '@/components/create/ImageCanvas';
import HistoryPanel from '@/components/create/HistoryPanel';
import InputHistoryPanel from '@/components/create/InputHistoryPanel';
import AIPromptInput from '@/components/create/AIPromptInput';
import FileUpload from '@/components/create/FileUpload';
import GalleryModal from '@/components/gallery/GalleryModal';

// Redux actions - SIMPLIFIED
import { uploadInputImage, fetchInputImagesBySource, createTweakInputImageFromExisting } from '@/features/images/inputImagesSlice';
import { generateWithCurrentState, fetchAllVariations } from '@/features/images/historyImagesSlice';
import { setSelectedImage, setIsPromptModalOpen } from '@/features/create/createUISlice';
import { getMasks, restoreMaskMaterialMappings, restoreAIMaterials, restoreSavedPrompt, clearMaskMaterialSelections, clearSavedPrompt, getAIPromptMaterials, getSavedPrompt, saveCurrentAIMaterials, restoreAIMaterialsForImage } from '@/features/masks/maskSlice';
import { setIsModalOpen, setMode } from '@/features/gallery/gallerySlice';

const CreatePageSimplified: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [editInspectorMinimized, setEditInspectorMinimized] = useState(false);
  
  // Track last processed image to avoid duplicate API calls
  const lastProcessedImageRef = useRef<{id: number; type: string} | null>(null);
  // Track if initial data has been loaded to prevent duplicate initial loads
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  
  // Redux selectors
  const inputImages = useAppSelector(state => state.inputImages.images);
  const inputImagesLoading = useAppSelector(state => state.inputImages.loading);
  const inputImagesError = useAppSelector(state => state.inputImages.error);
  
  const historyImages = useAppSelector(state => state.historyImages.images);
  const historyImagesLoading = useAppSelector(state => state.historyImages.loading);
  
  const selectedImageId = useAppSelector(state => state.createUI.selectedImageId);
  const selectedImageType = useAppSelector(state => state.createUI.selectedImageType);
  
  // Show all images including processing ones from all modules (CREATE, TWEAK, REFINE) for cross-module functionality
  const filteredHistoryImages = React.useMemo(() => {
    const filtered = historyImages.filter((image) => 
      image.status === 'COMPLETED' || 
      image.status === 'PROCESSING' || 
      !image.status
    );
    console.log('🔍 CreatePage HistoryPanel filtering:', {
      totalHistoryImages: historyImages.length,
      filteredImages: filtered.length,
      completedImages: historyImages.filter(img => img.status === 'COMPLETED').length,
      processingImages: historyImages.filter(img => img.status === 'PROCESSING').length,
      moduleCounts: {
        CREATE: historyImages.filter(img => img.moduleType === 'CREATE').length,
        TWEAK: historyImages.filter(img => img.moduleType === 'TWEAK').length,
        REFINE: historyImages.filter(img => img.moduleType === 'REFINE').length
      }
    });
    return filtered;
  }, [historyImages]);
  const isPromptModalOpen = useAppSelector(state => state.createUI.isPromptModalOpen);
  const isGalleryModalOpen = useAppSelector(state => state.gallery.isModalOpen);

  const basePrompt = useAppSelector(state => state.masks.savedPrompt);
  const masks = useAppSelector(state => state.masks.masks);
  const maskInputs = useAppSelector(state => state.masks.maskInputs);
  const aiPromptMaterials = useAppSelector(state => state.masks.aiPromptMaterials);
  const { creativity, expressivity, resemblance, variations: selectedVariations } = useAppSelector(state => state.customization);

  // WebSocket connections (deferred until after initial load)
  const effectiveInputImageId = selectedImageType === 'input' ? selectedImageId : undefined;

  // Only enable WebSockets after initial data is loaded to prevent connection churn
  useMaskWebSocket({
    inputImageId: effectiveInputImageId,
    enabled: !!effectiveInputImageId && initialDataLoaded
  });

  // NEW: User-based WebSocket for reliable notifications regardless of selected image
  const { isConnected: isUserConnected } = useUserWebSocket({
    enabled: initialDataLoaded
  });

  console.log('CREATE WebSocket connected - User WebSocket connected:', isUserConnected);
  console.log('CREATE selectedImageId:', selectedImageId, 'selectedImageType:', selectedImageType);
  console.log('🔍 CREATE WebSocket subscribing to user notifications');
  
  // Enhanced WebSocket debug info
  console.log('🔍 CREATE WebSocket Debug Info:', {
    isUserConnected,
    selectedImageId,
    selectedImageType,
    enabled: initialDataLoaded,
    timestamp: new Date().toISOString()
  });

  // SIMPLIFIED EFFECT 1: Load initial data (deduplicated)
  useEffect(() => {
    if (initialDataLoaded) {
      console.log('⏭️ Skipping duplicate initial data load');
      return;
    }

    const loadInitialData = async () => {
      console.log('🚀 Loading initial data for Create page...');
      
      // Load input images and variations in parallel
      const [inputResult, variationsResult] = await Promise.allSettled([
        dispatch(fetchInputImagesBySource({ uploadSource: 'CREATE_MODULE' })),
        dispatch(fetchAllVariations({ page: 1, limit: 100 })) // Standard limit
      ]);
      
      console.log('📊 Data loading results:', {
        inputResult: inputResult.status,
        variationsResult: variationsResult.status,
        inputImages: inputResult.status === 'fulfilled' ? 'loaded' : 'failed',
        historyImages: variationsResult.status === 'fulfilled' ? 'loaded' : 'failed'
      });
      
      // Mark as loaded after API calls complete
      setInitialDataLoaded(true);
      
      if (inputResult.status === 'fulfilled' && fetchInputImagesBySource.fulfilled.match(inputResult.value)) {
        const loadedImages = inputResult.value.payload.inputImages;
        
        // Handle URL parameters
        const imageIdParam = searchParams.get('imageId');
        const imageTypeParam = searchParams.get('type'); // 'input' or 'generated'
        const showMasksParam = searchParams.get('showMasks');
        
        if (imageIdParam) {
          const targetImageId = parseInt(imageIdParam);
          const imageType = imageTypeParam === 'generated' ? 'generated' : 'input'; // Default to 'input' for backward compatibility
          
          console.log('🎯 Create page URL params:', { imageId: targetImageId, type: imageType });
          
          if (imageType === 'input') {
            // Handle input image selection (existing logic)
            const targetImage = loadedImages.find((img: any) => img.id === targetImageId);
            
            if (targetImage) {
              dispatch(setSelectedImage({ id: targetImageId, type: 'input' }));
              if (showMasksParam === 'true') {
                setTimeout(() => dispatch(setIsPromptModalOpen(true)), 1000);
              }
            }
          } else if (imageType === 'generated') {
            // Handle generated image selection
            console.log('🖼️ Selecting generated image:', targetImageId);
            dispatch(setSelectedImage({ id: targetImageId, type: 'generated' }));
            // Note: Generated images don't support masks, so ignore showMasks param
          }
        } else if (loadedImages.length > 0) {
          // Select most recent input image
          dispatch(setSelectedImage({ id: loadedImages[0].id, type: 'input' }));
        }
      }
    };
    
    loadInitialData();
  }, [dispatch, initialDataLoaded]); // Remove searchParams from here since we'll handle it separately

  // EFFECT: Handle URL parameter changes (for navigation from gallery)
  useEffect(() => {
    // Only handle URL params after initial data is loaded
    if (!initialDataLoaded) return;

    const imageIdParam = searchParams.get('imageId');
    const imageTypeParam = searchParams.get('type'); // 'input' or 'generated'
    const showMasksParam = searchParams.get('showMasks');

    if (imageIdParam) {
      const targetImageId = parseInt(imageIdParam);
      const imageType = imageTypeParam === 'generated' ? 'generated' : 'input'; // Default to 'input' for backward compatibility
      
      console.log('🔄 URL params changed, selecting image:', { imageId: targetImageId, type: imageType });
      
      if (imageType === 'input') {
        // Handle input image selection
        const targetImage = inputImages.find((img: any) => img.id === targetImageId);
        
        if (targetImage) {
          console.log('✅ Found input image, selecting:', targetImage.id);
          dispatch(setSelectedImage({ id: targetImageId, type: 'input' }));
          if (showMasksParam === 'true') {
            setTimeout(() => dispatch(setIsPromptModalOpen(true)), 1000);
          }
        } else {
          console.log('❌ Input image not found:', targetImageId);
        }
      } else if (imageType === 'generated') {
        // Handle generated image selection
        const targetImage = historyImages.find((img: any) => img.id === targetImageId);
        
        if (targetImage) {
          console.log('✅ Found generated image, selecting:', {
            id: targetImage.id,
            imageUrl: targetImage.imageUrl,
            processedImageUrl: targetImage.processedImageUrl,
            createdAt: targetImage.createdAt,
            module: targetImage.moduleType
          });
          dispatch(setSelectedImage({ id: targetImageId, type: 'generated' }));
          // Note: Generated images don't support masks, so ignore showMasks param
        } else {
          console.log('❌ Generated image not found:', targetImageId, 'in', historyImages.length, 'history images');
          // Log available history images for debugging
          if (historyImages.length > 0) {
            console.log('📋 Available history image IDs:', historyImages.map(img => img.id));
            console.log('📋 First few history images:', historyImages.slice(0, 3));
          } else {
            console.log('📋 No history images loaded yet, this might be a timing issue');
          }
        }
      }
    }
  }, [searchParams, initialDataLoaded, inputImages, historyImages, dispatch]);

  // EFFECT: Retry URL parameter selection if image wasn't found initially but becomes available
  useEffect(() => {
    const imageIdParam = searchParams.get('imageId');
    const imageTypeParam = searchParams.get('type');
    
    // Only retry if we have URL params but no selected image
    if (imageIdParam && !selectedImageId) {
      const targetImageId = parseInt(imageIdParam);
      
      if (imageTypeParam === 'generated' && historyImages.length > 0) {
        const targetImage = historyImages.find((img: any) => img.id === targetImageId);
        
        if (targetImage) {
          console.log('🔄 Retry: Found generated image on subsequent load:', targetImage.id);
          dispatch(setSelectedImage({ id: targetImageId, type: 'generated' }));
        }
      } else if (imageTypeParam === 'input' && inputImages.length > 0) {
        const targetImage = inputImages.find((img: any) => img.id === targetImageId);
        
        if (targetImage) {
          console.log('🔄 Retry: Found input image on subsequent load:', targetImage.id);
          dispatch(setSelectedImage({ id: targetImageId, type: 'input' }));
        } else {
          // If image still not found, it might be newly created - refresh input images
          console.log('🔄 Input image not found, may be newly created. Refreshing input images...');
          dispatch(fetchInputImagesBySource({ uploadSource: 'CREATE_MODULE' })).then(() => {
            // Try once more after refresh
            const refreshedTargetImage = inputImages.find((img: any) => img.id === targetImageId);
            if (refreshedTargetImage) {
              console.log('✅ Found input image after refresh:', refreshedTargetImage.id);
              dispatch(setSelectedImage({ id: targetImageId, type: 'input' }));
            }
          });
        }
      }
    }
  }, [historyImages, inputImages, searchParams, selectedImageId, dispatch]);

  // SIMPLIFIED EFFECT 2: Load data when image selected with proper isolation (deduplicated)
  useEffect(() => {
    if (selectedImageId && selectedImageType) {
      // Check if we already processed this exact image to avoid duplicate API calls
      const currentImageKey = `${selectedImageId}-${selectedImageType}`;
      const lastProcessedKey = lastProcessedImageRef.current ? 
        `${lastProcessedImageRef.current.id}-${lastProcessedImageRef.current.type}` : null;
        
      if (currentImageKey === lastProcessedKey) {
        console.log('⏭️ Skipping duplicate processing for:', currentImageKey);
        return;
      }
      
      // Save current AI materials before switching images
      if (lastProcessedImageRef.current) {
        dispatch(saveCurrentAIMaterials({
          imageId: lastProcessedImageRef.current.id,
          imageType: lastProcessedImageRef.current.type as 'input' | 'generated'
        }));
      }
      
      // Update ref to track this processing
      lastProcessedImageRef.current = { id: selectedImageId, type: selectedImageType };
      
      if (selectedImageType === 'input') {
        console.log('🔄 Loading data for INPUT image:', selectedImageId);
        
        // Clear any previous generated image data and restore saved materials for this input image
        dispatch(clearMaskMaterialSelections());
        dispatch(restoreAIMaterialsForImage({ imageId: selectedImageId, imageType: 'input' })); 
        dispatch(clearSavedPrompt());
        
        // Load base masks from the input image
        dispatch(getMasks(selectedImageId));
        
        // Only load from database if no saved materials found in local cache
        // This will be handled by the restoreAIMaterialsForImage action
        dispatch(getAIPromptMaterials(selectedImageId));
        dispatch(getSavedPrompt(selectedImageId));
      } else if (selectedImageType === 'generated') {
        console.log('🔄 Loading data for GENERATED image:', selectedImageId);
        
        // For generated images, first try to restore saved materials for this specific image
        dispatch(restoreAIMaterialsForImage({ imageId: selectedImageId, imageType: 'generated' }));
        
        // For generated images, we need to load base masks from the ORIGINAL input image
        const generatedImage = historyImages.find(img => img.id === selectedImageId);
        if (generatedImage && generatedImage.originalInputImageId) {
          console.log('🔄 Loading base masks from original InputImage:', generatedImage.originalInputImageId);
          console.log('🎯 Generated image has specific data:', {
            aiPrompt: generatedImage.aiPrompt,
            aiMaterials: generatedImage.aiMaterials?.length || 0,
            maskMappings: Object.keys(generatedImage.maskMaterialMappings || {}).length
          });
          
          // Load base masks from the original input image ONLY once
          // Store the generated image data to restore AFTER masks load ONLY if no saved materials found
          const dataToRestore = {
            maskMaterialMappings: generatedImage.maskMaterialMappings,
            aiMaterials: generatedImage.aiMaterials,
            aiPrompt: generatedImage.aiPrompt
          };
          
          dispatch(getMasks(generatedImage.originalInputImageId)).then(() => {
            // Restore the specific data from this generated image AFTER masks are loaded
            if (dataToRestore.maskMaterialMappings && Object.keys(dataToRestore.maskMaterialMappings).length > 0) {
              console.log('🎭 Restoring mask mappings from generated image (after masks loaded)');
              dispatch(restoreMaskMaterialMappings(dataToRestore.maskMaterialMappings));
            } else {
              console.log('🧹 Clearing previous mask mappings');
              dispatch(clearMaskMaterialSelections());
            }
            
            // Only restore AI materials from generated image if no saved materials exist for this image
            // The restoreAIMaterialsForImage above will have set materials if they were saved
            if (dataToRestore.aiMaterials && dataToRestore.aiMaterials.length > 0) {
              console.log('🎨 Setting AI materials from generated image (fallback)');
              dispatch(restoreAIMaterials(dataToRestore.aiMaterials));
            }
            
            if (dataToRestore.aiPrompt) {
              console.log('📝 Restoring AI prompt from generated image:', dataToRestore.aiPrompt);
              dispatch(restoreSavedPrompt(dataToRestore.aiPrompt));
            } else {
              console.log('🧹 Clearing previous AI prompt');
              dispatch(clearSavedPrompt());
            }
          });
        } else {
          console.warn('⚠️ Generated image missing originalInputImageId:', generatedImage);
        }
      }
    }
  }, [selectedImageId, selectedImageType, historyImages, dispatch]);

  // SIMPLIFIED EFFECT 3: Auto-select latest completed generation (only if no URL params)
  useEffect(() => {
    // Don't auto-select if we have URL parameters (user is navigating with specific intent)
    const hasUrlParams = searchParams.get('imageId') || searchParams.get('fromBatch');
    if (hasUrlParams) {
      console.log('⏭️ Skipping auto-selection due to URL parameters');
      return;
    }

    if (filteredHistoryImages.length > 0) {
      const recent = filteredHistoryImages
        .filter(img => img.status === 'COMPLETED')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      
      if (recent) {
        const isVeryRecent = Date.now() - recent.createdAt.getTime() < 30000; // 30 seconds
        if (isVeryRecent && selectedImageId !== recent.id) {
          console.log('🔄 Auto-selecting recent completion:', recent.id);
          dispatch(setSelectedImage({ id: recent.id, type: 'generated' }));
        }
      }
    }
  }, [filteredHistoryImages, selectedImageId, searchParams, dispatch]);

  // Event handlers
  const handleImageUpload = async (file: File) => {
    try {
      const result = await dispatch(uploadInputImage({ file, uploadSource: 'CREATE_MODULE' }));
      if (uploadInputImage.fulfilled.match(result)) {
        dispatch(setSelectedImage({ id: result.payload.id, type: 'input' }));
        toast.success('Image uploaded successfully');
      } else if (uploadInputImage.rejected.match(result)) {
        toast.error(result.payload as string || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('An unexpected error occurred during upload');
    }
  };

  const handleSubmit = async (userPrompt?: string, contextSelection?: string) => {
    console.log('🚀 Starting generation with simplified flow');
    
    if (!selectedImageId || !selectedImageType) {
      toast.error('Please select an image first');
      return;
    }

    // Determine the correct inputImageId based on selected image type
    let targetInputImageId: number;
    if (selectedImageType === 'input') {
      targetInputImageId = selectedImageId;
    } else {
      // For generated images, use the original input image ID
      const generatedImage = historyImages.find(img => img.id === selectedImageId);
      if (!generatedImage?.originalInputImageId) {
        toast.error('Cannot find original input image for this generated image');
        return;
      }
      targetInputImageId = generatedImage.originalInputImageId;
    }

    console.log('🎯 Target input image for generation:', targetInputImageId);

    try {
      const finalPrompt = userPrompt || basePrompt || 'CREATE AN ARCHITECTURAL VISUALIZATION';
      
      // Collect mask prompts
      const maskPrompts: Record<string, string> = {};
      masks.forEach(mask => {
        const userInput = maskInputs[mask.id]?.displayName?.trim();
        if (userInput || mask.customText) {
          maskPrompts[`mask_${mask.id}`] = userInput || mask.customText || '';
        }
      });

      // Collect mask material mappings from current frontend state
      const maskMaterialMappings: Record<string, any> = {};
      masks.forEach(mask => {
        const userInput = maskInputs[mask.id]?.displayName?.trim();
        if (userInput || mask.customText || mask.materialOption || mask.customizationOption) {
          maskMaterialMappings[`mask_${mask.id}`] = {
            customText: userInput || mask.customText || '',
            materialOptionId: mask.materialOption?.id,
            customizationOptionId: mask.customizationOption?.id,
            subCategoryId: mask.subCategory?.id,
            imageUrl: maskInputs[mask.id]?.imageUrl || null,
            category: maskInputs[mask.id]?.category || ''
          };
        }
      });

      console.log('🎭 Mask material mappings for generation:', maskMaterialMappings);

      // Generate request
      const generateRequest = {
        prompt: finalPrompt,
        inputImageId: targetInputImageId,
        variations: selectedVariations,
        settings: {
          seed: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
          model: "realvisxlLightning.safetensors",
          upscale: "Yes" as const,
          style: "No" as const,
          cfgKsampler1: creativity,
          cannyStrength: resemblance / 10,
          loraStrength: [1, expressivity / 10],
          mode: 'photorealistic',
          creativity,
          expressivity,
          resemblance,
          context: contextSelection
        },
        maskPrompts,
        maskMaterialMappings,
        aiPromptMaterials,
        contextSelection,
        sliderSettings: { creativity, expressivity, resemblance }
      };

      const result = await dispatch(generateWithCurrentState(generateRequest));
      
      if (generateWithCurrentState.fulfilled.match(result)) {
        console.log('✅ Generation started successfully');
        dispatch(setIsPromptModalOpen(false));
        
        // Get variation count from result for more specific message
        // const variationCount = result.payload.runpodJobs?.length || 1;
        // const message = variationCount > 1 
        //   ? `Generation started! Creating ${variationCount} variations. Check the history panel for progress.`
        //   : 'Generation started! Check the history panel for progress.';
        
        // toast.success(message);
      } else {
        console.error('❌ Generation failed:', result.payload);
        const errorPayload = result.payload as any;
        toast.error(errorPayload?.message || 'Generation failed');
      }
    } catch (error) {
      console.error('Error starting generation:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const handleSelectImage = (imageId: number, sourceType: 'input' | 'generated') => {
    console.log('🖼️ Selecting image:', { imageId, sourceType });
    dispatch(setSelectedImage({ id: imageId, type: sourceType }));
  };

  // const handleTogglePromptModal = (isOpen: boolean) => {
  //   dispatch(setIsPromptModalOpen(isOpen));
  // };

  // const handleOpenGallery = () => dispatch(setIsModalOpen(true));
  // const handleCloseGallery = () => dispatch(setIsModalOpen(false));

  // Helper functions to get the correct data based on image type with proper isolation
  const getCurrentImageData = () => {
    if (!selectedImageId || !selectedImageType) return null;
    
    if (selectedImageType === 'input') {
      const inputImage = inputImages.find(img => img.id === selectedImageId);
      return {
        aiPrompt: basePrompt || inputImage?.aiPrompt || '',
        // Give priority to Redux state (user changes) over database data
        aiMaterials: aiPromptMaterials || inputImage?.aiMaterials || [],
        maskMaterialMappings: {} // Input images don't have specific mappings yet
      };
    } else {
      const generatedImage = historyImages.find(img => img.id === selectedImageId);
      return {
        // For generated images, prioritize Redux state (restored data) over static data
        aiPrompt: basePrompt || generatedImage?.aiPrompt || '',
        // Give priority to Redux state (user changes) over static generated image data
        aiMaterials: aiPromptMaterials || generatedImage?.aiMaterials || [],
        maskMaterialMappings: generatedImage?.maskMaterialMappings || {}
      };
    }
  };

  // Helper to get functional input image ID (used for EditInspector, etc.)
  const getFunctionalInputImageId = () => {
    if (!selectedImageId || !selectedImageType) return undefined;
    
    if (selectedImageType === 'input') {
      return selectedImageId;
    } else if (selectedImageType === 'generated') {
      const generatedImage = historyImages.find(img => img.id === selectedImageId);
      return generatedImage?.originalInputImageId;
    }
    return undefined;
  };

  // Helper to get the base/original input image URL (always shows the source image)
  const getBaseImageUrl = () => {
    if (!selectedImageId || !selectedImageType) {
      console.log('🚫 getBaseImageUrl: No selected image', { selectedImageId, selectedImageType });
      return undefined;
    }
    
    console.log('🔍 getBaseImageUrl called with:', { selectedImageId, selectedImageType });
    
    if (selectedImageType === 'input') {
      const inputImage = inputImages.find(img => img.id === selectedImageId);
      console.log('🔍 Base input image found:', inputImage ? { id: inputImage.id, originalUrl: inputImage.originalUrl } : 'NOT FOUND');
      return inputImage?.originalUrl || inputImage?.processedUrl || inputImage?.imageUrl;
    } else if (selectedImageType === 'generated') {
      // For generated images, find the original input image
      const generatedImage = historyImages.find(img => img.id === selectedImageId);
      if (generatedImage?.originalInputImageId) {
        const originalInputImage = inputImages.find(img => img.id === generatedImage.originalInputImageId);
        console.log('🔍 Base image from generated image:', originalInputImage ? { id: originalInputImage.id, originalUrl: originalInputImage.originalUrl } : 'NOT FOUND');
        return originalInputImage?.originalUrl || originalInputImage?.processedUrl || originalInputImage?.imageUrl;
      }
    }
    
    console.log('🚫 getBaseImageUrl: Could not determine base image URL');
    return undefined;
  };

  const getCurrentImageUrl = () => {
    if (!selectedImageId || !selectedImageType) {
      console.log('🚫 getCurrentImageUrl: No selected image', { selectedImageId, selectedImageType });
      return undefined;
    }
    
    console.log('🔍 getCurrentImageUrl called with:', { selectedImageId, selectedImageType });
    
    if (selectedImageType === 'input') {
      const inputImage = inputImages.find(img => img.id === selectedImageId);
      console.log('🔍 Input image found:', inputImage ? { id: inputImage.id, urls: { originalUrl: inputImage.originalUrl, processedUrl: inputImage.processedUrl, imageUrl: inputImage.imageUrl } } : 'NOT FOUND');
      return inputImage?.originalUrl || inputImage?.processedUrl || inputImage?.imageUrl;
    } else {
      const historyImage = historyImages.find(img => img.id === selectedImageId);
      console.log('🔍 History image found:', historyImage ? { 
        id: historyImage.id, 
        imageUrl: historyImage.imageUrl,
        processedImageUrl: historyImage.processedImageUrl,
        thumbnailUrl: historyImage.thumbnailUrl,
        module: historyImage.moduleType || 'unknown'
      } : 'NOT FOUND');
      console.log('🔍 Available history images:', historyImages.length, 'total images');
      return historyImage?.imageUrl || historyImage?.processedImageUrl;
    }
  };

  // Debug selected image state
  React.useEffect(() => {
    console.log('🎯 Selected image state changed:', { 
      selectedImageId, 
      selectedImageType,
      currentImageUrl: getCurrentImageUrl()
    });
  }, [selectedImageId, selectedImageType]);

  const hasInputImages = inputImages && inputImages.length > 0;

  // Handler functions for ImageCanvas actions
  const handleShare = async (imageUrl: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Generated Image',
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
    if (imageId) {
      console.log('🎯 HandleEdit called for imageId:', imageId);
      
      // Determine if it's an input or generated image
      const isInputImage = inputImages.some(img => img.id === imageId);
      const isHistoryImage = historyImages.some(img => img.id === imageId);
      
      if (isInputImage) {
        // For input images (user uploaded), create a new TWEAK input image and redirect
        const inputImage = inputImages.find(img => img.id === imageId);
        if (inputImage) {
          try {
            console.log('📋 Creating TWEAK input image from existing input image:', inputImage);
            const result = await dispatch(createTweakInputImageFromExisting({
              imageUrl: inputImage.imageUrl,
              thumbnailUrl: inputImage.thumbnailUrl,
              fileName: inputImage.fileName || 'tweaked-image.jpg',
              originalImageId: inputImage.id
            }));
            
            if (createTweakInputImageFromExisting.fulfilled.match(result)) {
              console.log('✅ TWEAK input image created, redirecting to edit page');
              navigate(`/edit?imageId=${result.payload.id}&type=tweak_uploaded`);
            } else {
              toast.error('Failed to prepare image for editing');
            }
          } catch (error) {
            console.error('❌ Error creating TWEAK input image:', error);
            toast.error('Failed to prepare image for editing');
          }
        }
      } else if (isHistoryImage) {
        // For history images (CREATE generated), redirect directly
        console.log('🎯 Redirecting CREATE generated image to edit page');
        navigate(`/edit?imageId=${imageId}&type=generated`);
      } else {
        toast.error('Image not found');
      }
      
      // Close gallery modal if open
      dispatch(setIsModalOpen(false));
    } else {
      toast.error('No image selected for editing');
    }
  };

  const handleUpscale = (imageId?: number) => {
    if (imageId) {
      // Determine if it's an input or generated image
      const isInputImage = inputImages.some(img => img.id === imageId);
      const isHistoryImage = historyImages.some(img => img.id === imageId);
      
      if (isInputImage) {
        navigate(`/upscale?imageId=${imageId}&type=input`);
      } else if (isHistoryImage) {
        navigate(`/upscale?imageId=${imageId}&type=generated`);
      } else {
        toast.error('Image not found');
      }
      
      // Close gallery modal if open
      dispatch(setIsModalOpen(false));
    } else {
      toast.error('No image selected for upscaling');
    }
  };

  const handleOpenGallery = () => {
    dispatch(setMode('create'));
    dispatch(setIsModalOpen(true));
  };

  const handleCloseGallery = () => {
    dispatch(setIsModalOpen(false));
  };

  const handleTogglePromptModal = (isOpen: boolean) => {
    dispatch(setIsPromptModalOpen(isOpen));
  };

  // const handleSelectImage = (imageId: number, imageType: 'input' | 'history') => {
  //   console.log(`🖼️ Selecting ${imageType} image:`, imageId);
  //   dispatch(setSelectedImage({ imageId, imageType }));
  // };

  // const handleImageUpload = async (file: File) => {
  //   console.log('📤 Uploading image:', file.name);
  //   try {
  //     const result = await dispatch(uploadInputImage({ file, source: 'user_upload' }));
  //     if (uploadInputImage.fulfilled.match(result)) {
  //       // Auto-select the uploaded image
  //       handleSelectImage(result.payload.id, 'input');
  //       toast.success('Image uploaded successfully');
  //     }
  //   } catch (error) {
  //     console.error('Upload error:', error);
  //     toast.error('Failed to upload image');
  //   }
  // };

  // const getFunctionalInputImageId = () => {
  //   if (selectedImageType === 'input' && selectedImageId) {
  //     return selectedImageId;
  //   } else if (selectedImageType === 'history' && selectedImageId) {
  //     // Get the original input image ID from the selected history image
  //     const historyImage = historyImages.find(img => img.id === selectedImageId);
  //     return historyImage?.originalInputImageId;
  //   }
  //   return undefined;
  // };

  // const handleSubmit = async (userPrompt: string, selectedVariations: number = 1) => {
  //   // This function content would need to be implemented based on the generation logic
  //   // For now, adding a placeholder
  //   console.log('🚀 Generation request:', { userPrompt, selectedVariations });
  //   toast.success('Generation started');
  // };

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
                  error={inputImagesError}
                />
              </div>
            
              <EditInspector 
                imageUrl={getBaseImageUrl()} 
                processedUrl={getCurrentImageUrl()}
                inputImageId={getFunctionalInputImageId()}
                setIsPromptModalOpen={handleTogglePromptModal}
                editInspectorMinimized={editInspectorMinimized}
                setEditInspectorMinimized={setEditInspectorMinimized}
              />
            </div>

            <div className="flex-1 flex flex-col relative">
              <div className="flex-1 relative">
                <ImageCanvas 
                  imageUrl={getCurrentImageUrl()} 
                  loading={historyImagesLoading}
                  setIsPromptModalOpen={handleTogglePromptModal}
                  editInspectorMinimized={editInspectorMinimized}
                  onDownload={() => console.log('Download:', selectedImageId)}
                  onOpenGallery={handleOpenGallery}
                  onShare={handleShare}
                  onEdit={handleEdit}
                  onUpscale={handleUpscale}
                  imageId={selectedImageId}
                />  

                {isPromptModalOpen && (
                  <AIPromptInput 
                    editInspectorMinimized={editInspectorMinimized}
                    handleSubmit={handleSubmit}
                    setIsPromptModalOpen={handleTogglePromptModal}
                    loading={historyImagesLoading}
                    inputImageId={getFunctionalInputImageId()}
                    // Pass isolated data based on selected image type
                    currentPrompt={getCurrentImageData()?.aiPrompt}
                    currentAIMaterials={getCurrentImageData()?.aiMaterials}
                  />
                )}
              </div>

              <HistoryPanel 
                images={filteredHistoryImages}
                selectedImageId={selectedImageType === 'generated' ? selectedImageId : undefined}
                onSelectImage={(imageId) => handleSelectImage(imageId, 'generated')}
                loading={historyImagesLoading}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <FileUpload 
              onUploadImage={handleImageUpload}
              loading={inputImagesLoading}
            />
          </div>
        )}
        
        <GalleryModal 
          isOpen={isGalleryModalOpen}
          onClose={handleCloseGallery}
        />
      </div>
    </MainLayout>
  );
};

export default CreatePageSimplified;