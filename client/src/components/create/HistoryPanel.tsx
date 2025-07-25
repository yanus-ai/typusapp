import React from 'react';
import { Images, Layers2 } from 'lucide-react';

interface HistoryImage {
  id: string;
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
  selectedImageId?: string;
  onSelectImage: (imageId: string) => void;
  onConvertToInputImage?: (image: HistoryImage) => void;
  loading?: boolean;
  error?: string | null;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  images, 
  selectedImageId,
  onSelectImage,
  onConvertToInputImage,
  loading = false,
  error = null
}) => {
  // Filter and sort images - show all completed images, processing for feedback
  const displayImages = images
    .filter(image => image.status === 'COMPLETED' || image.status === 'PROCESSING')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const renderImage = (image: HistoryImage) => {
    const imageUrl = image.thumbnailUrl || image.imageUrl;
    const isRecent = image.createdAt && Date.now() - image.createdAt.getTime() < 60000;
    const isSelected = selectedImageId === image.id.toString();
    
    return (
      <div className="flex flex-col items-center gap-1">
        <div 
          key={image.id}
          className={`cursor-pointer rounded-md overflow-hidden border-2 w-[73px] h-[57px] relative ${
            isSelected ? 'border-blue-500' : 'border-transparent'
          }`}
          onClick={() => onSelectImage(image.id.toString())}
        >
          {imageUrl && image.status === 'COMPLETED' ? (
            <img 
              src={imageUrl} 
              alt={`Generated image`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              {image.status === 'PROCESSING' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-blue-500"></div>
              ) : (
                <div className="text-gray-400 text-xs">Loading...</div>
              )}
            </div>
          )}
          
          {/* Processing indicator */}
          {image.status === 'PROCESSING' && imageUrl && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            </div>
          )}
          
          {/* Recently generated indicator */}
          {isRecent && image.status === 'COMPLETED' && (
            <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          )}
        </div>
        
        {/* Create Regions Button */}
        {image.status === 'COMPLETED' && onConvertToInputImage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConvertToInputImage(image);
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            title="Create regions for this image"
          >
            <Layers2 size={10} />
            <span>Regions</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="absolute top-1/2 right-3 -translate-y-1/2 h-auto shadow-lg bg-[#F1F1F1] rounded-md w-[88px]">
      <div className='flex flex-col justify-center bg-[#F0F0F0] shadow-lg rounded-md max-h-[calc(100vh-152px)] m-auto'>
        <div className="text-center py-4">
          <h2 className="text-sm">History</h2>
          <div className="border-b border-white border-2 mt-2 w-1/2 mx-auto" />
        </div>
        
        <div className="overflow-y-auto h-[calc(100%-53px)] pb-2 hide-scrollbar">
          {loading && images.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center pb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 border-t-blue-500 mb-2"></div>
              <p className="text-xs text-gray-600">Loading...</p>
            </div>
          ) : displayImages.length > 0 ? (
            <div className="grid gap-3 text-xs">
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