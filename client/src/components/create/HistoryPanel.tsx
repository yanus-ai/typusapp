import React from 'react';
import { Images } from 'lucide-react';

interface HistoryImage {
  id: string;
  imageUrl: string;
  createdAt: Date;
}

interface HistoryPanelProps {
  images: HistoryImage[];
  selectedImageId?: string;
  onSelectImage: (imageId: string) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  images, 
  selectedImageId,
  onSelectImage
}) => {
  return (
    <div className="absolute top-1/2 right-3 -translate-y-1/2 h-auto shadow-lg bg-[#F1F1F1] rounded-md w-[88px]">
      <div className="text-center py-4">
        <h2 className="text-sm">History</h2>
        <div className="border-b border-white border-2 my-2 w-1/2 mx-auto" />
      </div>
      
      <div className="overflow-y-auto h-[calc(100%-53px)] pb-2">
        {images.length > 0 ? (
          <div className="grid gap-2 text-xs">
            {images.map((image, index) => (
              <>
                {index !== 0 && <div className="border-t border-gray-300 my-2" />}
                <div 
                  key={image.id}
                  className={`cursor-pointer rounded-md overflow-hidden border-2 w-[73px] h-[57px] ${
                    selectedImageId === image.id ? 'border-blue-500' : 'border-transparent'
                  }`}
                  onClick={() => onSelectImage(image.id)}
                >
                  <img 
                    src={image.imageUrl} 
                    alt={`History item from ${image.createdAt.toLocaleString()}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center pb-4">
            <Images />
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;