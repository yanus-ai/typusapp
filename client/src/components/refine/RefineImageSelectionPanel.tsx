import React, { useRef } from 'react';
import { Images, Plus, Upload, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RefineImageSelectionPanelProps {
  inputImages: any[];
  generatedImages: any[];
  selectedImageId: number | null;
  onImageSelect: (image: any, type: 'input' | 'generated') => void;
  onUploadImage?: (file: File) => void;
  loading: boolean;
  operations: any[];
  loadingOperations: boolean;
}

const RefineImageSelectionPanel: React.FC<RefineImageSelectionPanelProps> = ({
  inputImages,
  generatedImages,
  selectedImageId,
  onImageSelect,
  onUploadImage,
  loading
}) => {
  console.log('🖼️ RefineImageSelectionPanel: Rendering with:', {
    selectedImageId,
    inputImagesCount: inputImages.length,
    generatedImagesCount: generatedImages.length
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // Removed unused render methods as we're using a simplified layout

  return (
    <div className="h-full w-[74px] flex flex-col justify-center z-60">
      <div className='flex flex-col justify-center bg-[#F0F0F0] shadow-lg rounded-md max-h-[min(500px,calc(100vh-150px))] h-auto w-[74px] m-auto'>
        {/* Upload Section */}
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

        {/* Images List */}
        <div className="overflow-y-auto h-[calc(100%-53px)] mb-2 hide-scrollbar">
          {(inputImages.length > 0 || generatedImages.length > 0) ? (
            <div className="grid gap-2 px-1">
              {/* Refine Module Input Images */}
              {inputImages.map((image) => {
                const imageUrl = image.processedUrl || image.originalUrl;
                const isSelected = selectedImageId === image.id;
                
                if (!imageUrl) {
                  return null;
                }
                
                return (
                  <div 
                    key={`input-${image.id}`}
                    className={`cursor-pointer rounded-md overflow-hidden border-2 relative ${
                      isSelected ? 'border-black' : 'border-transparent'
                    }`}
                    onClick={() => {
                      console.log('🖼️ RefineImageSelectionPanel: Input image clicked:', { id: image.id, imageUrl });
                      onImageSelect(image, 'input');
                    }}
                  >
                    <img 
                      src={image.thumbnailUrl || imageUrl} 
                      alt={`Input image ${image.id}`}
                      className="w-full h-[57px] object-cover"
                      loading="lazy"
                    />
                    {/* Upload indicator */}
                    <div className="absolute top-1 right-1">
                      <Upload className="w-3 h-3 text-white drop-shadow" />
                    </div>
                  </div>
                );
              }).filter(Boolean)}
              
              {/* Generated Images from Create and Tweak Modules */}
              {generatedImages.map((image) => {
                const imageUrl = image.imageUrl;
                const isSelected = selectedImageId === image.id;
                
                if (!imageUrl || image.status !== 'COMPLETED') {
                  return null;
                }
                
                return (
                  <div 
                    key={`generated-${image.id}`}
                    className={`cursor-pointer rounded-md overflow-hidden border-2 relative ${
                      isSelected ? 'border-black' : 'border-transparent'
                    }`}
                    onClick={() => {
                      console.log('🖼️ RefineImageSelectionPanel: Generated image clicked:', { id: image.id, imageUrl });
                      onImageSelect(image, 'generated');
                    }}
                  >
                    <img 
                      src={image.thumbnailUrl || imageUrl} 
                      alt={`Generated image ${image.id}`}
                      className="w-full h-[57px] object-cover"
                      loading="lazy"
                    />
                    {/* Generated indicator */}
                    <div className="absolute top-1 right-1">
                      <Sparkles className="w-3 h-3 text-white drop-shadow" />
                    </div>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          ) : !loading ? (
            <div className="h-full flex flex-col items-center justify-center text-center pb-4">
              <Images className="mb-2 text-gray-400" size={24} />
              <p className="text-xs text-gray-500">No images available</p>
            </div>
          ) : (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 border-t-blue-500"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RefineImageSelectionPanel;
