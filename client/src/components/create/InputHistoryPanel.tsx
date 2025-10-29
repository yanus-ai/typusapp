import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Images } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import squareSpinner from '@/assets/animations/square-spinner.lottie';
import LightTooltip from '../ui/light-tooltip';
import { useAppSelector } from '@/hooks/useAppSelector';

interface InputHistoryImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
}

interface InputHistoryPanelProps {
  images: InputHistoryImage[];
  currentStep?: number;
  selectedImageId?: number;
  onSelectImage: (imageId: number) => void;
  onUploadImage: (file: File) => void;
  loading?: boolean;
  error?: string | null;
}

const InputHistoryPanel: React.FC<InputHistoryPanelProps> = ({ 
  currentStep,
  images, 
  selectedImageId,
  onSelectImage,
  onUploadImage,
  loading = false,
  error = null,
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
      
      // Reset the input value so the same file can be uploaded again if needed
      event.target.value = '';
    }
  };

  // Show loading state only when no images exist yet
  if (loading && images.length === 0) {
    return (
      <div className="h-full w-[74px] flex flex-col justify-center flex-shrink-0">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full w-[74px] flex flex-col justify-center  `}>
      <div className='flex flex-col justify-center bg-white shadow-lg rounded-md max-h-[min(500px,calc(100vh-150px))] h-auto w-full m-auto'>
        <div className="px-2 text-center py-4">
          <LightTooltip text='Upload Image' direction='bottom'>
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 bg-white shadow border-0 py-5"
              onClick={handleUploadClick}
              disabled={loading}
            >
              {loading ? (
                <DotLottieReact 
                  src={squareSpinner} 
                  autoplay 
                  loop 
                  style={{ width: 24, height: 24 }} 
                />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </LightTooltip>
          <input 
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={loading}
          />
          <div className="border-b border-[#E3E3E3] border-2 mt-4 w-1/2 mx-auto" />
        </div>

        <div className="overflow-y-auto h-[calc(100%-53px)] mb-2 hide-scrollbar">
          {images.length > 0 ? (
            <div className="grid gap-2 px-1">
              {displayImages.map((image) => (
                <div 
                  key={image.id}
                  className={`relative cursor-pointer rounded-md overflow-hidden border-2 group ${
                    selectedImageId === image.id ? 'border-red-500' : 'border-transparent'
                  }`}
                  onClick={() => onSelectImage(image.id)}
                >
                  <img 
                    src={image.thumbnailUrl} 
                    alt={`Input item from ${image.createdAt.toLocaleString()}`}
                    className="w-full h-[57px] w-[57px] object-cover"
                  />
                  {/* delete removed */}
                </div>
              ))}
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

export default InputHistoryPanel;