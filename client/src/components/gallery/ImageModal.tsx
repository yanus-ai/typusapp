import React, { useEffect } from 'react';
import { X, Download, Heart, Calendar, ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';

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

interface ImageModalProps {
  image: PublicImage | null;
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onDownload?: (imageUrl: string, imageId: number) => void;
  onLike?: (imageId: number) => void;
  onCreateFromImage?: (imageId: number, imageUrl: string) => void;
  downloadingImages?: Set<number>;
  likedImages?: Set<number>;
}

const ImageModal: React.FC<ImageModalProps> = ({
  image,
  isOpen,
  onClose,
  onPrevious,
  onNext,
  canGoPrevious = false,
  canGoNext = false,
  onDownload,
  onLike,
  onCreateFromImage,
  downloadingImages = new Set(),
  likedImages = new Set()
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (canGoPrevious && onPrevious) {
            onPrevious();
          }
          break;
        case 'ArrowRight':
          if (canGoNext && onNext) {
            onNext();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onPrevious, onNext, canGoPrevious, canGoNext]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !image) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full h-full max-w-7xl mx-auto p-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-sm font-medium text-white overflow-hidden">
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
            <div>
              <p className="text-white font-medium">
                {image.user.name}
              </p>
              <div className="flex items-center gap-4 text-sm text-white/80">
                <button
                  onClick={() => onLike && onLike(image.id)}
                  className={`flex items-center gap-1 transition-colors hover:scale-105 ${
                    likedImages.has(image.id)
                      ? 'text-red-400 hover:text-red-300'
                      : 'text-white/80 hover:text-white'
                  }`}
                  title={likedImages.has(image.id) ? "Unlike" : "Like"}
                >
                  <Heart className={`w-5 h-5 ${likedImages.has(image.id) ? 'fill-current text-red-400' : ''}`} />
                  <span>{image.likesCount}</span>
                </button>

                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(image.createdAt)}</span>
                </div>
                {image.moduleType && (
                  <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded text-xs font-medium">
                    {image.moduleType}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {onDownload && (
              <button
                onClick={() => onDownload(image.imageUrl, image.id)}
                disabled={downloadingImages.has(image.id)}
                className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors text-white"
                title="Download"
              >
                {downloadingImages.has(image.id) ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors text-white"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div className="flex-1 flex items-center justify-center relative min-h-0">
          {/* Previous Button */}
          {canGoPrevious && onPrevious && (
            <button
              onClick={onPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors text-white z-20"
              title="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next Button */}
          {canGoNext && onNext && (
            <button
              onClick={onNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors text-white z-20"
              title="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Image with Prompt Overlay */}
          <div className="relative max-w-full max-h-full flex items-center justify-center group">
            <img
              src={image.imageUrl}
              alt={image.title || 'Generated image'}
              className="max-w-full max-h-[calc(100vh-200px)] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Plus button - center of image */}
            {onCreateFromImage && (
              <button
                onClick={() => onCreateFromImage(image.id, image.imageUrl)}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 p-4 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 z-10"
                title="Create from this image"
              >
                <Plus className="w-8 h-8" />
              </button>
            )}

            {/* Prompt Overlay - Bottom of Image */}
            {image.prompt && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-6 rounded-b-lg">
                <p className="text-white text-sm leading-relaxed line-clamp-3">
                  "{image.prompt}"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;