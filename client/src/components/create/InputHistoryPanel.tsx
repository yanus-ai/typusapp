import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Images } from 'lucide-react';

interface InputHistoryImage {
  id: string;
  imageUrl: string;
  createdAt: Date;
}

interface InputHistoryPanelProps {
  images: InputHistoryImage[];
  selectedImageId?: string;
  onSelectImage: (imageId: string) => void;
  onUploadImage?: (file: File) => void;
}

const InputHistoryPanel: React.FC<InputHistoryPanelProps> = ({ 
  images, 
  selectedImageId,
  onSelectImage,
  onUploadImage
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

  return (
    <div className="h-full w-[74px] flex flex-col justify-center pl-2">
      <div className='flex flex-col justify-center bg-[#F0F0F0] rounded-md'>
        <div className="px-2 text-center py-4">
        <Button 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2 bg-white shadow border-0 py-5"
          onClick={handleUploadClick}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <input 
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
        <div className="border-b border-[#E3E3E3] border-2 mt-4 w-1/2 mx-auto" />
      </div>
      
      <div className="overflow-y-auto h-[calc(100%-53px)] pb-2">
        {images.length > 0 ? (
          <div className="grid gap-2">
            {images.map((image) => (
              <div 
                key={image.id}
                className={`cursor-pointer rounded-md overflow-hidden border-2 ${
                  selectedImageId === image.id ? 'border-blue-500' : 'border-transparent'
                }`}
                onClick={() => onSelectImage(image.id)}
              >
                <img 
                  src={image.imageUrl} 
                  alt={`History item from ${image.createdAt.toLocaleString()}`}
                  className="w-full h-24 object-cover"
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