import React, { useState } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import EditInspector from '@/components/create/EditInspector';
import ImageCanvas from '@/components/create/ImageCanvas';
import HistoryPanel from '@/components/create/HistoryPanel';
import AIPromptInput from '@/components/create/AIPrompt';
import InputHistoryPanel from '@/components/create/InputHistoryPanel';

const ArchitecturalVisualization: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
  const [historyImages, setHistoryImages] = useState<{ id: string; imageUrl: string; createdAt: Date }[]>([]);
  
  const handlePromptSubmit = (prompt: string) => {
    // In a real app, this would call an API to generate an image
    console.log('Generating image with prompt:', prompt);
    // For now, just add a sample image to history
    const newImage = {
      id: Date.now().toString(),
      imageUrl: '/images/sample-building.jpg',
      createdAt: new Date()
    };
    
    setHistoryImages([newImage, ...historyImages]);
    setSelectedImage(newImage.id);
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
            
            <AIPromptInput onSubmit={handlePromptSubmit} />
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