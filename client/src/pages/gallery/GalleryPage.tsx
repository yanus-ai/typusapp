import React, { useEffect, useState } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import { useNavigate } from 'react-router-dom';
import GallerySidebar from "@/components/gallery/GallerySidebar";
import GalleryGrid from '@/components/gallery/GalleryGrid';
import CreateModeView from '@/components/gallery/CreateModeView';
import TweakModeView from '@/components/gallery/TweakModeView';
import UpscaleModeView from '@/components/gallery/UpscaleModeView';
import ExploreView from '@/components/gallery/ExploreView';
import { Button } from '@/components/ui/button';
import { X, Grid3X3, Square, Image, Monitor, Smartphone } from 'lucide-react';
import { downloadImageFromUrl } from '@/utils/helpers';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import toast from 'react-hot-toast';

// Redux actions
import { fetchAllVariations, generateWithCurrentState, addProcessingVariations, addProcessingTweakVariations } from '@/features/images/historyImagesSlice';
import { setLayout, setImageSize, setMode, setSelectedBatchId } from '@/features/gallery/gallerySlice';
import { SLIDER_CONFIGS } from '@/constants/editInspectorSliders';
import { loadBatchSettings } from '@/features/customization/customizationSlice';
import { generateInpaint, generateOutpaint } from '@/features/tweak/tweakSlice';

export type LayoutType = 'full' | 'square';
export type ImageSizeType = 'large' | 'medium' | 'small';

interface GalleryPageProps {
  onModalClose?: () => void;
}

const GalleryPage: React.FC<GalleryPageProps> = ({ onModalClose }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  // Redux selectors
  const historyImages = useAppSelector(state => state.historyImages.images);
  const inputImages = useAppSelector(state => state.inputImages.images);
  const loading = useAppSelector(state => state.historyImages.loading);
  const error = useAppSelector(state => state.historyImages.error);

  // Gallery state
  const layout = useAppSelector(state => state.gallery.layout);
  const imageSize = useAppSelector(state => state.gallery.imageSize);
  const galleryMode = useAppSelector(state => state.gallery.mode);
  const selectedBatchId = useAppSelector(state => state.gallery.selectedBatchId);

  // Reset selections when gallery mode changes
  useEffect(() => {
    // No local state to reset for Create mode
  }, [galleryMode]);

  // Unified WebSocket connection - handles all real-time updates (same as other pages)
  useUnifiedWebSocket({
    enabled: true, // Always enabled for gallery to receive completion updates
    currentInputImageId: undefined // Gallery doesn't have a specific input image
  });
  // WebSocket automatically calls fetchAllVariations() when images complete processing

  // Load all generated images on component mount
  useEffect(() => {
    dispatch(fetchAllVariations({ page: 1, limit: 100 }));
    loadUserLikedImages();
  }, [dispatch]);

  // Debug effect to see when images load
  useEffect(() => {
    console.log('🔄 Loading state:', loading, 'Error:', error);
  }, [historyImages, loading, error]);

  // Use historyImages directly - it already includes all module types (CREATE, TWEAK, REFINE) from getAllCompletedVariations
  const completedImages = historyImages
    .filter(img => img.status === 'COMPLETED' || !img.status) // Include images without status for backward compatibility
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Load user's liked images for Explore view
  const loadUserLikedImages = async () => {
    try {
      const response = await api.get('/likes/user-likes');
      if (response.data.success && response.data.images) {
        const likedImageIds = response.data.images.map((img: any) => img.id);
        setLikedImages(new Set(likedImageIds));
      }
    } catch (error) {
      console.error('❌ Error loading liked images:', error);
      // Silently fail - user will just not see their like status initially
    }
  };

  const handleClose = () => {
    // Never prevent closing during variant generation - allow gallery to stay open
    // if (isVariantGenerating) {
    //   console.log('⚠️ Gallery close prevented: variant generation in progress');
    //   return;
    // }
    
    if (onModalClose) {
      // If used as modal, call the modal close handler
      onModalClose();
    } else {
      // Otherwise, navigate back
      window.history.back();
    }
  };

  const [downloadingImages, setDownloadingImages] = useState<Set<number>>(new Set());
  const [likedImages, setLikedImages] = useState<Set<number>>(new Set());
  const [isSharingImage, setIsSharingImage] = useState(false);

  const handleDownload = async (imageUrl: string, imageId: number) => {
    try {
      // Set loading state for this specific image
      setDownloadingImages(prev => new Set(prev).add(imageId));

      await downloadImageFromUrl(
        imageUrl,
        `typus-ai-gallery-image-${imageId}-${Date.now()}.jpg`,
        () => {
          // Optional: Could be used for additional loading feedback
        }
      );
    } catch (error) {
      console.error('Failed to download image:', error);
    } finally {
      // Clear loading state for this image
      setDownloadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  };

  const handleLike = async (imageId: number) => {
    try {
      console.log('Like image:', imageId);
      
      // Optimistically update UI
      setLikedImages(prev => {
        const newSet = new Set(prev);
        if (newSet.has(imageId)) {
          newSet.delete(imageId);
        } else {
          newSet.add(imageId);
        }
        return newSet;
      });

      // Call API to toggle like
      const response = await api.post(`/likes/toggle/${imageId}`);
      
      if (response.data.success) {
        console.log(`✅ ${response.data.action} image ${imageId}, new count: ${response.data.likesCount}`);
        toast.success(`Image ${response.data.action}!`);
      }
    } catch (error) {
      console.error('❌ Error toggling like:', error);
      // Revert optimistic update on error
      setLikedImages(prev => {
        const newSet = new Set(prev);
        if (newSet.has(imageId)) {
          newSet.delete(imageId);
        } else {
          newSet.add(imageId);
        }
        return newSet;
      });
      toast.error('Failed to update like. Please try again.');
    }
  };

  const handleCreateFromImage = async (imageId: number, imageUrl: string, prompt?: string) => {
    try {
      console.log('Create from image:', imageId, imageUrl);
      
      // Show loading state
      setDownloadingImages(prev => new Set(prev).add(imageId));
      
      // Create input image from the public explore image
      const response = await api.post('/images/create-input-from-public', {
        imageId,
        imageUrl,
        prompt
      });
      
      // Handle both response formats: direct object or wrapped in success
      if (response.data && (response.data.id || response.data.success)) {
        const newInputImage = response.data.success ? response.data.inputImage : response.data;
        console.log('✅ Successfully created input image from explore:', newInputImage);
        
        // Close gallery modal if open
        if (onModalClose) {
          onModalClose();
        }
        
        // Navigate to create page with the new input image
        const targetUrl = `/create?imageId=${newInputImage.id}&type=input`;
        navigate(targetUrl);
        toast.success('Image added to Create module!');
      } else {
        throw new Error(response.data.message || 'Failed to create input image');
      }
    } catch (error) {
      console.error('❌ Error creating from image:', error);
      toast.error('Failed to add image to Create module. Please try again.');
    } finally {
      // Remove loading state
      setDownloadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  };

  const handleShare = async (_imageUrl: string, imageId: number) => {
    if (isSharingImage) return; // Prevent multiple clicks

    console.log('🔄 Starting share process for image:', imageId);
    setIsSharingImage(true);
    try {
      // Use API to toggle share status (make image public/private for community)
      console.log('📡 Making API call to /images/share/' + imageId);
      const response = await api.post(`/images/share/${imageId}`);

      console.log('📥 API Response:', response.data);

      if (response.data.success) {
        const isPublic = response.data.isPublic;
        console.log('✅ Share successful, isPublic:', isPublic);

        if (isPublic) {
          toast.success('Image shared to community! Others can now see and like it in Explore.', {
            duration: 4000,
          });
        } else {
          toast.success('🔒 Image removed from community.', {
            duration: 3000,
          });
        }
      } else {
        console.log('❌ API returned success=false:', response.data);
        throw new Error(response.data.message || 'Failed to toggle share status');
      }
    } catch (error) {
      console.error('❌ Error sharing image:', error);
      toast.error('Failed to share image. Please try again.');
    } finally {
      console.log('🏁 Share process finished, setting isSharingImage=false');
      setIsSharingImage(false);
    }
  };

  // Handle Tweak redirection from gallery
  const handleTweakRedirect = (imageId: number) => {
    
    if (onModalClose) {
      // If in modal, close modal first then navigate
      onModalClose();
      setTimeout(() => {
        navigate(`/edit?imageId=${imageId}`);
      }, 100);
    } else {
      // If standalone gallery page, navigate directly
      navigate(`/edit?imageId=${imageId}`);
    }
  };

  // Handle batch selection from organize mode
  const handleBatchSelection = (batchId: number, moduleType: 'CREATE' | 'TWEAK' | 'REFINE') => {
    
    // Set the selected batch ID in Redux state
    dispatch(setSelectedBatchId(batchId));
    
    // Switch to appropriate mode based on module type
    let targetMode: 'organize' | 'create' | 'tweak' | 'refine' | 'edit' | 'upscale';
    switch (moduleType) {
      case 'CREATE':
        targetMode = 'create';
        break;
      case 'TWEAK':
        targetMode = 'edit';
        break;
      case 'REFINE':
        targetMode = 'upscale';
        break;
      default:
        targetMode = 'create';
    }
    
    // Switch to the target mode - the mode views will use selectedBatchId for scrolling
    dispatch(setMode(targetMode));
  };

  // Render different content based on gallery mode
  const renderMainContent = () => {
    switch (galleryMode) {
      case 'explore':
        return (
          <ExploreView
            onDownload={handleDownload}
            onLike={handleLike}
            onCreateFromImage={handleCreateFromImage}
            downloadingImages={downloadingImages}
            likedImages={likedImages}
          />
        );
      case 'create': {
        
        // Filter historyImages to only include CREATE module images
        const createModeImages = historyImages.filter(img => img.moduleType === 'CREATE' || !img.moduleType);
        
        return (
          <CreateModeView
            images={createModeImages.map(img => ({
              id: img.id,
              imageUrl: img.imageUrl,
              thumbnailUrl: img.thumbnailUrl,
              processedImageUrl: img.processedImageUrl,
              createdAt: img.createdAt,
              prompt: img.aiPrompt,
              variations: img.settingsSnapshot?.variations || 1,
              batchId: img.batchId,
              status: img.status,
              settings: {
                creativity: img.settingsSnapshot?.creativity || SLIDER_CONFIGS.creativity.default,
                expressivity: img.settingsSnapshot?.expressivity || SLIDER_CONFIGS.expressivity.default,
                resemblance: img.settingsSnapshot?.resemblance || SLIDER_CONFIGS.resemblance.default,
              },
              createUploadId: img.createUploadId,
              tweakUploadId: img.tweakUploadId,
              refineUploadId: img.refineUploadId
            }))}
            selectedBatchId={selectedBatchId}
            onDownload={handleDownload}
            onShare={handleShare}
            downloadingImages={downloadingImages}
            isSharing={isSharingImage}
            onBatchSelect={(batch) => {
              console.log('Selected batch:', batch);
              // Note: Batch selection functionality removed with canvas view
            }}
            onCreateFromBatch={(batch) => {
              // Navigate to create page with batch information including settings
              const params = new URLSearchParams({
                fromBatch: batch.batchId.toString(),
                ...(batch.prompt && { prompt: batch.prompt }),
                ...(batch.settings && {
                  creativity: batch.settings.creativity.toString(),
                  expressivity: batch.settings.expressivity.toString(),
                  resemblance: batch.settings.resemblance.toString(),
                  variations: batch.settings.variations.toString()
                })
              });
              
              const url = `/create?${params.toString()}`;
              
              if (onModalClose) {
                // If in modal, close modal first then navigate
                onModalClose();
                setTimeout(() => {
                  navigate(url);
                }, 100);
              } else {
                // If standalone gallery page, navigate directly
                navigate(url);
              }
            }}
            onGenerateVariant={async (batch) => {
              try {
                
                // Generate a new variant and add it to the SAME existing batch
                if (!batch.settings || batch.images.length === 0) {
                  console.error('❌ Invalid batch for variant generation:', batch);
                  return;
                }
                
                try {
                  
                  // Step 1: Get the original input image ID that was used for this batch
                  let batchInputImageId: number | undefined;
                  
                  try {
                    const batchResult = await dispatch(loadBatchSettings(batch.batchId));
                    
                    if (loadBatchSettings.fulfilled.match(batchResult)) {
                      batchInputImageId = batchResult.payload.inputImageId;
                    } else {
                      console.error('❌ Failed to load batch settings:', batchResult.payload);
                      return;
                    }
                  } catch (error) {
                    console.error('❌ Error loading batch settings:', error);
                    return;
                  }
                  
                  if (!batchInputImageId) {
                    console.error('❌ No input image ID found for batch:', batch.batchId);
                    return;
                  }
                  
                  // Step 2: Create generation request using the SAME input image and settings as the original batch
                  const generationRequest = {
                    prompt: batch.prompt || '',
                    inputImageId: batchInputImageId, // Use the SAME input image that created this batch
                    variations: 1, // Generate single additional variant
                    existingBatchId: batch.batchId, // ✅ IMPORTANT: Tell server to add to existing batch
                    settings: {
                      // Use the EXACT same settings that were used in the original batch
                      seed: Math.floor(1000000000 + Math.random() * 9000000000).toString(), // New random seed for variation
                      model: "realvisxlLightning.safetensors",
                      upscale: "Yes" as const,
                      style: "No" as const,
                      cfgKsampler1: batch.settings.creativity,
                      cannyStrength: batch.settings.resemblance / 10,
                      loraStrength: [1, batch.settings.expressivity / 10],
                      // CreateSettings data (same as original batch)
                      mode: 'photorealistic',
                      creativity: batch.settings.creativity,
                      expressivity: batch.settings.expressivity,
                      resemblance: batch.settings.resemblance,
                      buildingType: undefined,
                      category: undefined,
                      context: undefined,
                      styleSelection: undefined,
                      regions: {}
                    }
                  };
                  
                  
                  // Step 3: Generate with RunPod - this should add to the existing batch
                  const result = await dispatch(generateWithCurrentState(generationRequest));
                  
                  if (generateWithCurrentState.fulfilled.match(result)) {

                    // Step 4: Add processing variations immediately for loading states
                    if (result.payload.runpodJobs) {
                      const imageIds = result.payload.runpodJobs.map((job: any) => parseInt(job.imageId) || job.imageId);
                      dispatch(addProcessingVariations({
                        batchId: batch.batchId, // ✅ Use the EXISTING batch ID, not a new one
                        totalVariations: 1,
                        imageIds
                      }));
                    }

                    // Step 5: Credits will be updated automatically via WebSocket (same as Create page)

                  } else {
                    console.error('❌ Failed to add variant to batch:', result.payload);
                  }
                } catch (error) {
                  console.error('❌ Error adding variant to existing batch:', error);
                }
              } catch (outerError) {
                console.error('❌ Outer error in onGenerateVariant:', outerError);
              }
            }}
          />
        );
      }
      case 'edit': {
        const allTweakImages = historyImages.filter(img => img.moduleType === 'TWEAK');
        return (
          <TweakModeView
            images={allTweakImages.map(img => ({
              id: img.id,
              imageUrl: img.imageUrl,
              processedImageUrl: img.processedImageUrl,
              thumbnailUrl: img.thumbnailUrl,
              createdAt: img.createdAt,
              prompt: img.aiPrompt,
              variations: img.settingsSnapshot?.variations || 1,
              batchId: img.batchId,
              status: img.status,
              settings: {
                operationType: img.settingsSnapshot?.operationType || img.operationType || 'tweak',
                maskKeyword: img.settingsSnapshot?.maskKeyword || '',
                negativePrompt: img.settingsSnapshot?.negativePrompt || '',
              },
              createUploadId: img.createUploadId,
              tweakUploadId: img.tweakUploadId,
              refineUploadId: img.refineUploadId,
            }))}
            selectedBatchId={selectedBatchId}
            onDownload={handleDownload}
            onShare={handleShare}
            downloadingImages={downloadingImages}
            isSharing={isSharingImage}
            onImageSelect={() => {
              // Note: Tweak image selection functionality maintained for tweak view
            }}
            onBatchSelect={(batch) => {
              console.log('Selected tweak batch:', batch);
              // Note: Tweak batch selection functionality maintained for tweak view
            }}
            onCreateFromBatch={(batch) => {
              // Navigate to tweak page with batch information including settings
              const params = new URLSearchParams({
                fromBatch: batch.batchId.toString(),
                ...(batch.prompt && { prompt: batch.prompt }),
                ...(batch.settings && {
                  operationType: batch.settings.operationType,
                  maskKeyword: batch.settings.maskKeyword || '',
                  negativePrompt: batch.settings.negativePrompt || '',
                  variations: batch.settings.variations.toString()
                })
              });
              
              const url = `/edit?${params.toString()}`;
              
              if (onModalClose) {
                // If in modal, close modal first then navigate
                onModalClose();
                setTimeout(() => {
                  navigate(url);
                }, 100);
              } else {
                // If standalone gallery page, navigate directly
                navigate(url);
              }
            }}
            onGenerateVariant={async (batch) => {
              try {
                
                // Generate a new variant and add it to the SAME existing batch
                if (!batch.settings || batch.images.length === 0) {
                  console.error('❌ Invalid batch for tweak variant generation:', batch);
                  return;
                }
                
                try {
                  
                  // Step 1: Get the original batch settings to determine operation type and parameters
                  let batchSettings: any;
                  
                  try {
                    const batchResult = await dispatch(loadBatchSettings(batch.batchId));
                    
                    if (loadBatchSettings.fulfilled.match(batchResult)) {
                      batchSettings = batchResult.payload;
                    } else {
                      console.error('❌ Failed to load tweak batch settings:', batchResult.payload);
                      return;
                    }
                  } catch (error) {
                    console.error('❌ Error loading tweak batch settings:', error);
                    return;
                  }
                  
                  if (!batchSettings) {
                    console.error('❌ No batch settings found for tweak batch:', batch.batchId);
                    return;
                  }
                  
                  // Extract settings from the response structure
                  const settings = batchSettings.settings || batchSettings;

                  // Step 2: Determine operation type and generate variant accordingly
                  const operationType = batch.settings.operationType || settings.operationType;

                  // Note: No global generation state needed for gallery variants
                  // TweakModeView manages its own loading state via generatingBatch
                  if (operationType === 'inpaint') {
                    // Generate inpaint variant
                    const inpaintRequest = {
                      baseImageUrl: settings.baseImageUrl,
                      maskImageUrl: settings.maskImageUrl,
                      prompt: batch.prompt || settings.prompt || '',
                      negativePrompt: batch.settings.negativePrompt || settings.negativePrompt || '',
                      maskKeyword: batch.settings.maskKeyword || settings.maskKeyword || '',
                      variations: 1, // Generate single additional variant
                      originalBaseImageId: settings.originalBaseImageId,
                      selectedBaseImageId: settings.selectedBaseImageId,
                      existingBatchId: batch.batchId // ✅ IMPORTANT: Tell server to add to existing batch
                    };


                    const result = await dispatch(generateInpaint(inpaintRequest) as any);
                    
                    if (generateInpaint.fulfilled.match(result)) {

                      // Step 3: Add processing variations immediately for loading states
                      if (result.payload.runpodJobs) {
                        const imageIds = result.payload.runpodJobs.map((job: any) => parseInt(job.imageId) || job.imageId);
                        dispatch(addProcessingTweakVariations({
                          batchId: batch.batchId, // ✅ Use the EXISTING batch ID, not a new one
                          totalVariations: 1,
                          imageIds
                        }));
                      }

                      // Step 4: Credits will be updated automatically via WebSocket (same as Create page)

                      // Return the result for TweakModeView component to handle
                      return result.payload;

                    } else {
                      console.error('❌ Failed to add inpaint variant to batch:', result.payload);
                      throw new Error('Failed to add inpaint variant to batch');
                    }
                    
                  } else if (operationType === 'outpaint') {
                    // Generate outpaint variant
                    const outpaintRequest = {
                      prompt: batch.prompt || settings.prompt || '',
                      baseImageUrl: settings.baseImageUrl,
                      canvasBounds: settings.canvasBounds,
                      originalImageBounds: settings.originalImageBounds,
                      variations: 1, // Generate single additional variant
                      originalBaseImageId: settings.originalBaseImageId,
                      selectedBaseImageId: settings.selectedBaseImageId,
                      existingBatchId: batch.batchId // ✅ IMPORTANT: Tell server to add to existing batch
                    };
                    
                    
                    const result = await dispatch(generateOutpaint(outpaintRequest) as any);
                    
                    if (generateOutpaint.fulfilled.match(result)) {

                      // Step 3: Add processing variations immediately for loading states
                      if (result.payload.runpodJobs) {
                        const imageIds = result.payload.runpodJobs.map((job: any) => parseInt(job.imageId) || job.imageId);
                        dispatch(addProcessingTweakVariations({
                          batchId: batch.batchId, // ✅ Use the EXISTING batch ID, not a new one
                          totalVariations: 1,
                          imageIds
                        }));
                      }

                      // Step 4: Credits will be updated automatically via WebSocket (same as Create page)

                      // Return the result for TweakModeView component to handle
                      return result.payload;

                    } else {
                      console.error('❌ Failed to add outpaint variant to batch:', result.payload);
                      throw new Error('Failed to add outpaint variant to batch');
                    }
                    
                  } else {
                    console.error('❌ Unsupported tweak operation type:', operationType);
                    return;
                  }
                  
                } catch (error) {
                  console.error('❌ Error adding tweak variant to existing batch:', error);
                }
              } catch (outerError) {
                console.error('❌ Outer error in tweak onGenerateVariant:', outerError);
              }
            }}
          />
        );
      }
      case 'upscale': {
        // Filter to only show upscaled images (REFINE module type)
        const upscaledImages = historyImages
          .filter(img => img.status === 'COMPLETED' || !img.status) // Only completed images
          .filter(img => img.moduleType === 'REFINE');

        console.log('🔍 Upscale Debug - Total images:', historyImages.length);
        console.log('🔍 Upscale Debug - Module types:', [...new Set(historyImages.map(img => img.moduleType))]);
        console.log('🔍 Upscale Debug - REFINE images:', upscaledImages.length);
        console.log('🔍 Upscale Debug - Sample images:', historyImages.slice(0, 3).map(img => ({ id: img.id, moduleType: img.moduleType, status: img.status })));
          
        return (
          <UpscaleModeView
            images={upscaledImages.map(img => ({
              id: img.id,
              imageUrl: img.imageUrl,
              thumbnailUrl: img.thumbnailUrl,
              processedImageUrl: img.processedImageUrl,
              createdAt: img.createdAt,
              prompt: img.aiPrompt,
              batchId: img.batchId,
              status: img.status,
              createUploadId: img.createUploadId,
              tweakUploadId: img.tweakUploadId,
              refineUploadId: img.refineUploadId,
              originalInputImageId: img.originalInputImageId
            }))}
            inputImages={inputImages}
            selectedBatchId={selectedBatchId}
            onDownload={handleDownload}
            onShare={handleShare}
            downloadingImages={downloadingImages}
            onImageSelect={() => {
              // Note: Upscale image selection functionality can be implemented here if needed
            }}
            activeTab="upscale"
          />
        );
      }
      case 'organize':
      default:
        return (
          <GalleryGrid
            images={completedImages}
            layout={layout}
            imageSize={imageSize}
            loading={loading}
            error={error}
            onDownload={handleDownload}
            onShare={handleShare}
            onTweakRedirect={handleTweakRedirect}
            onBatchSelect={handleBatchSelection}
            downloadingImages={downloadingImages}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-site-white font-space-grotesk">
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentStep={0} />
        <main className="flex-1 overflow-y-auto">
          <div className="flex flex-1 h-[calc(100vh-57px)]">
            {/* Left Sidebar - Gallery Navigation */}
            <GallerySidebar isModal={!!onModalClose} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Content with Right Sidebar */}
              {/* Header */}
              <div className="flex items-center justify-between p-6">
                <h1 className="text-3xl font-semibold tracking-tight font-siggnal">
                  {galleryMode === 'explore' ? 'Explore' : 'Gallery'}
                </h1>

                <div className="flex items-center gap-2">
                  {/* Customize View Controls - Only show in organize mode */}
                  {galleryMode === 'organize' && (
                    <div className="flex items-center gap-1 mr-4">
                      {/* Layout Toggle */}
                      <div className="flex border border-gray-200 rounded-md overflow-hidden">
                        <button
                          onClick={() => dispatch(setLayout('full'))}
                          className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                            layout === 'full' 
                              ? 'bg-gray-100 text-gray-900' 
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                          title="Full Layout"
                        >
                          <Grid3X3 className="w-4 h-4" />
                          Full
                        </button>
                        <button
                          onClick={() => dispatch(setLayout('square'))}
                          className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors border-l border-gray-200 ${
                            layout === 'square' 
                              ? 'bg-gray-100 text-gray-900' 
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                          title="Square Layout"
                        >
                          <Square className="w-4 h-4" />
                          Square
                        </button>
                      </div>

                      {/* Image Size Toggle */}
                      <div className="flex border border-gray-200 rounded-md overflow-hidden ml-2">
                        <button
                          onClick={() => dispatch(setImageSize('large'))}
                          className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                            imageSize === 'large' 
                              ? 'bg-gray-100 text-gray-900' 
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                          title="Large Size"
                        >
                          <Monitor className="w-4 h-4" />
                          L
                        </button>
                        <button
                          onClick={() => dispatch(setImageSize('medium'))}
                          className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors border-l border-gray-200 ${
                            imageSize === 'medium' 
                              ? 'bg-gray-100 text-gray-900' 
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                          title="Medium Size"
                        >
                          <Image className="w-4 h-4" />
                          M
                        </button>
                        <button
                          onClick={() => dispatch(setImageSize('small'))}
                          className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors border-l border-gray-200 ${
                            imageSize === 'small' 
                              ? 'bg-gray-100 text-gray-900' 
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                          title="Small Size"
                        >
                          <Smartphone className="w-4 h-4" />
                          S
                        </button>
                      </div>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="text-gray-500 hover:text-gray-900"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Close gallery
                  </Button>
                </div>
              </div>
              <div className="flex-1 flex overflow-hidden pb-6 px-6 gap-8">
                {/* Gallery Content Area */}
                <div className="flex-1 overflow-auto hide-scrollbar">
                  {renderMainContent()}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default GalleryPage;