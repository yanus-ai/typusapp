import React, { useRef } from 'react';
import TweakCanvas, { TweakCanvasRef } from '@/components/tweak/TweakCanvas';

const ExampleUsage: React.FC = () => {
  const canvasRef = useRef<TweakCanvasRef>(null);

  const handleGenerateMask = () => {
    if (canvasRef.current) {
      const maskDataUrl = canvasRef.current.generateMaskImage();
      
      if (maskDataUrl) {
        console.log('Generated mask:', maskDataUrl);
        
        // You can now use this mask for:
        // 1. Sending to an inpainting/outpainting API
        // 2. Displaying as a preview
        // 3. Saving to file
        // 4. Converting to blob for upload
        
        // Example: Convert to blob
        fetch(maskDataUrl)
          .then(res => res.blob())
          .then(blob => {
            console.log('Mask as blob:', blob);
            // Use the blob for API calls
          });
          
        // Example: Create download link
        const link = document.createElement('a');
        link.href = maskDataUrl;
        link.download = 'mask.png';
        link.click();
      } else {
        console.log('No drawn objects found - no mask generated');
      }
    }
  };

  return (
    <div>
      <TweakCanvas 
        ref={canvasRef}
        imageUrl="your-image-url"
        currentTool="rectangle"
        selectedBaseImageId={1}
      />
      
      <button onClick={handleGenerateMask}>
        Generate Mask
      </button>
    </div>
  );
};

export default ExampleUsage;
