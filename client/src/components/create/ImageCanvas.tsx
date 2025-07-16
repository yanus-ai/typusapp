import React from 'react';
import { Images } from 'lucide-react';

interface ImageCanvasProps {
  imageUrl?: string;
  onClose?: () => void;
  loading?: boolean;
  error?: string | null;
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({ imageUrl }) => {
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center w-full h-full">
      {/* Image Preview */}
      <div className={`relative w-full h-full max-w-3xl max-h-[calc(100vh-260px)] flex items-center justify-center rounded-md m-auto ${!imageUrl && 'bg-black'}`}>
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt="Generated visualization"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <Images size={"128"} className='text-white opacity-80'/>
        )}
      </div>
      
      {/* Bottom toolbar will be added later */}
    </div>
  );
};

export default ImageCanvas;