import React, { useRef, useEffect, useState } from 'react';
import { Images, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface ImageCanvasProps {
  setIsPromptModalOpen: (isOpen: boolean) => void;
  imageUrl?: string;
  onClose?: () => void;
  loading?: boolean;
  error?: string | null;
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({ imageUrl, setIsPromptModalOpen }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [initialImageLoaded, setInitialImageLoaded] = useState(false);

  useEffect(() => {
    console.log('🖼️ ImageCanvas: imageUrl changed:', imageUrl);
    if (imageUrl) {
      const img = new Image();
      img.onload = () => {
        console.log('🖼️ ImageCanvas: Image loaded successfully');
        setImage(img);
        if (!initialImageLoaded) {
          // Center and fit the image to viewport on initial load
          centerAndFitImage(img);
          setInitialImageLoaded(true);
        }
        drawCanvas();
      };
      img.onerror = (error) => {
        console.error('🖼️ ImageCanvas: Failed to load image:', error);
      };
      img.src = imageUrl;
    } else {
      console.log('🖼️ ImageCanvas: No imageUrl provided, clearing image');
      setImage(null);
      setInitialImageLoaded(false);
    }
  }, [imageUrl]);

  useEffect(() => {
    drawCanvas();
  }, [zoom, pan, image]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const prevWidth = canvas.width;
      const prevHeight = canvas.height;
      
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Adjust pan position to maintain relative image position after resize
      if (prevWidth > 0 && prevHeight > 0 && image) {
        const widthRatio = canvas.width / prevWidth;
        const heightRatio = canvas.height / prevHeight;
        
        // Adjust pan to maintain the same relative position
        setPan(prev => ({
          x: prev.x * widthRatio,
          y: prev.y * heightRatio
        }));
      }
      
      drawCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [image]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (image) {
      const centerX = canvas.width / 2 + pan.x;
      const centerY = canvas.height / 2 + pan.y;
      const scaledWidth = image.width * zoom;
      const scaledHeight = image.height * zoom;

      ctx.drawImage(
        image,
        centerX - scaledWidth / 2,
        centerY - scaledHeight / 2,
        scaledWidth,
        scaledHeight
      );
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    // e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(10, prev * zoomFactor)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setHasDragged(false);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Update mouse position for the hover indicator
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });

    if (!isDragging) return;
    
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      setHasDragged(true);
    }
    
    setPan(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const zoomIn = () => {
    setZoom(prev => Math.min(10, prev * 1.2));
  };

  const zoomOut = () => {
    setZoom(prev => Math.max(0.1, prev / 1.2));
  };

  const resetView = () => {
    if (image) {
      centerAndFitImage(image);
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  const centerAndFitImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Calculate the scale to fit the image within the viewport with some padding
    const padding = 50; // 50px padding from edges
    const availableWidth = canvas.width - padding * 2;
    const availableHeight = canvas.height - padding * 2;
    
    const scaleX = availableWidth / img.width;
    const scaleY = availableHeight / img.height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond original size
    
    setZoom(scale);
    setPan({ x: 0, y: 0 }); // Center the image
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-white">
      <div 
        className="relative w-full h-full"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          handleMouseUp();
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-move"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={() => {
            if (imageUrl && !hasDragged) {
              setIsPromptModalOpen(true);
            }
          }}
        />
        
        {/* Pulsating click indicator that follows mouse cursor */}
        {imageUrl && isHovering && !isDragging && (
          <div 
            className="absolute pointer-events-none z-10"
            style={{
              left: mousePos.x - 32, // Center the 64px (w-16) circle on cursor
              top: mousePos.y - 32,
            }}
          >
            <div className="relative">
              {/* Outer pulsating ring */}
              <div className="absolute inset-0 w-16 h-16 bg-gray-500/20 rounded-full animate-ping"></div>
              {/* Middle pulsating ring */}
              <div className="absolute inset-0 w-16 h-16 bg-gray-500/30 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}
      </div>
      
      {!imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Images size={128} className="text-white opacity-80" />
        </div>
      )}

      <div className="absolute bottom-1 right-4 flex flex gap-2">
        <button
          onClick={zoomIn}
          className="cursor-pointer p-2 bg-white/10 hover:bg-white/20 text-black rounded-md text-xs backdrop-blur-sm"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={zoomOut}
          className="cursor-pointer p-2 bg-white/10 hover:bg-white/20 text-black rounded-md text-xs backdrop-blur-sm"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={resetView}
          className="cursor-pointer p-2 bg-white/10 hover:bg-white/20 text-black rounded-md text-xs backdrop-blur-sm"
          title="Fit to Screen"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default ImageCanvas;