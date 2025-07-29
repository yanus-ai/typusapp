import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Images, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { 
  setCanvasBounds, 
  setOriginalImageBounds, 
  setZoom, 
  setPan,
  addSelectedRegion,
  generateOutpaint,
  clearSelectedRegions,
  CanvasBounds 
} from '@/features/tweak/tweakSlice';

interface TweakCanvasProps {
  imageUrl?: string;
  currentTool: 'select' | 'region' | 'cut' | 'add';
  selectedBaseImageId: number | null;
}

interface ResizeHandle {
  position: 'top' | 'bottom' | 'left' | 'right';
  cursor: string;
}

const resizeHandles: ResizeHandle[] = [
  { position: 'top', cursor: 'n-resize' },
  { position: 'bottom', cursor: 's-resize' },
  { position: 'left', cursor: 'w-resize' },
  { position: 'right', cursor: 'e-resize' },
];

const TweakCanvas: React.FC<TweakCanvasProps> = ({ 
  imageUrl, 
  currentTool, 
  selectedBaseImageId 
}) => {
  const dispatch = useAppDispatch();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Redux state
  const { canvasBounds, originalImageBounds, zoom, pan, selectedRegions } = useAppSelector(state => state.tweak);
  
  // Local state
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isPainting, setIsPainting] = useState(false);
  const [paintPath, setPaintPath] = useState<{x: number, y: number}[]>([]);
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [initialImageLoaded, setInitialImageLoaded] = useState(false);

  // Load image when URL changes
  useEffect(() => {
    console.log('🖼️ TweakCanvas: imageUrl changed:', imageUrl);
    if (imageUrl) {
      const img = new Image();
      img.onload = () => {
        console.log('🖼️ TweakCanvas: Image loaded successfully');
        setImage(img);
        
        // Always reset bounds for new image
        const bounds = {
          x: 0,
          y: 0,
          width: img.width,
          height: img.height
        };
        dispatch(setOriginalImageBounds(bounds));
        dispatch(setCanvasBounds({ ...bounds, width: img.width + 48, height: img.height + 48 }));
        
        // Clear existing selections when new image loads
        dispatch(clearSelectedRegions());
        
        // Center and fit the new image
        setTimeout(() => centerAndFitImage(img), 0);
        setInitialImageLoaded(true);
      };
      img.onerror = (error) => {
        console.error('🖼️ TweakCanvas: Failed to load image:', error);
      };
      img.src = imageUrl;
    } else {
      console.log('🖼️ TweakCanvas: No imageUrl provided, clearing image');
      setImage(null);
      setInitialImageLoaded(false);
    }
  }, [imageUrl]); // Remove dispatch and initialImageLoaded from dependencies

  // Draw canvas
  const drawCanvas = useCallback(() => {
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

      // Draw extended canvas area (outpaint area) background
      const extendedWidth = canvasBounds.width * zoom;
      const extendedHeight = canvasBounds.height * zoom;
      const extendedX = centerX - extendedWidth / 2;
      const extendedY = centerY - extendedHeight / 2;

      // Fill outpaint area with light gray
      if (canvasBounds.width > originalImageBounds.width || canvasBounds.height > originalImageBounds.height) {
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(extendedX, extendedY, extendedWidth, extendedHeight);
      }

      // Draw the main image
      ctx.drawImage(
        image,
        centerX - scaledWidth / 2,
        centerY - scaledHeight / 2,
        scaledWidth,
        scaledHeight
      );

      // Draw extended canvas border with better visual cues
      if (canvasBounds.width > originalImageBounds.width || canvasBounds.height > originalImageBounds.height) {
        // Draw main border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(extendedX, extendedY, extendedWidth, extendedHeight);

        // Draw resize handles if select tool is active (only 4 handles, not 8)
        if (currentTool === 'select') {
          const handleWidth = (originalImageBounds.width * zoom) * 0.05;
          const handleHeight = (originalImageBounds.height * zoom) * 0.05;
          ctx.fillStyle = '#E3E3E3';
          
          // Left handle (middle of left edge)
          ctx.fillRect(extendedX - 5, extendedY + extendedHeight / 2 - handleHeight / 2, 10, handleHeight);
          
          // Right handle (middle of right edge)
          ctx.fillRect(extendedX + extendedWidth - 5, extendedY + extendedHeight / 2 - handleHeight / 2, 10, handleHeight);
          
          // Top handle (middle of top edge)
          ctx.fillRect(extendedX + extendedWidth / 2 - handleWidth / 2, extendedY - 5, handleWidth, 10);
          
          // Bottom handle (middle of bottom edge)
          ctx.fillRect(extendedX + extendedWidth / 2 - handleWidth / 2, extendedY + extendedHeight - 5, handleWidth, 10);
        }
      }

      // Draw selected regions overlay (free-form paths)
      selectedRegions.forEach(region => {
        if (region.imagePath && region.imagePath.length > 0) {
          // Convert image coordinates to current screen coordinates
          const screenPath = region.imagePath.map(point => 
            imageToScreenCoordinates(point.x, point.y)
          ).filter(point => point !== null) as { x: number; y: number }[];
          
          if (screenPath.length === 0) return;
          
          ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          if (screenPath.length === 1) {
            // Draw a small circle for single point
            ctx.beginPath();
            ctx.arc(screenPath[0].x, screenPath[0].y, 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          } else {
            // Draw smooth filled path
            ctx.beginPath();
            ctx.moveTo(screenPath[0].x, screenPath[0].y);
            
            for (let i = 1; i < screenPath.length; i++) {
              const prevPoint = screenPath[i - 1];
              const currentPoint = screenPath[i];
              
              if (i === 1) {
                ctx.lineTo(currentPoint.x, currentPoint.y);
              } else {
                const nextPoint = screenPath[i + 1];
                if (nextPoint) {
                  const cpx = (prevPoint.x + currentPoint.x) / 2;
                  const cpy = (prevPoint.y + currentPoint.y) / 2;
                  ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, cpx, cpy);
                } else {
                  ctx.lineTo(currentPoint.x, currentPoint.y);
                }
              }
            }
            
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        }
      });

      // Draw current painting path in real-time
      if (isPainting && paintPath.length > 0) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.8;
        
        if (paintPath.length === 1) {
          // Draw a small circle for single point
          ctx.beginPath();
          ctx.arc(paintPath[0].x, paintPath[0].y, 2, 0, 2 * Math.PI);
          ctx.fill();
        } else {
          // Draw smooth path
          ctx.beginPath();
          ctx.moveTo(paintPath[0].x, paintPath[0].y);
          
          for (let i = 1; i < paintPath.length; i++) {
            const prevPoint = paintPath[i - 1];
            const currentPoint = paintPath[i];
            
            if (i === 1) {
              ctx.lineTo(currentPoint.x, currentPoint.y);
            } else {
              const nextPoint = paintPath[i + 1];
              if (nextPoint) {
                const cpx = (prevPoint.x + currentPoint.x) / 2;
                const cpy = (prevPoint.y + currentPoint.y) / 2;
                ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, cpx, cpy);
              } else {
                ctx.lineTo(currentPoint.x, currentPoint.y);
              }
            }
          }
          
          ctx.stroke();
        }
        
        ctx.globalAlpha = 1;
      }
    }
  }, [image, canvasBounds.width, canvasBounds.height, originalImageBounds.width, originalImageBounds.height, zoom, pan.x, pan.y, selectedRegions, currentTool, isPainting, paintPath]);

  const centerAndFitImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use 24px padding from edges
    const padding = 24;
    const availableWidth = canvas.width - padding * 2;
    const availableHeight = canvas.height - padding * 2;
    
    const scaleX = availableWidth / img.width;
    const scaleY = availableHeight / img.height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond original size
    
    dispatch(setZoom(scale));
    dispatch(setPan({ x: 0, y: 0 }));
  };

  // Convert screen coordinates to image coordinates (0-1 normalized)
  const screenToImageCoordinates = (screenX: number, screenY: number): { x: number; y: number } | null => {
    if (!image) return null;
    
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const centerX = canvas.width / 2 + pan.x;
    const centerY = canvas.height / 2 + pan.y;
    const scaledWidth = image.width * zoom;
    const scaledHeight = image.height * zoom;
    
    const imageX = centerX - scaledWidth / 2;
    const imageY = centerY - scaledHeight / 2;
    
    // Convert to normalized coordinates (0-1)
    const normalizedX = (screenX - imageX) / scaledWidth;
    const normalizedY = (screenY - imageY) / scaledHeight;
    
    return { x: normalizedX, y: normalizedY };
  };

  // Convert image coordinates (0-1 normalized) to screen coordinates
  const imageToScreenCoordinates = (imageX: number, imageY: number): { x: number; y: number } | null => {
    if (!image) return null;
    
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const centerX = canvas.width / 2 + pan.x;
    const centerY = canvas.height / 2 + pan.y;
    const scaledWidth = image.width * zoom;
    const scaledHeight = image.height * zoom;
    
    const imageScreenX = centerX - scaledWidth / 2;
    const imageScreenY = centerY - scaledHeight / 2;
    
    // Convert from normalized coordinates to screen coordinates
    const screenX = imageScreenX + (imageX * scaledWidth);
    const screenY = imageScreenY + (imageY * scaledHeight);
    
    return { x: screenX, y: screenY };
  };

  // Check if mouse is inside the original image area
  const isMouseInsideImage = (mouseX: number, mouseY: number): boolean => {
    const imageCoords = screenToImageCoordinates(mouseX, mouseY);
    if (!imageCoords) return false;
    
    return imageCoords.x >= 0 && imageCoords.x <= 1 && 
           imageCoords.y >= 0 && imageCoords.y <= 1;
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setLastMousePos({ x: mouseX, y: mouseY });
    setHasDragged(false);

    if (currentTool === 'region') {
      // Only allow region selection inside the image
      if (isMouseInsideImage(mouseX, mouseY)) {
        setIsPainting(true);
        setPaintPath([{ x: mouseX, y: mouseY }]);
      }
    } else if (currentTool === 'select') {
      // Check if clicking on resize handle for outpainting
      const handle = getResizeHandle(mouseX, mouseY);
      if (handle) {
        setIsResizing(handle);
      } else if (isMouseInsideImage(mouseX, mouseY)) {
        // For select tool, allow region selection only inside the image
        setIsPainting(true);
        setPaintPath([{ x: mouseX, y: mouseY }]);
      }
    } else {
      // For other tools, allow canvas dragging
      setIsDragging(true);
    }
  };

  // Get cursor style based on current tool and hover state
  const getCursorStyle = () => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return 'default';
    
    const handle = getResizeHandle(mousePos.x, mousePos.y);
    
    if (currentTool === 'select' && handle) {
      switch (handle) {
        case 'top':
        case 'bottom':
          return 'n-resize';
        case 'left':
        case 'right':
          return 'e-resize';
        default:
          return 'default';
      }
    }
    
    if (currentTool === 'region') return 'crosshair';
    if (currentTool === 'select') return 'crosshair';
    if (currentTool === 'cut') return 'crosshair'; 
    return 'move';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setMousePos({ x: mouseX, y: mouseY });

    if (isResizing && currentTool === 'select') {
      handleResize(mouseX, mouseY);
    } else if (isPainting && (currentTool === 'region' || currentTool === 'select')) {
      // Only add to paint path if mouse is inside the image
      if (isMouseInsideImage(mouseX, mouseY)) {
        // Add smoothing by only adding points if they're a certain distance apart
        setPaintPath(prev => {
          if (prev.length === 0) {
            return [{ x: mouseX, y: mouseY }];
          }
          
          const lastPoint = prev[prev.length - 1];
          const distance = Math.sqrt(
            Math.pow(mouseX - lastPoint.x, 2) + Math.pow(mouseY - lastPoint.y, 2)
          );
          
          // Only add point if it's at least 3 pixels away from the last point
          if (distance >= 3) {
            return [...prev, { x: mouseX, y: mouseY }];
          }
          
          return prev;
        });
      }
    } else if (isDragging && currentTool !== 'select') {
      const deltaX = mouseX - lastMousePos.x;
      const deltaY = mouseY - lastMousePos.y;
      
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        setHasDragged(true);
      }
      
      dispatch(setPan({ x: pan.x + deltaX, y: pan.y + deltaY }));
      setLastMousePos({ x: mouseX, y: mouseY });
    }
  };

  const handleMouseUp = () => {
    if (isPainting && paintPath.length > 0 && (currentTool === 'region' || currentTool === 'select')) {
      // Convert screen coordinates to image coordinates
      const imagePath = paintPath.map(point => 
        screenToImageCoordinates(point.x, point.y)
      ).filter(point => point !== null) as { x: number; y: number }[];
      
      // Convert paint path to region with free-form path
      const region = {
        id: Date.now().toString(),
        mask: new ImageData(1, 1), // Placeholder
        bounds: calculateBoundsFromPath(paintPath),
        path: [...paintPath], // Store screen coordinates for compatibility
        imagePath: imagePath // Store normalized image coordinates
      };
      dispatch(addSelectedRegion(region));
      setPaintPath([]);
    }

    if (isResizing && selectedBaseImageId) {
      // Trigger outpaint generation when resize is complete
      dispatch(generateOutpaint({
        baseImageId: selectedBaseImageId,
        newBounds: canvasBounds,
        originalBounds: originalImageBounds
      }));
    }

    setIsPainting(false);
    setIsDragging(false);
    setIsResizing(null);
  };

  const getResizeHandle = (mouseX: number, mouseY: number): string | null => {
    if (!image) return null;

    const canvas = canvasRef.current;
    if (!canvas) return null;

    const centerX = canvas.width / 2 + pan.x;
    const centerY = canvas.height / 2 + pan.y;
    
    const extendedWidth = canvasBounds.width * zoom;
    const extendedHeight = canvasBounds.height * zoom;
    
    const extendedX = centerX - extendedWidth / 2;
    const extendedY = centerY - extendedHeight / 2;

    // Use 5% of image dimensions for handle size
    const handleWidth = (originalImageBounds.width * zoom) * 0.05;
    const handleHeight = (originalImageBounds.height * zoom) * 0.05;
    
    // Check for handles only at specific positions (not full borders)
    
    // Left handle (middle of left edge)
    const leftHandleX = extendedX;
    const leftHandleY = extendedY + extendedHeight / 2 - handleHeight / 2;
    if (mouseX >= leftHandleX - 5 && mouseX <= leftHandleX + 10 && 
        mouseY >= leftHandleY && mouseY <= leftHandleY + handleHeight) {
      return 'left';
    }
    
    // Right handle (middle of right edge)
    const rightHandleX = extendedX + extendedWidth - 10;
    const rightHandleY = extendedY + extendedHeight / 2 - handleHeight / 2;
    if (mouseX >= rightHandleX && mouseX <= rightHandleX + 15 && 
        mouseY >= rightHandleY && mouseY <= rightHandleY + handleHeight) {
      return 'right';
    }
    
    // Top handle (middle of top edge)
    const topHandleX = extendedX + extendedWidth / 2 - handleWidth / 2;
    const topHandleY = extendedY;
    if (mouseX >= topHandleX && mouseX <= topHandleX + handleWidth && 
        mouseY >= topHandleY - 5 && mouseY <= topHandleY + 10) {
      return 'top';
    }
    
    // Bottom handle (middle of bottom edge)
    const bottomHandleX = extendedX + extendedWidth / 2 - handleWidth / 2;
    const bottomHandleY = extendedY + extendedHeight - 10;
    if (mouseX >= bottomHandleX && mouseX <= bottomHandleX + handleWidth && 
        mouseY >= bottomHandleY && mouseY <= bottomHandleY + 15) {
      return 'bottom';
    }

    return null;
  };

  const handleResize = (mouseX: number, mouseY: number) => {
    if (!isResizing) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentMouseX = mouseX;
    const currentMouseY = mouseY;
    
    const deltaX = (currentMouseX - lastMousePos.x) / zoom;
    const deltaY = (currentMouseY - lastMousePos.y) / zoom;
    
    let newBounds = { ...canvasBounds };

    switch (isResizing) {
      case 'right':
        newBounds.width = Math.max(originalImageBounds.width, canvasBounds.width + deltaX);
        break;
      case 'left':
        const newLeftWidth = canvasBounds.width - deltaX;
        if (newLeftWidth >= originalImageBounds.width) {
          newBounds.width = newLeftWidth;
          newBounds.x = canvasBounds.x + deltaX;
        }
        break;
      case 'bottom':
        newBounds.height = Math.max(originalImageBounds.height, canvasBounds.height + deltaY);
        break;
      case 'top':
        const newTopHeight = canvasBounds.height - deltaY;
        if (newTopHeight >= originalImageBounds.height) {
          newBounds.height = newTopHeight;
          newBounds.y = canvasBounds.y + deltaY;
        }
        break;
    }

    dispatch(setCanvasBounds(newBounds));
    setLastMousePos({ x: currentMouseX, y: currentMouseY });
  };

  const calculateBoundsFromPath = (path: {x: number, y: number}[]): CanvasBounds => {
    if (path.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    
    const minX = Math.min(...path.map(p => p.x));
    const maxX = Math.max(...path.map(p => p.x));
    const minY = Math.min(...path.map(p => p.y));
    const maxY = Math.max(...path.map(p => p.y));
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  };

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    dispatch(setZoom(zoom * zoomFactor));
  };

  // Zoom controls
  const zoomIn = () => {
    dispatch(setZoom(Math.min(10, zoom * 1.2)));
  };

  const zoomOut = () => {
    dispatch(setZoom(Math.max(0.1, zoom / 1.2)));
  };

  const resetView = () => {
    if (image) {
      centerAndFitImage(image);
    } else {
      dispatch(setZoom(1));
      dispatch(setPan({ x: 0, y: 0 }));
    }
  };

  // Canvas resize effect
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [drawCanvas]);

  // Draw effect
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

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
          className="w-full h-full"
          style={{ 
            transition: 'none',
            cursor: getCursorStyle()
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        />
        
      </div>
      
      {!imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Images size={128} className="text-gray-400 opacity-80" />
        </div>
      )}

      <div className="absolute bottom-4 right-4 flex gap-2">
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

export default TweakCanvas;