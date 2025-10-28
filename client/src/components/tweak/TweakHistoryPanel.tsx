import React from 'react';
import { Images } from 'lucide-react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import toast from 'react-hot-toast';
import { removeHistoryImage } from '@/features/images/historyImageDeleteSlice';

interface TweakImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  operationType?: 'outpaint' | 'inpaint' | 'add_image' | 'unknown';
}

interface TweakHistoryPanelProps {
  images: TweakImage[];
  selectedImageId: number | null;
  onSelectImage: (imageId: number) => void;
  loading?: boolean;  
  loadingTweakHistory?: boolean;
  error?: string | null;
}

const TweakHistoryPanel: React.FC<TweakHistoryPanelProps> = ({
  images,
  selectedImageId,
  onSelectImage,
  loading = false,
  loadingTweakHistory = false,
  error = null
}) => {
  const dispatch = useAppDispatch();
  
  // Get deleted image IDs from Redux
  const deletedImageIds = useAppSelector(state => state.historyImageDelete.deletedImageIds);

  // Filter out deleted images first, then apply other filters
  const displayImages = images
    .filter(image => !deletedImageIds.includes(image.id))
    .filter(image => image.status === 'COMPLETED' || image.status === 'PROCESSING' || image.status === 'FAILED')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const renderImage = (image: TweakImage) => {
    const imageUrl = image.thumbnailUrl || image.imageUrl;
    const isSelected = selectedImageId === image.id;
    
    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      dispatch(removeHistoryImage(image.id));
      toast.success('Image removed from history', {
        position: 'bottom-right',
        duration: 3000
      });
    };
    
    return (
      <div 
        key={image.id}
        className={`w-full cursor-pointer rounded-md overflow-hidden border-2 relative group ${
          isSelected ? 'border-black' : 'border-transparent'
        }`}
        onClick={() => onSelectImage(image.id)}
      >
        <div className="relative">
          {imageUrl && image.status === 'COMPLETED' ? (
            <img 
              src={imageUrl} 
              alt="Generated tweak variation"
              className="w-full h-[57px] object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full bg-gray-200 h-[57px] flex items-center justify-center">
              {image.status === 'PROCESSING' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-blue-500"></div>
              ) : image.status === 'FAILED' ? (
                <div className="text-red-500 text-xs flex flex-col items-center">
                  <span>⚠️</span>
                  <span>Failed</span>
                </div>
              ) : (
                <div className="text-gray-400 text-xs">Loading...</div>
              )}
            </div>
          )}

          <button
            onClick={handleDelete}
            className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete image"
          >
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute top-1/2 right-3 -translate-y-1/2 h-auto shadow-lg bg-[#F1F1F1] rounded-md w-[88px] z-50">
      <div className='flex flex-col justify-center bg-[#F0F0F0] shadow-lg rounded-md max-h-[min(500px,calc(100vh-150px))] h-auto m-auto'>
        <div className="text-center py-4">
          <h2 className="text-sm">History</h2>
          <div className="border-b border-white border-2 mt-2 w-1/2 mx-auto" />
        </div>
        
        <div className="overflow-y-auto h-[calc(100%-53px)] pb-2 hide-scrollbar mb-2">
          {loadingTweakHistory && images.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center pb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 mb-2"></div>
              <p className="text-xs text-gray-600">Loading...</p>
            </div>
          ) : displayImages.length > 0 ? (
            <div className="grid gap-2 px-1">
              {displayImages.map((image) => (
                <React.Fragment key={image.id}>
                  <div className="flex justify-center">
                    {renderImage(image)}
                  </div>
                </React.Fragment>
              ))}
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-center pb-4">
              <div className="text-red-500 text-xs mb-2">⚠️ Error</div>
              <p className="text-xs text-gray-600">{error}</p>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center pb-4">
              <Images />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TweakHistoryPanel;