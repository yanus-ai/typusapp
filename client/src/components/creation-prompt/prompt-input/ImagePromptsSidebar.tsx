import React from 'react';

interface HistoryImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  aiPrompt?: string;
  moduleType?: 'CREATE' | 'TWEAK' | 'REFINE';
  settingsSnapshot?: {
    attachments?: {
      surroundingUrls?: string[];
      wallsUrls?: string[];
      textureUrls?: string[];
      referenceImageUrls?: string[];
    };
  };
}

interface ImagePromptsSidebarProps {
  images: HistoryImage[];
  selectedImageId?: number;
  onSelectImage: (imageId: number) => void;
}

const ImagePromptsSidebar: React.FC<ImagePromptsSidebarProps> = ({
  images,
  selectedImageId,
  onSelectImage
}) => {
  // Filter completed images with prompts
  const imagesWithPrompts = images
    .filter(image => image.status === 'COMPLETED' && image.aiPrompt)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10); // Show last 10 images

  if (imagesWithPrompts.length === 0) {
    return (
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col p-4">
        <div className="text-sm text-gray-500 text-center mt-8">
          No generated images yet
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white flex flex-col overflow-hidden">
      {/* Prompts List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
        {imagesWithPrompts.map((image) => {
          const isSelected = selectedImageId === image.id;
          
          // Extract texture URLs - handle both JSON string and object
          let settingsSnapshot = image.settingsSnapshot;
          if (typeof settingsSnapshot === 'string') {
            try {
              settingsSnapshot = JSON.parse(settingsSnapshot);
            } catch (e) {
              console.warn('Failed to parse settingsSnapshot:', e);
            }
          }
          
          const attachments = settingsSnapshot?.attachments;
          const surroundingUrls = attachments?.surroundingUrls || [];
          const wallsUrls = attachments?.wallsUrls || [];
          const textureUrls = attachments?.textureUrls || [];
          const referenceImageUrls = attachments?.referenceImageUrls || [];
          
          // Combine all texture URLs
          const allTextureUrls = [
            ...surroundingUrls,
            ...wallsUrls,
            ...textureUrls,
            ...referenceImageUrls
          ].filter(Boolean).slice(0, 8); // Show max 8 texture samples

          return (
            <div
              key={image.id}
              className={`group cursor-pointer transition-all ${
                isSelected ? 'scale-[1.02]' : ''
              }`}
              onClick={() => onSelectImage(image.id)}
            >
              {/* Chat Bubble */}
              <div
                className={`relative bg-gray-50 rounded-2xl rounded-bl-md p-4 transition-all ${
                  isSelected
                    ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset'
                    : 'hover:bg-gray-100'
                }`}
              >
                {/* Prompt Text */}
                {image.aiPrompt && (
                  <p
                    className={`text-sm leading-relaxed mb-3 ${
                      isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {image.aiPrompt}
                  </p>
                )}

                {/* Texture Samples */}
                {allTextureUrls.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Textures
                      </span>
                      <span className="text-xs text-gray-400">
                        {allTextureUrls.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {allTextureUrls.map((textureUrl, idx) => (
                        <div
                          key={idx}
                          className="aspect-square rounded-lg overflow-hidden bg-gray-200 shadow-sm"
                        >
                          <img
                            src={textureUrl}
                            alt={`Texture ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-10 bg-blue-500 rounded-r-full" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ImagePromptsSidebar;
