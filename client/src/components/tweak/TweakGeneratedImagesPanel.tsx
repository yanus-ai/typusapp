import React from 'react';
import { Images, Undo2, Redo2 } from 'lucide-react';

interface TweakImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  batchId?: number;
  variationNumber?: number;
  runpodStatus?: string;
  originalBaseImageId?: number;
}

interface TweakGeneratedImagesPanelProps {
  images: TweakImage[];
  selectedImageId?: number;
  onSelectImage: (imageId: number) => void;
  loading?: boolean;
  error?: string | null;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  selectedBaseImageId?: number;
  generationHistory?: Array<{imageId: number, operationType?: string, timestamp: Date, baseImageId?: number}>;
  historyIndex?: number;
}

const TweakGeneratedImagesPanel: React.FC<TweakGeneratedImagesPanelProps> = ({ 
  images, 
  selectedImageId,
  onSelectImage,
  loading = false,
  error = null,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  generationHistory = [],
  historyIndex = -1
}) => {
  console.log('🖼️ TweakGeneratedImagesPanel props:', {
    imagesCount: images.length,
    generationHistoryCount: generationHistory.length,
    historyIndex,
    selectedImageId
  });
  
  // Show images from generation history to preserve order and show all states
  const filteredImages = generationHistory.map(historyItem => {
    const image = images.find(img => img.id === historyItem.imageId);
    console.log('🔍 Looking for image:', historyItem.imageId, 'found:', !!image);
    return image ? {
      ...image,
      isInHistory: true,
      isCurrentState: generationHistory.indexOf(historyItem) === historyIndex
    } : null;
  }).filter(Boolean) as (TweakImage & {isInHistory: boolean, isCurrentState: boolean})[];
  
  console.log('🎯 Filtered images for panel:', filteredImages.length);

  const renderImage = (image: TweakImage & {isInHistory?: boolean, isCurrentState?: boolean}) => {
    const imageUrl = image.thumbnailUrl || image.imageUrl;
    const isSelected = selectedImageId === image.id;
    const isCurrentState = image.isCurrentState;
    
    return (
      <div 
        key={image.id}
        className={`w-full cursor-pointer rounded-md overflow-hidden border-2 relative ${ 
          isCurrentState ? 'border-blue-500 border-3' : isSelected ? 'border-black' : 'border-transparent'
        }`}
        onClick={() => onSelectImage(image.id)}
        title={isCurrentState ? 'Current state' : ''}
      >
        {imageUrl && image.status === 'COMPLETED' ? (
          <img 
            src={imageUrl} 
            alt={`Tweak generated image`}
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
          <h2 className="text-sm">Generated</h2>
          <div className="border-b border-white border-2 mt-2 w-1/2 mx-auto" />
        </div>
        
        {/* Undo/Redo Controls */}
        {(onUndo || onRedo) && (
          <div className="flex justify-center gap-1 px-2 pb-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-1 rounded text-xs ${
                canUndo 
                  ? 'bg-white/20 hover:bg-white/30 text-black cursor-pointer' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title="Undo"
            >
              <Undo2 size={12} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1 rounded text-xs ${
                canRedo 
                  ? 'bg-white/20 hover:bg-white/30 text-black cursor-pointer' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title="Redo"
            >
              <Redo2 size={12} />
            </button>
          </div>
        )}
        
        <div className="overflow-y-auto h-[calc(100%-53px)] pb-2 hide-scrollbar mb-2">
          {loading && filteredImages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center pb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 mb-2"></div>
              <p className="text-xs text-gray-600">Loading...</p>
            </div>
          ) : filteredImages.length > 0 ? (
            <div className="grid gap-2 px-1">
              {filteredImages.map((image) => (
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
              <Images size={24} className="text-gray-400 mb-2" />
              <p className="text-xs text-gray-600">No images yet</p>
              <p className="text-xs text-gray-500 mt-1">Generate to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TweakGeneratedImagesPanel;