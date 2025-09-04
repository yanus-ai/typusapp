import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Images } from 'lucide-react';

interface BaseImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt?: Date;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  moduleType?: 'INPUT' | 'CREATE' | 'TWEAK' | 'REFINE';
  operationType?: string;
  fileName?: string;
  variationNumber?: number;
}

interface ImageSelectionPanelProps {
  inputImages: BaseImage[];
  selectedImageId: number | null;
  onSelectImage: (imageId: number) => void;
  onUploadImage: (file: File) => void;
  loading?: boolean;
  loadingInputAndCreate?: boolean;
  error?: string | null;
}

const ImageSelectionPanel: React.FC<ImageSelectionPanelProps> = ({
  inputImages,
  selectedImageId,
  onSelectImage,
  onUploadImage,
  loading = false,
  loadingInputAndCreate = false,
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

  // Render image item component
  const renderImageItem = (image: BaseImage, sectionType: 'input' | 'create') => (
    <div 
      key={`${sectionType}-${image.id}`}
      className={`cursor-pointer rounded-md overflow-hidden border-2 relative ${
        selectedImageId === image.id ? 'border-black' : 'border-transparent'
      }`}
      onClick={() => onSelectImage(image.id)}
    >
      {image.imageUrl && image.status === 'COMPLETED' ? (
        <>
          <img 
            src={image.thumbnailUrl || image.imageUrl} 
            alt={`${sectionType} image`}
            className="w-full h-[57px] object-cover"
            loading="lazy"
          />
        </>
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

  // Show loading state
  if ((loading || loadingInputAndCreate) && inputImages.length === 0) {
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
        <div className="text-red-500 text-sm p-2">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-full w-[74px] flex flex-col justify-center z-60">
      <div className='flex flex-col justify-center bg-[#F0F0F0] shadow-lg rounded-md max-h-[min(600px,calc(100vh-150px))] h-auto m-auto'>
        {/* Upload Button */}
        <div className="px-2 text-center py-4">
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2 bg-white shadow border-0 py-5"
            onClick={handleUploadClick}
            disabled={loading || loadingInputAndCreate}
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
            disabled={loading || loadingInputAndCreate}
          />
          <div className="border-b border-[#E3E3E3] border-2 mt-4 w-1/2 mx-auto" />
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto h-[calc(100%-53px)] mb-2 hide-scrollbar">
          {/* Input Images Section - Only show tweak uploaded images */}
          {inputImages.length > 0 && (
            <div className="mb-4">
              <div className="grid gap-2 px-1">
                {inputImages.map((image) => renderImageItem(image, 'input'))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {inputImages.length === 0 && !loadingInputAndCreate && (
            <div className="h-full flex flex-col items-center justify-center text-center pb-4">
              <Images className="mb-2 text-gray-400" size={24} />
              <p className="text-xs text-gray-500">No images available</p>
            </div>
          )}

          {/* Loading State for Sections */}
          {loadingInputAndCreate && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 border-t-blue-500"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageSelectionPanel;