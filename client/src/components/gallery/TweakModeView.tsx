import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import whiteSquareSpinner from '@/assets/animations/white-square-spinner.lottie';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setIsModalOpen } from '@/features/gallery/gallerySlice';
import ImageCard from './ImageCard';
import { LayoutType } from '@/pages/gallery/GalleryPage';

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
}

const TweakModeView: React.FC<TweakModeViewProps> = ({ 
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
  const batchRefs = useRef<{ [key: number]: HTMLElement | null }>({});
  const [generatingBatch, setGeneratingBatch] = useState<number | null>(null);
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
    
    console.log('🗂️ Raw tweak batches after grouping:', batches);
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
      console.log(`🎛️ Tweak Batch ${batchId} settings from first image:`, {
        hasSettings: !!firstImage.settings,
        settings: firstImage.settings,
        prompt: firstImage.prompt,
        aiPrompt: firstImage.aiPrompt, // 🔥 NEW: Log AI prompt
        batchSize: batchImages.length
      });
      
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

  console.log('🗂️ Tweak image batches:', imageBatches);
  console.log('📅 Grouped tweak batches by date:', groupedBatches);
  console.log('🔢 Total tweak images received:', images.length);

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
        console.log('🎯 Auto-selecting most recent tweak batch:', batch.batchId);
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
        console.log('✅ Tweak variant generation request completed, clearing generating state');
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
                      {batch.images.map((image) => {
                        // Convert TweakModeImage to GalleryImage format for ImageCard
                        console.log('asdasdasd', image);
                        const galleryImage = {
                          id: image.id,
                          imageUrl: image.imageUrl,
                          thumbnailUrl: image.thumbnailUrl,
                          processedImageUrl: image.processedImageUrl,
                          createdAt: image.createdAt,
                          status: image.status,
                          moduleType: 'TWEAK' as const,
                          originalInputImageId: 1, // Mark as generated
                          aiPrompt: image.aiPrompt || image.prompt,
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
                            key={`tweak-variant-${index}`}
                            onClick={() => handleGenerateVariant(batch)}
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

export default TweakModeView;