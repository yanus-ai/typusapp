import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Images } from 'lucide-react';

interface RefineInputHistoryImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
  source?: 'refine_uploaded' | 'tweak_generated' | 'create_generated';
  moduleType?: string;
}

interface RefineInputHistoryPanelProps {
  images: RefineInputHistoryImage[];
  selectedImageId?: number;
  onSelectImage: (imageId: number) => void;
  onUploadImage: (file: File) => void;
  loading?: boolean;
  error?: string | null;
}

const RefineInputHistoryPanel: React.FC<RefineInputHistoryPanelProps> = ({ 
  images, 
  selectedImageId,
  onSelectImage,
  onUploadImage,
  loading = false,
  error = null
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Filter to only show refine uploaded input images
  const refineUploadedImages = images.filter(image => image.source === 'refine_uploaded');
  
  // Debug logging to see selection state
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

  // Show loading state only when no images exist yet
  if (loading && refineUploadedImages.length === 0) {
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
      <div className='flex flex-col justify-center bg-white shadow-lg rounded-md max-h-[min(500px,calc(100vh-150px))] h-auto w-full m-auto'>
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
          {refineUploadedImages.length > 0 ? (
            <div className="grid gap-2 px-1">
              {refineUploadedImages.map((image) => {
                const isSelected = selectedImageId === image.id;
                
                return (
                <div 
                  key={image.id}
                  className={`cursor-pointer rounded-md overflow-hidden border-2 relative group ${
                    isSelected ? 'border-black' : 'border-transparent'
                  }`}
                  onClick={() => onSelectImage(image.id)}
                >
                  <img 
                    src={image.thumbnailUrl} 
                    alt={`Input item from ${image.createdAt.toLocaleString()}`}
                    className="w-full h-[57px] w-[57px] object-cover"
                  />
                  {/* Source badge */}
                  {/* <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <CrossModuleBadges
                      createUploadId={image.source === 'create_generated' ? image.id : undefined}
                      tweakUploadId={image.source === 'tweak_generated' ? image.id : undefined}
                      refineUploadId={image.source === 'refine_uploaded' ? image.id : undefined}
                      size="sm"
                    />
                  </div> */}
                </div>
                );
              })}
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

export default RefineInputHistoryPanel;