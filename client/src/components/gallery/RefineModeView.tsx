import React from 'react';
import { Images, Loader2 } from 'lucide-react';

interface RefineModeImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
  moduleType: 'CREATE' | 'TWEAK';
  refineUploadId: number;
}

interface RefineModeViewProps {
  images: RefineModeImage[];
  onDownload: (imageUrl: string, imageId: number) => void;
  onShare: (imageUrl: string, imageId: number) => void;
  isSharing?: boolean; // New prop for share loading state
}

const RefineModeView: React.FC<RefineModeViewProps> = ({
  images,
  onDownload,
  onShare,
  isSharing = false
}) => {
  
  // Group images by date for better organization
  const groupImagesByDate = (images: RefineModeImage[]) => {
    const groups: { [key: string]: RefineModeImage[] } = {};
    
    images.forEach(image => {
      const date = new Date(image.createdAt);
      const dateKey = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(image);
    });
    
    return groups;
  };

  const groupedImages = groupImagesByDate(images);
  
  // Sort date groups by most recent date first
  const sortedDateEntries = Object.entries(groupedImages).sort(([dateA], [dateB]) => {
    const dateObjA = new Date(dateA);
    const dateObjB = new Date(dateB);
    return dateObjB.getTime() - dateObjA.getTime();
  });

  return (
    <div className="flex-1 overflow-auto hide-scrollbar">
      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-medium text-gray-600 mb-6">Refine Ready Images</h2>
          <p className="text-sm text-gray-500 mb-6">
            Images from Create and Edit modules that have been uploaded to Refine module
          </p>
          
          {sortedDateEntries.length > 0 ? (
            <>
              {sortedDateEntries.map(([date, dateImages]) => (
                <div key={date} className="mb-8">
                  <h3 className="text-sm font-medium text-gray-500 mb-4">{date}</h3>
                  
                  {/* Input Image Panel Style Grid */}
                  <div className="bg-[#F0F0F0] rounded-md p-4">
                    <div className="text-xs text-gray-600 mb-3 uppercase tracking-wider font-medium">
                      Refine Input Images ({dateImages.length})
                    </div>
                    
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                      {dateImages.map((image) => (
                        <div 
                          key={image.id}
                          className="group relative cursor-pointer rounded-md overflow-hidden border-2 border-transparent hover:border-black transition-colors"
                          onClick={() => {
                            // Navigate to refine page with this image
                            window.location.href = `/refine?imageId=${image.refineUploadId}&type=input`;
                          }}
                        >
                          <img 
                            src={image.thumbnailUrl || image.imageUrl} 
                            alt={`${image.moduleType} image ${image.id} - ready for refine`}
                            className="w-full aspect-square object-cover"
                            loading="lazy"
                          />
                          
                          {/* Module type indicator */}
                          <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                            {image.moduleType}
                          </div>
                          
                          {/* Hover overlay with actions */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                          
                          {/* Action buttons on hover */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isSharing) {
                                    onShare(image.imageUrl, image.id);
                                  }
                                }}
                                disabled={isSharing}
                                className={`bg-white/90 hover:bg-white text-gray-700 shadow-lg w-6 h-6 flex items-center justify-center rounded text-xs ${
                                  isSharing ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                                }`}
                                title="Share"
                              >
                                {isSharing ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  '📤'
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDownload(image.imageUrl, image.id);
                                }}
                                className="bg-white/90 hover:bg-white text-gray-700 shadow-lg w-6 h-6 flex items-center justify-center rounded text-xs"
                                title="Download"
                              >
                                ⬇️
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="text-center py-12">
              <Images className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <div className="text-gray-400 mb-2">No refine-ready images yet</div>
              <div className="text-sm text-gray-500">
                Create or edit some images, then use the UPSCALE button to prepare them for refining
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RefineModeView;
