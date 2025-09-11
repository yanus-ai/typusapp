import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import whiteSquareSpinner from '@/assets/animations/white-square-spinner.lottie';
import smallSpinner from '@/assets/animations/small-spinner.lottie';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setIsModalOpen } from '@/features/gallery/gallerySlice';
import ImageCard from './ImageCard';
import { LayoutType } from '@/pages/gallery/GalleryPage';

interface CreateModeImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  processedImageUrl?: string;
  createdAt: Date;
  prompt?: string;
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
  onShare: (imageUrl: string) => void;
  onImageSelect?: (image: CreateModeImage) => void;
  onBatchSelect?: (batch: ImageBatch | null) => void;
  onGenerateVariant?: (batch: ImageBatch) => Promise<void>;
  onCreateFromBatch?: (batch: ImageBatch) => void;
  selectedBatchId?: number | null; // New prop for scrolling to specific batch
}

const CreateModeView: React.FC<CreateModeViewProps> = ({ 
  images, 
  onDownload, 
  onShare, 
  onImageSelect,
  onBatchSelect,
  onGenerateVariant,
  onCreateFromBatch: _onCreateFromBatch,
  selectedBatchId
}) => {
  const [localSelectedBatchId, setLocalSelectedBatchId] = useState<number | null>(null);
  const [generatingBatch, setGeneratingBatch] = useState<number | null>(null);
  const batchRefs = useRef<{ [key: number]: HTMLElement | null }>({});
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  // Determine current page from URL path (same logic as ImageCard)
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path.includes('/create') || path.includes('/dashboard')) return 'create';
    if (path.includes('/edit') || path.includes('/tweak')) return 'edit';
    if (path.includes('/refine') || path.includes('/upscale')) return 'refine';
    return 'create'; // default
  };

  const currentPage = getCurrentPage();

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
    
    console.log('🗂️ Raw batches after grouping:', batches);
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
      console.log(`🎛️ Batch ${batchId} settings from first image:`, {
        hasSettings: !!firstImage.settings,
        settings: firstImage.settings,
        variations: firstImage.variations,
        batchSize: batchImages.length
      });
      
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

  console.log('🗂️ Image batches:', imageBatches);
  console.log('📅 Grouped batches by date:', groupedBatches);
  console.log('🔢 Total images received:', images.length);

  // Auto-select batch based on selectedBatchId prop or most recent batch
  useEffect(() => {
    console.log('🔄 Batch selection check:', {
      selectedBatchIdProp: selectedBatchId,
      localSelectedBatchId,
      hasGroupedBatches: Object.keys(groupedBatches).length > 0,
      batchCount: Object.keys(groupedBatches).length
    });
    
    // If selectedBatchId prop is provided (from organize mode), use it
    if (selectedBatchId !== undefined && selectedBatchId !== null && selectedBatchId !== localSelectedBatchId) {
      console.log('🎯 Selecting batch from prop:', selectedBatchId);
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
        console.log('🎯 Auto-selecting most recent batch:', batch.batchId);
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
      console.log('📜 Scrolling to batch:', localSelectedBatchId);
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
        console.log('🎯 Executing variant generation for batch:', batch.batchId);
        
        await onGenerateVariant(batch);
        
        console.log('✅ Variant generation request completed');
      } catch (error) {
        console.error('❌ Variant generation failed:', error);
      } finally {
        // Always clear generating state to prevent stuck UI
        console.log('🔄 Clearing generating state for batch:', batch.batchId);
        setGeneratingBatch(null);
      }
    }
  };

  return (
    <div className="flex-1 overflow-auto hide-scrollbar">
      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-medium text-gray-600 mb-6">Create Mode Creations</h2>
          
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
                        ? 'border-black bg-gray-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Images Grid - 4 columns max for batch */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {batch.images.map((image) => {
                        // Convert CreateModeImage to GalleryImage format for ImageCard
                        const galleryImage = {
                          id: image.id,
                          imageUrl: image.imageUrl,
                          thumbnailUrl: image.thumbnailUrl,
                          processedImageUrl: image.processedImageUrl,
                          createdAt: image.createdAt,
                          status: image.status,
                          moduleType: 'CREATE' as const,
                          originalInputImageId: 1, // Mark as generated
                          aiPrompt: image.prompt,
                          createUploadId: image.createUploadId,
                          tweakUploadId: image.tweakUploadId,
                          refineUploadId: image.refineUploadId
                        };
                        
                        return (
                          <div 
                            key={image.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              const isImageProcessing = image.status === 'PROCESSING';
                              !isImageProcessing && onImageSelect?.(image);
                            }}
                          >

                            {/* {`image.createUploadId: ${image.createUploadId}\n`}
                            {`image.tweakUploadId: ${image.tweakUploadId}\n`}
                            {`image.refineUploadId: ${image.refineUploadId}`} */}
                            <ImageCard
                              image={galleryImage}
                              layout="square"
                              onDownload={onDownload}
                              onShare={onShare}
                            />
                          </div>
                        );
                      })}
                      
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
                              
                              console.log('🔥 Generate Variant button clicked for batch:', batch.batchId);
                              
                              // Show animation INSTANTLY - this should update the UI immediately
                              setGeneratingBatch(batch.batchId);
                              console.log('🎬 Animation state set, should show lottie now');
                              
                              // Prevent any default behavior and call async function safely
                              setTimeout(() => {
                                handleGenerateVariant(batch).catch(error => {
                                  console.error('❌ handleGenerateVariant error caught:', error);
                                  setGeneratingBatch(null);
                                });
                              }, 10);
                              
                              return false; // Additional prevention of default behavior
                            }}
                            disabled={isSlotDisabled}
                            className={`aspect-square rounded-lg border-2 border-dashed transition-colors duration-200 flex flex-col items-center justify-center gap-2 group ${isGenerating ? 'bg-black' : ''} ${
                              isSlotDisabled 
                                ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed' 
                                : 'bg-gray-50 border-gray-300 hover:border-black hover:bg-gray-100'
                            }`}
                          >
                            {isGenerating && index === 0 ? (
                              <>
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                  <DotLottieReact
                                    src={smallSpinner}
                                    loop
                                    autoplay
                                    style={{ height: 35, width: 50 }}
                                  />
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

export default CreateModeView;
