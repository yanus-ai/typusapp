import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Images, ZoomIn, ZoomOut, Maximize2, Download, Grid3X3, Undo2, Redo2, Share2, Loader2 } from 'lucide-react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { 
  setCanvasBounds, 
  setOriginalImageBounds, 
  setZoom, 
  setPan,
  addSelectedRegion,
  updateSelectedRegion,
  clearSelectedRegions,
  addRectangleObject,
  updateRectangleObject,
  addBrushObject,
  updateBrushObject,
  CanvasBounds,
  RectangleObject,
  BrushObject
} from '@/features/tweak/tweakSlice';
import { downloadImageFromUrl } from '@/utils/helpers';

export interface TweakCanvasRef {
  generateMaskImage: () => string | null;
  clearLocalSelections: () => void;
}

interface TweakCanvasProps {
  imageUrl?: string;
  currentTool: 'select' | 'region' | 'cut' | 'add' | 'rectangle' | 'brush' | 'move' | 'pencil';
  selectedBaseImageId: number | null;
  onDownload?: () => void;
  loading?: boolean;
  onOpenGallery?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onShare?: (imageUrl: string) => void;
  onCreate?: (imageId?: number) => void;
  onUpscale?: (imageId?: number) => void;
  imageId?: number;
}

const TweakCanvas = forwardRef<TweakCanvasRef, TweakCanvasProps>(({ 
  imageUrl, 
  currentTool, 
  selectedBaseImageId,
  onDownload,
  loading = false,
  onOpenGallery,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onShare,
  onCreate,
  onUpscale,
  imageId
}, ref) => {
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
  const [isHoveringOverImage, setIsHoveringOverImage] = useState(false);
  const [isHoveringOverButtons, setIsHoveringOverButtons] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
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
  
  // Region state
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [isDraggingRegion, setIsDraggingRegion] = useState(false);

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
        dispatch(setCanvasBounds({ x: 0, y: 0, width: img.width + 1, height: img.height + 1 }));
        
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

      // Fill outpaint area with dotted pattern (same as rectangle/brush) with opacity
      if (canvasBounds.width > originalImageBounds.width || canvasBounds.height > originalImageBounds.height) {
        // Create dotted pattern
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 10;
        patternCanvas.height = 10;
        const patternCtx = patternCanvas.getContext('2d');
        if (patternCtx) {
          // Create pattern with black background and white dots (same as rectangle/brush)
          patternCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          patternCtx.fillRect(0, 0, 10, 10);
          patternCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          patternCtx.fillRect(4, 4, 2, 2);
        }
        const pattern = ctx.createPattern(patternCanvas, 'repeat');
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fillRect(extendedX, extendedY, extendedWidth, extendedHeight);
        }
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

        // Draw 3x3 grid overlay on the entire extended canvas if select tool is active
        if (currentTool === 'select') {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 1;
          
          // Calculate grid cell dimensions
          const cellWidth = extendedWidth / 3;
          const cellHeight = extendedHeight / 3;
          
          // Draw vertical grid lines
          for (let i = 1; i < 3; i++) {
            const x = extendedX + (cellWidth * i);
            ctx.beginPath();
            ctx.moveTo(x, extendedY);
            ctx.lineTo(x, extendedY + extendedHeight);
            ctx.stroke();
          }
          
          // Draw horizontal grid lines
          for (let i = 1; i < 3; i++) {
            const y = extendedY + (cellHeight * i);
            ctx.beginPath();
            ctx.moveTo(extendedX, y);
            ctx.lineTo(extendedX + extendedWidth, y);
            ctx.stroke();
          }
        }

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

      // Draw selected regions overlay (free-form paths) - only show when Add Objects or Move Objects is active
      const shouldShowObjects = currentTool === 'rectangle' || currentTool === 'brush' || currentTool === 'pencil' || currentTool === 'move';
      
      // Debug: Log object visibility status
      if (rectangleObjects.length > 0 || brushObjects.length > 0 || selectedRegions.length > 0) {
        console.log('🎨 Object visibility:', { 
          currentTool, 
          shouldShowObjects, 
          objectCount: { 
            rectangles: rectangleObjects.length, 
            brushes: brushObjects.length, 
            regions: selectedRegions.length 
          }
        });
      }
      
      if (shouldShowObjects) {
        selectedRegions.forEach(region => {
        if (region.imagePath && region.imagePath.length > 0) {
          // Convert image coordinates to current screen coordinates
          const screenPath = region.imagePath.map(point => 
            imageToScreenCoordinates(point.x, point.y)
          ).filter(point => point !== null) as { x: number; y: number }[];
          
          if (screenPath.length === 0) return;
          
          // Create dotted pattern for selected regions - match rectangle pattern exactly
          const patternCanvas = document.createElement('canvas');
          patternCanvas.width = 10;
          patternCanvas.height = 10;
          const patternCtx = patternCanvas.getContext('2d');
          if (patternCtx) {
            // Create pattern with black background and white dots (same as rectangle)
            patternCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            patternCtx.fillRect(0, 0, 20, 20);
            patternCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            patternCtx.fillRect(9, 9, 2, 2);
          }
          const pattern = ctx.createPattern(patternCanvas, 'repeat');
          
          ctx.fillStyle = pattern || 'rgba(99, 102, 241, 0.3)';
          
          if (screenPath.length === 1) {
            // Draw a small circle for single point
            ctx.beginPath();
            ctx.arc(screenPath[0].x, screenPath[0].y, 5, 0, 2 * Math.PI);
            ctx.fill();
          } else {
            // Draw smooth filled path without stroke
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
          }
        }
        });
      }
      
      // Draw rectangle objects - only show when Add Objects or Move Objects is active
      if (shouldShowObjects) {
        rectangleObjects.forEach(rectangle => {
        const screenPos = imageToScreenCoordinates(rectangle.position.x, rectangle.position.y);
        const screenSize = {
          width: rectangle.size.width * image.width * zoom,
          height: rectangle.size.height * image.height * zoom
        };
        
        if (screenPos) {
          // Add enhanced shadow effect
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 12;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 3;
          
          // Draw black background with opacity (Krea style)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.fillRect(screenPos.x, screenPos.y, screenSize.width, screenSize.height);
          
          // Reset shadow for border
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          
          // Draw thick white border (Krea style)
          ctx.strokeStyle = 'transparent';
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
      }
      
      // Draw current rectangle being drawn with same styling as final rectangles - only show when Add Objects or Move Objects is active
      if (shouldShowObjects && isDrawingRectangle && currentRectangle) {
        // Add enhanced shadow effect
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        
        // Black transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(currentRectangle.x, currentRectangle.y, currentRectangle.width, currentRectangle.height);
        
        // Reset shadow for border
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // White border (stroke)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(currentRectangle.x, currentRectangle.y, currentRectangle.width, currentRectangle.height);
      }

      // Draw current painting path in real-time (for pencil tool) - simple red stroke - only show when Add Objects or Move Objects is active
      if (shouldShowObjects && isPainting && paintPath.length > 0 && currentTool === 'pencil') {
        ctx.strokeStyle = '#FFFFFF';
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
      
      // Draw brush objects as actual stroke shapes (preserve user's drawing) - only show when Add Objects or Move Objects is active
      if (shouldShowObjects) {
        brushObjects.forEach(brushObj => {
        const screenPath = brushObj.path.map(point => 
          imageToScreenCoordinates(point.x, point.y)
        ).filter(point => point !== null) as { x: number; y: number }[];
        
        if (screenPath.length === 0) return;
        
        const strokeWidth = (brushObj.strokeWidth || brushSize) * zoom;
        
        // Add enhanced shadow effect
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        
        // STEP 1: Draw white outline stroke that follows the organic shape
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
        ctx.strokeStyle = 'transparent';
        ctx.lineWidth = strokeWidth + 3; // White border
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        // Reset shadow for inner stroke
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // STEP 2: Draw the actual brush stroke content on top of white outline
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
        
        // STEP 3: Add dot pattern overlay on top
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 10;
        patternCanvas.height = 10;
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
      }

      // Draw current brush path while drawing (black with opacity) - only show when Add Objects or Move Objects is active
      if (shouldShowObjects && currentTool === 'brush' && brushPath.length > 0) {
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
  }, [image, canvasBounds.width, canvasBounds.height, originalImageBounds.width, originalImageBounds.height, zoom, pan.x, pan.y, selectedRegions, rectangleObjects, brushObjects, currentTool, isPainting, paintPath, isDrawingRectangle, currentRectangle, selectedRectangleId, selectedBrushId, selectedRegionId, brushPath, brushSize]);

  // Calculate minimum zoom level to ensure image is at least 500px in either dimension
  const getMinimumZoom = (img: HTMLImageElement) => {
    if (!img) return 0.1;
    
    // Calculate minimum zoom needed for 500px minimum size
    const minZoomForWidth = 500 / img.width;
    const minZoomForHeight = 500 / img.height;
    
    // Use the smaller of the two to ensure at least one dimension reaches 500px
    return Math.min(minZoomForWidth, minZoomForHeight);
  };

  const centerAndFitImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Add padding to reduce the image size on canvas
    const padding = 100; // Increased padding to make image smaller
    const availableWidth = canvas.width - padding * 2;
    const availableHeight = canvas.height - padding * 2;
    
    const scaleX = availableWidth / img.width;
    const scaleY = availableHeight / img.height;
    const fitScale = Math.min(scaleX, scaleY, 0.5); // Reduced max scale to 60% and don't scale up beyond that
    
    // Ensure the scale doesn't go below minimum zoom
    const minZoom = getMinimumZoom(img);
    const scale = Math.max(fitScale, minZoom);
    
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

  // Check if mouse is inside the original image area with small tolerance
  const isMouseInsideImage = (mouseX: number, mouseY: number): boolean => {
    const imageCoords = screenToImageCoordinates(mouseX, mouseY);
    if (!imageCoords) return false;
    
    // Allow small tolerance (few pixels) outside the image boundaries
    const tolerance = 0.02; // ~2% of image dimensions
    return imageCoords.x >= -tolerance && imageCoords.x <= 1 + tolerance && 
           imageCoords.y >= -tolerance && imageCoords.y <= 1 + tolerance;
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

  // Helper function to check if mouse is over a region
  const getRegionAtPoint = (mouseX: number, mouseY: number): string | null => {
    // Check regions in reverse order (last drawn on top)
    for (let i = selectedRegions.length - 1; i >= 0; i--) {
      const region = selectedRegions[i];
      if (!region.imagePath || region.imagePath.length === 0) continue;
      
      // Convert region path to screen coordinates
      const screenPath = region.imagePath.map(point => 
        imageToScreenCoordinates(point.x, point.y)
      ).filter(point => point !== null) as { x: number; y: number }[];
      
      if (screenPath.length === 0) continue;
      
      // Use point-in-polygon algorithm
      let inside = false;
      let j = screenPath.length - 1;
      
      for (let k = 0; k < screenPath.length; k++) {
        const xi = screenPath[k].x, yi = screenPath[k].y;
        const xj = screenPath[j].x, yj = screenPath[j].y;
        
        if (((yi > mouseY) !== (yj > mouseY)) && 
            (mouseX < (xj - xi) * (mouseY - yi) / (yj - yi) + xi)) {
          inside = !inside;
        }
        j = k;
      }
      
      if (inside) {
        return region.id;
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
    // Prevent any interaction during loading
    if (loading) {
      e.preventDefault();
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setLastMousePos({ x: mouseX, y: mouseY });
    setHasDragged(false);

    if (currentTool === 'rectangle') {
      if (isMouseInsideImage(mouseX, mouseY)) {
        // Check if clicking on existing objects first - prioritize dragging over drawing
        const clickedBrush = getBrushAtPoint(mouseX, mouseY);
        const clickedRegion = getRegionAtPoint(mouseX, mouseY);
        const clickedRectangle = getRectangleAtPoint(mouseX, mouseY);
        
        if (clickedRectangle) {
          // Clicking on existing rectangle - drag it instead of drawing new one
          setSelectedRectangleId(clickedRectangle);
          setSelectedBrushId(null);
          setSelectedRegionId(null);
          const resizeHandle = getRectangleResizeHandle(mouseX, mouseY, clickedRectangle);
          if (resizeHandle) {
            setIsResizingRectangle(resizeHandle);
          } else {
            setIsDraggingRectangle(true);
          }
        } else if (clickedBrush) {
          // Clicking on brush object - drag it
          setSelectedBrushId(clickedBrush);
          setSelectedRectangleId(null);
          setSelectedRegionId(null);
          setIsDraggingBrush(true);
        } else if (clickedRegion) {
          // Clicking on region - drag it
          setSelectedRegionId(clickedRegion);
          setSelectedBrushId(null);
          setSelectedRectangleId(null);
          setIsDraggingRegion(true);
        } else {
          // Not clicking on any object - start drawing new rectangle
          setSelectedRectangleId(null);
          setSelectedBrushId(null);
          setSelectedRegionId(null);
          setIsDrawingRectangle(true);
          setRectangleStart({ x: mouseX, y: mouseY });
        }
      }
    } else if (currentTool === 'brush') {
      if (isMouseInsideImage(mouseX, mouseY)) {
        // Check if clicking on existing objects first - prioritize dragging over drawing
        const clickedBrush = getBrushAtPoint(mouseX, mouseY);
        const clickedRegion = getRegionAtPoint(mouseX, mouseY);
        const clickedRectangle = getRectangleAtPoint(mouseX, mouseY);
        
        if (clickedBrush) {
          // Clicking on existing brush - drag it instead of drawing new one
          setSelectedBrushId(clickedBrush);
          setSelectedRectangleId(null);
          setSelectedRegionId(null);
          setIsDraggingBrush(true);
        } else if (clickedRectangle) {
          // Clicking on rectangle object - drag it
          setSelectedRectangleId(clickedRectangle);
          setSelectedBrushId(null);
          setSelectedRegionId(null);
          const resizeHandle = getRectangleResizeHandle(mouseX, mouseY, clickedRectangle);
          if (resizeHandle) {
            setIsResizingRectangle(resizeHandle);
          } else {
            setIsDraggingRectangle(true);
          }
        } else if (clickedRegion) {
          // Clicking on region - drag it
          setSelectedRegionId(clickedRegion);
          setSelectedBrushId(null);
          setSelectedRectangleId(null);
          setIsDraggingRegion(true);
        } else {
          // Not clicking on any object - start drawing new brush stroke
          setBrushPath([{ x: mouseX, y: mouseY }]);
          setSelectedBrushId(null);
          setSelectedRectangleId(null);
          setSelectedRegionId(null);
        }
      }
    } else if (currentTool === 'move') {
      // Check if clicking on objects first (brush objects take priority, then regions, then rectangles)
      const clickedBrush = getBrushAtPoint(mouseX, mouseY);
      const clickedRegion = getRegionAtPoint(mouseX, mouseY);
      const clickedRectangle = getRectangleAtPoint(mouseX, mouseY);
      
      if (clickedBrush) {
        setSelectedBrushId(clickedBrush);
        setSelectedRectangleId(null);
        setSelectedRegionId(null);
        setIsDraggingBrush(true);
      } else if (clickedRegion) {
        setSelectedRegionId(clickedRegion);
        setSelectedBrushId(null);
        setSelectedRectangleId(null);
        setIsDraggingRegion(true);
      } else if (clickedRectangle) {
        setSelectedRectangleId(clickedRectangle);
        setSelectedBrushId(null);
        setSelectedRegionId(null);
        setIsDraggingRectangle(true);
      } else {
        // Clear selections and allow dragging the canvas/image
        setSelectedBrushId(null);
        setSelectedRectangleId(null);
        setSelectedRegionId(null);
        setIsDragging(true);
      }
    } else if (currentTool === 'pencil') {
      if (isMouseInsideImage(mouseX, mouseY)) {
        // Check if clicking on existing objects first - prioritize dragging over drawing
        const clickedBrush = getBrushAtPoint(mouseX, mouseY);
        const clickedRegion = getRegionAtPoint(mouseX, mouseY);
        const clickedRectangle = getRectangleAtPoint(mouseX, mouseY);
        
        if (clickedBrush) {
          // Clicking on existing brush - drag it instead of drawing new region
          setSelectedBrushId(clickedBrush);
          setSelectedRectangleId(null);
          setSelectedRegionId(null);
          setIsDraggingBrush(true);
        } else if (clickedRectangle) {
          // Clicking on rectangle object - drag it
          setSelectedRectangleId(clickedRectangle);
          setSelectedBrushId(null);
          setSelectedRegionId(null);
          const resizeHandle = getRectangleResizeHandle(mouseX, mouseY, clickedRectangle);
          if (resizeHandle) {
            setIsResizingRectangle(resizeHandle);
          } else {
            setIsDraggingRectangle(true);
          }
        } else if (clickedRegion) {
          // Clicking on region - drag it
          setSelectedRegionId(clickedRegion);
          setSelectedBrushId(null);
          setSelectedRectangleId(null);
          setIsDraggingRegion(true);
        } else {
          // Not clicking on any object - start drawing new region
          setIsPainting(true);
          setPaintPath([{ x: mouseX, y: mouseY }]);
        }
      }
    } else if (currentTool === 'select') {
      // Check if clicking on resize handle for outpainting (no region drawing in select mode)
      const handle = getResizeHandle(mouseX, mouseY);
      if (handle) {
        setIsResizing(handle);
      } else {
        // For select tool, allow canvas dragging but no region drawing
        setIsDragging(true);
      }
    } else {
      // For all other tools, check if clicking on objects first, then allow canvas dragging
      const clickedBrush = getBrushAtPoint(mouseX, mouseY);
      const clickedRegion = getRegionAtPoint(mouseX, mouseY);
      const clickedRectangle = getRectangleAtPoint(mouseX, mouseY);
      
      if (clickedBrush) {
        setSelectedBrushId(clickedBrush);
        setSelectedRectangleId(null);
        setSelectedRegionId(null);
        setIsDraggingBrush(true);
      } else if (clickedRegion) {
        setSelectedRegionId(clickedRegion);
        setSelectedBrushId(null);
        setSelectedRectangleId(null);
        setIsDraggingRegion(true);
      } else if (clickedRectangle) {
        setSelectedRectangleId(clickedRectangle);
        setSelectedBrushId(null);
        setSelectedRegionId(null);
        const resizeHandle = getRectangleResizeHandle(mouseX, mouseY, clickedRectangle);
        if (resizeHandle) {
          setIsResizingRectangle(resizeHandle);
        } else {
          setIsDraggingRectangle(true);
        }
      } else {
        // No object clicked, allow canvas dragging
        setIsDragging(true);
      }
    }
  };

  // Get cursor style based on current tool and hover state
  const getCursorStyle = () => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return 'default';
    
    // Check for objects under cursor for all tools
    const rectangleId = getRectangleAtPoint(mousePos.x, mousePos.y);
    const brushId = getBrushAtPoint(mousePos.x, mousePos.y);
    const regionId = getRegionAtPoint(mousePos.x, mousePos.y);
    
    if (currentTool === 'rectangle') {
      // Prioritize showing resize handles for rectangles
      if (rectangleId) {
        const resizeHandle = getRectangleResizeHandle(mousePos.x, mousePos.y, rectangleId);
        if (resizeHandle === 'se') {
          return 'nw-resize'; // Bottom-right corner uses nw-resize cursor
        }
        return 'move'; // Show move cursor when hovering over rectangle body
      }
      // Show move cursor when hovering over other objects (brush, region)
      if (brushId || regionId) {
        return 'move';
      }
      // Default to crosshair when not over any object
      return 'crosshair';
    }
    
    if (currentTool === 'brush') {
      // Show move cursor when hovering over any object
      if (rectangleId) {
        const resizeHandle = getRectangleResizeHandle(mousePos.x, mousePos.y, rectangleId);
        if (resizeHandle === 'se') {
          return 'nw-resize'; // Show resize cursor for rectangle handles
        }
        return 'move';
      }
      if (brushId || regionId) {
        return 'move';
      }
      // Show custom brush cursor when not over any object
      return `url("data:image/svg+xml,%3csvg width='${brushSize}' height='${brushSize}' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='${brushSize/2}' cy='${brushSize/2}' r='${brushSize/2-1}' fill='none' stroke='%23000' stroke-width='2'/%3e%3c/svg%3e") ${brushSize/2} ${brushSize/2}, crosshair`;
    }
    
    if (currentTool === 'move') {
      if (rectangleId || brushId || regionId) {
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
    
    if (currentTool === 'pencil') {
      // Show appropriate cursor when hovering over any object
      if (rectangleId) {
        const resizeHandle = getRectangleResizeHandle(mousePos.x, mousePos.y, rectangleId);
        if (resizeHandle === 'se') {
          return 'nw-resize'; // Show resize cursor for rectangle handles
        }
        return 'move';
      }
      if (brushId || regionId) {
        return 'move';
      }
      // Default to crosshair when not over any object
      return 'crosshair';
    }
    if (currentTool === 'select') return 'default';
    if (currentTool === 'cut') return 'crosshair'; 
    return 'move';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setMousePos({ x: mouseX, y: mouseY });
    
    // Check if mouse is over the image area for hover state
    if (image && canvasRef.current) {
      const canvas = canvasRef.current;
      const centerX = canvas.width / 2 + pan.x;
      const centerY = canvas.height / 2 + pan.y;
      const scaledWidth = image.width * zoom;
      const scaledHeight = image.height * zoom;
      
      const imageLeft = centerX - scaledWidth / 2;
      const imageRight = centerX + scaledWidth / 2;
      const imageTop = centerY - scaledHeight / 2;
      const imageBottom = centerY + scaledHeight / 2;
      
      const isOverImage = mouseX >= imageLeft && mouseX <= imageRight && 
                         mouseY >= imageTop && mouseY <= imageBottom;
      
      setIsHoveringOverImage(isOverImage);
    }
    
    // Prevent mouse move logic during loading except for cursor updates
    if (!loading) {
      handleMouseMoveLogic(e.clientX, e.clientY, rect);
    }
  };

  // Global mouse move handler for document-wide dragging
  const handleDocumentMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    handleMouseMoveLogic(e.clientX, e.clientY, rect);
  }, []);

  const handleMouseMoveLogic = (clientX: number, clientY: number, rect: DOMRect) => {
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

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
    } else if (isPainting && currentTool === 'pencil') {
      // Only add to paint path if mouse is inside the image (for pencil tool)
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
    }
    
    // Handle object dragging for all tools (not just move tool)
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
      } else if (isDraggingRegion && selectedRegionId) {
        // Move selected region
        const deltaX = mouseX - lastMousePos.x;
        const deltaY = mouseY - lastMousePos.y;
        
        const deltaXNormalized = deltaX / ((image?.width || 1) * zoom);
        const deltaYNormalized = deltaY / ((image?.height || 1) * zoom);
        
        const region = selectedRegions.find(r => r.id === selectedRegionId);
        if (region && region.imagePath) {
          // Calculate current bounds
          const currentMinX = Math.min(...region.imagePath.map(p => p.x));
          const currentMaxX = Math.max(...region.imagePath.map(p => p.x));
          const currentMinY = Math.min(...region.imagePath.map(p => p.y));
          const currentMaxY = Math.max(...region.imagePath.map(p => p.y));
          
          // Calculate region dimensions
          const regionWidth = currentMaxX - currentMinX;
          const regionHeight = currentMaxY - currentMinY;
          
          // Calculate new position, keeping the entire region within bounds
          const newMinX = Math.max(0, Math.min(1 - regionWidth, currentMinX + deltaXNormalized));
          const newMinY = Math.max(0, Math.min(1 - regionHeight, currentMinY + deltaYNormalized));
          
          // Calculate actual delta to apply
          const actualDeltaX = newMinX - currentMinX;
          const actualDeltaY = newMinY - currentMinY;
          
          // Move all points by the actual delta
          const newImagePath = region.imagePath.map(point => ({
            x: point.x + actualDeltaX,
            y: point.y + actualDeltaY
          }));
          
          dispatch(updateSelectedRegion({
            id: selectedRegionId,
            updates: {
              imagePath: newImagePath
            }
          }));
        }
        
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
  };

  // Global mouse up handler for document-wide interactions
  const handleDocumentMouseUp = useCallback(() => {
    handleMouseUp();
  }, []);

  // Add document event listeners for global mouse interactions
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging || isDrawingRectangle || isDraggingRectangle || isResizingRectangle || 
          isPainting || isDraggingBrush || isDraggingRegion) {
        handleDocumentMouseMove(e);
      }
    };

    const handleMouseUp = () => {
      if (isDragging || isDrawingRectangle || isDraggingRectangle || isResizingRectangle || 
          isPainting || isDraggingBrush || isDraggingRegion) {
        handleDocumentMouseUp();
      }
    };

    // Add document-wide mouse event listeners for drag operations
    if (isDragging || isDrawingRectangle || isDraggingRectangle || isResizingRectangle || 
        isPainting || isDraggingBrush || isDraggingRegion) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);
      
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
    } else {
      // Restore text selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Ensure text selection is restored
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [isDragging, isDrawingRectangle, isDraggingRectangle, isResizingRectangle, 
      isPainting, isDraggingBrush, isDraggingRegion, handleDocumentMouseMove, handleDocumentMouseUp]);

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
    // Note: Outpaint is now triggered manually via Generate button, not automatically on boundary release

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
      setIsDraggingRegion(false);
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
    } else if (isPainting && paintPath.length > 0 && currentTool === 'pencil') {
      // Convert screen coordinates to image coordinates for pencil tool
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

    setIsPainting(false);
    setIsDragging(false);
    setIsResizing(null);
    
    // Clean up object dragging states for all tools
    setIsDraggingRectangle(false);
    setIsDraggingBrush(false);
    setIsDraggingRegion(false);
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
        const newRightExpansion = Math.max(0, rightExpansion + deltaX);
        newBounds.width = originalImageBounds.width + leftExpansion + newRightExpansion;
        break;
      }
      case 'left': {
        // Expand left side only - invert deltaX so dragging left expands, dragging right shrinks
        const newLeftExpansion = Math.max(0, leftExpansion - deltaX);
        newBounds.width = originalImageBounds.width + newLeftExpansion + rightExpansion;
        newBounds.x = -newLeftExpansion;
        break;
      }
      case 'bottom': {
        // Expand bottom side only
        const newBottomExpansion = Math.max(1, bottomExpansion + deltaY);
        newBounds.height = originalImageBounds.height + topExpansion + newBottomExpansion;
        break;
      }
      case 'top': {
        // Expand top side only - invert deltaY so dragging up expands, dragging down shrinks
        const newTopExpansion = Math.max(1, topExpansion - deltaY);
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
    
    if (!image) return;
    
    // More controlled zoom with smaller increments
    // Normalize the delta value to handle different devices better
    const normalizedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 100);
    const zoomIntensity = 0.002; // Much smaller zoom factor
    const zoomFactor = 1 - normalizedDelta * zoomIntensity;
    
    // Calculate minimum zoom based on current image
    const minZoom = getMinimumZoom(image);
    
    // Apply zoom with minimum constraint
    const newZoom = Math.max(minZoom, Math.min(10, zoom * zoomFactor));
    dispatch(setZoom(newZoom));
  };

  // Zoom controls
  const zoomIn = () => {
    dispatch(setZoom(Math.min(10, zoom * 1.2)));
  };

  const zoomOut = () => {
    if (!image) return;
    
    const minZoom = getMinimumZoom(image);
    dispatch(setZoom(Math.max(minZoom, zoom / 1.2)));
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
      await downloadImageFromUrl(
        imageUrl, 
        `typus-ai-${selectedBaseImageId || 'download'}.jpg`,
        setIsDownloading
      );
      onDownload();
    }
  };

  // Generate mask image for inpainting/outpainting
  const generateMaskImage = useCallback((): string | null => {
    if (!image) return null;

    console.log('🎭 Generating mask image from drawn objects...');

    // Create a new canvas for the mask with the same dimensions as the processed image
    const maskCanvas = document.createElement('canvas');
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return null;

    // Set mask canvas dimensions to match the processed image exactly
    maskCanvas.width = image.naturalWidth;
    maskCanvas.height = image.naturalHeight;

    console.log(`🎭 Mask canvas dimensions: ${maskCanvas.width}x${maskCanvas.height}`);

    // Fill the mask canvas with black background (non-mask areas)
    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Set white color for drawn objects (mask areas)
    maskCtx.fillStyle = 'white';
    maskCtx.strokeStyle = 'white';

    let hasDrawnObjects = false;

    // Draw rectangle objects on mask
    rectangleObjects.forEach(rectangle => {
      console.log('🎭 Drawing rectangle on mask:', rectangle);
      
      // Convert normalized coordinates (0-1) to actual image coordinates
      const maskX = rectangle.position.x * image.naturalWidth;
      const maskY = rectangle.position.y * image.naturalHeight;
      const maskWidth = rectangle.size.width * image.naturalWidth;
      const maskHeight = rectangle.size.height * image.naturalHeight;

      maskCtx.fillRect(maskX, maskY, maskWidth, maskHeight);
      hasDrawnObjects = true;
    });

    // Draw brush objects on mask
    brushObjects.forEach(brushObj => {
      if (brushObj.path.length === 0) return;

      console.log('🎭 Drawing brush stroke on mask:', brushObj);

      // Convert normalized path coordinates (0-1) to actual image coordinates
      const imagePath = brushObj.path.map(point => ({
        x: point.x * image.naturalWidth,
        y: point.y * image.naturalHeight
      }));

      maskCtx.beginPath();
      // Scale stroke width appropriately relative to image size
      maskCtx.lineWidth = (brushObj.strokeWidth || brushSize) * (image.naturalWidth / 1000);
      maskCtx.lineCap = 'round';
      maskCtx.lineJoin = 'round';

      if (imagePath.length === 1) {
        // Single point - draw a circle
        const point = imagePath[0];
        maskCtx.beginPath();
        maskCtx.arc(point.x, point.y, maskCtx.lineWidth / 2, 0, 2 * Math.PI);
        maskCtx.fill();
      } else {
        // Multiple points - draw stroke path
        maskCtx.moveTo(imagePath[0].x, imagePath[0].y);
        for (let i = 1; i < imagePath.length; i++) {
          maskCtx.lineTo(imagePath[i].x, imagePath[i].y);
        }
        maskCtx.stroke();
      }
      hasDrawnObjects = true;
    });

    // Draw selected regions on mask (free-form paths from pencil tool)
    selectedRegions.forEach(region => {
      if (!region.imagePath || region.imagePath.length === 0) return;

      console.log('🎭 Drawing region on mask:', region);

      // Convert normalized path coordinates (0-1) to actual image coordinates
      const imagePath = region.imagePath.map(point => ({
        x: point.x * image.naturalWidth,
        y: point.y * image.naturalHeight
      }));

      maskCtx.beginPath();
      maskCtx.moveTo(imagePath[0].x, imagePath[0].y);
      
      for (let i = 1; i < imagePath.length; i++) {
        maskCtx.lineTo(imagePath[i].x, imagePath[i].y);
      }
      
      maskCtx.closePath();
      maskCtx.fill();
      hasDrawnObjects = true;
    });

    if (!hasDrawnObjects) {
      console.log('🎭 No drawn objects found, returning null mask');
      return null;
    }

    console.log('🎭 Mask generation complete');
    
    // Convert mask canvas to base64 data URL
    return maskCanvas.toDataURL('image/png');
  }, [image, rectangleObjects, brushObjects, selectedRegions, brushSize]);

  // Function to clear local selections (for undo/redo)
  const clearLocalSelections = useCallback(() => {
    setSelectedRectangleId(null);
    setSelectedBrushId(null);
    setSelectedRegionId(null);
    setIsDraggingRectangle(false);
    setIsDraggingBrush(false);
    setIsDraggingRegion(false);
    setIsResizingRectangle(null);
    setIsPainting(false);
    setIsDrawingRectangle(false);
    setBrushPath([]);
    setPaintPath([]);
    setCurrentRectangle(null);
  }, []);

  // Expose functions to parent components
  useImperativeHandle(ref, () => ({
    generateMaskImage,
    clearLocalSelections
  }), [generateMaskImage, clearLocalSelections]);

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
          setIsHoveringOverImage(false);
          setIsHoveringOverButtons(false);
          handleMouseUp();
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ 
            transition: 'none',
            cursor: loading ? 'wait' : getCursorStyle()
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

      {/* Loading overlay with left-to-right animation - only inside image area */}
      {loading && image && canvasRef.current && (
        <div 
          className="absolute pointer-events-none z-40 overflow-hidden"
          style={{
            left: `${canvasRef.current.width / 2 + pan.x - (image.width * zoom) / 2 + (canvasBounds.x * zoom)}px`,
            top: `${canvasRef.current.height / 2 + pan.y - (image.height * zoom) / 2 + (canvasBounds.y * zoom)}px`,
            width: `${canvasBounds.width * zoom}px`,
            height: `${canvasBounds.height * zoom}px`
          }}
        >
          {/* Left-to-right animated overlay */}
          <div 
            className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
            style={{
              animation: 'slide 2s ease-in-out infinite',
              transform: 'translateX(-100%)'
            }}
          ></div>
        </div>
      )}

      {/* Action buttons overlay when hovering over image */}
      {imageUrl && (isHoveringOverImage || isHoveringOverButtons) && !isDragging && image && canvasRef.current && (
        <div 
          className="absolute z-20 pointer-events-none"
          style={{
            left: canvasRef.current.width / 2 + pan.x,
            top: canvasRef.current.height / 2 + pan.y,
            transform: 'translate(-50%, -50%)',
            width: image.width * zoom,
            height: image.height * zoom,
          }}
          onMouseEnter={() => setIsHoveringOverButtons(true)}
          onMouseLeave={() => setIsHoveringOverButtons(false)}
        >
          {/* Top-left: Share button */}
          <div className="absolute top-3 left-3 pointer-events-auto" onMouseEnter={() => setIsHoveringOverButtons(true)} onMouseLeave={() => setIsHoveringOverButtons(false)}>
            {onShare && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(imageUrl);
                }}
                className="bg-black/20 hover:bg-black/40 text-white w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer"
                title="Share Image"
              >
                <Share2 size={18} />
              </button>
            )}
          </div>

          {/* Top-right: Download button */}
          <div className="absolute top-3 right-3 pointer-events-auto" onMouseEnter={() => setIsHoveringOverButtons(true)} onMouseLeave={() => setIsHoveringOverButtons(false)}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              className="bg-black/20 hover:bg-black/40 text-white w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer"
              title="Download Image"
            >
              {isDownloading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
            </button>
          </div>

          {/* Bottom-left: Create button */}
          <div className="absolute bottom-3 left-3 pointer-events-auto" onMouseEnter={() => setIsHoveringOverButtons(true)} onMouseLeave={() => setIsHoveringOverButtons(false)}>
            {onCreate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreate(imageId);
                }}
                className="bg-black/20 hover:bg-black/40 text-white px-3 py-2 rounded-lg text-sm font-bold tracking-wider transition-all duration-200 cursor-pointer"
                title="Create Image"
              >
                CREATE
              </button>
            )}
          </div>

          {/* Bottom-right: Upscale button */}
          <div className="absolute bottom-3 right-3 pointer-events-auto" onMouseEnter={() => setIsHoveringOverButtons(true)} onMouseLeave={() => setIsHoveringOverButtons(false)}>
            {onUpscale && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpscale(imageId);
                }}
                className="bg-black/20 hover:bg-black/40 text-white px-3 py-2 rounded-lg text-sm font-bold tracking-wider transition-all duration-200 cursor-pointer"
                title="Upscale Image"
              >
                UPSCALE
              </button>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slide {
            0% {
              transform: translateX(-100%);
              opacity: 0.3;
            }
            50% {
              transform: translateX(0%);
              opacity: 1;
            }
            100% {
              transform: translateX(100%);
              opacity: 0.3;
            }
          }
        `
      }} />

      <div className="absolute bottom-4 right-4 flex gap-2">
        {/* Undo/Redo buttons */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`cursor-pointer p-2 rounded-md text-xs backdrop-blur-sm transition-colors ${
            canUndo 
              ? 'bg-white/10 hover:bg-white/20 text-black' 
              : 'bg-white/5 text-gray-400 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`cursor-pointer p-2 rounded-md text-xs backdrop-blur-sm transition-colors ${
            canRedo 
              ? 'bg-white/10 hover:bg-white/20 text-black' 
              : 'bg-white/5 text-gray-400 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={16} />
        </button>
        
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
            {isDownloading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
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
});

TweakCanvas.displayName = 'TweakCanvas';

export default TweakCanvas;