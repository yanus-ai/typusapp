import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Images, ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react';
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
  addRectangleObject,
  updateRectangleObject,
  addBrushObject,
  updateBrushObject,
  CanvasBounds,
  RectangleObject,
  BrushObject
} from '@/features/tweak/tweakSlice';

interface TweakCanvasProps {
  imageUrl?: string;
  currentTool: 'select' | 'region' | 'cut' | 'add' | 'rectangle' | 'brush' | 'move';
  selectedBaseImageId: number | null;
  onDownload?: () => void;
}

const TweakCanvas: React.FC<TweakCanvasProps> = ({ 
  imageUrl, 
  currentTool, 
  selectedBaseImageId,
  onDownload
}) => {
  const dispatch = useAppDispatch();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Redux state
  const { canvasBounds, originalImageBounds, zoom, pan, selectedRegions, rectangleObjects, brushObjects, brushSize } = useAppSelector(state => state.tweak);
  
  // Local state
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [, setHasDragged] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isPainting, setIsPainting] = useState(false);
  const [paintPath, setPaintPath] = useState<{x: number, y: number}[]>([]);
  const [, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [, setInitialImageLoaded] = useState(false);
  
  // Rectangle drawing state
  const [isDrawingRectangle, setIsDrawingRectangle] = useState(false);
  const [rectangleStart, setRectangleStart] = useState({ x: 0, y: 0 });
  const [currentRectangle, setCurrentRectangle] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [selectedRectangleId, setSelectedRectangleId] = useState<string | null>(null);
  const [isDraggingRectangle, setIsDraggingRectangle] = useState(false);
  const [isResizingRectangle, setIsResizingRectangle] = useState<string | null>(null);
  
  // Enhanced brush state
  const [brushPath, setBrushPath] = useState<{x: number, y: number}[]>([]);
  const [selectedBrushId, setSelectedBrushId] = useState<string | null>(null);
  const [isDraggingBrush, setIsDraggingBrush] = useState(false);

  // Load image when URL changes
  useEffect(() => {
    console.log('🖼️ TweakCanvas: imageUrl changed:', imageUrl);
    if (imageUrl) {
      const img = new Image();
      img.onload = () => {
        console.log('🖼️ TweakCanvas: Image loaded successfully');
        setImage(img);
        
        // Always reset bounds for new image with 10px minimum gap
        const bounds = {
          x: 0,
          y: 0,
          width: img.width,
          height: img.height
        };
        dispatch(setOriginalImageBounds(bounds));
        // Start with 10px padding on each side, using negative offset to center
        dispatch(setCanvasBounds({ x: -10, y: -10, width: img.width + 20, height: img.height + 20 }));
        
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
      // Position extended area using bounds offset
      const extendedX = centerX - scaledWidth / 2 + (canvasBounds.x * zoom);
      const extendedY = centerY - scaledHeight / 2 + (canvasBounds.y * zoom);

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

      // Draw rectangle objects
      rectangleObjects.forEach(rectangle => {
        const screenPos = imageToScreenCoordinates(rectangle.position.x, rectangle.position.y);
        const screenSize = {
          width: rectangle.size.width * image.width * zoom,
          height: rectangle.size.height * image.height * zoom
        };
        
        if (screenPos) {
          // Add shadow effect
          ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          // Draw black background with opacity (Krea style)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.fillRect(screenPos.x, screenPos.y, screenSize.width, screenSize.height);
          
          // Reset shadow for border
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          
          // Draw thick white border (Krea style)
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.strokeRect(screenPos.x, screenPos.y, screenSize.width, screenSize.height);
          
          // Show dotted pattern only inside the black region
          const patternCanvas = document.createElement('canvas');
          patternCanvas.width = 10;
          patternCanvas.height = 10;
          const patternCtx = patternCanvas.getContext('2d');
          if (patternCtx) {
            // Create pattern with black background and white dots
            patternCtx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // Same as background
            patternCtx.fillRect(0, 0, 20, 20);
            patternCtx.fillStyle = 'rgba(255, 255, 255, 0.3)'; // White dots
            patternCtx.fillRect(9, 9, 2, 2); // Small white dots
            
            const pattern = ctx.createPattern(patternCanvas, 'repeat');
            if (pattern) {
              ctx.fillStyle = pattern;
              ctx.fillRect(screenPos.x, screenPos.y, screenSize.width, screenSize.height);
            }
          }
          
          // Draw resize handle if this rectangle is selected (no selection border)
          if (selectedRectangleId === rectangle.id) {
            // Draw only bottom-right resize handle (Krea style)
            const handleSize = 12;
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            
            const handleX = screenPos.x + screenSize.width - handleSize/2;
            const handleY = screenPos.y + screenSize.height - handleSize/2;
            
            ctx.fillRect(handleX, handleY, handleSize, handleSize);
            ctx.strokeRect(handleX, handleY, handleSize, handleSize);
          }
        }
      });
      
      // Draw current rectangle being drawn
      if (isDrawingRectangle && currentRectangle) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.fillRect(currentRectangle.x, currentRectangle.y, currentRectangle.width, currentRectangle.height);
        ctx.strokeRect(currentRectangle.x, currentRectangle.y, currentRectangle.width, currentRectangle.height);
      }

      // Draw current painting path in real-time (for region tool)
      if (isPainting && paintPath.length > 0 && currentTool === 'region') {
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
      
      // Draw brush objects as actual stroke shapes (preserve user's drawing)
      brushObjects.forEach(brushObj => {
        const screenPath = brushObj.path.map(point => 
          imageToScreenCoordinates(point.x, point.y)
        ).filter(point => point !== null) as { x: number; y: number }[];
        
        if (screenPath.length === 0) return;
        
        const strokeWidth = (brushObj.strokeWidth || brushSize) * zoom;
        
        // Add shadow effect
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Draw white border around the actual stroke shape
        ctx.beginPath();
        if (screenPath.length === 1) {
          // Single point - draw circle with border
          ctx.arc(screenPath[0].x, screenPath[0].y, strokeWidth / 2 + 1.5, 0, 2 * Math.PI);
        } else {
          // Multiple points - draw stroke path with border
          ctx.moveTo(screenPath[0].x, screenPath[0].y);
          for (let i = 1; i < screenPath.length; i++) {
            ctx.lineTo(screenPath[i].x, screenPath[i].y);
          }
        }
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = strokeWidth + 3; // White border
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        // Reset shadow for inner stroke
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // First draw the solid black background
        ctx.beginPath();
        if (screenPath.length === 1) {
          ctx.arc(screenPath[0].x, screenPath[0].y, strokeWidth / 2, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Same as rectangle background
          ctx.fill();
        } else {
          ctx.moveTo(screenPath[0].x, screenPath[0].y);
          for (let i = 1; i < screenPath.length; i++) {
            ctx.lineTo(screenPath[i].x, screenPath[i].y);
          }
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'; // Same as rectangle background
          ctx.lineWidth = strokeWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        }
        
        // Then draw the dot pattern on top
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 20;
        patternCanvas.height = 20;
        const patternCtx = patternCanvas.getContext('2d');
        if (patternCtx) {
          // Create pattern with black background and white dots (same as rectangle)
          patternCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          patternCtx.fillRect(0, 0, 20, 20);
          patternCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          patternCtx.fillRect(9, 9, 2, 2);
          
          const pattern = ctx.createPattern(patternCanvas, 'repeat');
          if (pattern) {
            // Draw the stroke with dot pattern
            ctx.beginPath();
            if (screenPath.length === 1) {
              ctx.arc(screenPath[0].x, screenPath[0].y, strokeWidth / 2, 0, 2 * Math.PI);
              ctx.fillStyle = pattern;
              ctx.fill();
            } else {
              ctx.moveTo(screenPath[0].x, screenPath[0].y);
              for (let i = 1; i < screenPath.length; i++) {
                ctx.lineTo(screenPath[i].x, screenPath[i].y);
              }
              ctx.strokeStyle = pattern;
              ctx.lineWidth = strokeWidth;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.stroke();
            }
          }
        }
      });

      // Draw current brush path while drawing (black with opacity)
      if (currentTool === 'brush' && brushPath.length > 0) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'; // Black with opacity
        ctx.lineWidth = brushSize * zoom;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (brushPath.length === 1) {
          // Draw a circle for single point
          ctx.beginPath();
          ctx.arc(brushPath[0].x, brushPath[0].y, brushSize * zoom / 2, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.fill();
        } else {
          // Draw stroke path
          ctx.beginPath();
          ctx.moveTo(brushPath[0].x, brushPath[0].y);
          
          for (let i = 1; i < brushPath.length; i++) {
            ctx.lineTo(brushPath[i].x, brushPath[i].y);
          }
          
          ctx.stroke();
        }
      }
    }
  }, [image, canvasBounds.width, canvasBounds.height, originalImageBounds.width, originalImageBounds.height, zoom, pan.x, pan.y, selectedRegions, rectangleObjects, brushObjects, currentTool, isPainting, paintPath, isDrawingRectangle, currentRectangle, selectedRectangleId, selectedBrushId, brushPath, brushSize]);

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

  // Helper function to check if mouse is over a brush object
  const getBrushAtPoint = (mouseX: number, mouseY: number): string | null => {
    for (const brushObj of brushObjects) {
      const screenPath = brushObj.path.map(point => 
        imageToScreenCoordinates(point.x, point.y)
      ).filter(point => point !== null) as { x: number; y: number }[];
      
      if (screenPath.length === 0) continue;
      
      // Calculate bounding box with padding for brush stroke width
      const minX = Math.min(...screenPath.map(p => p.x));
      const maxX = Math.max(...screenPath.map(p => p.x));
      const minY = Math.min(...screenPath.map(p => p.y));
      const maxY = Math.max(...screenPath.map(p => p.y));
      
      const padding = (brushObj.strokeWidth || brushSize) * zoom / 2;
      
      if (mouseX >= minX - padding && mouseX <= maxX + padding &&
          mouseY >= minY - padding && mouseY <= maxY + padding) {
        return brushObj.id;
      }
    }
    return null;
  };

  // Helper function to check if mouse is over a rectangle
  const getRectangleAtPoint = (mouseX: number, mouseY: number): string | null => {
    for (const rectangle of rectangleObjects) {
      const screenPos = imageToScreenCoordinates(rectangle.position.x, rectangle.position.y);
      const screenSize = {
        width: rectangle.size.width * (image?.width || 0) * zoom,
        height: rectangle.size.height * (image?.height || 0) * zoom
      };
      
      if (screenPos && 
          mouseX >= screenPos.x && 
          mouseX <= screenPos.x + screenSize.width &&
          mouseY >= screenPos.y && 
          mouseY <= screenPos.y + screenSize.height) {
        return rectangle.id;
      }
    }
    return null;
  };

  // Helper function to get rectangle resize handle (only bottom-right corner for Krea style)
  const getRectangleResizeHandle = (mouseX: number, mouseY: number, rectangleId: string): string | null => {
    const rectangle = rectangleObjects.find(r => r.id === rectangleId);
    if (!rectangle || !image) return null;
    
    const screenPos = imageToScreenCoordinates(rectangle.position.x, rectangle.position.y);
    const screenSize = {
      width: rectangle.size.width * image.width * zoom,
      height: rectangle.size.height * image.height * zoom
    };
    
    if (!screenPos) return null;
    
    const handleSize = 12;
    const handleX = screenPos.x + screenSize.width - handleSize/2;
    const handleY = screenPos.y + screenSize.height - handleSize/2;
    
    // Only check bottom-right corner (Krea style)
    if (mouseX >= handleX && mouseX <= handleX + handleSize && 
        mouseY >= handleY && mouseY <= handleY + handleSize) {
      return 'se';
    }
    
    return null;
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setLastMousePos({ x: mouseX, y: mouseY });
    setHasDragged(false);

    if (currentTool === 'rectangle') {
      if (isMouseInsideImage(mouseX, mouseY)) {
        // Check if clicking on existing rectangle
        const clickedRectangle = getRectangleAtPoint(mouseX, mouseY);
        if (clickedRectangle) {
          setSelectedRectangleId(clickedRectangle);
          const resizeHandle = getRectangleResizeHandle(mouseX, mouseY, clickedRectangle);
          if (resizeHandle) {
            setIsResizingRectangle(resizeHandle);
          } else {
            setIsDraggingRectangle(true);
          }
        } else {
          // Start drawing new rectangle
          setSelectedRectangleId(null);
          setIsDrawingRectangle(true);
          setRectangleStart({ x: mouseX, y: mouseY });
        }
      }
    } else if (currentTool === 'brush') {
      if (isMouseInsideImage(mouseX, mouseY)) {
        // Check if hovering over any existing objects first
        const clickedBrush = getBrushAtPoint(mouseX, mouseY);
        const clickedRectangle = getRectangleAtPoint(mouseX, mouseY);
        
        if (clickedBrush) {
          // Select and start dragging the brush object
          setSelectedBrushId(clickedBrush);
          setSelectedRectangleId(null);
          setIsDraggingBrush(true);
        } else if (clickedRectangle) {
          // Select and start dragging the rectangle object
          setSelectedRectangleId(clickedRectangle);
          setSelectedBrushId(null);
          const resizeHandle = getRectangleResizeHandle(mouseX, mouseY, clickedRectangle);
          if (resizeHandle) {
            setIsResizingRectangle(resizeHandle);
          } else {
            setIsDraggingRectangle(true);
          }
        } else {
          // No object clicked, start drawing new brush stroke
          setBrushPath([{ x: mouseX, y: mouseY }]);
        }
      }
    } else if (currentTool === 'move') {
      // Check if clicking on objects first (brush objects take priority)
      const clickedBrush = getBrushAtPoint(mouseX, mouseY);
      const clickedRectangle = getRectangleAtPoint(mouseX, mouseY);
      
      if (clickedBrush) {
        setSelectedBrushId(clickedBrush);
        setSelectedRectangleId(null); // Clear rectangle selection
        setIsDraggingBrush(true);
      } else if (clickedRectangle) {
        setSelectedRectangleId(clickedRectangle);
        setSelectedBrushId(null); // Clear brush selection
        setIsDraggingRectangle(true);
      } else {
        // Clear selections and allow dragging the canvas/image
        setSelectedBrushId(null);
        setSelectedRectangleId(null);
        setIsDragging(true);
      }
    } else if (currentTool === 'region') {
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
    
    if (currentTool === 'rectangle') {
      const rectangleId = getRectangleAtPoint(mousePos.x, mousePos.y);
      if (rectangleId) {
        const resizeHandle = getRectangleResizeHandle(mousePos.x, mousePos.y, rectangleId);
        if (resizeHandle === 'se') {
          return 'nw-resize'; // Bottom-right corner uses nw-resize cursor
        }
        return 'move';
      }
      return 'crosshair';
    }
    
    if (currentTool === 'brush') {
      return `url("data:image/svg+xml,%3csvg width='${brushSize}' height='${brushSize}' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='${brushSize/2}' cy='${brushSize/2}' r='${brushSize/2-1}' fill='none' stroke='%23000' stroke-width='2'/%3e%3c/svg%3e") ${brushSize/2} ${brushSize/2}, crosshair`;
    }
    
    if (currentTool === 'move') {
      const rectangleId = getRectangleAtPoint(mousePos.x, mousePos.y);
      const brushId = getBrushAtPoint(mousePos.x, mousePos.y);
      if (rectangleId || brushId) {
        return 'move';
      }
      return 'move'; // Always show move cursor for move tool
    }
    
    const handle = getResizeHandle(mousePos.x, mousePos.y);
    
    if (currentTool === 'select' && handle) {
      switch (handle) {
        case 'top':
          return 'n-resize';
        case 'bottom':
          return 's-resize';
        case 'left':
          return 'w-resize';
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

    if (currentTool === 'rectangle') {
      if (isDrawingRectangle) {
        // Update current rectangle being drawn
        setCurrentRectangle({
          x: Math.min(rectangleStart.x, mouseX),
          y: Math.min(rectangleStart.y, mouseY),
          width: Math.abs(mouseX - rectangleStart.x),
          height: Math.abs(mouseY - rectangleStart.y)
        });
      } else if (isDraggingRectangle && selectedRectangleId) {
        // Move selected rectangle
        const deltaX = mouseX - lastMousePos.x;
        const deltaY = mouseY - lastMousePos.y;
        
        const deltaXNormalized = deltaX / ((image?.width || 1) * zoom);
        const deltaYNormalized = deltaY / ((image?.height || 1) * zoom);
        
        dispatch(updateRectangleObject({
          id: selectedRectangleId,
          updates: {
            position: {
              x: Math.max(0, Math.min(1, rectangleObjects.find(r => r.id === selectedRectangleId)!.position.x + deltaXNormalized)),
              y: Math.max(0, Math.min(1, rectangleObjects.find(r => r.id === selectedRectangleId)!.position.y + deltaYNormalized))
            }
          }
        }));
        
        setLastMousePos({ x: mouseX, y: mouseY });
      } else if (isResizingRectangle && selectedRectangleId) {
        // Resize selected rectangle
        handleRectangleResize(mouseX, mouseY);
      }
    } else if (currentTool === 'brush') {
      if (isDraggingBrush && selectedBrushId) {
        // Move selected brush object (same as move tool logic)
        const deltaX = mouseX - lastMousePos.x;
        const deltaY = mouseY - lastMousePos.y;
        
        const deltaXNormalized = deltaX / ((image?.width || 1) * zoom);
        const deltaYNormalized = deltaY / ((image?.height || 1) * zoom);
        
        const brushObj = brushObjects.find(b => b.id === selectedBrushId);
        if (brushObj) {
          // Calculate the current bounds of the brush object
          const currentMinX = Math.min(...brushObj.path.map(p => p.x));
          const currentMaxX = Math.max(...brushObj.path.map(p => p.x));
          const currentMinY = Math.min(...brushObj.path.map(p => p.y));
          const currentMaxY = Math.max(...brushObj.path.map(p => p.y));
          
          // Calculate the brush object dimensions
          const brushWidth = currentMaxX - currentMinX;
          const brushHeight = currentMaxY - currentMinY;
          
          // Calculate new position, but constrain it to keep the entire brush within bounds
          const newMinX = Math.max(0, Math.min(1 - brushWidth, currentMinX + deltaXNormalized));
          const newMinY = Math.max(0, Math.min(1 - brushHeight, currentMinY + deltaYNormalized));
          
          // Calculate the actual delta to apply (may be less than requested if hitting boundaries)
          const actualDeltaX = newMinX - currentMinX;
          const actualDeltaY = newMinY - currentMinY;
          
          // Move all points by the actual delta (preserving shape)
          const newPath = brushObj.path.map(point => ({
            x: point.x + actualDeltaX,
            y: point.y + actualDeltaY
          }));
          
          // Update bounds
          const minX = Math.min(...newPath.map(p => p.x));
          const maxX = Math.max(...newPath.map(p => p.x));
          const minY = Math.min(...newPath.map(p => p.y));
          const maxY = Math.max(...newPath.map(p => p.y));
          
          dispatch(updateBrushObject({
            id: selectedBrushId,
            updates: {
              path: newPath,
              bounds: {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
              }
            }
          }));
        }
        
        setLastMousePos({ x: mouseX, y: mouseY });
      } else if (isDraggingRectangle && selectedRectangleId) {
        // Move selected rectangle (same as rectangle tool logic)
        const deltaX = mouseX - lastMousePos.x;
        const deltaY = mouseY - lastMousePos.y;
        
        const deltaXNormalized = deltaX / ((image?.width || 1) * zoom);
        const deltaYNormalized = deltaY / ((image?.height || 1) * zoom);
        
        dispatch(updateRectangleObject({
          id: selectedRectangleId,
          updates: {
            position: {
              x: Math.max(0, Math.min(1, rectangleObjects.find(r => r.id === selectedRectangleId)!.position.x + deltaXNormalized)),
              y: Math.max(0, Math.min(1, rectangleObjects.find(r => r.id === selectedRectangleId)!.position.y + deltaYNormalized))
            }
          }
        }));
        
        setLastMousePos({ x: mouseX, y: mouseY });
      } else if (isResizingRectangle && selectedRectangleId) {
        // Resize selected rectangle
        handleRectangleResize(mouseX, mouseY);
      } else if (brushPath.length > 0) {
        // Continue drawing brush stroke
        if (isMouseInsideImage(mouseX, mouseY)) {
          setBrushPath(prev => {
            const lastPoint = prev[prev.length - 1];
            const distance = Math.sqrt(
              Math.pow(mouseX - lastPoint.x, 2) + Math.pow(mouseY - lastPoint.y, 2)
            );
            
            // Add point if it's at least 2 pixels away from the last point
            if (distance >= 2) {
              return [...prev, { x: mouseX, y: mouseY }];
            }
            
            return prev;
          });
        }
      }
    } else if (isResizing && currentTool === 'select') {
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
    } else if (currentTool === 'move') {
      if (isDraggingBrush && selectedBrushId) {
        // Move selected brush object
        const deltaX = mouseX - lastMousePos.x;
        const deltaY = mouseY - lastMousePos.y;
        
        const deltaXNormalized = deltaX / ((image?.width || 1) * zoom);
        const deltaYNormalized = deltaY / ((image?.height || 1) * zoom);
        
        const brushObj = brushObjects.find(b => b.id === selectedBrushId);
        if (brushObj) {
          // Calculate the current bounds of the brush object
          const currentMinX = Math.min(...brushObj.path.map(p => p.x));
          const currentMaxX = Math.max(...brushObj.path.map(p => p.x));
          const currentMinY = Math.min(...brushObj.path.map(p => p.y));
          const currentMaxY = Math.max(...brushObj.path.map(p => p.y));
          
          // Calculate the brush object dimensions
          const brushWidth = currentMaxX - currentMinX;
          const brushHeight = currentMaxY - currentMinY;
          
          // Calculate new position, but constrain it to keep the entire brush within bounds
          const newMinX = Math.max(0, Math.min(1 - brushWidth, currentMinX + deltaXNormalized));
          const newMinY = Math.max(0, Math.min(1 - brushHeight, currentMinY + deltaYNormalized));
          
          // Calculate the actual delta to apply (may be less than requested if hitting boundaries)
          const actualDeltaX = newMinX - currentMinX;
          const actualDeltaY = newMinY - currentMinY;
          
          // Move all points by the actual delta (preserving shape)
          const newPath = brushObj.path.map(point => ({
            x: point.x + actualDeltaX,
            y: point.y + actualDeltaY
          }));
          
          // Update bounds
          const minX = Math.min(...newPath.map(p => p.x));
          const maxX = Math.max(...newPath.map(p => p.x));
          const minY = Math.min(...newPath.map(p => p.y));
          const maxY = Math.max(...newPath.map(p => p.y));
          
          dispatch(updateBrushObject({
            id: selectedBrushId,
            updates: {
              path: newPath,
              bounds: {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
              }
            }
          }));
        }
        
        setLastMousePos({ x: mouseX, y: mouseY });
      } else if (isDraggingRectangle && selectedRectangleId) {
        // Move selected rectangle
        const deltaX = mouseX - lastMousePos.x;
        const deltaY = mouseY - lastMousePos.y;
        
        const deltaXNormalized = deltaX / ((image?.width || 1) * zoom);
        const deltaYNormalized = deltaY / ((image?.height || 1) * zoom);
        
        dispatch(updateRectangleObject({
          id: selectedRectangleId,
          updates: {
            position: {
              x: Math.max(0, Math.min(1, rectangleObjects.find(r => r.id === selectedRectangleId)!.position.x + deltaXNormalized)),
              y: Math.max(0, Math.min(1, rectangleObjects.find(r => r.id === selectedRectangleId)!.position.y + deltaYNormalized))
            }
          }
        }));
        
        setLastMousePos({ x: mouseX, y: mouseY });
      } else if (isDragging) {
        // Move the canvas/image
        const deltaX = mouseX - lastMousePos.x;
        const deltaY = mouseY - lastMousePos.y;
        
        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
          setHasDragged(true);
        }
        
        dispatch(setPan({ x: pan.x + deltaX, y: pan.y + deltaY }));
        setLastMousePos({ x: mouseX, y: mouseY });
      }
    } else if (isDragging && !['select', 'rectangle', 'brush', 'move'].includes(currentTool)) {
      const deltaX = mouseX - lastMousePos.x;
      const deltaY = mouseY - lastMousePos.y;
      
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        setHasDragged(true);
      }
      
      dispatch(setPan({ x: pan.x + deltaX, y: pan.y + deltaY }));
      setLastMousePos({ x: mouseX, y: mouseY });
    }
  };

  // Handle rectangle resizing (only bottom-right corner for Krea style)
  const handleRectangleResize = (mouseX: number, mouseY: number) => {
    if (!selectedRectangleId || !isResizingRectangle) return;
    
    const rectangle = rectangleObjects.find(r => r.id === selectedRectangleId);
    if (!rectangle || !image) return;
    
    const deltaX = mouseX - lastMousePos.x;
    const deltaY = mouseY - lastMousePos.y;
    
    const deltaXNormalized = deltaX / (image.width * zoom);
    const deltaYNormalized = deltaY / (image.height * zoom);
    
    // Only handle bottom-right corner resize (Krea style)
    if (isResizingRectangle === 'se') {
      const updates = {
        size: {
          width: Math.max(0.01, rectangle.size.width + deltaXNormalized),
          height: Math.max(0.01, rectangle.size.height + deltaYNormalized)
        }
      };
      
      dispatch(updateRectangleObject({ id: selectedRectangleId, updates }));
    }
    
    setLastMousePos({ x: mouseX, y: mouseY });
  };

  const handleMouseUp = () => {
    if (currentTool === 'rectangle') {
      if (isDrawingRectangle && currentRectangle && currentRectangle.width > 5 && currentRectangle.height > 5) {
        // Create new rectangle object
        const imageCoords = {
          start: screenToImageCoordinates(currentRectangle.x, currentRectangle.y),
          end: screenToImageCoordinates(currentRectangle.x + currentRectangle.width, currentRectangle.y + currentRectangle.height)
        };
        
        if (imageCoords.start && imageCoords.end) {
          const newRectangle: RectangleObject = {
            id: Date.now().toString(),
            position: { x: imageCoords.start.x, y: imageCoords.start.y },
            size: { 
              width: Math.abs(imageCoords.end.x - imageCoords.start.x), 
              height: Math.abs(imageCoords.end.y - imageCoords.start.y) 
            },
            color: '#3b82f6',
            strokeWidth: 2
          };
          
          dispatch(addRectangleObject(newRectangle));
          setSelectedRectangleId(newRectangle.id);
        }
      }
      
      setIsDrawingRectangle(false);
      setCurrentRectangle(null);
      setIsDraggingRectangle(false);
      setIsResizingRectangle(null);
    } else if (currentTool === 'move') {
      // Clean up move tool state
      setIsDraggingRectangle(false);
      setIsDraggingBrush(false);
      // Don't clear selected IDs so user can see which object is selected
    } else if (currentTool === 'brush') {
      if (brushPath.length > 0) {
        // Convert brush path to a brush object
        const imagePath = brushPath.map(point => 
          screenToImageCoordinates(point.x, point.y)
        ).filter(point => point !== null) as { x: number; y: number }[];
        
        if (imagePath.length > 0) {
          // Calculate bounds
          const minX = Math.min(...imagePath.map(p => p.x));
          const maxX = Math.max(...imagePath.map(p => p.x));
          const minY = Math.min(...imagePath.map(p => p.y));
          const maxY = Math.max(...imagePath.map(p => p.y));
          
          // Always preserve the actual stroke shape (no automatic fill detection)
          const newBrushObject: BrushObject = {
            id: Date.now().toString(),
            path: imagePath,
            bounds: {
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY
            },
            color: '#000000', // Black color
            strokeWidth: brushSize // Always use actual brush size
          };
          
          dispatch(addBrushObject(newBrushObject));
          setSelectedBrushId(newBrushObject.id); // Auto-select the new brush object
        }
        
        setBrushPath([]);
      }
      
      // Clean up brush tool dragging states
      setIsDraggingBrush(false);
      setIsDraggingRectangle(false);
      setIsResizingRectangle(null);
    } else if (isPainting && paintPath.length > 0 && (currentTool === 'region' || currentTool === 'select')) {
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
    const scaledWidth = image.width * zoom;
    const scaledHeight = image.height * zoom;
    
    const extendedWidth = canvasBounds.width * zoom;
    const extendedHeight = canvasBounds.height * zoom;
    
    // Position extended area using bounds offset
    const extendedX = centerX - scaledWidth / 2 + (canvasBounds.x * zoom);
    const extendedY = centerY - scaledHeight / 2 + (canvasBounds.y * zoom);

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
    
    const newBounds = { ...canvasBounds };
    
    // Calculate current expansion on each side
    const leftExpansion = -canvasBounds.x;
    const rightExpansion = canvasBounds.width - originalImageBounds.width + canvasBounds.x;
    const topExpansion = -canvasBounds.y;
    const bottomExpansion = canvasBounds.height - originalImageBounds.height + canvasBounds.y;

    switch (isResizing) {
      case 'right': {
        // Expand right side only
        const newRightExpansion = Math.max(10, rightExpansion + deltaX);
        newBounds.width = originalImageBounds.width + leftExpansion + newRightExpansion;
        break;
      }
      case 'left': {
        // Expand left side only - invert deltaX so dragging left expands, dragging right shrinks
        const newLeftExpansion = Math.max(10, leftExpansion - deltaX);
        newBounds.width = originalImageBounds.width + newLeftExpansion + rightExpansion;
        newBounds.x = -newLeftExpansion;
        break;
      }
      case 'bottom': {
        // Expand bottom side only
        const newBottomExpansion = Math.max(10, bottomExpansion + deltaY);
        newBounds.height = originalImageBounds.height + topExpansion + newBottomExpansion;
        break;
      }
      case 'top': {
        // Expand top side only - invert deltaY so dragging up expands, dragging down shrinks
        const newTopExpansion = Math.max(10, topExpansion - deltaY);
        newBounds.height = originalImageBounds.height + newTopExpansion + bottomExpansion;
        newBounds.y = -newTopExpansion;
        break;
      }
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
    
    // More controlled zoom with smaller increments
    // Normalize the delta value to handle different devices better
    const normalizedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 100);
    const zoomIntensity = 0.002; // Much smaller zoom factor
    const zoomFactor = 1 - normalizedDelta * zoomIntensity;
    
    // Apply zoom with better limits
    const newZoom = Math.max(0.1, Math.min(10, zoom * zoomFactor));
    dispatch(setZoom(newZoom));
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
        link.download = `yanus-image-${selectedBaseImageId || 'download'}.jpg`;
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
        link.download = `yanus-image-${selectedBaseImageId || 'download'}.jpg`;
        link.target = '_blank'; // Ensure it doesn't navigate away
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        onDownload();
      }
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

export default TweakCanvas;