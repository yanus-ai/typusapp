import React from 'react';
import { Images } from 'lucide-react';

interface HistoryImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  batchId?: number;
  variationNumber?: number;
  runpodStatus?: string;
}

interface HistoryPanelProps {
  images: HistoryImage[];
  selectedImageId?: number;
  onSelectImage: (imageId: number) => void;
  onConvertToInputImage?: (image: HistoryImage) => void;
  loading?: boolean;
  error?: string | null;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  images, 
  selectedImageId,
  onSelectImage,
  loading = false,
  error = null
}) => {
  // Filter and sort images - show all completed images, processing for feedback
  const displayImages = images
    .filter(image => image.status === 'COMPLETED' || image.status === 'PROCESSING')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const renderImage = (image: HistoryImage) => {
    const imageUrl = image.thumbnailUrl || image.imageUrl;
    const isSelected = selectedImageId === image.id;
    
    return (
      <div 
        key={image.id}
        className={`w-full cursor-pointer rounded-md overflow-hidden border-2 relative ${
          isSelected ? 'border-black' : 'border-transparent'
        }`}
        onClick={() => onSelectImage(image.id)}
      >
        {imageUrl && image.status === 'COMPLETED' ? (
          <img 
            src={imageUrl} 
            alt={`Generated image`}
            className="w-full h-[57px] w-[57px] object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full bg-gray-200 h-[57px] flex items-center justify-center">
            {image.status === 'PROCESSING' ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-blue-500"></div>
            ) : (
              <div className="text-gray-400 text-xs">Loading...</div>
            )}
          </div>
        )}
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
          {loading && images.length === 0 ? (
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

export default HistoryPanel;