import React, { useEffect } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useNavigate } from 'react-router-dom';
import MainLayout from "@/components/layout/MainLayout";
import GallerySidebar from "@/components/gallery/GallerySidebar";
import GalleryGrid from '@/components/gallery/GalleryGrid';
import CustomizeViewSidebar from '@/components/gallery/CustomizeViewSidebar';
import CreateModeView from '@/components/gallery/CreateModeView';
import TweakModeView from '@/components/gallery/TweakModeView';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

// Redux actions
import { fetchAllVariations, generateWithCurrentState, addProcessingVariations } from '@/features/images/historyImagesSlice';
import { setLayout, setImageSize, setIsVariantGenerating } from '@/features/gallery/gallerySlice';
import { SLIDER_CONFIGS } from '@/constants/editInspectorSliders';
import { fetchCurrentUser } from '@/features/auth/authSlice';
import { loadBatchSettings } from '@/features/customization/customizationSlice';

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
  const loading = useAppSelector(state => state.historyImages.loading);
  const error = useAppSelector(state => state.historyImages.error);
  
  // Gallery state
  const layout = useAppSelector(state => state.gallery.layout);
  const imageSize = useAppSelector(state => state.gallery.imageSize);
  const galleryMode = useAppSelector(state => state.gallery.mode);
  const isVariantGenerating = useAppSelector(state => state.gallery.isVariantGenerating);

  // Reset selections when gallery mode changes
  useEffect(() => {
    // No local state to reset for Create mode
  }, [galleryMode]);

  // Load all generated images on component mount
  useEffect(() => {
    console.log('🚀 Loading variations for gallery...');
    dispatch(fetchAllVariations({ page: 1, limit: 100 }));
  }, [dispatch]);

  // Debug effect to see when images load
  useEffect(() => {
    console.log('🔄 Loading state:', loading, 'Error:', error);
    if (historyImages.length > 0) {
      console.log('📸 History images loaded:', historyImages.length);
      console.log('📄 First few images:', historyImages.slice(0, 3));
    } else {
      console.log('❌ No history images available');
    }
  }, [historyImages, loading, error]);

  // Use historyImages directly - it already includes all module types (CREATE, TWEAK, REFINE) from getAllCompletedVariations
  const completedImages = historyImages
    .filter(img => img.status === 'COMPLETED' || !img.status) // Include images without status for backward compatibility
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleClose = () => {
    // Prevent closing if variant is generating
    if (isVariantGenerating) {
      console.log('⚠️ Gallery close prevented: variant generation in progress');
      return;
    }
    
    if (onModalClose) {
      // If used as modal, call the modal close handler
      onModalClose();
    } else {
      // Otherwise, navigate back
      window.history.back();
    }
  };

  const handleDownload = (imageUrl: string, imageId: number) => {
    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `image_${imageId}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        // TODO: Add toast notification
        console.log('Image URL copied to clipboard');
      } catch (error) {
        console.log('Error copying to clipboard:', error);
      }
    }
  };

  // Handle Tweak redirection from gallery
  const handleTweakRedirect = (imageId: number) => {
    console.log('🔄 Gallery: Redirecting to Tweak page with image:', imageId);
    
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

  // Render different content based on gallery mode
  const renderMainContent = () => {
    switch (galleryMode) {
      case 'create':
        console.log('🖼️ All completed images for Create mode:', completedImages);
        console.log('🛠️ Sample image settings:', completedImages[0]?.settingsSnapshot);
        
        // Filter historyImages to only include CREATE module images
        const createModeImages = historyImages.filter(img => img.moduleType === 'CREATE' || !img.moduleType);
        console.log('🎨 Filtered CREATE images:', createModeImages.length, 'out of', historyImages.length, 'total images');
        
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
              }
            }))}
            onDownload={handleDownload}
            onShare={handleShare}
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
                  window.location.href = url;
                }, 100);
              } else {
                // If standalone gallery page, navigate directly
                window.location.href = url;
              }
            }}
            onGenerateVariant={async (batch) => {
              try {
                console.log('🔥 onGenerateVariant called for batch:', batch.batchId);
                
                // Generate a new variant and add it to the SAME existing batch
                if (!batch.settings || batch.images.length === 0) {
                  console.error('❌ Invalid batch for variant generation:', batch);
                  return;
                }
                
                try {
                  // Set variant generating state to prevent gallery from closing
                  dispatch(setIsVariantGenerating(true));
                  console.log('🎨 Adding new variant to existing batch:', batch.batchId);
                  
                  // Step 1: Get the original input image ID that was used for this batch
                  let batchInputImageId: number | undefined;
                  
                  try {
                    console.log('🔍 Getting original input image from batch settings...');
                    const batchResult = await dispatch(loadBatchSettings(batch.batchId));
                    
                    if (loadBatchSettings.fulfilled.match(batchResult)) {
                      batchInputImageId = batchResult.payload.inputImageId;
                      console.log('✅ Found original input image ID from batch:', batchInputImageId);
                    } else {
                      console.error('❌ Failed to load batch settings:', batchResult.payload);
                      dispatch(setIsVariantGenerating(false));
                      return;
                    }
                  } catch (error) {
                    console.error('❌ Error loading batch settings:', error);
                    dispatch(setIsVariantGenerating(false));
                    return;
                  }
                  
                  if (!batchInputImageId) {
                    console.error('❌ No input image ID found for batch:', batch.batchId);
                    dispatch(setIsVariantGenerating(false));
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
                  
                  console.log('🚀 Adding variant to existing batch with same input image:', {
                    batchId: batch.batchId,
                    inputImageId: batchInputImageId,
                    settings: generationRequest.settings
                  });
                  
                  // Step 3: Generate with RunPod - this should add to the existing batch
                  const result = await dispatch(generateWithCurrentState(generationRequest));
                  
                  if (generateWithCurrentState.fulfilled.match(result)) {
                    console.log('✅ Variant generation started, adding to batch:', batch.batchId);
                    
                    // Step 4: Add processing variations immediately for loading states
                    if (result.payload.runpodJobs) {
                      const imageIds = result.payload.runpodJobs.map((job: any) => parseInt(job.imageId) || job.imageId);
                      dispatch(addProcessingVariations({
                        batchId: batch.batchId, // ✅ Use the EXISTING batch ID, not a new one
                        totalVariations: 1,
                        imageIds
                      }));
                    }
                    
                    // Step 5: Refresh user credits
                    console.log('💳 Refreshing credits after adding variant to batch');
                    dispatch(fetchCurrentUser());
                    
                    console.log('🎉 Successfully added new variant to existing batch:', batch.batchId);
                  } else {
                    console.error('❌ Failed to add variant to batch:', result.payload);
                  }
                } catch (error) {
                  console.error('❌ Error adding variant to existing batch:', error);
                } finally {
                  // Clear variant generating state to allow gallery to close again
                  dispatch(setIsVariantGenerating(false));
                }
              } catch (outerError) {
                console.error('❌ Outer error in onGenerateVariant:', outerError);
                // Ensure state cleanup even in outer errors
                dispatch(setIsVariantGenerating(false));
              }
            }}
          />
        );
      case 'edit':
        console.log('🔧 All completed tweak images for Tweak mode:', allTweakImages);
        console.log('🛠️ Sample tweak image settings:', allTweakImages[0]?.settingsSnapshot);
        return (
          <TweakModeView
            images={allTweakImages.map(img => ({
              id: img.id,
              imageUrl: img.imageUrl,
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
              }
            }))}
            onDownload={handleDownload}
            onShare={handleShare}
            onImageSelect={(image) => {
              console.log('Selected tweak image:', image);
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
                  window.location.href = url;
                }, 100);
              } else {
                // If standalone gallery page, navigate directly
                window.location.href = url;
              }
            }}
            onGenerateVariant={async (batch) => {
              // Generate a new variant for tweak operations (similar to Create but adapted for tweak)
              if (batch.settings && batch.images.length > 0) {
                try {
                  console.log('🎨 Adding new tweak variant to existing batch:', batch.batchId);
                  
                  // For tweak operations, we need to use the same base image and settings
                  // This would require calling the appropriate tweak endpoint (inpaint/outpaint)
                  // For now, just log the action - implementation would depend on the specific tweak operation
                  console.log('🔧 Tweak variant generation not implemented yet for batch:', batch.batchId);
                  console.log('📝 Batch settings:', batch.settings);
                  
                  // TODO: Implement tweak variant generation
                  // This would call generateInpaint or generateOutpaint with the same parameters
                  
                } catch (error) {
                  console.error('❌ Error adding tweak variant to existing batch:', error);
                }
              }
            }}
          />
        );
      case 'upscale':
        // For now, show the same as organize - can be customized later
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
          />
        );
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
          />
        );
    }
  };

  const renderRightSidebar = () => {
    switch (galleryMode) {
      case 'create':
        // Prepare data for sidebar - prioritize batch data over individual image data
        // const sidebarData = selectedBatch ? {
        //   id: selectedBatch.batchId,
        //   prompt: selectedBatch.prompt,
        //   variations: selectedBatch.settings?.variations,
        //   settings: selectedBatch.settings
        // } : selectedCreateImage;

        return (
          <></>
          // <CreateControlsSidebar 
          //   selectedImage={sidebarData}
          //   selectedBatch={selectedBatch}
          //   onRegenerate={(settings) => {
          //     console.log('Regenerate with settings:', settings);
          //     // TODO: Implement regeneration logic
          //   }}
          //   onCreateFromBatch={async (settings) => {
          //     if (!selectedBatch) {
          //       console.error('No batch selected for creation');
          //       return;
          //     }

          //     try {
          //       console.log('Creating new batch from existing batch:', {
          //         batchId: selectedBatch.batchId,
          //         settings
          //       });

          //       // Convert Edit Inspector settings to RunPod settings format
          //       const runpodSettings = {
          //         // Map creativity, expressivity, resemblance to RunPod parameters
          //         // For now, use default values and extend this mapping as needed
          //         stepsKsampler1: 20,
          //         cfgKsampler1: 7,
          //         denoiseKsampler1: 0.8,
          //       };
                
          //       // Dispatch the createFromBatch action
          //       const result = await dispatch(createFromBatch({
          //         batchId: selectedBatch.batchId,
          //         variations: settings.variations || 1,
          //         settings: runpodSettings
          //       }));

          //       if (createFromBatch.fulfilled.match(result)) {
          //         console.log('✅ Successfully created new batch from existing batch');
          //         // Refresh the gallery to show the new batch
          //         dispatch(fetchAllVariations({ page: 1, limit: 50 }));
          //       } else {
          //         console.error('❌ Failed to create from batch:', result.payload);
          //         // TODO: Show error toast
          //       }
          //     } catch (error) {
          //       console.error('❌ Error creating from batch:', error);
          //       // TODO: Show error toast
          //     }
          //   }}
          // />
        );
      case 'edit':
        // Prepare data for tweak sidebar - prioritize batch data over individual image data
        // const tweakSidebarData = selectedTweakBatch ? {
        //   id: selectedTweakBatch.batchId,
        //   prompt: selectedTweakBatch.prompt,
        //   aiPrompt: selectedTweakBatch.prompt, // 🔥 FIX: Ensure aiPrompt is available for TweakControlsSidebar
        //   variations: selectedTweakBatch.settings?.variations,
        //   settings: selectedTweakBatch.settings
        // } : selectedTweakImage;

        return (
          <></>
          // <TweakControlsSidebar 
          //   selectedImage={tweakSidebarData}
          //   selectedBatch={selectedTweakBatch}
          //   onRegenerate={(settings) => {
          //     console.log('Regenerate tweak with settings:', settings);
          //     // TODO: Implement tweak regeneration logic
          //   }}
          //   onCreateFromBatch={async (settings) => {
          //     if (!selectedTweakBatch) {
          //       console.error('No tweak batch selected for creation');
          //       return;
          //     }

          //     try {
          //       console.log('Creating new tweak from existing batch:', {
          //         batchId: selectedTweakBatch.batchId,
          //         settings
          //       });

          //       // TODO: Implement createFromTweakBatch logic
          //       // This would involve recreating the tweak operation with new settings
          //       console.log('🔧 Create from tweak batch not implemented yet');
                
          //     } catch (error) {
          //       console.error('❌ Error creating from tweak batch:', error);
          //       // TODO: Show error toast
          //     }
          //   }}
          // />
        );
      case 'organize':
      default:
        return (
          <CustomizeViewSidebar
            layout={layout}
            imageSize={imageSize}
            onLayoutChange={(newLayout) => dispatch(setLayout(newLayout))}
            onImageSizeChange={(newSize) => dispatch(setImageSize(newSize))}
          />
        );
    }
  };

  return (
    <MainLayout>
      {/* Left Sidebar - Gallery Navigation */}
      <GallerySidebar isModal={!!onModalClose} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content with Right Sidebar */}
        <div className="flex-1 flex overflow-hidden p-6 gap-8">
          {/* Gallery Content Area */}
          <div className="flex-1 overflow-auto hide-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between py-4 bg-white sticky top-0 z-30">
              <h1 className="text-2xl font-semibold tracking-tight">Gallery</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={isVariantGenerating}
                className={`${isVariantGenerating ? 'opacity-50 cursor-not-allowed' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <X className="w-4 h-4 mr-2" />
                {isVariantGenerating ? 'Generating...' : 'Close gallery'}
              </Button>
            </div>
            {renderMainContent()}
          </div>

          {/* Right Sidebar - Mode-specific */}
          {renderRightSidebar()}
        </div>
      </div>
    </MainLayout>
  );
};

export default GalleryPage;