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
  return (
    <div className="absolute top-1/2 right-3 -translate-y-1/2 h-auto shadow-lg bg-[#F1F1F1] rounded-md w-[88px]">
      <div className="text-center py-4">
        <h2 className="text-sm">History</h2>
        <div className="border-b border-white border-2 my-2 w-1/2 mx-auto" />
      </div>
      
      <div className="overflow-y-auto h-[calc(100%-53px)] pb-2">
        {loading && images.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center pb-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 border-t-blue-500 mb-2"></div>
            <p className="text-xs text-gray-600">Loading...</p>
          </div>
        ) : images.length > 0 ? (
          <div className="grid gap-2 text-xs">
            {images.map((image, index) => (
              <>
                {index !== 0 && <div className="border-t border-gray-300 my-2" />}
                <div 
                  key={image.id}
                  className={`cursor-pointer rounded-md overflow-hidden border-2 w-[73px] h-[57px] relative ${
                    selectedImageId === image.id ? 'border-blue-500' : 'border-transparent'
                  }`}
                  onClick={() => onSelectImage(image.id)}
                >
                  <img 
                    src={image.imageUrl} 
                    alt={`History item from ${image.createdAt.toLocaleString()}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Show processing indicator for RunPod images */}
                  {(image as any).status === 'PROCESSING' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    </div>
                  )}
                  {/* Show batch indicator for RunPod images */}
                  {(image as any).batchId && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </div>
              </>
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
  );
};

export default HistoryPanel;