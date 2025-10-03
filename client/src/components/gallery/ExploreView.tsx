import React, { useState, useEffect } from 'react';
import { Heart, Calendar, Download, Loader2, Search, Plus } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loader from '@/assets/animations/loader.lottie';
import api from '@/lib/api';
import ImageModal from './ImageModal';

interface PublicImage {
  id: number;
  imageUrl: string;
  processedImageUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  createdAt: string;
  prompt?: string;
  moduleType?: string;
  likesCount: number;
  user: {
    id: number;
    name: string;
    handle?: string;
    profilePicture?: string;
  };
}

// Static explore images data
const STATIC_EXPLORE_IMAGES: PublicImage[] = [
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/08342611-bd4a-420a-9e0a-ab38040649a6.webp',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/123213.png',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/1337-db8fe912-5228-11ef-a0f2-6619e3d55756.png',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/193a2b0b-657a-4add-98a8-19f3ed69b834.jpg',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/24fc6161-debb-4001-a2b2-345324a91047.jpg',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/5802d835-a327-46c2-b12a-63126e6d481a.png',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/9c3e541d-3edb-4fec-be98-0e9a6e8ec5fe.jpg',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/b_low.png',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/bild2+(1).png',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/e5465514-8fcc-46f9-ba01-17b6ca36dfb7.webp',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/ec0d0183-e6c2-41ac-aa13-534c135afab0.webp',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/enhanced-image+(1).png',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/enhanced-image+(3).png',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/interior.png',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/lucasgomez_small.png',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/replicate-prediction-4akaemsj6hrj60ch62yrtcf2j8.png',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/s1.png',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/yanus.ai_hello_1758187648369_7900.png',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/yanus.ai_team_1744810987148_1040.png',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/yanus.ai_team_1745661570435_8600.png',
  'https://prai-vision.s3.eu-central-1.amazonaws.com/explore/yanus.ai_team_1747855586574_1700_compressed.png'
].map((url, index) => ({
  id: index + 1,
  imageUrl: url,
  thumbnailUrl: url,
  title: `Community Creation ${index + 1}`,
  description: 'Amazing AI-generated artwork from our community',
  createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Random date within last 30 days
  prompt: [
    'A stunning architectural visualization',
    'Beautiful interior design with modern aesthetics',
    'Photorealistic rendering with amazing details',
    'Creative design exploration',
    'Innovative architectural concept',
    'Modern interior with natural lighting',
    'Elegant design composition',
    'Professional architectural visualization',
    'Contemporary design elements',
    'Sophisticated interior styling'
  ][index % 10],
  moduleType: ['CREATE', 'TWEAK', 'REFINE'][index % 3],
  likesCount: Math.floor(Math.random() * 50) + 5, // Random likes between 5-55
  user: {
    id: (index % 5) + 1,
    name: ['Alex Chen', 'Maria Rodriguez', 'David Kim', 'Sarah Johnson', 'Michael Brown'][index % 5],
    handle: ['alexc', 'maria_r', 'dkim', 'sarah_j', 'mike_b'][index % 5],
    profilePicture: undefined
  }
}));

interface ExploreViewProps {
  onDownload?: (imageUrl: string, imageId: number) => void;
  onLike?: (imageId: number) => void;
  onCreateFromImage?: (imageId: number, imageUrl: string) => void;
  downloadingImages?: Set<number>;
  likedImages?: Set<number>;
}

const ExploreView: React.FC<ExploreViewProps> = ({
  onDownload,
  onLike,
  onCreateFromImage,
  downloadingImages = new Set(),
  likedImages = new Set()
}) => {
  const [images, setImages] = useState<PublicImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Modal state
  const [selectedImage, setSelectedImage] = useState<PublicImage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPublicImages = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const response = await api.get(`/images/public?page=${pageNum}&limit=24`);
      const data = response.data;

      if (data.success) {
        const userImages = data.images || [];

        if (append) {
          // When loading more, just append user images
          setImages(prev => [...prev, ...userImages]);
        } else {
          // On initial load, combine static images with user images
          // Add unique IDs to static images to avoid conflicts with user image IDs
          const staticImagesWithUniqueIds = STATIC_EXPLORE_IMAGES.map((img, index) => ({
            ...img,
            id: 1000000 + index // Use high IDs to avoid conflicts with user image IDs
          }));

          // Combine static images first, then user images
          setImages([...staticImagesWithUniqueIds, ...userImages]);
        }
        setHasMore(data.pagination?.hasNextPage || false);
      } else {
        throw new Error(data.message || 'Failed to fetch public images');
      }
    } catch (err) {
      console.error('Error fetching public images:', err);

      if (!append) {
        // On initial load failure, still show static images
        const staticImagesWithUniqueIds = STATIC_EXPLORE_IMAGES.map((img, index) => ({
          ...img,
          id: 1000000 + index
        }));
        setImages(staticImagesWithUniqueIds);
        setError('Failed to load community images, showing curated gallery');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load more images');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPublicImages();
  }, []);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPublicImages(nextPage, true);
    }
  };

  // Modal handlers
  const handleImageClick = (image: PublicImage) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  const handlePreviousImage = () => {
    if (!selectedImage) return;
    const currentIndex = images.findIndex(img => img.id === selectedImage.id);
    if (currentIndex > 0) {
      setSelectedImage(images[currentIndex - 1]);
    }
  };

  const handleNextImage = () => {
    if (!selectedImage) return;
    const currentIndex = images.findIndex(img => img.id === selectedImage.id);
    if (currentIndex < images.length - 1) {
      setSelectedImage(images[currentIndex + 1]);
    }
  };

  const canGoPrevious = () => {
    if (!selectedImage) return false;
    const currentIndex = images.findIndex(img => img.id === selectedImage.id);
    return currentIndex > 0;
  };

  const canGoNext = () => {
    if (!selectedImage) return false;
    const currentIndex = images.findIndex(img => img.id === selectedImage.id);
    return currentIndex < images.length - 1;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <DotLottieReact
            src={loader}
            loop
            autoplay
            className="w-[200px] h-[200px] mx-auto mb-4"
          />
          <p className="text-gray-600">Loading public creations...</p>
        </div>
      </div>
    );
  }

  // Only show error screen if there are no images at all (shouldn't happen since we always show static images)
  if (error && images.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchPublicImages();
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      {/* Header */}
      <div className="mb-6">
        <p className="text-lg font-medium text-gray-600 mb-6">Discover amazing AI-generated architectural visualizations and designs by the community</p>

        {/* Show error message if there's an issue but we still have images */}
        {error && images.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <p className="text-yellow-800 text-sm">{error}</p>
          </div>
        )}
      </div>

      {images.length === 0 ? (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No public images found</p>
        </div>
      ) : (
        <>
          {/* Masonry Grid */}
          <div className="columns-3 gap-4 space-y-4 mb-8">
            {images.map((image) => (
              <div
                key={image.id}
                className="break-inside-avoid mb-4 bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Image with overlay content */}
                <div className="relative group cursor-pointer" onClick={() => handleImageClick(image)}>
                  <img
                    src={image.thumbnailUrl || image.imageUrl}
                    alt={image.title || 'Generated image'}
                    className="w-full h-auto object-cover transition-transform hover:scale-105"
                    loading="lazy"
                  />

                  {/* Plus button - center of image */}
                  {onCreateFromImage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateFromImage(image.id, image.imageUrl);
                      }}
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 p-3 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110"
                      title="Create from this image"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  )}

                  {/* Action buttons - top right */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onDownload && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(image.imageUrl, image.id);
                        }}
                        disabled={downloadingImages.has(image.id)}
                        className="p-1.5 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
                        title="Download"
                      >
                        {downloadingImages.has(image.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <Download className="w-4 h-4 text-white" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* User info and stats - bottom left overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3">
                    {/* User info */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-xs font-medium text-white overflow-hidden">
                        {image.user.profilePicture ? (
                          <img
                            src={image.user.profilePicture}
                            alt={image.user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getInitials(image.user.name)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {image.user.name}
                        </p>
                      </div>
                    </div>

                    {/* Stats and module type */}
                    <div className="flex items-center justify-between text-xs text-white/80">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onLike && onLike(image.id);
                          }}
                          className={`flex items-center gap-1 transition-colors hover:scale-105 ${
                            likedImages.has(image.id)
                              ? 'text-red-400 hover:text-red-300'
                              : 'text-white/80 hover:text-white'
                          }`}
                          title={likedImages.has(image.id) ? "Unlike" : "Like"}
                        >
                          <Heart className={`w-4 h-4 ${likedImages.has(image.id) ? 'fill-current text-red-400' : ''}`} />
                          <span>{image.likesCount}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(image.createdAt)}</span>
                        </div>
                      </div>

                      {image.moduleType && (
                        <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded text-xs font-medium">
                          {image.moduleType}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingMore ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Image Modal */}
      <ImageModal
        image={selectedImage}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onPrevious={handlePreviousImage}
        onNext={handleNextImage}
        canGoPrevious={canGoPrevious()}
        canGoNext={canGoNext()}
        onDownload={onDownload}
        onLike={onLike}
        onCreateFromImage={onCreateFromImage}
        downloadingImages={downloadingImages}
        likedImages={likedImages}
      />
    </div>
  );
};

export default ExploreView;