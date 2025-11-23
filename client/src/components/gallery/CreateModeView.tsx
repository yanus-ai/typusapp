import React, { useState, useEffect, useRef } from 'react';
import { Plus, Download, Share2, Loader2 } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loader from '@/assets/animations/loader.lottie';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setIsModalOpen } from '@/features/gallery/gallerySlice';
import { createInputImageFromExisting } from '@/features/images/inputImagesSlice';
import { fetchAllVariations, fetchInputAndCreateImages } from '@/features/images/historyImagesSlice';
import { Button } from '@/components/ui/button';
import LightTooltip from '@/components/ui/light-tooltip';
import toast from 'react-hot-toast';

interface CreateModeImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  processedImageUrl?: string;
  createdAt: Date;
  prompt?: string;
  aiPrompt?: string; // AI prompt from individual image
  aiMaterials?: any[]; // AI materials from individual image
  variations?: number;
  batchId?: number;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  settings?: {
    creativity: number;
    expressivity: number;
    resemblance: number;
  };
  createUploadId?: number;
  tweakUploadId?: number;
  refineUploadId?: number;
}

interface ImageBatch {
  batchId: number;
  images: CreateModeImage[];
  prompt?: string;
  createdAt: Date;
  settings?: {
    creativity: number;
    expressivity: number;
    resemblance: number;
    variations: number;
  };
}

interface CreateModeViewProps {
  images: CreateModeImage[];
  onDownload: (imageUrl: string, imageId: number) => void;
  onShare: (imageUrl: string, imageId: number) => void;
  onImageSelect?: (image: CreateModeImage) => void;
  onBatchSelect?: (batch: ImageBatch | null) => void;
  onGenerateVariant?: (batch: ImageBatch) => Promise<void>;
  onCreateFromBatch?: (batch: ImageBatch) => void;
  selectedBatchId?: number | null; // New prop for scrolling to specific batch
  activeTab?: 'create' | 'edit'; // New prop to track active gallery tab
  downloadingImages?: Set<number>; // New prop for tracking download states
  isSharing?: boolean; // New prop for share loading state
}

const CreateModeView: React.FC<CreateModeViewProps> = ({
  images,
  onDownload,
  onShare,
  onImageSelect,
  onBatchSelect,
  onGenerateVariant,
  onCreateFromBatch: _onCreateFromBatch,
  selectedBatchId,
  activeTab = 'create',
  downloadingImages = new Set(),
  isSharing = false
}) => {
  const [localSelectedBatchId, setLocalSelectedBatchId] = useState<number | null>(null);
  const [generatingBatch, setGeneratingBatch] = useState<number | null>(null);
  const batchRefs = useRef<{ [key: number]: HTMLElement | null }>({});
  const navigate = useNavigate();
  const dispatch = useAppDispatch();


  // Group images by batch, then by date
  const groupImagesByBatch = (images: CreateModeImage[]) => {
    const batches: { [key: number]: CreateModeImage[] } = {};
    
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

  const groupBatchesByDate = (batches: { [key: number]: CreateModeImage[] }) => {
    const dateGroups: { [key: string]: ImageBatch[] } = {};
    
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
      
      const batch: ImageBatch = {
        batchId,
        images: batchImages.sort((a, b) => a.id - b.id), // Sort by ID for consistent order
        prompt: firstImage.prompt,
        createdAt: mostRecentImage.createdAt, // Use most recent image timestamp
        settings: firstImage.settings ? {
          creativity: firstImage.settings.creativity,
          expressivity: firstImage.settings.expressivity,
          resemblance: firstImage.settings.resemblance,
          variations: firstImage.variations || batchImages.length, // Use actual batch size if variations not set
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

  // Sort date groups by most recent date first
  const sortedDateEntries = Object.entries(groupedBatches).sort(([dateA], [dateB]) => {
    const dateObjA = new Date(dateA);
    const dateObjB = new Date(dateB);
    return dateObjB.getTime() - dateObjA.getTime();
  });


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
      let mostRecentBatch: ImageBatch | null = null;
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
        const batch = mostRecentBatch as ImageBatch;
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
          block: 'center',
        });
      }
    }
  }, [localSelectedBatchId]);

  const handleBatchSelect = (batch: ImageBatch) => {
    const newSelectedId = localSelectedBatchId === batch.batchId ? null : batch.batchId;
    setLocalSelectedBatchId(newSelectedId);
    
    // Notify parent component about batch selection
    if (onBatchSelect) {
      onBatchSelect(newSelectedId ? batch : null);
    }
  };

  const handleGenerateVariant = async (batch: ImageBatch) => {
    if (onGenerateVariant) {
      try {
        await onGenerateVariant(batch);
      } catch (error) {
        console.error('❌ Variant generation failed:', error);
      } finally {
        // Always clear generating state to prevent stuck UI
        setGeneratingBatch(null);
      }
    }
  };

  return (
    <div className="flex-1 overflow-auto hide-scrollbar">
      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-medium text-gray-600 mb-6">Create Mode Creations</h2>
          
          {sortedDateEntries.map(([date, dateBatches]) => (
            <div key={date} className="mb-8">
              <h3 className="text-sm font-medium text-gray-500 mb-4">{date}</h3>
              
              <div className="space-y-6">
                {dateBatches.map((batch) => (
                  <div 
                    key={batch.batchId} 
                    ref={(el) => { batchRefs.current[batch.batchId] = el; }}
                    onClick={() => handleBatchSelect(batch)}
                    className={`relative border-2 rounded-none p-4 transition-all duration-200 cursor-pointer ${
                      localSelectedBatchId === batch.batchId 
                        ? 'border-black bg-gray-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Images Grid - 4 columns max for batch */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {batch.images.map((image) => (
                        <CreateModeImageCard
                          key={image.id}
                          image={image}
                          activeTab={activeTab}
                          onDownload={onDownload}
                          onShare={onShare}
                          onImageSelect={onImageSelect}
                          dispatch={dispatch}
                          navigate={navigate}
                          isDownloading={downloadingImages.has(image.id)}
                          isSharing={isSharing}
                        />
                      ))}
                      
                      {/* Fill empty slots if batch has less than 4 images */}
                      {Array.from({ length: Math.max(0, 4 - batch.images.length) }).map((_, index) => {
                        const isGenerating = generatingBatch === batch.batchId;
                        // Count processing images in the batch
                        const processingImagesCount = batch.images.filter(img => img.status === 'PROCESSING').length;
                        // Only enable the first empty slot, or the next one if one is already processing
                        const isNextAvailableSlot = index === 0 || processingImagesCount > 0;
                        const isSlotDisabled = isGenerating || !isNextAvailableSlot;
                        
                        return (
                          <button 
                            type="button"
                            key={`empty-${index}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();

                              if (isSlotDisabled) {
                                return;
                              }
                              
                              // Show animation immediately
                              setGeneratingBatch(batch.batchId);
                              
                              handleGenerateVariant(batch).catch(error => {
                                console.error('❌ handleGenerateVariant error caught:', error);
                                setGeneratingBatch(null);
                              });
                            }}
                            disabled={isSlotDisabled}
                            className={`aspect-square rounded-none border-2 border-dashed transition-colors duration-200 flex flex-col items-center justify-center gap-2 group ${isGenerating ? 'bg-black' : ''} ${
                              isSlotDisabled 
                                ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed' 
                                : 'bg-gray-50 border-gray-300 hover:border-black hover:bg-gray-100'
                            }`}
                          >
                            {isGenerating && index === 0 ? (
                              <>
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                  <div className='w-[100px] h-[100px] flex flex-col items-center justify-center gap-2 overflow-hiddeen'>
                                    <DotLottieReact
                                      src={loader}
                                      loop
                                      autoplay
                                      style={{ transform: 'scale(3)' }}
                                    />
                                  </div>
                                  <div className="text-black text-xs font-medium">Processing...</div>
                                </div>
                              </>
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
                                }`}>Generate Variant</div>
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
              <div className="text-gray-400 mb-2">No create mode creations yet</div>
              <div className="text-sm text-gray-500">Images created in Create mode will appear here</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Custom ImageCard component for CreateModeView with context-aware button logic
interface CreateModeImageCardProps {
  image: CreateModeImage;
  activeTab: 'create' | 'edit';
  onDownload: (imageUrl: string, imageId: number) => void;
  onShare: (imageUrl: string, imageId: number) => void;
  onImageSelect?: (image: CreateModeImage) => void;
  dispatch: any;
  navigate: any;
  isDownloading?: boolean;
  isSharing?: boolean;
}

const CreateModeImageCard: React.FC<CreateModeImageCardProps> = ({
  image,
  activeTab,
  onDownload,
  onShare,
  onImageSelect,
  dispatch,
  navigate,
  isDownloading = false,
  isSharing = false,
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
        // Create tab active - select image directly for Create page
        dispatch(setIsModalOpen(false));
        navigate(`/create?imageId=${image.id}&type=generated`);
      } else if (activeTab === 'edit') {
        // Edit tab active - this shouldn't happen in CreateModeView, but handle gracefully
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
      // CREATE image to CREATE page - use directly
      dispatch(setIsModalOpen(false));
      navigate(`/create?imageId=${image.id}&type=generated`);
    } catch (error) {
      console.error('❌ CREATE button error:', error);
      toast.error('Failed to navigate to Create module');
    }
  };

  // Handle EDIT button click
  const handleEditClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      if (image.tweakUploadId) {
        dispatch(setIsModalOpen(false));
        navigate(`/edit?imageId=${image.tweakUploadId}&type=input`);
      } else {
        const result = await dispatch(createInputImageFromExisting({
          imageUrl: image.imageUrl,
          thumbnailUrl: image.thumbnailUrl,
          fileName: `tweak-from-${image.id}.jpg`,
          originalImageId: image.id,
          uploadSource: 'TWEAK_MODULE',
          currentPrompt: image.aiPrompt || image.prompt,
          currentAIMaterials: image.aiMaterials
        }));
        
        if (createInputImageFromExisting.fulfilled.match(result)) {
          const newInputImage = result.payload;
          dispatch(setIsModalOpen(false));
          
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
  };

  // Handle UPSCALE button click
  const handleUpscaleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      if (image.refineUploadId) {
        dispatch(setIsModalOpen(false));
        navigate(`/upscale?imageId=${image.refineUploadId}&type=input`);
      } else {
        const result = await dispatch(createInputImageFromExisting({
          imageUrl: image.imageUrl,
          thumbnailUrl: image.thumbnailUrl,
          fileName: `refine-from-${image.id}.jpg`,
          originalImageId: image.id,
          uploadSource: 'REFINE_MODULE',
          currentPrompt: image.aiPrompt || image.prompt,
          currentAIMaterials: image.aiMaterials
        }));
        
        if (createInputImageFromExisting.fulfilled.match(result)) {
          const newInputImage = result.payload;
          dispatch(setIsModalOpen(false));
          navigate(`/upscale?imageId=${newInputImage.id}&type=input`);
          dispatch(fetchAllVariations({ page: 1, limit: 100 }));
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
      className="relative bg-gray-100 rounded-none overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg aspect-square"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        const isImageProcessing = image.status === 'PROCESSING';
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        !isImageProcessing && onImageSelect?.(image);
      }}
    >
      {/* Show processing animation for PROCESSING status */}
      {isProcessing ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className='w-[100px] h-[100px] flex flex-col items-center justify-center gap-2 overflow-hiddeen'>
            <DotLottieReact
              src={loader}
              loop
              autoplay
              style={{ transform: 'scale(3)' }}
            />
          </div>
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
              <DotLottieReact
                src={loader}
                autoplay
                loop
                style={{ transform: 'scale(3)', width: 48, height: 48 }}
              />
            </div>
          )}
        </>
      )}

      {/* Plus button (context-aware) */}
      {isHovered && imageLoaded && !isProcessing && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <LightTooltip text="Select for current page" direction="top">
            <button
              onClick={handlePlusClick}
              className="text-white bg-black/50 hover:bg-black/80 p-3 rounded-full transition-all duration-200 cursor-pointer z-20 hover:scale-110"
            >
              <Plus className="w-6 h-6" />
            </button>
          </LightTooltip>
        </div>
      )}

      {/* Action buttons: CREATE, EDIT, UPSCALE */}
      {isHovered && imageLoaded && !isProcessing && (
        <>
          {/* CREATE Button - Left */}
          <button
            disabled={activeTab === 'create'}
            onClick={handleCreateClick}
            className={`absolute bottom-3 left-3 text-white text-xs font-bold tracking-wider opacity-90 hover:opacity-100 px-2 py-1 rounded transition-all duration-200 cursor-pointer z-20 ${
              activeTab === 'create' 
                ? 'bg-gray-500/50 opacity-50 cursor-not-allowed' 
                : 'bg-black/50 hover:bg-black/80'
            }`}
            title={activeTab === 'create' ? 'Create tab is active - plus button opens in Create page' : 'Open in Create module'}
          >
            CREATE
          </button>

          {/* EDIT Button - Center */}
          <button
            disabled={false}
            onClick={handleEditClick}
            className="absolute bottom-3 right-1/2 translate-x-1/2 text-white text-xs font-bold tracking-wider opacity-90 hover:opacity-100 px-2 py-1 rounded transition-all duration-200 cursor-pointer z-20 bg-black/50 hover:bg-black/80"
            title="Convert and open in Edit module"
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
                if (!isSharing) {
                  onShare(image.processedImageUrl || image.imageUrl, image.id);
                }
              }}
              disabled={isSharing}
              className={`bg-white/90 hover:bg-white text-gray-700 shadow-lg w-8 h-8 flex-shrink-0 ${
                isSharing ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
              }`}
            >
              {isSharing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Share2 className="w-3 h-3" />
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(image.imageUrl, image.id);
              }}
              disabled={isDownloading}
              className="bg-white/90 hover:bg-white text-gray-700 shadow-lg w-8 h-8 flex-shrink-0 disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Download className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateModeView;
