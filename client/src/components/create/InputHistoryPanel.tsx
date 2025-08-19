import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Images } from 'lucide-react';

interface InputHistoryImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
}

interface InputHistoryPanelProps {
  images: InputHistoryImage[];
  selectedImageId?: number;
  onSelectImage: (imageId: number) => void;
  onUploadImage: (file: File) => void;
  loading?: boolean;
  error?: string | null;
}

const InputHistoryPanel: React.FC<InputHistoryPanelProps> = ({ 
  images, 
  selectedImageId,
  onSelectImage,
  onUploadImage,
  loading = false,
  error = null
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // Show loading state
  if (loading) {
    return (
      <div className="h-full w-[74px] flex flex-col justify-center flex-shrink-0">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-full w-[74px] flex flex-col justify-center">
        <div className="text-red-500 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-full w-[74px] flex flex-col justify-center z-60">
      <div className='flex flex-col justify-center bg-[#F0F0F0] shadow-lg rounded-md max-h-[min(500px,calc(100vh-150px))] h-auto w-full m-auto'>
        <div className="px-2 text-center py-4">
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2 bg-white shadow border-0 py-5"
            onClick={handleUploadClick}
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2"></div>
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
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
              {images.map((image) => (
                <div 
                  key={image.id}
                  className={`cursor-pointer rounded-md overflow-hidden border-2 ${
                    selectedImageId === image.id ? 'border-black' : 'border-transparent'
                  }`}
                  onClick={() => onSelectImage(image.id)}
                >
                  <img 
                    src={image.thumbnailUrl} 
                    alt={`Input item from ${image.createdAt.toLocaleString()}`}
                    className="w-full h-[57px] w-[57px] object-cover"
                  />
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