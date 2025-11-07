import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCreditCheck } from '@/hooks/useCreditCheck';
import toast from 'react-hot-toast';
import axios from 'axios';
import api from '@/lib/api';
import MainLayout from "@/components/layout/MainLayout";
import ImageCanvas from '@/components/create/ImageCanvas';
import HistoryPanel from '@/components/create/HistoryPanel';
import InputHistoryPanel from '@/components/create/InputHistoryPanel';
import { PromptInputContainer } from "@/components/creation-prompt";

// Redux actions - SIMPLIFIED
import { uploadInputImage, fetchInputImagesBySource, createInputImageFromExisting } from '@/features/images/inputImagesSlice';
// delete functionality removed; history panels no longer expose delete controls
import { generateWithCurrentState, fetchAllVariations, addProcessingCreateVariations, fetchInputAndCreateImages } from '@/features/images/historyImagesSlice';
import { setSelectedImage, setIsPromptModalOpen, startGeneration, stopGeneration } from '@/features/create/createUISlice';
import { getMasks, restoreMaskMaterialMappings, restoreAIMaterials, restoreSavedPrompt, clearMaskMaterialSelections, clearSavedPrompt, getAIPromptMaterials, getSavedPrompt, getInputImageSavedPrompt, getGeneratedImageSavedPrompt, saveCurrentAIMaterials, restoreAIMaterialsForImage } from '@/features/masks/maskSlice';
import { setIsModalOpen, setMode } from '@/features/gallery/gallerySlice';
import { initializeCreateSettings } from '@/features/customization/customizationSlice';
import OnboardingPopup from '@/components/onboarding/OnboardingPopup';
// Use the same Flux/Nano Banana flow as Edit-by-Text when requested
import { runFluxKonect } from '@/features/tweak/tweakSlice';

const CreatePageSimplified: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkCreditsBeforeAction } = useCreditCheck();
  
  // Track last processed image to avoid duplicate API calls
  const lastProcessedImageRef = useRef<{id: number; type: string} | null>(null);
  // Track if initial data has been loaded to prevent duplicate initial loads
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // Download progress state (same as RefinePage)
  const [downloadingImageId, setDownloadingImageId] = useState<number | undefined>(undefined);

  // Note: delete functionality removed from UI
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  // Model selection for Create page (default to Nano Banana)
  // Use global tweak.selectedModel so toolbar and websockets stay in sync
  const selectedModel = useAppSelector(state => state.tweak.selectedModel);
  const [imageObjectUrls, setImageObjectUrls] = useState<Record<number, string>>({});
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [forceShowOnboarding, setForceShowOnboarding] = useState<boolean>(false);

  // Check if welcome dialog should be shown and set currentStep accordingly
  useEffect(() => {
    // Default to showing the Create modal (prompt + tiles) when entering Create page
    dispatch(setIsPromptModalOpen(true));
  }, [dispatch]);
  React.useEffect(() => {
    const showWelcome = localStorage.getItem('showWelcome');
    const welcomeSeen = localStorage.getItem('welcomeSeen');
    const onboardingSeen = localStorage.getItem('onboardingSeen');

    // If welcome dialog should show (new user), keep currentStep at -1
    if (showWelcome === 'true' && !welcomeSeen && !onboardingSeen) {
      setCurrentStep(-1);
    } else if (showWelcome === 'false') {
      // If welcome dialog is disabled, use currentStep 0 for normal app experience
      setCurrentStep(0);
    } else if (onboardingSeen) {
      // If user has completed onboarding, keep at neutral state
      setCurrentStep(-1);
    }
  }, []);
  
  // Redux selectors
  const inputImages = useAppSelector(state => state.inputImages.images);
  const inputImagesLoading = useAppSelector(state => state.inputImages.loading);
  const inputImagesError = useAppSelector(state => state.inputImages.error);
  
  const historyImages = useAppSelector(state => state.historyImages.images);
  const historyImagesLoading = useAppSelector(state => state.historyImages.loading);
  
  const selectedImageId = useAppSelector(state => state.createUI.selectedImageId);
  const selectedImageType = useAppSelector(state => state.createUI.selectedImageType);
  
  // Show all images including processing ones from all modules (CREATE, TWEAK, REFINE) for cross-module functionality
  // Exclude region extraction images (SDXL "extract regions" results should show in RegionsWrapper, not history)
  const filteredHistoryImages = React.useMemo(() => {
    const filtered = historyImages.filter((image) => {
      // Exclude region extraction images (they're saved as mask regions, not history images)
      const metadata = image.metadata as any;
      if (metadata?.isRegionExtraction) {
        return false;
      }
      
      return image.moduleType === 'CREATE' && (
        image.status === 'COMPLETED' || 
        image.status === 'PROCESSING' || 
        !image.status
      );
    });
    return filtered;
  }, [historyImages]);

  const isPromptModalOpen = useAppSelector(state => state.createUI.isPromptModalOpen);
  const isGalleryModalOpen = useAppSelector(state => state.gallery.isModalOpen);

  // Generation state
  const isGenerating = useAppSelector(state => state.createUI.isGenerating);
  const generatingInputImageId = useAppSelector(state => state.createUI.generatingInputImageId);
  const generatingInputImagePreviewUrl = useAppSelector(state => state.createUI.generatingInputImagePreviewUrl);

  const basePrompt = useAppSelector(state => state.masks.savedPrompt);
  const masks = useAppSelector(state => state.masks.masks);
  const maskInputs = useAppSelector(state => state.masks.maskInputs);
  const aiPromptMaterials = useAppSelector(state => state.masks.aiPromptMaterials);
  const { creativity, expressivity, resemblance, variations: selectedVariations } = useAppSelector(state => state.customization);

  // Get current functional input image ID for WebSocket filtering
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
    enabled: initialDataLoaded,
    currentInputImageId
  });

  // Download image with progress tracking (same as RefinePage)
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

  
  // Enhanced WebSocket debug info

  // SIMPLIFIED EFFECT 1: Load initial data (deduplicated)
  useEffect(() => {
    if (initialDataLoaded) {
      return;
    }

    const loadInitialData = async () => {
      
      // Load input images and variations in parallel
      const [inputResult, variationsResult] = await Promise.allSettled([
        dispatch(fetchInputImagesBySource({ uploadSource: 'CREATE_MODULE' })),
        dispatch(fetchAllVariations({ page: 1, limit: 100 })) // Standard limit
      ]);
      
      
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
            dispatch(setSelectedImage({ id: targetImageId, type: 'generated' }));
            // Note: Generated images don't support masks, so ignore showMasks param
          }
        }
        // Don't auto-select any image if no URL params - let user choose manually
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
      
      
      if (imageType === 'input') {
        // Handle input image selection
        const targetImage = inputImages.find((img: any) => img.id === targetImageId);
        
        if (targetImage) {
          dispatch(setSelectedImage({ id: targetImageId, type: 'input' }));
          if (showMasksParam === 'true') {
            setTimeout(() => dispatch(setIsPromptModalOpen(true)), 1000);
          }
        } else {
        }
      } else if (imageType === 'generated') {
        // Handle generated image selection
        const targetImage = historyImages.find((img: any) => img.id === targetImageId);
        
        if (targetImage) {
          dispatch(setSelectedImage({ id: targetImageId, type: 'generated' }));
          // Note: Generated images don't support masks, so ignore showMasks param
        } else {
          // Log available history images for debugging
          if (historyImages.length > 0) {
          } else {
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
          dispatch(setSelectedImage({ id: targetImageId, type: 'generated' }));
        }
      } else if (imageTypeParam === 'input' && inputImages.length > 0) {
        const targetImage = inputImages.find((img: any) => img.id === targetImageId);
        
        if (targetImage) {
          dispatch(setSelectedImage({ id: targetImageId, type: 'input' }));
        } else {
          // If image still not found, it might be newly created - refresh input images
          dispatch(fetchInputImagesBySource({ uploadSource: 'CREATE_MODULE' })).then(() => {
            // Try once more after refresh
            const refreshedTargetImage = inputImages.find((img: any) => img.id === targetImageId);
            if (refreshedTargetImage) {
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
      // Reset slider config to Create defaults on image select
      dispatch(initializeCreateSettings());
      // Check if we already processed this exact image to avoid duplicate API calls
      const currentImageKey = `${selectedImageId}-${selectedImageType}`;
      const lastProcessedKey = lastProcessedImageRef.current ?
        `${lastProcessedImageRef.current.id}-${lastProcessedImageRef.current.type}` : null;
      if (currentImageKey === lastProcessedKey) {
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

        // Clear any previous generated image data and restore saved materials for this input image
        dispatch(clearMaskMaterialSelections());
        dispatch(restoreAIMaterialsForImage({ imageId: selectedImageId, imageType: 'input' }));
        dispatch(clearSavedPrompt());

        // Load base masks from the input image
        dispatch(getMasks(selectedImageId));

        // Only load from database if no saved materials found in local cache
        // This will be handled by the restoreAIMaterialsForImage action
        dispatch(getAIPromptMaterials(selectedImageId));

        // Use the correct API for InputImage prompts
        dispatch(getInputImageSavedPrompt(selectedImageId));
      } else if (selectedImageType === 'generated') {
        // Close modal when generated image is selected (so user can see the image)
        dispatch(setIsPromptModalOpen(false));

        // For generated images, first try to restore saved materials for this specific image
        dispatch(restoreAIMaterialsForImage({ imageId: selectedImageId, imageType: 'generated' }));

        // For generated images, DON'T load masks automatically - show CREATE section instead
        // Only restore the data from the generated image
        const generatedImage = historyImages.find(img => img.id === selectedImageId);
        if (generatedImage) {
          // Clear mask selections AND ensure maskStatus is 'none' to show CREATE section (not regions)
          dispatch(clearMaskMaterialSelections());
          // Reset mask state to ensure CREATE section shows (not regions)
          dispatch({ type: 'masks/resetMaskState' });

          // Restore AI materials if available
          if (generatedImage.aiMaterials && generatedImage.aiMaterials.length > 0) {
            dispatch(restoreAIMaterials(generatedImage.aiMaterials));
          }

          // Restore prompt from generated image
          if (generatedImage.aiPrompt) {
            dispatch(restoreSavedPrompt(generatedImage.aiPrompt));
          } else {
            // Try to get prompt from Generated Image table
            dispatch(getGeneratedImageSavedPrompt(selectedImageId)).then((result: any) => {
              if (result.type.endsWith('fulfilled') && result.payload.data.aiPrompt) {
                dispatch(restoreSavedPrompt(result.payload.data.aiPrompt));
              }
            }).catch(() => {
              dispatch(clearSavedPrompt());
            });
          }

          // Restore attachments (base image, walls, surroundings) from settingsSnapshot
          const settingsSnapshot = generatedImage.settingsSnapshot as any;
          if (settingsSnapshot?.attachments) {
            const att = settingsSnapshot.attachments;
            // Store attachments in localStorage to be picked up by AIPromptInput
            try {
              const attachmentData = {
                baseImageUrl: att.baseAttachmentUrl,
                surroundingUrls: att.surroundingUrls || (att.textureUrls ? att.textureUrls.slice(0, Math.floor(att.textureUrls.length / 2)) : []),
                wallsUrls: att.wallsUrls || (att.textureUrls ? att.textureUrls.slice(Math.floor(att.textureUrls.length / 2)) : []),
                referenceImageUrls: att.referenceImageUrls || []
              };
              
              // Store in localStorage with generated image ID as key
              localStorage.setItem(`create.attachments.generated.${selectedImageId}`, JSON.stringify(attachmentData));
              
              // Also store in attachmentsByBase with originalInputImageId if available
              if (generatedImage.originalInputImageId) {
                const originalInputId = generatedImage.originalInputImageId;
                const key = `create.attachmentsByBase`;
                const existing = localStorage.getItem(key);
                const parsed = existing ? JSON.parse(existing) : {};
                parsed[originalInputId] = attachmentData;
                localStorage.setItem(key, JSON.stringify(parsed));
              }
            } catch (error) {
              console.error('Failed to store generated image attachments:', error);
            }
          }
        } else {
          console.warn('⚠️ Generated image not found:', selectedImageId);
        }
      }
    }
  }, [selectedImageId, selectedImageType, historyImages, dispatch]);

  // Handle image data loading with download progress for generated images
  useEffect(() => {
    if (selectedImageId && selectedImageType === 'generated') {
      const historyImage = filteredHistoryImages.find(img => img.id === selectedImageId);
      const imageUrl = historyImage?.imageUrl || historyImage?.processedImageUrl;

      if (imageUrl) {
        // Check if we already have this image cached
        if (imageObjectUrls[selectedImageId]) {
          // Already cached, no need to download again
          return;
        } else {
          // Download with progress tracking for generated images
          downloadImageWithProgress(imageUrl, selectedImageId);
        }
      }
    }
  }, [selectedImageId, selectedImageType, filteredHistoryImages, imageObjectUrls, downloadImageWithProgress]);

  // SIMPLIFIED EFFECT 3: Auto-select latest completed generation (only if no URL params)
  useEffect(() => {
    // Don't auto-select if we have URL parameters (user is navigating with specific intent)
    const hasUrlParams = searchParams.get('imageId') || searchParams.get('fromBatch');
    if (hasUrlParams) {
      return;
    }

    if (filteredHistoryImages.length > 0) {
      const recent = filteredHistoryImages
        .filter(img => img.status === 'COMPLETED')
        .sort((a, b) => {
          // Handle both Date objects and string dates
          const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
          const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
          return dateB - dateA;
        })[0];
      
      if (recent) {
        // Handle both Date objects and string dates, and increase window to 60 seconds
        const createdAt = recent.createdAt instanceof Date ? recent.createdAt : new Date(recent.createdAt);
        const isVeryRecent = Date.now() - createdAt.getTime() < 60000; // 60 seconds
        // Only auto-select if no image is currently selected OR if the selected image is not the most recent one
        if (isVeryRecent && (!selectedImageId || selectedImageId !== recent.id)) {
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

  const handleSubmit = async (
    userPrompt?: string,
    contextSelection?: string,
    attachments?: { baseImageUrl?: string; referenceImageUrls?: string[]; surroundingUrls?: string[]; wallsUrls?: string[] },
    options?: { size?: string; aspectRatio?: string }
  ) => {
    
    // Base image is now optional for Create; if none is selected, we'll call Seedream-4

    // NOTE: Only compute targetInputImageId if we proceed with the non-Replicate (RunPod) flow below.
    let targetInputImageId: number | undefined = undefined;

    // Check credits before proceeding with generation
    if (!checkCreditsBeforeAction(1)) {
      return; // Credit check handles the error display
    }

    try {
      const finalPrompt = userPrompt || basePrompt;
      
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


      // Simple model-based generation: send selected model with prompt, base image, and reference image
      // Prompt is required, base image and reference image are optional
      
      // Validate prompt (required)
      if (!finalPrompt || !finalPrompt.trim()) {
        toast.error('Please enter a prompt');
        return;
      }

      // Get base image URL (optional)
      const baseUrl = getBaseImageUrl();
      const effectiveBaseUrl = baseUrl || attachments?.baseImageUrl;
      
      // Reference images removed - no longer supported
      const referenceImageUrls: string[] = [];
      
      // Find input image ID for tracking - check base image and texture URLs
      let inputImageIdForBase: number | undefined = selectedImageId && selectedImageType === 'input' ? selectedImageId : undefined;
      if (!inputImageIdForBase && effectiveBaseUrl) {
        // Try to find input image by URL
        const matchingInputImage = inputImages.find(img => 
          img.originalUrl === effectiveBaseUrl || 
          img.imageUrl === effectiveBaseUrl ||
          img.processedUrl === effectiveBaseUrl
        );
        if (matchingInputImage) {
          inputImageIdForBase = matchingInputImage.id;
          console.log('🔗 Found input image ID for base URL:', { url: effectiveBaseUrl, inputImageId: inputImageIdForBase });
        }
      }
      // Combine surroundingUrls and wallsUrls into textureUrls for backend compatibility
      const combinedTextureUrls = [
        ...(attachments?.surroundingUrls || []),
        ...(attachments?.wallsUrls || [])
      ];

      // Also check texture URLs if base not found (for tracking purposes)
      if (!inputImageIdForBase && combinedTextureUrls.length > 0) {
        const textureImage = inputImages.find(img => 
          combinedTextureUrls.some(textureUrl => 
            img.originalUrl === textureUrl || 
            img.imageUrl === textureUrl ||
            img.processedUrl === textureUrl
          )
        );
        if (textureImage) {
          inputImageIdForBase = textureImage.id;
          console.log('🔗 Found input image ID from texture URL:', { inputImageId: inputImageIdForBase });
        }
      }

      // Build an augmented prompt that guides the model on how to use the selected images
      const surroundingCount = (attachments?.surroundingUrls || []).length;
      const wallsCount = (attachments?.wallsUrls || []).length;
      let promptGuidance = '';
      if (surroundingCount > 0 && wallsCount > 0) {
        promptGuidance = ` Use the ${wallsCount} wall texture image${wallsCount === 1 ? '' : 's'} as wall materials, and the ${surroundingCount} surrounding image${surroundingCount === 1 ? '' : 's'} as environmental/context references.`;
      } else if (wallsCount > 0) {
        promptGuidance = ` Use the ${wallsCount} wall texture image${wallsCount === 1 ? '' : 's'} as wall materials.`;
      } else if (surroundingCount > 0) {
        promptGuidance = ` Use the ${surroundingCount} surrounding image${surroundingCount === 1 ? '' : 's'} as environmental/context references.`;
      }

      const promptToSend = `${finalPrompt.trim()}${promptGuidance}`.trim();

      // Prevent SDXL from being used with Generate button - only Create Regions should use SDXL
      if (selectedModel === 'sdxl') {
        toast.error('SDXL model can only be used with "Create Regions" button. Please use "Create Regions" or select a different model.');
        return;
      }

      // Send request to selected model
      try {
        const resultResponse: any = await dispatch(
          runFluxKonect({
            prompt: promptToSend,
            imageUrl: effectiveBaseUrl, // Base image (optional)
            variations: selectedVariations,
            model: selectedModel, // Use selected model directly
            moduleType: 'CREATE',
            selectedBaseImageId: selectedImageId,
            originalBaseImageId: inputImageIdForBase || selectedImageId,
            baseAttachmentUrl: attachments?.baseImageUrl,
            referenceImageUrls: referenceImageUrls, // Reference images (optional)
            textureUrls: combinedTextureUrls.length > 0 ? combinedTextureUrls : undefined, // Combined texture URLs (for backward compatibility)
            surroundingUrls: attachments?.surroundingUrls, // Surrounding texture URLs
            wallsUrls: attachments?.wallsUrls, // Walls texture URLs
            size: options?.size,
            aspectRatio: options?.aspectRatio,
          })
        );

        if (resultResponse?.payload?.success) {
          // Don't close modal immediately - let WebSocket handler close it when image completes
          // This ensures the modal stays open during processing and closes when image is ready
          // The WebSocket handler will close it and auto-select the generated image
        } else {
          const payload = resultResponse?.payload;
          const errorMsg = payload?.message || payload?.error || 'Generation failed';
          toast.error(errorMsg);
        }
      } catch (err: any) {
        console.error(`❌ ${selectedModel === 'seedream4' ? 'Seed Dream' : 'Nano Banana'} generation error:`, err);
        toast.error(err?.message || `Failed to start generation`);
      }

      return; // Do not proceed to RunPod flow
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error?.message || 'Failed to start generation');
    }
  };

  // Handle Create Regions (SDXL regional_prompt task)
  const handleCreateRegions = async () => {
    console.log('🔵🔵🔵 handleCreateRegions CALLED in CreatePage!', { 
      selectedImageId, 
      selectedImageType,
      inputImagesCount: inputImages.length 
    });

    // Check credits before proceeding
    if (!checkCreditsBeforeAction(1)) {
      return;
    }

    try {
      // Get base image URL
      let effectiveBaseUrl: string | undefined = undefined;
      let inputImageIdForBase: number | undefined = selectedImageId && selectedImageType === 'input' ? selectedImageId : undefined;
      
      if (selectedImageId && selectedImageType === 'input') {
        const inputImage = inputImages.find(img => img.id === selectedImageId);
        effectiveBaseUrl = inputImage?.originalUrl || inputImage?.imageUrl || inputImage?.processedUrl;
        inputImageIdForBase = selectedImageId;
        console.log('🔵 Found input image:', { id: selectedImageId, url: effectiveBaseUrl });
      } else if (selectedImageType === 'generated') {
        const generatedImage = historyImages.find(img => img.id === selectedImageId);
        if (generatedImage?.originalInputImageId) {
          const originalInputImage = inputImages.find(img => img.id === generatedImage.originalInputImageId);
          effectiveBaseUrl = originalInputImage?.originalUrl || originalInputImage?.imageUrl || originalInputImage?.processedUrl;
          inputImageIdForBase = generatedImage.originalInputImageId;
          console.log('🔵 Found original input from generated image:', { 
            generatedId: selectedImageId, 
            originalInputId: generatedImage.originalInputImageId,
            url: effectiveBaseUrl 
          });
        }
      }

      if (!effectiveBaseUrl) {
        console.warn('⚠️ No base image URL found');
        toast.error('Please select a base image first');
        return;
      }

      console.log('🚀 Calling SDXL with extract regions', { 
        imageUrl: effectiveBaseUrl, 
        inputImageIdForBase,
        selectedImageId 
      });

      // Call SDXL with "extract regions" prompt for regional_prompt task
      const resultResponse: any = await dispatch(
        runFluxKonect({
          prompt: 'extract regions', // Key: Use "extract regions" prompt for Create Regions
          imageUrl: effectiveBaseUrl,
          variations: 1,
          model: 'sdxl', // Key: Use 'sdxl' model
          moduleType: 'CREATE',
          selectedBaseImageId: selectedImageId,
          originalBaseImageId: inputImageIdForBase || selectedImageId,
          baseAttachmentUrl: effectiveBaseUrl,
          referenceImageUrls: [],
          textureUrls: undefined,
          surroundingUrls: undefined,
          wallsUrls: undefined,
          size: '1K',
          aspectRatio: '16:9',
        })
      );

      console.log('📥 SDXL response:', resultResponse);

      if (resultResponse?.payload?.success) {
        toast.success('Region extraction started');
      } else {
        const payload = resultResponse?.payload;
        const errorMsg = payload?.message || payload?.error || 'Region extraction failed';
        console.error('❌ SDXL failed:', errorMsg, payload);
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.error('❌ Create Regions error:', error);
      toast.error(error?.message || 'Failed to start region extraction');
    }
  };

  const handleSelectImage = (imageId: number, sourceType: 'input' | 'generated') => {
    dispatch(setSelectedImage({ id: imageId, type: sourceType }));
    // Close modal when selecting an image from history
    dispatch(setIsPromptModalOpen(false));
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
      
      
      // For newly uploaded images (CREATE_MODULE), aiPrompt should be empty initially
      // For converted images (CONVERTED_FROM_GENERATED), aiPrompt contains the original prompt
      const finalPrompt = basePrompt || inputImage?.aiPrompt || '';
      const finalMaterials = aiPromptMaterials || inputImage?.aiMaterials || [];
      
      return {
        aiPrompt: finalPrompt,
        aiMaterials: finalMaterials,
        maskMaterialMappings: {} // Input images don't have specific mappings yet
      };
    } else {
      const generatedImage = historyImages.find(img => img.id === selectedImageId);
      
      const finalPrompt = basePrompt || generatedImage?.aiPrompt || '';
      const finalMaterials = aiPromptMaterials || generatedImage?.aiMaterials || [];
      
      
      return {
        aiPrompt: finalPrompt,
        aiMaterials: finalMaterials,
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
      return undefined;
    }

    if (selectedImageType === 'input') {
      const inputImage = inputImages.find(img => img.id === selectedImageId);
      return inputImage?.originalUrl || inputImage?.imageUrl || inputImage?.processedUrl;
    } else if (selectedImageType === 'generated') {
      // For generated images, find the original input image
      const generatedImage = historyImages.find(img => img.id === selectedImageId);
      if (generatedImage?.originalInputImageId) {
        const originalInputImage = inputImages.find(img => img.id === generatedImage.originalInputImageId);
        return originalInputImage?.originalUrl || originalInputImage?.imageUrl || originalInputImage?.processedUrl;
      }
    }

    return undefined;
  };

  // Helper to get the preview URL that ALWAYS shows the base input image (original uploaded image)
  const getPreviewImageUrl = () => {
    if (!selectedImageId || !selectedImageType) {
      return undefined;
    }

    if (selectedImageType === 'input') {
      const inputImage = inputImages.find(img => img.id === selectedImageId);
      return inputImage?.originalUrl || inputImage?.imageUrl;
    } else if (selectedImageType === 'generated') {
      // For generated images, first try to use the stored previewUrl, then fallback to finding original input image
      const generatedImage = historyImages.find(img => img.id === selectedImageId);

      // 🔥 NEW: Use previewUrl from generated image if available
      if (generatedImage?.previewUrl) {
        return generatedImage.previewUrl;
      }

      // Fallback to finding original input image
      if (generatedImage?.originalInputImageId) {
        const originalInputImage = inputImages.find(img => img.id === generatedImage.originalInputImageId);
        return originalInputImage?.originalUrl || originalInputImage?.imageUrl;
      }
    }
    return undefined;
  };

  const getCurrentImageUrl = () => {
    if (!selectedImageId || !selectedImageType) {
      return undefined;
    }

    if (selectedImageType === 'input') {
      const inputImage = inputImages.find(img => img.id === selectedImageId);
      return inputImage?.originalUrl || inputImage?.imageUrl || inputImage?.processedUrl;
    } else {
      // For generated images, use cached object URL if available
      if (imageObjectUrls[selectedImageId]) {
        return imageObjectUrls[selectedImageId];
      }
      const historyImage = historyImages.find(img => img.id === selectedImageId);
      return historyImage?.imageUrl || historyImage?.processedImageUrl;
    }
  };

  // Debug selected image state
  React.useEffect(() => {
  }, [selectedImageId, selectedImageType]);

  const hasInputImages = inputImages && inputImages.length > 0;

  // Cleanup object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      Object.values(imageObjectUrls).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, []); // Remove imageObjectUrls dependency to prevent premature cleanup

  // Handler functions for ImageCanvas actions
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async (imageUrl: string) => {
    if (!selectedImageId) {
      toast.error('Please select an image to share');
      return;
    }

    if (isSharing) return; // Prevent multiple clicks

    setIsSharing(true);
    try {
      // Determine the API endpoint based on image type
      let apiUrl;
      if (selectedImageType === 'input') {
        apiUrl = `/images/input-images/share/${selectedImageId}`;
      } else {
        apiUrl = `/images/share/${selectedImageId}`;
      }

      // Call API to toggle share status (make image public/private)
      const response = await api.post(apiUrl);

      if (response.data.success) {
        const action = response.data.action;
        const isPublic = response.data.isPublic;

        if (isPublic) {
          toast.success('Image shared to community! Others can now see and like it in Explore.', {
            duration: 4000,
          });
        } else {
          toast.success('Image removed from community sharing.', {
            duration: 3000,
          });
        }

        console.log(`✅ Image ${action}:`, {
          imageId: selectedImageId,
          isPublic,
          likesCount: response.data.likesCount
        });
      }
    } catch (error) {
      console.error('❌ Error sharing image:', error);
      toast.error('Failed to share image. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleEdit = async (imageId?: number) => {
    console.log('🔵 EDIT BUTTON CLICKED:', { imageId, selectedImageType });

    if (imageId) {
      // Determine if it's an input or generated image
      const isInputImage = inputImages.some(img => img.id === imageId);
      const isHistoryImage = historyImages.some(img => img.id === imageId);

      console.log('🔍 Image type detection:', {
        imageId,
        isInputImage,
        isHistoryImage,
        totalInputImages: inputImages.length,
        totalHistoryImages: historyImages.length
      });

      if (isInputImage) {
        // For CREATE input images, check if already converted to TWEAK
        const inputImage = inputImages.find(img => img.id === imageId);

        console.log('📄 Input image found:', {
          id: inputImage?.id,
          uploadSource: inputImage?.uploadSource,
          createUploadId: inputImage?.createUploadId,
          tweakUploadId: inputImage?.tweakUploadId,
          refineUploadId: inputImage?.refineUploadId,
          fullInputImage: inputImage
        });

        if (inputImage && inputImage.tweakUploadId) {
          // Already converted - use existing TWEAK input
          console.log('✅ Using existing TWEAK conversion:', inputImage.tweakUploadId);
          navigate(`/edit?imageId=${inputImage.tweakUploadId}&type=input`);
        } else {
          // Convert: Create new TWEAK input image
          console.log('🔄 Creating new TWEAK conversion for input image:', inputImage?.id);

          const result = await dispatch(createInputImageFromExisting({
            imageUrl: inputImage!.imageUrl,
            thumbnailUrl: inputImage!.thumbnailUrl,
            fileName: `tweak-from-create-input-${inputImage!.id}.jpg`,
            originalImageId: inputImage!.id,
            uploadSource: 'TWEAK_MODULE',
            currentPrompt: basePrompt || undefined,
            currentAIMaterials: aiPromptMaterials
          }));

          if (createInputImageFromExisting.fulfilled.match(result)) {
            const newInputImage = result.payload;
            console.log('✅ Successfully created new TWEAK input image:', newInputImage);

            // Refresh input images for CREATE page to show updated tracking fields
            dispatch(fetchInputImagesBySource({ uploadSource: 'CREATE_MODULE' }));
            // Refresh input images for Edit page
            dispatch(fetchInputAndCreateImages({ page: 1, limit: 100, uploadSource: 'TWEAK_MODULE' }));
            dispatch(fetchAllVariations({ page: 1, limit: 100 }));

            navigate(`/edit?imageId=${newInputImage.id}&type=input`);
          } else {
            console.error('❌ Failed to create new TWEAK input image:', result);
            throw new Error('Failed to convert input image for Edit module');
          }
        }
      } else if (isHistoryImage) {
        // For generated images, check if already converted or convert now
        const historyImage = historyImages.find(img => img.id === imageId);
        if (historyImage) {
          try {
            if (historyImage.tweakUploadId) {
              // Already converted - use existing
              navigate(`/edit?imageId=${historyImage.tweakUploadId}&type=input`);
            } else {
              // Convert: Create new input image for Edit module
              const result = await dispatch(createInputImageFromExisting({
                imageUrl: historyImage.imageUrl, // Use high-definition imageUrl
                thumbnailUrl: historyImage.thumbnailUrl,
                fileName: `tweak-from-${historyImage.id}.jpg`,
                originalImageId: historyImage.id,
                uploadSource: 'TWEAK_MODULE',
                currentPrompt: basePrompt || undefined,
                currentAIMaterials: aiPromptMaterials
              }));

              if (createInputImageFromExisting.fulfilled.match(result)) {
                const newInputImage = result.payload;

                // Refresh input images for CREATE page to show updated tracking fields
                dispatch(fetchInputImagesBySource({ uploadSource: 'CREATE_MODULE' }));
                // Refresh input images for Edit page to find the new image
                dispatch(fetchInputAndCreateImages({ page: 1, limit: 100, uploadSource: 'TWEAK_MODULE' }));
                dispatch(fetchAllVariations({ page: 1, limit: 100 }));

                navigate(`/edit?imageId=${newInputImage.id}&type=input`);
              } else {
                throw new Error('Failed to convert image');
              }
            }
          } catch (error) {
            console.error('❌ EDIT button error:', error);
            toast.error('Failed to convert image for Edit module');
          }
        }
      } else {
        toast.error('Image not found');
      }

      // Close gallery modal if open
      dispatch(setIsModalOpen(false));
    } else {
      toast.error('No image selected for editing');
    }
  };

  const handleUpscale = async (imageId?: number) => {
    console.log('🟡 UPSCALE BUTTON CLICKED:', { imageId, selectedImageType });

    if (imageId) {
      // Determine if it's an input or generated image
      const isInputImage = inputImages.some(img => img.id === imageId);
      const isHistoryImage = historyImages.some(img => img.id === imageId);

      console.log('🔍 Image type detection (Upscale):', {
        imageId,
        isInputImage,
        isHistoryImage,
        totalInputImages: inputImages.length,
        totalHistoryImages: historyImages.length
      });

      if (isInputImage) {
        // For CREATE input images, check if already converted to REFINE
        const inputImage = inputImages.find(img => img.id === imageId);

        console.log('📄 Input image found (Upscale):', {
          id: inputImage?.id,
          uploadSource: inputImage?.uploadSource,
          createUploadId: inputImage?.createUploadId,
          tweakUploadId: inputImage?.tweakUploadId,
          refineUploadId: inputImage?.refineUploadId,
          fullInputImage: inputImage
        });

        if (inputImage && inputImage.refineUploadId) {
          // Already converted - use existing REFINE input
          console.log('✅ Using existing REFINE conversion:', inputImage.refineUploadId);
          navigate(`/upscale?imageId=${inputImage.refineUploadId}&type=input`);
        } else {
          // Convert: Create new REFINE input image
          console.log('🔄 Creating new REFINE conversion for input image:', inputImage?.id);

          const result = await dispatch(createInputImageFromExisting({
            imageUrl: inputImage!.imageUrl,
            thumbnailUrl: inputImage!.thumbnailUrl,
            fileName: `refine-from-create-input-${inputImage!.id}.jpg`,
            originalImageId: inputImage!.id,
            uploadSource: 'REFINE_MODULE',
            currentPrompt: basePrompt || undefined,
            currentAIMaterials: aiPromptMaterials
          }));

          if (createInputImageFromExisting.fulfilled.match(result)) {
            const newInputImage = result.payload;
            console.log('✅ Successfully created new REFINE input image:', newInputImage);

            // Refresh input images for CREATE page to show updated tracking fields
            dispatch(fetchInputImagesBySource({ uploadSource: 'CREATE_MODULE' }));
            // Refresh variations to get updated tracking
            dispatch(fetchAllVariations({ page: 1, limit: 100 }));

            // Add a small delay to ensure data propagation before navigation
            setTimeout(() => {
              navigate(`/upscale?imageId=${newInputImage.id}&type=input`);
            }, 300);
          } else {
            throw new Error('Failed to convert input image for Refine module');
          }
        }
      } else if (isHistoryImage) {
        // For generated images, check if already converted or convert now
        const historyImage = historyImages.find(img => img.id === imageId);
        if (historyImage) {
          try {
            if (historyImage.refineUploadId) {
              // Already converted - use existing
              navigate(`/upscale?imageId=${historyImage.refineUploadId}&type=input`);
            } else {
              // Convert: Create new input image for Refine module
              const result = await dispatch(createInputImageFromExisting({
                imageUrl: historyImage.imageUrl, // Use high-definition imageUrl
                thumbnailUrl: historyImage.thumbnailUrl,
                fileName: `refine-from-${historyImage.id}.jpg`,
                originalImageId: historyImage.id,
                uploadSource: 'REFINE_MODULE',
                currentPrompt: basePrompt || undefined,
                currentAIMaterials: aiPromptMaterials
              }));

              if (createInputImageFromExisting.fulfilled.match(result)) {
                const newInputImage = result.payload;

                // Refresh input images for CREATE page to show updated tracking fields
                dispatch(fetchInputImagesBySource({ uploadSource: 'CREATE_MODULE' }));
                // Refresh variations to get updated cross-module tracking
                dispatch(fetchAllVariations({ page: 1, limit: 100 }));

                // Add a small delay to ensure data propagation before navigation
                setTimeout(() => {
                  navigate(`/upscale?imageId=${newInputImage.id}&type=input`);
                }, 300);
              } else {
                throw new Error('Failed to convert image');
              }
            }
          } catch (error) {
            console.error('❌ UPSCALE button error:', error);
            toast.error('Failed to convert image for Refine module');
          }
        }
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

  const handleTogglePromptModal = (isOpen: boolean) => {
    dispatch(setIsPromptModalOpen(isOpen));
  };

  const handleStartTour = () => {
    setCurrentStep(0);
    setForceShowOnboarding(true);
  };

  const handleCloseTour = () => {
    setForceShowOnboarding(false);
  };

  // const handleSelectImage = (imageId: number, imageType: 'input' | 'history') => {
  //   dispatch(setSelectedImage({ imageId, imageType }));
  // };

  // const handleImageUpload = async (file: File) => {
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
  //   toast.success('Generation started');
  // };


  return (
    <MainLayout currentStep={currentStep} onStartTour={handleStartTour}>
      <OnboardingPopup
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        forceShow={forceShowOnboarding}
      />
      <div className="flex-1 flex overflow-hidden relative">
          <>
            <div className={`transition-all flex gap-3 pl-2 h-full relative`}>
              <div className={`${currentStep === 3 ? 'z-[1000]' : 'z-60'}`}>
                <InputHistoryPanel
                  currentStep={currentStep}
                  images={inputImages}
                  selectedImageId={selectedImageType === 'input' ? selectedImageId : undefined}
                  onSelectImage={(imageId) => handleSelectImage(imageId, 'input')}
                  onUploadImage={handleImageUpload}
                  loading={inputImagesLoading}
                  error={inputImagesError}
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col relative">
              <div className="flex-1 relative">
                {/* Always show ImageCanvas; default to most recent or blank canvas if none */}
                {!isPromptModalOpen && (
                  <ImageCanvas
                    imageUrl={getCurrentImageUrl()}
                    loading={historyImagesLoading || (selectedImageType === 'generated' && downloadingImageId === selectedImageId)}
                    setIsPromptModalOpen={handleTogglePromptModal}
                    editInspectorMinimized={false}
                    onDownload={() => console.log('Download:', selectedImageId)}
                    onOpenGallery={handleOpenGallery}
                    onShare={handleShare}
                    onEdit={handleEdit}
                    onUpscale={handleUpscale}
                    imageId={selectedImageId}
                    downloadProgress={downloadingImageId === selectedImageId ? downloadProgress : undefined}
                    isSharing={isSharing}
                  />
                )}

                {/* Show new PromptInputContainer UI when modal is open */}
                {(isPromptModalOpen || currentStep === 4) && (
                  <div className={`absolute inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-xs ${currentStep === 4 ? 'z-[999]' : ''}`}>
                    <PromptInputContainer 
                      onGenerate={handleSubmit}
                      onCreateRegions={handleCreateRegions}
                      isGenerating={isGenerating}
                    />
                  </div>
                )}
              </div>

              <HistoryPanel
                currentStep={currentStep}
                images={filteredHistoryImages}
                selectedImageId={selectedImageType === 'generated' ? selectedImageId : undefined}
                onSelectImage={(imageId, sourceType = 'generated') => handleSelectImage(imageId, sourceType)}
                loading={historyImagesLoading}
                downloadingImageId={downloadingImageId}
                downloadProgress={downloadProgress}
              />
            </div>
          </>
      </div>
    </MainLayout>
  );
};

export default CreatePageSimplified;