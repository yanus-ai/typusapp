import React, { useRef, useEffect, useState } from 'react';
import { Images, ZoomIn, ZoomOut, Maximize2, Download, Grid3X3 } from 'lucide-react';

interface ImageCanvasProps {
  setIsPromptModalOpen: (isOpen: boolean) => void;
  imageUrl?: string;
  onClose?: () => void;
  loading?: boolean;
  error?: string | null;
  editInspectorMinimized?: boolean;
  onDownload?: () => void;
  onOpenGallery?: () => void;
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({ imageUrl, setIsPromptModalOpen, editInspectorMinimized = false, onDownload, onOpenGallery }) => {
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
  const [animatedPanelOffset, setAnimatedPanelOffset] = useState(() => {
    // Initialize with correct offset based on initial panel state
    const panelWidth = editInspectorMinimized ? 0 : 396;
    return panelWidth / 2;
  });
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    console.log('🖼️ ImageCanvas: imageUrl changed:', imageUrl);
    if (imageUrl) {
      const img = new Image();
      img.onload = () => {
        console.log('🖼️ ImageCanvas: Image loaded successfully');
        setImage(img);
        // Always center and fit the image when image changes (not just on initial load)
        centerAndFitImage(img);
        if (!initialImageLoaded) {
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
  }, [zoom, pan, image, animatedPanelOffset]);

  // Animate panel offset transition
  const animatePanelOffset = (targetOffset: number) => {
    // Skip animation if already at target
    if (Math.abs(animatedPanelOffset - targetOffset) < 1) {
      return;
    }

    console.log('🎬 Starting panel offset animation:', { from: animatedPanelOffset, to: targetOffset });
    
    const startOffset = animatedPanelOffset;
    const startTime = performance.now();
    const duration = 300; // 300ms animation duration

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentOffset = startOffset + (targetOffset - startOffset) * easeOut;
      
      setAnimatedPanelOffset(currentOffset);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        console.log('🎬 Panel offset animation completed');
      }
    };

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    animationRef.current = requestAnimationFrame(animate);
  };

  // Animate panel offset when panel state changes (preserve user's zoom and pan)
  useEffect(() => {
    const panelWidth = editInspectorMinimized ? 0 : 396;
    const targetOffset = panelWidth / 2;
    
    console.log('🔄 Panel state changed, preserving current state:', {
      zoom,
      pan,
      editInspectorMinimized,
      targetOffset
    });
    
    // Only animate the panel offset, don't reset zoom or pan
    animatePanelOffset(targetOffset);
  }, [editInspectorMinimized]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

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
      // Use the animated panel offset for smooth transitions
      const centerX = canvas.width / 2 + pan.x + animatedPanelOffset;
      const centerY = canvas.height / 2 + pan.y;
      const scaledWidth = image.width * zoom;
      const scaledHeight = image.height * zoom;

      // Debug logging (remove in production)
      // console.log('🎨 Drawing image:', {
      //   canvasSize: { width: canvas.width, height: canvas.height },
      //   pan,
      //   zoom,
      //   animatedPanelOffset,
      //   centerX,
      //   centerY
      // });

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
    e.preventDefault();
    
    // More controlled zoom with smaller increments
    // Normalize the delta value to handle different devices better
    const normalizedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 100);
    const zoomIntensity = 0.002; // Much smaller zoom factor
    const zoomFactor = 1 - normalizedDelta * zoomIntensity;
    
    // Apply zoom with better limits
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

    // Calculate panel width and adjust available space based on current panel state
    const panelWidth = editInspectorMinimized ? 0 : 396; // Total width of both panels
    const padding = 50; // 50px padding from edges
    const availableWidth = (canvas.width - panelWidth) - padding * 2; // Subtract panel width from available space
    const availableHeight = canvas.height - padding * 2;
    
    const scaleX = availableWidth / img.width;
    const scaleY = availableHeight / img.height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond original size
    
    setZoom(scale);
    setPan({ x: 0, y: 0 }); // Center the image (drawCanvas will handle the panel offset)
  };

  const handleDownload = async () => {
    if (imageUrl && onDownload) {
      try {
        // Fetch the image as a blob to handle CORS issues
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // Create object URL from blob
        const objectUrl = URL.createObjectURL(blob);
        
        // Create a temporary link element and trigger download
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = `yanus-create-image-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the object URL
        URL.revokeObjectURL(objectUrl);
        
        // Call the parent's download handler if provided
        onDownload();
      } catch (error) {
        console.error('Failed to download image:', error);
        // Fallback to direct link method
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `yanus-create-image-${Date.now()}.jpg`;
        link.target = '_blank'; // Ensure it doesn't navigate away
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        onDownload();
      }
    }
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
          style={{ 
            transition: 'none' // We handle transitions via requestAnimationFrame for smoother animation
          }}
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

      <div className="absolute bottom-1 right-4 flex gap-2">
        {onOpenGallery && (
          <button
            onClick={onOpenGallery}
            className="cursor-pointer p-2 bg-white/10 hover:bg-white/20 text-black rounded-md text-xs backdrop-blur-sm"
            title="Open Gallery"
          >
            <Grid3X3 size={16} />
          </button>
        )}
        {imageUrl && onDownload && (
          <button
            onClick={handleDownload}
            className="cursor-pointer p-2 bg-white/10 hover:bg-white/20 text-black rounded-md text-xs backdrop-blur-sm"
            title="Download Image"
          >
            <Download size={16} />
          </button>
        )}
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