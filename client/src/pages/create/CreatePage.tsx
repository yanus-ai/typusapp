import React, { useState } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import EditInspector from '@/components/create/EditInspector';
import ImageCanvas from '@/components/create/ImageCanvas';
import HistoryPanel from '@/components/create/HistoryPanel';
import ContextToolbar from '@/components/create/ContextToolbar';
import InputHistoryPanel from '@/components/create/InputHistoryPanel';
import AIPromptInput from '@/components/create/AIPromptInput';

const ArchitecturalVisualization: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
  const [historyImages, setHistoryImages] = useState<{ id: string; imageUrl: string; createdAt: Date }[]>([]);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  
  const handlePromptSubmit = (prompt: string) => {
    console.log('Prompt submitted:', prompt);

    const newImage = {
      id: Date.now().toString(),
      imageUrl: '/images/sample-building.jpg',
      createdAt: new Date()
    };
    
    setHistoryImages([newImage, ...historyImages]);
    setSelectedImage(newImage.id);
  };

  const handleSubmit = () => {
    console.log('Submit button clicked');
  };
  
  const getCurrentImageUrl = () => {
    if (!selectedImage) return undefined;
    const image = historyImages.find(img => img.id === selectedImage);
    return image?.imageUrl;
  };
  
  return (
    <MainLayout>
      <div className="flex-1 flex overflow-hidden gap-2">
        <InputHistoryPanel
          images={historyImages}
          selectedImageId={selectedImage}
          onSelectImage={setSelectedImage}
        />

        <EditInspector />
        
        <div className="flex-1 flex flex-col relative">
          <div className="flex-1 relative">
            <ImageCanvas 
              imageUrl={getCurrentImageUrl()} 
            />
            
            <ContextToolbar setIsPromptModalOpen={setIsPromptModalOpen} onSubmit={handleSubmit} />

            {isPromptModalOpen && (
              <AIPromptInput 
                setIsPromptModalOpen={setIsPromptModalOpen}
                onSubmit={(prompt) => {
                  handlePromptSubmit(prompt);
                }}
              />
            )}
          </div>

          <HistoryPanel 
            images={historyImages}
            selectedImageId={selectedImage}
            onSelectImage={setSelectedImage}
          />
        </div>
        
      </div>
    </MainLayout>
  );
};

export default ArchitecturalVisualization;