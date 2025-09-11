import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useRunPodWebSocket } from '@/hooks/useRunPodWebSocket';
import toast from 'react-hot-toast';
import MainLayout from "@/components/layout/MainLayout";
import RefineEditInspector from '@/components/refine/RefineEditInspector';
import RefineImageCanvas from '@/components/refine/RefineImageCanvas';
import HistoryPanel from '@/components/create/HistoryPanel';
import RefineInputHistoryPanel from '@/components/refine/RefineInputHistoryPanel';
import RefineAIPromptInput from '@/components/refine/RefineAIPromptInput';
import RefineFileUpload from '@/components/refine/RefineFileUpload';
import GalleryModal from '@/components/gallery/GalleryModal';

// Redux actions
import { uploadInputImage } from '@/features/images/inputImagesSlice';
import { fetchInputAndCreateImages, fetchAllVariations, fetchAllTweakImages } from '@/features/images/historyImagesSlice';
import { 
  fetchAvailableImages,
  fetchRefineOperations,
  setSelectedImage,
  loadRefineSettings,
  setIsGenerating,
  setIsPromptModalOpen
} from '@/features/refine/refineSlice';
import { setIsModalOpen, setMode } from '@/features/gallery/gallerySlice';
import { resetSettings } from '@/features/customization/customizationSlice';
import { getMasks, resetMaskState, getAIPromptMaterials, clearMaskMaterialSelections, clearSavedPrompt, getSavedPrompt } from '@/features/masks/maskSlice';

const RefinePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Local state for UI
  const [editInspectorMinimized, setEditInspectorMinimized] = useState(false);
  
  // Redux selectors - Refine specific
  const {
    selectedImageId,
    selectedImageUrl,
    operations,
    loadingOperations,
    shouldFetchOperations,
    isGenerating,
    isPromptModalOpen,
    viewMode
  } = useAppSelector(state => state.refine);
  
  // Input images from REFINE_MODULE only
  const inputImages = useAppSelector(state => state.historyImages.inputImages);
  const createImages = useAppSelector(state => state.historyImages.createImages);
  const allTweakImages = useAppSelector(state => state.historyImages.allTweakImages);
  const loadingInputAndCreate = useAppSelector(state => state.historyImages.loadingInputAndCreate);
  const loadingAllTweakImages = useAppSelector(state => state.historyImages.loadingAllTweakImages);

  // Check if we have any images to determine layout
  const hasAnyImages = (inputImages && inputImages.length > 0) || 
                       (createImages && createImages.length > 0) || 
                       (allTweakImages && allTweakImages.length > 0);
                      
  // Combine and sort images from all sources
  const sortedImages = [...(inputImages || []).map(img => ({...img, source: 'refine_uploaded' as const})), 
                       ...(createImages || []).map(img => ({...img, source: 'create_generated' as const})), 
                       ...(allTweakImages || []).filter(img => img.status === 'COMPLETED').map(img => ({...img, source: 'tweak_generated' as const}))].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt).getTime();
    return dateB - dateA;
  });
  
  // Gallery modal state
  const isGalleryModalOpen = useAppSelector(state => state.gallery.isModalOpen);
  
  // Customization selectors
  const { availableOptions } = useAppSelector(state => state.customization);

  // WebSocket integration for real-time updates
  const { isConnected } = useRunPodWebSocket({
    inputImageId: selectedImageId || undefined,
    enabled: !!selectedImageId
  });

  console.log('REFINE WebSocket connected:', isConnected);
  console.log('REFINE selectedImageId:', selectedImageId, 'isGenerating:', isGenerating);
  
  // Handle navigation from create page with pre-selected image
  useEffect(() => {
    const state = location.state as { imageId?: number; imageUrl?: string; imageType?: 'generated' | 'uploaded' } | null;
    if (state?.imageId && state?.imageUrl) {
      console.log('🔗 Navigated from create page with image:', state);
      // Set the selected image based on the passed data
      dispatch(setSelectedImage({ 
        id: state.imageId, 
        url: state.imageUrl, 
        type: state.imageType === 'uploaded' ? 'input' : 'generated' 
      }));
      
      // Clear the navigation state to prevent re-selection on page refresh
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.state, dispatch]);

  // Handle URL parameter for direct image selection (enhanced multi-source support)
  useEffect(() => {
    // Only handle URL params after initial data is loaded
    if (!hasAnyImages && (loadingInputAndCreate || loadingAllTweakImages)) {
      console.log('⏳ Waiting for initial data to load before processing URL parameters...');
      return;
    }

    const imageIdParam = searchParams.get('imageId');
    const typeParam = searchParams.get('type'); // 'input' or 'generated'
    
    if (imageIdParam && !selectedImageId) {
      const targetImageId = parseInt(imageIdParam);
      const imageType = typeParam === 'generated' ? 'generated' : 'input'; // Default to 'input' for backward compatibility
      
      if (!isNaN(targetImageId)) {
        console.log('🔗 URL parameter detected: Selecting image for refine:', { targetImageId, type: imageType });
        
        if (imageType === 'input') {
          // Handle input image selection (refine uploaded)
          const inputImage = inputImages.find(img => img.id === targetImageId);
          
          if (inputImage) {
            console.log('✅ Found refine uploaded image, selecting:', targetImageId);
            dispatch(setSelectedImage({
              id: targetImageId,
              url: inputImage.imageUrl,
              type: 'input'
            }));
            
            // Clear URL parameters after successful selection
            setTimeout(() => {
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.delete('imageId');
              newSearchParams.delete('type');
              setSearchParams(newSearchParams);
            }, 1000);
          } else {
            console.log('❌ Refine uploaded image not found:', targetImageId);
          }
        } else if (imageType === 'generated') {
          // Handle generated image selection (create or tweak generated)
          // First try tweak generated images
          const tweakImage = allTweakImages?.find(img => img.id === targetImageId && img.status === 'COMPLETED');
          
          if (tweakImage) {
            console.log('✅ Found tweak generated image, selecting:', {
              id: tweakImage.id,
              imageUrl: tweakImage.imageUrl,
              createdAt: tweakImage.createdAt
            });
            dispatch(setSelectedImage({
              id: targetImageId,
              url: tweakImage.imageUrl,
              type: 'generated'
            }));
            
            // Clear URL parameters after successful selection
            setTimeout(() => {
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.delete('imageId');
              newSearchParams.delete('type');
              setSearchParams(newSearchParams);
            }, 1000);
          } else {
            // Try create generated images
            const createImage = createImages?.find(img => img.id === targetImageId && img.status === 'COMPLETED');
            
            if (createImage) {
              console.log('✅ Found create generated image, selecting:', {
                id: createImage.id,
                imageUrl: createImage.imageUrl,
                createdAt: createImage.createdAt
              });
              dispatch(setSelectedImage({
                id: targetImageId,
                url: createImage.imageUrl,
                type: 'generated'
              }));
              
              // Clear URL parameters after successful selection
              setTimeout(() => {
                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.delete('imageId');
                newSearchParams.delete('type');
                setSearchParams(newSearchParams);
              }, 1000);
            } else {
              console.log('❌ Generated image not found:', targetImageId);
              console.log('📋 Available tweak images:', allTweakImages?.map(img => ({ id: img.id, status: img.status })));
              console.log('📋 Available create images:', createImages?.map(img => ({ id: img.id, status: img.status })));
            }
          }
        }
      } else {
        console.warn('⚠️ Invalid imageId URL parameter:', imageIdParam);
      }
    }
  }, [searchParams, selectedImageId, inputImages, createImages, allTweakImages, hasAnyImages, loadingInputAndCreate, loadingAllTweakImages, dispatch, setSearchParams]);

  // EFFECT: Retry URL parameter selection if image wasn't found initially but becomes available
  useEffect(() => {
    const imageIdParam = searchParams.get('imageId');
    const typeParam = searchParams.get('type');
    
    // Only retry if we have URL params but no selected image
    if (imageIdParam && !selectedImageId) {
      const targetImageId = parseInt(imageIdParam);
      
      if (typeParam === 'generated' && (allTweakImages?.length > 0 || createImages?.length > 0)) {
        // First try tweak generated images
        const tweakImage = allTweakImages?.find(img => img.id === targetImageId && img.status === 'COMPLETED');
        
        if (tweakImage) {
          console.log('🔄 Retry: Found tweak generated image on subsequent load:', tweakImage.id);
          dispatch(setSelectedImage({
            id: targetImageId,
            url: tweakImage.imageUrl,
            type: 'generated'
          }));
          
          // Clear URL parameters after successful selection
          setTimeout(() => {
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('imageId');
            newSearchParams.delete('type');
            setSearchParams(newSearchParams);
          }, 1000);
        } else {
          // Try create generated images
          const createImage = createImages?.find(img => img.id === targetImageId && img.status === 'COMPLETED');
          
          if (createImage) {
            console.log('🔄 Retry: Found create generated image on subsequent load:', createImage.id);
            dispatch(setSelectedImage({
              id: targetImageId,
              url: createImage.imageUrl,
              type: 'generated'
            }));
            
            // Clear URL parameters after successful selection
            setTimeout(() => {
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.delete('imageId');
              newSearchParams.delete('type');
              setSearchParams(newSearchParams);
            }, 1000);
          }
        }
      } else if (typeParam === 'input' && inputImages.length > 0) {
        const inputImage = inputImages.find(img => img.id === targetImageId);
        
        if (inputImage) {
          console.log('🔄 Retry: Found refine uploaded image on subsequent load:', inputImage.id);
          dispatch(setSelectedImage({
            id: targetImageId,
            url: inputImage.imageUrl,
            type: 'input'
          }));
          
          // Clear URL parameters after successful selection
          setTimeout(() => {
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('imageId');
            newSearchParams.delete('type');
            setSearchParams(newSearchParams);
          }, 1000);
        }
      }
    }
  }, [inputImages, createImages, allTweakImages, searchParams, selectedImageId, dispatch, setSearchParams]);

  // Auto-select most recent image if none selected (priority: tweak generated -> refine uploaded -> create generated)
  useEffect(() => {
    if (!selectedImageId && hasAnyImages) {
      // Priority 1: Latest tweak generated image
      const completedTweakImages = allTweakImages?.filter(img => img.status === 'COMPLETED') || [];
      if (completedTweakImages.length > 0) {
        const mostRecentTweak = [...completedTweakImages].sort((a, b) => 
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        )[0];
        console.log('🎯 Auto-selecting most recent tweak generated image:', mostRecentTweak.id);
        dispatch(setSelectedImage({ 
          id: mostRecentTweak.id, 
          url: mostRecentTweak.imageUrl, 
          type: 'generated' 
        }));
      }
      // Priority 2: Latest refine uploaded image
      else if (inputImages.length > 0) {
        const mostRecentInput = [...inputImages].sort((a, b) => 
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        )[0];
        console.log('🎯 Auto-selecting most recent REFINE input image:', mostRecentInput.id);
        dispatch(setSelectedImage({ 
          id: mostRecentInput.id, 
          url: mostRecentInput.imageUrl, 
          type: 'input' 
        }));
      }
      // Priority 3: Latest create generated image
      else if (createImages?.length > 0) {
        const completedCreateImages = createImages.filter(img => img.status === 'COMPLETED');
        if (completedCreateImages.length > 0) {
          const mostRecentCreate = [...completedCreateImages].sort((a, b) => 
            new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
          )[0];
          console.log('🎯 Auto-selecting most recent create generated image:', mostRecentCreate.id);
          dispatch(setSelectedImage({ 
            id: mostRecentCreate.id, 
            url: mostRecentCreate.imageUrl, 
            type: 'generated' 
          }));
        }
      }
    }
  }, [selectedImageId, hasAnyImages, inputImages, createImages, allTweakImages, dispatch]);

  // Note: Removed subscription check to allow free access to Refine page for image upload and setup

  // Load initial data and customization options
  useEffect(() => {
    // Load input images with REFINE_MODULE filter to maintain module isolation
    dispatch(fetchInputAndCreateImages({ page: 1, limit: 100, uploadSource: 'REFINE_MODULE' }));
    
    // Load all create generated images
    dispatch(fetchAllVariations({ page: 1, limit: 100 }));
    
    // Load all tweak generated images
    dispatch(fetchAllTweakImages());
    
    // Also load available images for refine operations
    dispatch(fetchAvailableImages());
    
    // Reset settings to initial state on component mount
    dispatch(resetSettings());
  }, [dispatch]);

  // Load operations and related data when image is selected
  useEffect(() => {
    if (selectedImageId && shouldFetchOperations) {
      console.log('Fetching refine operations for selected image:', selectedImageId);
      dispatch(fetchRefineOperations(selectedImageId));
      dispatch(loadRefineSettings(selectedImageId));
      
      // Load masks and AI materials for the selected image
      dispatch(getMasks(selectedImageId));
      dispatch(getAIPromptMaterials(selectedImageId));
      dispatch(getSavedPrompt(selectedImageId));
    }
  }, [selectedImageId, shouldFetchOperations, dispatch]);

  
  // Handle image upload
  const handleImageUpload = async (file: File) => {
    try {
      const resultAction = await dispatch(uploadInputImage({ 
        file, 
        uploadSource: 'REFINE_MODULE' 
      }));
      
      if (uploadInputImage.fulfilled.match(resultAction)) {
        const uploadedImage = resultAction.payload;
        console.log('✅ Image uploaded successfully to REFINE_MODULE:', {
          id: uploadedImage.id,
          processedUrl: uploadedImage.processedUrl,
          originalUrl: uploadedImage.originalUrl,
          imageUrl: uploadedImage.imageUrl
        });
        
        // Auto-select the uploaded image FIRST (before refresh)
        const imageUrlToUse = uploadedImage.processedUrl || uploadedImage.imageUrl || uploadedImage.originalUrl;
        dispatch(setSelectedImage({
          id: uploadedImage.id,
          url: imageUrlToUse,
          type: 'input'
        }));
        
        console.log('🎯 Selected uploaded image:', { id: uploadedImage.id, url: imageUrlToUse });
        
        // Then refresh images after upload with REFINE_MODULE filter
        dispatch(fetchInputAndCreateImages({ page: 1, limit: 100, uploadSource: 'REFINE_MODULE' }));
        
        // Also refresh other image sources
        dispatch(fetchAllVariations({ page: 1, limit: 100 }));
        dispatch(fetchAllTweakImages());
        
        toast.success('Image uploaded successfully');
      } else if (uploadInputImage.rejected.match(resultAction)) {
        const errorMessage = resultAction.payload as string;
        toast.error(errorMessage || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('An unexpected error occurred during upload');
    }
  };

  const handleOpenGallery = () => {
    dispatch(setMode('upscale'));
    dispatch(setIsModalOpen(true));
  };

  const handleCloseGallery = () => {
    dispatch(setIsModalOpen(false));
  };

  // Handle submit for refine operations
  const handleSubmit = async (userPrompt?: string, contextSelection?: string) => {
    console.log('Submit button clicked - Starting refine operation');
    console.log('🔍 Current state:', { 
      selectedImageId, 
      userPrompt,
      contextSelection
    });
    
    // TODO: Implement refine-specific submission logic
    // This will be different from Create page as it handles refining existing images
    console.log('Refine submission logic to be implemented');
  };

  // Handle prompt modal toggle
  const handleTogglePromptModal = (isOpen: boolean) => {
    dispatch(setIsPromptModalOpen(isOpen));
  };

  // Handle image selection (supports all image types)
  const handleSelectImage = (imageId: number) => {
    console.log('🖼️ handleSelectImage called:', { imageId });
    console.log('🔍 Available image sources:', {
      inputImages: inputImages.map(img => ({ id: img.id, url: img.imageUrl?.slice(-20) })),
      createImages: createImages?.map(img => ({ id: img.id, url: img.imageUrl?.slice(-20) })) || [],
      tweakImages: allTweakImages?.map(img => ({ id: img.id, url: img.imageUrl?.slice(-20) })) || []
    });
    
    // Reset mask state when switching images
    dispatch(resetMaskState());
    dispatch(clearMaskMaterialSelections());
    dispatch(clearSavedPrompt());
    
    // Check in refine uploaded images first
    const inputImage = inputImages.find(img => img.id === imageId);
    if (inputImage) {
      console.log('✅ Found in refine uploaded images:', {
        id: imageId,
        url: inputImage.imageUrl,
        source: 'input'
      });
      dispatch(setSelectedImage({
        id: imageId,
        url: inputImage.imageUrl,
        type: 'input'
      }));
      dispatch(resetSettings());
      return;
    }
    
    // Check in create generated images
    const createImage = createImages?.find(img => img.id === imageId);
    if (createImage) {
      console.log('✅ Found in create generated images:', {
        id: imageId,
        url: createImage.imageUrl,
        source: 'create'
      });
      dispatch(setSelectedImage({
        id: imageId,
        url: createImage.imageUrl,
        type: 'generated'
      }));
      dispatch(resetSettings());
      return;
    }
    
    // Check in tweak generated images
    const tweakImage = allTweakImages?.find(img => img.id === imageId);
    if (tweakImage) {
      console.log('✅ Found in tweak generated images:', {
        id: imageId,
        url: tweakImage.imageUrl,
        source: 'tweak'
      });
      dispatch(setSelectedImage({
        id: imageId,
        url: tweakImage.imageUrl,
        type: 'generated'
      }));
      dispatch(resetSettings());
      return;
    }
    
    console.log('❌ Image not found in any source for selection:', imageId);
  };
  
  // Handle selection of refine operation results
  const handleSelectRefineResult = (imageId: number) => {
    console.log('🖼️ handleSelectRefineResult called:', { imageId });
    
    const selectedOperation = operations.find(op => op.id === imageId);
    if (selectedOperation && selectedOperation.resultImageUrl) {
      // For refine results, we update the selected image to show the refined result
      console.log('Selected refine result:', selectedOperation.resultImageUrl);
      dispatch(setSelectedImage({
        id: imageId,
        url: selectedOperation.resultImageUrl,
        type: 'generated'
      }));
    }
  };

  // Handle download
  const handleDownload = () => {
    console.log('Download image:', selectedImageId);
  };

  // Get current image URL for display
  const getCurrentImageUrl = () => {
    if (!selectedImageId) {
      console.log('🔍 getCurrentImageUrl: No selectedImageId');
      return undefined;
    }
    
    console.log('🔍 getCurrentImageUrl: Looking for image:', selectedImageId);
    console.log('🔍 getCurrentImageUrl: selectedImageUrl from Redux:', selectedImageUrl);
    console.log('🔍 getCurrentImageUrl: Current Redux state:', { selectedImageId, selectedImageUrl });
    
    // PRIORITY 1: Use selectedImageUrl from Redux state if it exists (set by setSelectedImage)
    if (selectedImageUrl) {
      console.log('✅ Using selectedImageUrl from Redux state:', selectedImageUrl);
      return selectedImageUrl;
    }
    
    console.log('🔍 getCurrentImageUrl: No selectedImageUrl in Redux, searching in sources...');
    console.log('🔍 getCurrentImageUrl: Available sources:', {
      operations: operations.length,
      inputImages: inputImages.length,
      createImages: createImages?.length || 0,
      tweakImages: allTweakImages?.length || 0
    });
    
    // PRIORITY 2: Check refine operation results
    const refineOperation = operations.find(op => op.id === selectedImageId);
    if (refineOperation) {
      const url = refineOperation.resultImageUrl || refineOperation.processedImageUrl;
      console.log('✅ Found in refine operations:', url);
      return url;
    }
    
    // PRIORITY 3: Check input images (refine uploaded)
    const inputImage = inputImages.find(img => img.id === selectedImageId);
    if (inputImage) {
      console.log('✅ Found in input images:', inputImage.imageUrl);
      return inputImage.imageUrl;
    }
    
    // PRIORITY 4: Check create generated images
    const createImage = createImages?.find(img => img.id === selectedImageId);
    if (createImage) {
      console.log('✅ Found in create images:', createImage.imageUrl);
      return createImage.imageUrl;
    }
    
    // PRIORITY 5: Check tweak generated images
    const tweakImage = allTweakImages?.find(img => img.id === selectedImageId);
    if (tweakImage) {
      console.log('✅ Found in tweak images:', tweakImage.imageUrl);
      return tweakImage.imageUrl;
    }
    
    console.log('❌ Image not found in any source');
    return undefined;
  };
  
  // Get original input image ID for mask operations
  const getOriginalInputImageId = () => {
    return selectedImageId || undefined;
  };


  // WebSocket event handlers for refine operations
  useEffect(() => {
    if (!isConnected) return;

    // WebSocket event handlers would be implemented here when needed
    // For now, we'll rely on the fallback polling mechanism below
    
  }, [isConnected, selectedImageId, dispatch]);

  // Auto-detect new refined images (fallback when WebSocket fails)
  useEffect(() => {
    if (isGenerating && selectedImageId) {
      const timeoutId = setTimeout(() => {
        // Refresh operations to check for completed items
        dispatch(fetchRefineOperations(selectedImageId));
        
        // Check if generation should be stopped
        const recentOperations = operations.filter(op => {
          const opTime = new Date(op.createdAt).getTime();
          const tenSecondsAgo = Date.now() - 10000;
          return op.status === 'COMPLETED' && opTime > tenSecondsAgo;
        });
        
        if (recentOperations.length > 0) {
          console.log('🎯 FALLBACK: Auto-detected new completed refine operation');
          dispatch(setIsGenerating(false));
        }
      }, 10000); // Wait 10 seconds before checking
      
      return () => clearTimeout(timeoutId);
    }
  }, [isGenerating, selectedImageId, operations.length, dispatch]);

  return (
    <MainLayout>
      <div className="flex-1 flex overflow-hidden relative">
        {/* Show normal layout when any images exist */}
        {hasAnyImages ? (
          <>
            <div className={`transition-all flex gap-3 z-100 pl-2 h-full ${editInspectorMinimized ? 'absolute top-0 left-0' : 'relative'}`}>
              <div>
                <RefineInputHistoryPanel
                  images={sortedImages.map(img => ({
                    id: img.id,
                    imageUrl: img.imageUrl || '',
                    thumbnailUrl: img.thumbnailUrl || undefined,
                    createdAt: new Date(img.createdAt),
                    source: img.source,
                    moduleType: img.moduleType
                  }))}
                  selectedImageId={(() => {
                    console.log('🔍 RefineInputHistoryPanel selectedImageId check:', {
                      selectedImageId,
                      imageIdsInPanel: sortedImages.map(img => img.id),
                      isSelectedImageInPanel: sortedImages.some(img => img.id === selectedImageId)
                    });
                    return selectedImageId || undefined;
                  })()}
                  onSelectImage={handleSelectImage}
                  onUploadImage={handleImageUpload}
                  loading={(loadingInputAndCreate || loadingAllTweakImages) && sortedImages.length === 0}
                  error={null}
                />
              </div>
            
              <RefineEditInspector 
                imageUrl={getCurrentImageUrl()} 
                inputImageId={getOriginalInputImageId()}
                setIsPromptModalOpen={handleTogglePromptModal}
                editInspectorMinimized={editInspectorMinimized}
                setEditInspectorMinimized={setEditInspectorMinimized}
              />
            </div>

            <div className={`flex-1 flex flex-col relative transition-all`}>
              <div className="flex-1 relative">
                <RefineImageCanvas 
                  imageUrl={getCurrentImageUrl()} 
                  originalImageUrl={selectedImageUrl || undefined}
                  operations={operations}
                  loading={loadingOperations}
                  setIsPromptModalOpen={handleTogglePromptModal}
                  editInspectorMinimized={editInspectorMinimized}
                  onDownload={handleDownload}
                  onOpenGallery={handleOpenGallery}
                  viewMode={viewMode}
                />

                {isPromptModalOpen && (
                  <RefineAIPromptInput 
                    editInspectorMinimized={editInspectorMinimized}
                    handleSubmit={handleSubmit}
                    setIsPromptModalOpen={handleTogglePromptModal}
                    loading={loadingOperations}
                    inputImageId={getOriginalInputImageId()}
                  />
                )}
              </div>

              <HistoryPanel 
                images={operations.map(op => ({
                  id: op.id,
                  imageUrl: op.resultImageUrl || op.processedImageUrl || '',
                  thumbnailUrl: op.thumbnailUrl,
                  createdAt: new Date(op.createdAt),
                  status: op.status,
                  batchId: op.batchId,
                  variationNumber: undefined
                }))}
                selectedImageId={operations.find(op => op.id === selectedImageId)?.id} // Show selection for refine results
                onSelectImage={handleSelectRefineResult}
                loading={loadingOperations}
              />
            </div>
          </>
        ) : (
          /* Show file upload section when no images exist */
          <div className="flex-1 flex items-center justify-center">
            <RefineFileUpload 
              onUploadImage={handleImageUpload}
              loading={loadingInputAndCreate}
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
