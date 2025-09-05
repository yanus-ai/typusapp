import React, { useEffect, useState, useRef } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useRunPodWebSocketSimplified } from '@/hooks/useRunPodWebSocketSimplified';
import { useMaskWebSocket } from '@/hooks/useMaskWebSocket';
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
import { uploadInputImage, fetchInputImagesBySource } from '@/features/images/inputImagesSlice';
import { generateWithCurrentState, fetchAllVariations } from '@/features/images/historyImagesSlice';
import { setSelectedImage, setIsPromptModalOpen } from '@/features/create/createUISlice';
import { getMasks, restoreMaskMaterialMappings, restoreAIMaterials, restoreSavedPrompt, clearMaskMaterialSelections, clearAIMaterials, clearSavedPrompt, getAIPromptMaterials, getSavedPrompt } from '@/features/masks/maskSlice';
import { setIsModalOpen } from '@/features/gallery/gallerySlice';

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
  const isPromptModalOpen = useAppSelector(state => state.createUI.isPromptModalOpen);
  const isGalleryModalOpen = useAppSelector(state => state.gallery.isModalOpen);

  const basePrompt = useAppSelector(state => state.masks.savedPrompt);
  const masks = useAppSelector(state => state.masks.masks);
  const maskInputs = useAppSelector(state => state.masks.maskInputs);
  const aiPromptMaterials = useAppSelector(state => state.masks.aiPromptMaterials);
  const { creativity, expressivity, resemblance, variations: selectedVariations } = useAppSelector(state => state.customization);

  // Simplified WebSocket connections (deferred until after initial load)
  const effectiveInputImageId = selectedImageType === 'input' ? selectedImageId : undefined;
  
  // Only enable WebSockets after initial data is loaded to prevent connection churn
  useRunPodWebSocketSimplified({ enabled: initialDataLoaded });

  useMaskWebSocket({
    inputImageId: effectiveInputImageId,
    enabled: !!effectiveInputImageId && initialDataLoaded
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
      const [inputResult] = await Promise.allSettled([
        dispatch(fetchInputImagesBySource({ uploadSource: 'CREATE_MODULE' })),
        dispatch(fetchAllVariations({ limit: 50 }))
      ]);
      
      // Mark as loaded after API calls complete
      setInitialDataLoaded(true);
      
      if (inputResult.status === 'fulfilled' && fetchInputImagesBySource.fulfilled.match(inputResult.value)) {
        const loadedImages = inputResult.value.payload.inputImages;
        
        // Handle URL parameters
        const imageIdParam = searchParams.get('imageId');
        const showMasksParam = searchParams.get('showMasks');
        
        if (imageIdParam) {
          const targetImageId = parseInt(imageIdParam);
          const targetImage = loadedImages.find((img: any) => img.id === targetImageId);
          
          if (targetImage) {
            dispatch(setSelectedImage({ id: targetImageId, type: 'input' }));
            if (showMasksParam === 'true') {
              setTimeout(() => dispatch(setIsPromptModalOpen(true)), 1000);
            }
          }
        } else if (loadedImages.length > 0) {
          // Select most recent input image
          dispatch(setSelectedImage({ id: loadedImages[0].id, type: 'input' }));
        }
      }
    };
    
    loadInitialData();
  }, [dispatch, searchParams, initialDataLoaded]);

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
      
      // Update ref to track this processing
      lastProcessedImageRef.current = { id: selectedImageId, type: selectedImageType };
      
      if (selectedImageType === 'input') {
        console.log('🔄 Loading data for INPUT image:', selectedImageId);
        
        // Clear any previous generated image data
        dispatch(clearMaskMaterialSelections());
        dispatch(clearAIMaterials()); 
        dispatch(clearSavedPrompt());
        
        // Load base masks from the input image
        dispatch(getMasks(selectedImageId));
        
        // Load input image's stored AI materials and prompt from database
        dispatch(getAIPromptMaterials(selectedImageId));
        dispatch(getSavedPrompt(selectedImageId));
      } else if (selectedImageType === 'generated') {
        console.log('🔄 Loading data for GENERATED image:', selectedImageId);
        
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
          // Store the generated image data to restore AFTER masks load
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
            
            if (dataToRestore.aiMaterials && dataToRestore.aiMaterials.length > 0) {
              console.log('🎨 Restoring AI materials from generated image');
              dispatch(restoreAIMaterials(dataToRestore.aiMaterials));
            } else {
              console.log('🧹 Clearing previous AI materials');
              dispatch(clearAIMaterials());
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

  // SIMPLIFIED EFFECT 3: Auto-select latest completed generation
  useEffect(() => {
    if (historyImages.length > 0) {
      const recent = historyImages
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
  }, [historyImages, selectedImageId, dispatch]);

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
        const variationCount = result.payload.runpodJobs?.length || 1;
        const message = variationCount > 1 
          ? `Generation started! Creating ${variationCount} variations. Check the history panel for progress.`
          : 'Generation started! Check the history panel for progress.';
        
        toast.success(message);
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

  const getCurrentImageUrl = () => {
    if (!selectedImageId || !selectedImageType) return undefined;
    
    if (selectedImageType === 'input') {
      const inputImage = inputImages.find(img => img.id === selectedImageId);
      return inputImage?.originalUrl || inputImage?.processedUrl || inputImage?.imageUrl;
    } else {
      const historyImage = historyImages.find(img => img.id === selectedImageId);
      return historyImage?.imageUrl;
    }
  };

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

  const handleEdit = (imageId?: number) => {
    if (imageId) {
      // Determine if it's an input or generated image
      const isInputImage = inputImages.some(img => img.id === imageId);
      const isHistoryImage = historyImages.some(img => img.id === imageId);
      
      if (isInputImage) {
        navigate(`/edit?imageId=${imageId}&type=input`);
      } else if (isHistoryImage) {
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
        navigate(`/refine?imageId=${imageId}&type=input`);
      } else if (isHistoryImage) {
        navigate(`/refine?imageId=${imageId}&type=generated`);
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
                imageUrl={getCurrentImageUrl()} 
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
                images={historyImages}
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