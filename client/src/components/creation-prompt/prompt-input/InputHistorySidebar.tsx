import React, { useRef } from 'react';
import { Plus } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loader from '@/assets/animations/loader.lottie';
import { useAppSelector } from '@/hooks/useAppSelector';

interface InputHistoryImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
}

interface InputHistorySidebarProps {
  images: InputHistoryImage[];
  selectedImageId?: number;
  onSelectImage: (imageId: number) => void;
  onUploadImage: (file: File) => void;
  loading?: boolean;
  error?: string | null;
}

const InputHistorySidebar: React.FC<InputHistorySidebarProps> = ({ 
  images, 
  selectedImageId,
  onSelectImage,
  onUploadImage,
  loading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get deleted image IDs from Redux to filter them out
  const deletedImageIds = useAppSelector(state => state.historyImageDelete.deletedImageIds);
  
  // Filter out deleted images
  const displayImages = images.filter(image => !deletedImageIds.includes(image.id));
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0 && onUploadImage) {
      onUploadImage(files[0]);
      event.target.value = '';
    }
  };

  return (
    <div className="h-full w-[74px] flex flex-col bg-white border-r border-gray-200">
      {/* Upload Button */}
      <div className="p-2 border-b border-gray-200">
        <button
          onClick={handleUploadClick}
          disabled={loading}
          className="w-full h-9 flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-200 rounded-none transition-colors disabled:opacity-50 shadow-sm"
        >
          {loading ? (
            <DotLottieReact 
              src={loader} 
              autoplay 
              loop 
              style={{ transform: 'scale(3)', width: 18, height: 18 }} 
            />
          ) : (
            <Plus className="h-4 w-4 text-gray-700" />
          )}
        </button>
        <input 
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
          disabled={loading}
        />
      </div>

      {/* Image Thumbnails */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 hide-scrollbar">
        {displayImages.length > 0 ? (
          displayImages.map((image) => {
            const isSelected = selectedImageId === image.id;
            return (
              <div
                key={image.id}
                className={`relative cursor-pointer rounded-none overflow-hidden border-2 transition-all ${
                  isSelected ? 'border-blue-500 shadow-md' : 'border-transparent hover:border-gray-300'
                }`}
                onClick={() => onSelectImage(image.id)}
              >
                {image.thumbnailUrl || image.imageUrl ? (
                  <img 
                    src={image.thumbnailUrl || image.imageUrl} 
                    alt={`Input ${image.id}`}
                    className="w-full aspect-square object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-none animate-spin" />
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs text-center px-1">
            <p>No images</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InputHistorySidebar;

