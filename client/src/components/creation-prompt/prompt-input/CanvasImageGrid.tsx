import React, { useState, useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loader from '@/assets/animations/loader.lottie';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface HistoryImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  processedUrl?: string;
  createdAt: Date;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  batchId?: number;
  variationNumber?: number;
  runpodStatus?: string;
  moduleType?: 'CREATE' | 'TWEAK' | 'REFINE';
  originalInputImageId?: number;
  aiPrompt?: string;
  settingsSnapshot?: {
    model?: string;
    mode?: string;
    creativity?: number;
    expressivity?: number;
    resemblance?: number;
    upscale?: string;
    style?: string;
    cfgKsampler1?: number;
    cannyStrength?: number;
    seed?: string;
    size?: string;
    aspectRatio?: string;
    attachments?: {
      baseAttachmentUrl?: string;
      baseImageUrl?: string;
      surroundingUrls?: string[];
      wallsUrls?: string[];
      textureUrls?: string[];
      referenceImageUrls?: string[];
    };
  };
}

interface CanvasImageGridProps {
  images: HistoryImage[];
  selectedImageId?: number;
  onSelectImage: (imageId: number, sourceType?: 'input' | 'generated') => void;
  onImageClick?: (image: HistoryImage) => void;
  loading?: boolean;
  error?: string | null;
  downloadingImageId?: number;
  downloadProgress?: number;
  onClose?: () => void;
}

interface ImageBatch {
  batchId: number;
  images: HistoryImage[];
  prompt?: string;
  createdAt: Date;
}

const CanvasImageGrid: React.FC<CanvasImageGridProps> = ({
  images,
  selectedImageId: _selectedImageId,
  onSelectImage: _onSelectImage,
  onImageClick: _onImageClick,
  loading = false,
  error = null,
  onClose
}) => {
  const [selectedImage, setSelectedImage] = useState<HistoryImage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBatchImages, setCurrentBatchImages] = useState<HistoryImage[]>([]);

  // Filter and sort images - show ALL images (be very lenient to show all history)
  const displayImages = React.useMemo(() => {
    console.log('🖼️ CanvasImageGrid received images:', images.length);
    const filtered = images
      .filter(image => {
        // Show all images - be very lenient to include all historical images
        // Only exclude explicitly failed images without URLs
        if (image.status === 'FAILED' && !image.imageUrl) {
          return false;
        }
        // Include everything else (completed, processing, undefined status, with/without URLs)
        return true;
      })
      .sort((a, b) => {
        // Sort by creation date (newest first), but keep processing images near the top
        if (a.status === 'PROCESSING' && b.status !== 'PROCESSING') return -1;
        if (b.status === 'PROCESSING' && a.status !== 'PROCESSING') return 1;
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
    console.log('✅ CanvasImageGrid filtered images:', filtered.length);
    return filtered;
  }, [images]);
    // Removed slice limit - show all images

  // Group images by batch
  const groupImagesByBatch = (images: HistoryImage[]): ImageBatch[] => {
    const batches: { [key: number]: HistoryImage[] } = {};
    
    images.forEach(image => {
      // Use a unique identifier for images without batchId (using negative numbers)
      const batchId = image.batchId || -image.id;
      
      if (!batches[batchId]) {
        batches[batchId] = [];
      }
      batches[batchId].push(image);
    });
    
    return Object.entries(batches).map(([batchIdStr, batchImages]) => {
      const batchId = parseInt(batchIdStr);
      // Handle both Date objects and date strings
      const mostRecentImage = batchImages.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return dateB - dateA;
      })[0];
      
      return {
        batchId,
        images: batchImages.sort((a, b) => a.id - b.id), // Sort by ID for consistent order
        prompt: mostRecentImage.aiPrompt,
        createdAt: mostRecentImage.createdAt instanceof Date ? mostRecentImage.createdAt : new Date(mostRecentImage.createdAt)
      };
    }).sort((a, b) => {
      // Handle both Date objects and date strings
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return dateB - dateA;
    }); // Sort batches by most recent
  };

  const imageBatches = React.useMemo(() => {
    const batches = groupImagesByBatch(displayImages);
    console.log('📦 CanvasImageGrid batches:', batches.length, 'total images:', displayImages.length);
    return batches;
  }, [displayImages]);

  // Handle image click - open modal
  const handleImageClick = (image: HistoryImage, batchImages: HistoryImage[]) => {
    if (image.status === 'COMPLETED') {
      setSelectedImage(image);
      setCurrentBatchImages(batchImages);
      setIsModalOpen(true);
    }
  };

  // Handle modal navigation
  const handlePreviousImage = () => {
    if (!selectedImage || currentBatchImages.length === 0) return;
    const currentIndex = currentBatchImages.findIndex(img => img.id === selectedImage.id);
    if (currentIndex > 0) {
      setSelectedImage(currentBatchImages[currentIndex - 1]);
    }
  };

  const handleNextImage = () => {
    if (!selectedImage || currentBatchImages.length === 0) return;
    const currentIndex = currentBatchImages.findIndex(img => img.id === selectedImage.id);
    if (currentIndex < currentBatchImages.length - 1) {
      setSelectedImage(currentBatchImages[currentIndex + 1]);
    }
  };

  const canGoPrevious = () => {
    if (!selectedImage || currentBatchImages.length === 0) return false;
    const currentIndex = currentBatchImages.findIndex(img => img.id === selectedImage.id);
    return currentIndex > 0;
  };

  const canGoNext = () => {
    if (!selectedImage || currentBatchImages.length === 0) return false;
    const currentIndex = currentBatchImages.findIndex(img => img.id === selectedImage.id);
    return currentIndex < currentBatchImages.length - 1;
  };

  // Handle keyboard events for modal
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          setIsModalOpen(false);
          break;
        case 'ArrowLeft':
          if (selectedImage && currentBatchImages.length > 0) {
            const currentIndex = currentBatchImages.findIndex(img => img.id === selectedImage.id);
            if (currentIndex > 0) {
              setSelectedImage(currentBatchImages[currentIndex - 1]);
            }
          }
          break;
        case 'ArrowRight':
          if (selectedImage && currentBatchImages.length > 0) {
            const currentIndex = currentBatchImages.findIndex(img => img.id === selectedImage.id);
            if (currentIndex < currentBatchImages.length - 1) {
              setSelectedImage(currentBatchImages[currentIndex + 1]);
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, selectedImage, currentBatchImages]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  if (loading && images.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <DotLottieReact
            src={loader}
            autoplay
            loop
            style={{ width: 48, height: 48 }}
          />
          <p className="text-gray-500 text-sm">Loading images...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-red-500 text-sm mb-2">⚠️ Error</div>
          <p className="text-gray-500 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  const formatModelName = (model?: string) => {
    if (!model) return 'Unknown';
    return model
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace(/\.safetensors/gi, '');
  };

  const getResolution = (snapshot: any) => {
    if (snapshot?.size) return snapshot.size;
    if (snapshot?.aspectRatio) return snapshot.aspectRatio;
    return 'Auto';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white relative h-full">
      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-none hover:bg-gray-100 transition-colors"
          aria-label="Close image grid"
        >
          <X className="h-4 w-4 text-gray-600" />
        </button>
      )}
      
      {imageBatches.length > 0 ? (
        <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: '100%' }}>
          <div className="w-full space-y-3">
            {imageBatches.map((batch) => {
              // Get settings from first image in batch
              const firstImage = batch.images[0];
              let settingsSnapshot = firstImage.settingsSnapshot;
              if (typeof settingsSnapshot === 'string') {
                try {
                  settingsSnapshot = JSON.parse(settingsSnapshot);
                } catch (e) {
                  console.warn('Failed to parse settingsSnapshot:', e);
                }
              }
              
              const attachments = settingsSnapshot?.attachments;
              const baseImageUrl = attachments?.baseAttachmentUrl || attachments?.baseImageUrl;
              const surroundingUrls = attachments?.surroundingUrls || [];
              const wallsUrls = attachments?.wallsUrls || [];
              const textureUrls = attachments?.textureUrls || [];
              const referenceImageUrls = attachments?.referenceImageUrls || [];
              
              // Combine texture URLs, avoiding duplicates
              // If textureUrls exists, it might already contain surrounding and walls, so prefer it
              // Otherwise, combine surroundingUrls and wallsUrls
              const allTextureUrlsSet = new Set<string>();
              
              if (textureUrls.length > 0) {
                // If textureUrls is provided, use it (it's the combined version)
                textureUrls.forEach(url => url && allTextureUrlsSet.add(url));
              } else {
                // Otherwise, combine surrounding and walls separately
                surroundingUrls.forEach(url => url && allTextureUrlsSet.add(url));
                wallsUrls.forEach(url => url && allTextureUrlsSet.add(url));
              }
              
              // Add reference image URLs
              referenceImageUrls.forEach(url => url && allTextureUrlsSet.add(url));
              
              const allTextureUrls = Array.from(allTextureUrlsSet);

              return (
                <div
                  key={batch.batchId}
                  className="group bg-white rounded-none transition-all"
                >
                  <div className="flex gap-4 p-4">
                    {/* Left: Chat Bubble with Prompt and Textures */}
                    <div className="w-lg">
                      {/* Base Image */}
                      {baseImageUrl && (
                        <div className="mb-3">
                          <div className="bg-gray-50 rounded-none rounded-none-md p-3">
                            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
                              Base Image
                            </div>
                            <div className="w-20 h-20 rounded-none overflow-hidden bg-gray-100">
                              <img
                                src={baseImageUrl}
                                alt="Base image"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Prompt Bubble */}
                      {batch.prompt && (
                        <div className="mb-4">
                          <div className="bg-gradient-to-br from-gray-50 via-gray-50/80 to-gray-100/50 rounded-none rounded-none-md p-4 shadow-sm border border-gray-200/30 backdrop-blur-sm">
                            <p className="text-sm text-gray-900 leading-relaxed font-medium">
                              {batch.prompt}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Textures Bubble */}
                      {allTextureUrls.length > 0 && (
                        <div className="mb-3">
                          <div className="bg-gray-50 rounded-none rounded-none-md p-3">
                            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
                              Textures ({allTextureUrls.length})
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {allTextureUrls.slice(0, 8).map((textureUrl, idx) => (
                                <div
                                  key={idx}
                                  className="w-12 h-12 rounded-none overflow-hidden bg-gray-100"
                                >
                                  <img
                                    src={textureUrl}
                                    alt={`Texture ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              ))}
                              {allTextureUrls.length > 8 && (
                                <div className="w-12 h-12 rounded-none bg-gray-100 flex items-center justify-center">
                                  <span className="text-xs text-gray-500">+{allTextureUrls.length - 8}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Attributes - Compact */}
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                        {settingsSnapshot?.model && (
                          <div>
                            <span className="text-gray-500">Model:</span>
                            <span className="ml-1.5 text-gray-800 font-medium">
                              {formatModelName(settingsSnapshot.model)}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Resolution:</span>
                          <span className="ml-1.5 text-gray-800 font-medium">
                            {getResolution(settingsSnapshot)}
                          </span>
                        </div>
                        {settingsSnapshot?.mode && (
                          <div>
                            <span className="text-gray-500">Mode:</span>
                            <span className="ml-1.5 text-gray-800 font-medium capitalize">
                              {settingsSnapshot.mode}
                            </span>
                          </div>
                        )}
                        {settingsSnapshot?.upscale && (
                          <div>
                            <span className="text-gray-500">Upscale:</span>
                            <span className="ml-1.5 text-gray-800 font-medium">
                              {settingsSnapshot.upscale}
                            </span>
                          </div>
                        )}
                        {/* Settings Row */}
                        {(settingsSnapshot?.creativity !== undefined || 
                          settingsSnapshot?.expressivity !== undefined || 
                          settingsSnapshot?.resemblance !== undefined) && (
                          <>
                            {settingsSnapshot.creativity !== undefined && (
                              <div>
                                <span className="text-gray-500">Creativity:</span>
                                <span className="ml-1.5 text-gray-800 font-medium">
                                  {settingsSnapshot.creativity}%
                                </span>
                              </div>
                            )}
                            {settingsSnapshot.expressivity !== undefined && (
                              <div>
                                <span className="text-gray-500">Expressivity:</span>
                                <span className="ml-1.5 text-gray-800 font-medium">
                                  {settingsSnapshot.expressivity}%
                                </span>
                              </div>
                            )}
                            {settingsSnapshot.resemblance !== undefined && (
                              <div>
                                <span className="text-gray-500">Resemblance:</span>
                                <span className="ml-1.5 text-gray-800 font-medium">
                                  {settingsSnapshot.resemblance}%
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right: Images Grid - Show variants (always 4 boxes) */}
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Array.from({ length: 4 }).map((_, index) => {
                        const image = batch.images[index];
                        
                        // If no image at this index, show empty placeholder
                        if (!image) {
                          return (
                            <div
                              key={`empty-${batch.batchId}-${index}`}
                              className="flex-shrink-0 aspect-square"
                            >
                              <div className="relative w-full h-full overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50">
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="text-gray-300 text-xs font-medium">Empty</div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        const imageUrl = image.thumbnailUrl || image.imageUrl;
                        
                        return (
                          <div
                            key={image.id}
                            className="flex-shrink-0 cursor-pointer group/image aspect-square"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImageClick(image, batch.images);
                            }}
                          >
                            <div className="relative w-full h-full overflow-hidden transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105">
                              {imageUrl && image.status === 'COMPLETED' ? (
                                <>
                                  <img
                                    src={imageUrl}
                                    alt={`Generated ${image.id}`}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover/image:scale-110"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300" />
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                  {image.status === 'PROCESSING' ? (
                                    <DotLottieReact
                                      src={loader}
                                      loop
                                      autoplay
                                      style={{ transform: 'scale(1.5)' }}
                                    />
                                  ) : (
                                    <div className="text-gray-400 text-xs font-medium">Loading...</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <div className="text-gray-500 text-base mb-2">No images yet</div>
            <p className="text-gray-400 text-sm">Generate your first image to see it here</p>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {isModalOpen && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full h-full max-w-7xl mx-auto p-4 flex flex-col">
            {/* Header */}
            <div className="flex flex-row-reverse items-center justify-between mb-4 relative z-10">
              {/* Close Button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 bg-white/20 backdrop-blur-sm rounded-none hover:bg-white/30 transition-colors text-white"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image Container */}
            <div className="flex-1 flex items-center justify-center relative min-h-0">
              {/* Previous Button */}
              {canGoPrevious() && (
                <button
                  onClick={handlePreviousImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 backdrop-blur-sm rounded-none hover:bg-black/70 transition-colors text-white z-20"
                  title="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Next Button */}
              {canGoNext() && (
                <button
                  onClick={handleNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 backdrop-blur-sm rounded-none hover:bg-black/70 transition-colors text-white z-20"
                  title="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              {/* Image */}
              <div className="relative max-w-full max-h-full flex items-center justify-center group">
                <img
                  src={selectedImage.imageUrl || selectedImage.thumbnailUrl}
                  alt={`Generated ${selectedImage.id}`}
                  className="max-w-full max-h-[calc(100vh-200px)] object-contain rounded-none shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Prompt Overlay - Bottom of Image */}
                {selectedImage.aiPrompt && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-6 rounded-none-lg">
                    <p className="text-white text-sm leading-relaxed line-clamp-3">
                      "{selectedImage.aiPrompt}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CanvasImageGrid;

