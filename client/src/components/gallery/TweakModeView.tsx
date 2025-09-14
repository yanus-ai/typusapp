import React, { useState, useEffect, useRef } from 'react';
import { Plus, Download, Share2 } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import whiteSquareSpinner from '@/assets/animations/white-square-spinner.lottie';
import loader from '@/assets/animations/loader.lottie';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setIsModalOpen } from '@/features/gallery/gallerySlice';
import { createInputImageFromExisting } from '@/features/images/inputImagesSlice';
import { fetchAllVariations, fetchInputAndCreateImages } from '@/features/images/historyImagesSlice';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface TweakModeImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  processedImageUrl?: string; // 🔥 NEW: Processed image URL for higher quality display
  createdAt: Date;
  prompt?: string;
  aiPrompt?: string; // 🔥 NEW: AI prompt from individual image
  variations?: number;
  batchId?: number;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  settingsSnapshot?: any; // 🔥 NEW: Settings snapshot from individual image
  settings?: {
    operationType?: string;
    maskKeyword?: string;
    negativePrompt?: string;
  };
  createUploadId?: number;
  tweakUploadId?: number;
  refineUploadId?: number;
}

interface TweakImageBatch {
  batchId: number;
  images: TweakModeImage[];
  prompt?: string;
  createdAt: Date;
  settings?: {
    operationType?: string;
    maskKeyword?: string;
    negativePrompt?: string;
    variations: number;
  };
}

interface TweakModeViewProps {
  images: TweakModeImage[];
  onDownload: (imageUrl: string, imageId: number) => void;
  onShare: (imageUrl: string) => void;
  onImageSelect?: (image: TweakModeImage) => void;
  onBatchSelect?: (batch: TweakImageBatch | null) => void;
  onGenerateVariant?: (batch: TweakImageBatch) => Promise<void>;
  onCreateFromBatch?: (batch: TweakImageBatch) => void;
  selectedBatchId?: number | null; // New prop for scrolling to specific batch
  activeTab?: 'create' | 'edit'; // New prop to track active gallery tab
}

const TweakModeView: React.FC<TweakModeViewProps> = ({ 
  images, 
  onDownload, 
  onShare, 
  onImageSelect,
  onBatchSelect,
  onGenerateVariant,
  onCreateFromBatch: _onCreateFromBatch,
  selectedBatchId,
  activeTab = 'edit'
}) => {
  const [localSelectedBatchId, setLocalSelectedBatchId] = useState<number | null>(null);
  const batchRefs = useRef<{ [key: number]: HTMLElement | null }>({});
  const [generatingBatch, setGeneratingBatch] = useState<number | null>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Group images by batch, then by date
  const groupImagesByBatch = (images: TweakModeImage[]) => {
    const batches: { [key: number]: TweakModeImage[] } = {};
    
    images.forEach(image => {
      // Use a unique identifier for images without batchId (using negative numbers)
      const batchId = image.batchId || -image.id; 
      
      if (!batches[batchId]) {
        batches[batchId] = [];
      }
      batches[batchId].push(image);
    });
    
    return batches;
  };

  const groupBatchesByDate = (batches: { [key: number]: TweakModeImage[] }) => {
    const dateGroups: { [key: string]: TweakImageBatch[] } = {};
    
    Object.entries(batches).forEach(([batchIdStr, batchImages]) => {
      const batchId = parseInt(batchIdStr);
      if (batchImages.length === 0) return;
      
      // Use the most recent image's creation date for sorting (latest first)
      const mostRecentImage = batchImages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const batchDate = mostRecentImage.createdAt;
      const dateKey = batchDate.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      
      // Extract settings from the first image (all images in a batch should have same settings)
      const firstImage = batchImages[0];
      
      const batch: TweakImageBatch = {
        batchId,
        images: batchImages.sort((a, b) => a.id - b.id), // Sort by ID for consistent order
        // 🔥 FIX: Prioritize aiPrompt from individual image over batch prompt
        prompt: firstImage.aiPrompt || firstImage.prompt,
        createdAt: mostRecentImage.createdAt, // Use most recent image timestamp
        settings: firstImage.settings ? {
          operationType: firstImage.settings.operationType,
          maskKeyword: firstImage.settings.maskKeyword,
          negativePrompt: firstImage.settings.negativePrompt,
          variations: batchImages.length, // Use actual batch size
        } : undefined
      };
      
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = [];
      }
      dateGroups[dateKey].push(batch);
    });
    
    // Sort batches within each date by most recent image timestamp (newest first)
    Object.values(dateGroups).forEach(dateBatches => {
      dateBatches.sort((a, b) => {
        // Find the most recent image in each batch
        const aMostRecent = Math.max(...a.images.map(img => new Date(img.createdAt).getTime()));
        const bMostRecent = Math.max(...b.images.map(img => new Date(img.createdAt).getTime()));
        return bMostRecent - aMostRecent;
      });
    });
    
    return dateGroups;
  };

  const imageBatches = groupImagesByBatch(images);
  const groupedBatches = groupBatchesByDate(imageBatches);


  // Auto-select batch based on selectedBatchId prop or most recent batch
  useEffect(() => {
    
    // If selectedBatchId prop is provided (from organize mode), use it
    if (selectedBatchId !== undefined && selectedBatchId !== null && selectedBatchId !== localSelectedBatchId) {
      setLocalSelectedBatchId(selectedBatchId);
      
      // Find the corresponding batch and notify parent
      Object.values(groupedBatches).forEach((dateBatches) => {
        const batch = dateBatches.find(b => b.batchId === selectedBatchId);
        if (batch && onBatchSelect) {
          onBatchSelect(batch);
        }
      });
    }
    // Otherwise, auto-select the most recent batch if none selected
    else if (localSelectedBatchId === null && Object.keys(groupedBatches).length > 0 && selectedBatchId === undefined) {
      // Find the most recent batch across all dates
      let mostRecentBatch: TweakImageBatch | null = null;
      let mostRecentDate = new Date(0);
      
      Object.values(groupedBatches).forEach((dateBatches) => {
        dateBatches.forEach((batch) => {
          if (batch.createdAt > mostRecentDate && batch.batchId > 0) {
            mostRecentDate = batch.createdAt;
            mostRecentBatch = batch;
          }
        });
      });
      
      if (mostRecentBatch !== null) {
        const batch = mostRecentBatch as TweakImageBatch;
        setLocalSelectedBatchId(batch.batchId);
        if (onBatchSelect) {
          onBatchSelect(batch);
        }
      }
    }
  }, [images, groupedBatches, selectedBatchId, localSelectedBatchId, onBatchSelect]);

  // Scroll to selected batch when it changes
  useEffect(() => {
    if (localSelectedBatchId !== null && batchRefs.current[localSelectedBatchId]) {
      const element = batchRefs.current[localSelectedBatchId];
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [localSelectedBatchId]);

  const handleBatchSelect = (batch: TweakImageBatch) => {
    const newSelectedId = localSelectedBatchId === batch.batchId ? null : batch.batchId;
    setLocalSelectedBatchId(newSelectedId);
    
    // Notify parent component about batch selection
    if (onBatchSelect) {
      onBatchSelect(newSelectedId ? batch : null);
    }
  };

  const handleGenerateVariant = async (batch: TweakImageBatch) => {
    if (onGenerateVariant) {
      setGeneratingBatch(batch.batchId);
      try {
        await onGenerateVariant(batch);
        // Clear generating state when generation request succeeds
        setGeneratingBatch(null);
      } catch (error) {
        console.error('❌ Tweak variant generation failed, clearing generating state');
        setGeneratingBatch(null);
      }
    }
  };

  return (
    <div className="flex-1 overflow-auto hide-scrollbar">
      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-medium text-gray-600 mb-6">Edit Mode Creations</h2>
          
          {Object.entries(groupedBatches).map(([date, dateBatches]) => (
            <div key={date} className="mb-8">
              <h3 className="text-sm font-medium text-gray-500 mb-4">{date}</h3>
              
              <div className="space-y-6">
                {dateBatches.map((batch) => (
                  <div 
                    key={batch.batchId} 
                    ref={(el) => { batchRefs.current[batch.batchId] = el; }}
                    onClick={() => handleBatchSelect(batch)}
                    className={`relative border-2 rounded-lg p-4 transition-all duration-200 cursor-pointer ${
                      localSelectedBatchId === batch.batchId 
                        ? 'border-black' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Batch Header with Prompt Preview */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-700 mb-1">
                          Tweak Generation ({batch.images.length} image{batch.images.length > 1 ? 's' : ''})
                          {batch.settings?.operationType && (
                            <span className="ml-2 px-2 py-1 text-xs bg-black/10 text-black rounded-full">
                              {batch.settings.operationType}
                            </span>
                          )}
                        </div>
                        {/* 🔥 Show prompt preview for tweak batches */}
                        {batch.prompt && (
                          <div className="text-xs text-gray-500 truncate max-w-md">
                            "{batch.prompt.length > 80 ? 
                              batch.prompt.substring(0, 80) + '...' : 
                              batch.prompt}"
                          </div>
                        )}
                        {/* Show additional tweak details */}
                        {batch.settings?.maskKeyword && (
                          <div className="text-xs text-gray-400 mt-1">
                            Mask: {batch.settings.maskKeyword}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Images Grid with Real-time Status - Responsive grid for tweak variations */}
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {batch.images.map((image) => (
                        <TweakModeImageCard
                          key={image.id}
                          image={image}
                          activeTab={activeTab}
                          onDownload={onDownload}
                          onShare={onShare}
                          onImageSelect={onImageSelect}
                          dispatch={dispatch}
                          navigate={navigate}
                        />
                      ))}
                      
                      {/* Add Variant Slots - Only show if batch has less than 2 images (tweak max) */}
                      {Array.from({ length: Math.max(0, 2 - batch.images.length) }).map((_, index) => {
                        const isGenerating = generatingBatch === batch.batchId;
                        // Count processing images in the batch
                        const processingImagesCount = batch.images.filter(img => img.status === 'PROCESSING').length;
                        // Only enable the first empty slot, or the next one if one is already processing
                        const isNextAvailableSlot = index === 0 || processingImagesCount > 0;
                        const isSlotDisabled = isGenerating || !isNextAvailableSlot;
                        
                        return (
                          <button 
                            type="button"
                            key={`tweak-variant-${index}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              if (isSlotDisabled) {
                                return;
                              }
                              
                              handleGenerateVariant(batch).catch(error => {
                                console.error('❌ handleGenerateVariant error caught:', error);
                                setGeneratingBatch(null);
                              });
                            }}
                            disabled={isSlotDisabled}
                            className={`aspect-square rounded-lg border-2 border-dashed transition-colors duration-200 flex flex-col items-center justify-center gap-2 group ${
                              isSlotDisabled 
                                ? `bg-gray-50 border-gray-200 ${isGenerating ? '' : 'opacity-50'} cursor-not-allowed` 
                                : 'bg-gray-50 border-gray-300 hover:border-black hover:bg-gray-100'
                            }`}
                          >
                            {isGenerating && index === 0 ? (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-black">
                                <DotLottieReact
                                  src={whiteSquareSpinner}
                                  loop
                                  autoplay
                                  style={{ height: 35, width: 50 }}
                                />
                                <div className="text-white text-xs font-medium">Processing...</div>
                              </div>
                            ) : (
                              <>
                                <Plus size={16} className={`transition-colors duration-200 ${
                                  isNextAvailableSlot 
                                    ? 'text-gray-400 group-hover:text-black' 
                                    : 'text-gray-300'
                                }`} />
                                <div className={`text-xs font-medium transition-colors duration-200 ${
                                  isNextAvailableSlot 
                                    ? 'text-gray-400 group-hover:text-black' 
                                    : 'text-gray-300'
                                }`}>Add Variant</div>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {images.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">No edit creations yet</div>
              <div className="text-sm text-gray-500">Images created in Edit mode will appear here</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Custom ImageCard component for TweakModeView with context-aware button logic
interface TweakModeImageCardProps {
  image: TweakModeImage;
  activeTab: 'create' | 'edit';
  onDownload: (imageUrl: string, imageId: number) => void;
  onShare: (imageUrl: string) => void;
  onImageSelect?: (image: TweakModeImage) => void;
  dispatch: any;
  navigate: any;
}

const TweakModeImageCard: React.FC<TweakModeImageCardProps> = ({
  image,
  activeTab,
  onDownload,
  onShare,
  onImageSelect,
  dispatch,
  navigate,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const displayUrl = image.processedImageUrl || image.thumbnailUrl || image.imageUrl;
  const isProcessing = image.status === 'PROCESSING';

  // Handle + button click (tab-aware)
  const handlePlusClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      if (activeTab === 'create') {
        // Create tab active - this shouldn't happen in TweakModeView, but handle gracefully
      } else if (activeTab === 'edit') {
        // Edit tab active - select TWEAK image directly for Edit page
        dispatch(setIsModalOpen(false));
        navigate(`/edit?imageId=${image.id}&type=generated`);
      }
    } catch (error) {
      console.error('❌ Plus button error:', error);
      toast.error('Failed to select image. Please try again.');
    }
  };

  // Handle CREATE button click
  const handleCreateClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      if (image.createUploadId) {
        dispatch(setIsModalOpen(false));
        navigate(`/create?imageId=${image.createUploadId}&type=input`);
        // toast.success('Using existing converted image for Create module!');
      } else {
        const result = await dispatch(createInputImageFromExisting({
          imageUrl: image.imageUrl, // Always use high-definition imageUrl
          thumbnailUrl: image.thumbnailUrl,
          fileName: `create-from-${image.id}.jpg`,
          originalImageId: image.id,
          uploadSource: 'CREATE_MODULE'
        }));
        
        if (createInputImageFromExisting.fulfilled.match(result)) {
          const newInputImage = result.payload;
          dispatch(setIsModalOpen(false));
          
          // Refresh input images for Create page to find the new image
          dispatch(fetchInputAndCreateImages({ page: 1, limit: 100, uploadSource: 'CREATE_MODULE' }));
          dispatch(fetchAllVariations({ page: 1, limit: 100 }));
          
          navigate(`/create?imageId=${newInputImage.id}&type=input`);
          // toast.success('Image converted for Create module!');
        } else {
          throw new Error('Failed to convert image');
        }
      }
    } catch (error) {
      console.error('❌ CREATE button error:', error);
      toast.error('Failed to convert image for Create module');
    }
  };

  // Handle EDIT button click
  const handleEditClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // TWEAK image to EDIT page - use directly
      dispatch(setIsModalOpen(false));
      navigate(`/edit?imageId=${image.id}&type=generated`);
      // toast.success('Image selected for Edit module!');
    } catch (error) {
      console.error('❌ EDIT button error:', error);
      toast.error('Failed to navigate to Edit module');
    }
  };

  // Handle UPSCALE button click
  const handleUpscaleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      if (image.refineUploadId) {
        dispatch(setIsModalOpen(false));
        navigate(`/upscale?imageId=${image.refineUploadId}&type=input`);
        // toast.success('Using existing converted image for Refine module!');
      } else {
        const result = await dispatch(createInputImageFromExisting({
          imageUrl: image.imageUrl, // Always use high-definition imageUrl
          thumbnailUrl: image.thumbnailUrl,
          fileName: `refine-from-${image.id}.jpg`,
          originalImageId: image.id,
          uploadSource: 'REFINE_MODULE'
        }));
        
        if (createInputImageFromExisting.fulfilled.match(result)) {
          const newInputImage = result.payload;
          dispatch(setIsModalOpen(false));
          navigate(`/upscale?imageId=${newInputImage.id}&type=input`);
          dispatch(fetchAllVariations({ page: 1, limit: 100 }));
          // toast.success('Image converted for Refine module!');
        } else {
          throw new Error('Failed to convert image');
        }
      }
    } catch (error) {
      console.error('❌ UPSCALE button error:', error);
      toast.error('Failed to convert image for Refine module');
    }
  };

  return (
    <div
      className="relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg aspect-square"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        const isImageProcessing = image.status === 'PROCESSING';
        !isImageProcessing && onImageSelect?.(image);
      }}
    >
      {/* Show processing animation for PROCESSING status */}
      {isProcessing ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <DotLottieReact
            src={loader}
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
            className="w-full h-full object-cover"
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

      {/* Plus button (context-aware) */}
      {isHovered && imageLoaded && !isProcessing && (
        <button
          onClick={handlePlusClick}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 p-3 rounded-full transition-all duration-200 cursor-pointer z-20 hover:scale-110"
          title="Select for current page"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Action buttons: CREATE, EDIT, UPSCALE */}
      {isHovered && imageLoaded && !isProcessing && (
        <>
          {/* CREATE Button - Left */}
          <button
            disabled={false}
            onClick={handleCreateClick}
            className="absolute bottom-3 left-3 text-white text-xs font-bold tracking-wider opacity-90 hover:opacity-100 px-2 py-1 rounded transition-all duration-200 cursor-pointer z-20 bg-black/50 hover:bg-black/80"
            title="Convert and open in Create module"
          >
            CREATE
          </button>

          {/* EDIT Button - Center */}
          <button
            disabled={activeTab === 'edit'}
            onClick={handleEditClick}
            className={`absolute bottom-3 right-1/2 translate-x-1/2 text-white text-xs font-bold tracking-wider opacity-90 hover:opacity-100 px-2 py-1 rounded transition-all duration-200 cursor-pointer z-20 ${
              activeTab === 'edit' 
                ? 'bg-gray-500/50 opacity-50 cursor-not-allowed' 
                : 'bg-black/50 hover:bg-black/80'
            }`}
            title={activeTab === 'edit' ? 'Edit tab is active - plus button opens in Edit page' : 'Open in Edit module'}
          >
            EDIT
          </button>

          {/* UPSCALE Button - Right */}
          <button
            disabled={false}
            onClick={handleUpscaleClick}
            className="absolute bottom-3 right-3 text-white text-xs font-bold tracking-wider opacity-90 hover:opacity-100 px-2 py-1 rounded transition-all duration-200 cursor-pointer z-20 bg-black/50 hover:bg-black/80"
            title="Convert and open in Refine module"
          >
            UPSCALE
          </button>
        </>
      )}

      {/* Hover overlay with download/share actions */}
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
                onDownload(image.imageUrl, image.id);
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

export default TweakModeView;