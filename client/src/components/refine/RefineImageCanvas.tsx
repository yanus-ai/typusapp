import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Download, Eye, ScanLine, Columns2, Images, Grid3X3 } from 'lucide-react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setViewMode } from '@/features/refine/refineSlice';

interface RefineImageCanvasProps {
  setIsPromptModalOpen: (isOpen: boolean) => void;
  imageUrl?: string;
  originalImageUrl?: string;
  onClose?: () => void;
  loading?: boolean;
  error?: string | null;
  editInspectorMinimized?: boolean;
  onDownload?: () => void;
  onOpenGallery?: () => void;
  viewMode: 'generated' | 'before-after' | 'side-by-side';
}

const RefineImageCanvas: React.FC<RefineImageCanvasProps> = ({ 
  imageUrl, 
  originalImageUrl,
  loading = false,
  setIsPromptModalOpen, 
  editInspectorMinimized = false, 
  onDownload, 
  onOpenGallery, 
  viewMode 
}) => {
  const dispatch = useAppDispatch();
  
  // Canvas refs for different view modes
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beforeAfterCanvasRef = useRef<HTMLCanvasElement>(null);
  const sideCanvasLeftRef = useRef<HTMLCanvasElement>(null);
  const sideCanvasRightRef = useRef<HTMLCanvasElement>(null);
  
  // State management
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [beforeAfterPosition, setBeforeAfterPosition] = useState(50);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [refinedImage, setRefinedImage] = useState<HTMLImageElement | null>(null);
  const [isHoveringOverImage, setIsHoveringOverImage] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [initialImageLoaded, setInitialImageLoaded] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [animatedPanelOffset, setAnimatedPanelOffset] = useState(() => {
    // Initialize with correct offset based on initial panel state
    const panelWidth = editInspectorMinimized ? 0 : 396;
    return panelWidth / 2;
  });
  const animationRef = useRef<number | null>(null);

  // Load original image
  useEffect(() => {
    if (originalImageUrl) {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        centerAndFitImage(img);
      };
      img.onerror = (error) => {
        console.error('🖼️ RefineImageCanvas: Failed to load original image:', error, originalImageUrl);
      };
      img.src = originalImageUrl;
    } else {
      setOriginalImage(null);
    }
  }, [originalImageUrl]);

  // Load the current image - simplified to always use imageUrl prop
  useEffect(() => {
    // Always use the imageUrl prop for consistent behavior
    if (imageUrl) {
      const img = new Image();
      img.onload = () => {
        setRefinedImage(img);
        // Always center and fit the image when image changes (same as Create page and TweakCanvas)
        centerAndFitImage(img);
        if (!initialImageLoaded) {
          setInitialImageLoaded(true);
        }
      };
      img.onerror = (error) => {
        console.error('🖼️ RefineImageCanvas: Failed to load image:', error, imageUrl);
      };
      img.src = imageUrl;
    } else {
      setRefinedImage(null);
    }
  }, [imageUrl, initialImageLoaded]);

  // Canvas drawing function
  const drawCanvas = useCallback((canvas: HTMLCanvasElement, imageToRender: HTMLImageElement | null, useOffset = false) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !imageToRender) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Only use panel offset for generated mode
    const offsetX = useOffset ? animatedPanelOffset : 0;
    const centerX = canvas.width / 2 + pan.x + offsetX;
    const centerY = canvas.height / 2 + pan.y;
    const scaledWidth = imageToRender.width * zoom;
    const scaledHeight = imageToRender.height * zoom;

    ctx.drawImage(
      imageToRender,
      centerX - scaledWidth / 2,
      centerY - scaledHeight / 2,
      scaledWidth,
      scaledHeight
    );
  }, [zoom, pan, animatedPanelOffset]);

  // Draw side-by-side canvases with consistent sizing
  const drawSideBySideCanvas = useCallback((canvas: HTMLCanvasElement, imageToRender: HTMLImageElement | null, isLeftCanvas: boolean = false) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!imageToRender) {
      // Show placeholder text
      ctx.fillStyle = '#666666';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      const text = isLeftCanvas ? 'Original Image' : 'Generated Image';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      return;
    }

    // Calculate consistent size based on the larger image dimensions
    // This ensures both canvases show images at the same scale
    const referenceImage = refinedImage || originalImage;
    if (!referenceImage) return;

    const centerX = canvas.width / 2 + pan.x;
    const centerY = canvas.height / 2 + pan.y;
    
    // Use the reference image dimensions for consistent scaling
    const scaledWidth = referenceImage.width * zoom;
    const scaledHeight = referenceImage.height * zoom;

    ctx.drawImage(
      imageToRender,
      centerX - scaledWidth / 2,
      centerY - scaledHeight / 2,
      scaledWidth,
      scaledHeight
    );
  }, [zoom, pan, originalImage, refinedImage]);

  // Draw before/after comparison
  const drawBeforeAfterCanvas = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !refinedImage) return;


    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Center the image with panel offset for before-after mode (same as generated mode)
    const centerX = canvas.width / 2 + pan.x + animatedPanelOffset;
    const centerY = canvas.height / 2 + pan.y;
    const scaledWidth = refinedImage.width * zoom;
    const scaledHeight = refinedImage.height * zoom;

    const imageX = centerX - scaledWidth / 2;
    const imageY = centerY - scaledHeight / 2;

    // Always draw refined/generated image as the base (background)
    ctx.drawImage(refinedImage, imageX, imageY, scaledWidth, scaledHeight);

    // Draw original image with clipping for comparison (foreground - left side shows original)
    if (originalImage) {
      ctx.save();
      const clipWidth = (beforeAfterPosition / 100) * canvas.width;
      ctx.rect(0, 0, clipWidth, canvas.height);
      ctx.clip();
      ctx.drawImage(originalImage, imageX, imageY, scaledWidth, scaledHeight);
      ctx.restore();

      // Draw divider line
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(clipWidth, 0);
      ctx.lineTo(clipWidth, canvas.height);
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    } else {
      // If no original image, show text overlay on left side
      ctx.save();
      const clipWidth = (beforeAfterPosition / 100) * canvas.width;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, clipWidth, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Original Image Not Available', clipWidth / 2, canvas.height / 2);
      ctx.restore();

      // Draw divider line
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(clipWidth, 0);
      ctx.lineTo(clipWidth, canvas.height);
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  }, [zoom, pan, animatedPanelOffset, originalImage, refinedImage, beforeAfterPosition]);

  // Canvas resize and drawing effects
  useEffect(() => {
    const resizeCanvas = () => {
      const canvases = [canvasRef, beforeAfterCanvasRef, sideCanvasLeftRef, sideCanvasRightRef];
      canvases.forEach(ref => {
        const canvas = ref.current;
        if (canvas) {
          // Set canvas size based on parent container
          const rect = canvas.parentElement?.getBoundingClientRect();
          if (rect) {
            canvas.width = rect.width;
            canvas.height = rect.height;
          }
          
          // Redraw canvas after resize
          if (viewMode === 'before-after' && ref === beforeAfterCanvasRef && refinedImage) {
            drawBeforeAfterCanvas(canvas);
          } else if (viewMode === 'side-by-side') {
            if (ref === sideCanvasLeftRef) {
              drawSideBySideCanvas(canvas, originalImage, true);
            } else if (ref === sideCanvasRightRef) {
              // Use refined image if available, otherwise original image
              const rightImage = refinedImage || originalImage;
              drawSideBySideCanvas(canvas, rightImage, false);
            }
          } else if (ref === canvasRef) {
            const imageToShow = refinedImage || originalImage;
            drawCanvas(canvas, imageToShow, true); // Use offset for generated mode
          }
        }
      });
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [drawCanvas, drawBeforeAfterCanvas, drawSideBySideCanvas, originalImage, refinedImage, viewMode]);

  // Draw effects for each view mode
  useEffect(() => {
    if (viewMode === 'generated') {
      const canvas = canvasRef.current;
      const imageToShow = refinedImage || originalImage;
      if (canvas && imageToShow) {
        drawCanvas(canvas, imageToShow, true); // Use offset for generated mode
      }
    } else if (viewMode === 'before-after') {
      const canvas = beforeAfterCanvasRef.current;
      if (canvas && refinedImage) {
        drawBeforeAfterCanvas(canvas);
      }
    } else if (viewMode === 'side-by-side') {
      const leftCanvas = sideCanvasLeftRef.current;
      const rightCanvas = sideCanvasRightRef.current;
      
      // Left canvas always shows original image with consistent sizing
      if (leftCanvas) {
        drawSideBySideCanvas(leftCanvas, originalImage, true);
      }
      
      // Right canvas shows refined image if available, otherwise original image
      if (rightCanvas) {
        const rightImage = refinedImage || originalImage;
        drawSideBySideCanvas(rightCanvas, rightImage, false);
      }
    }
  }, [zoom, pan, viewMode, originalImage, refinedImage, beforeAfterPosition, drawCanvas, drawBeforeAfterCanvas, drawSideBySideCanvas]);

  // Animate panel offset transition
  const animatePanelOffset = (targetOffset: number) => {
    // Skip animation if already at target
    if (Math.abs(animatedPanelOffset - targetOffset) < 1) {
      return;
    }

    
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
    
    
    // Only animate the panel offset, don't reset zoom or pan
    animatePanelOffset(targetOffset);
  }, [editInspectorMinimized]);

  // Track window width for toolbar positioning
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);


  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    // More controlled zoom with smaller increments
    // Normalize the delta value to handle different devices better
    const normalizedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 100);
    const zoomIntensity = 0.002; // Much smaller zoom factor
    const zoomFactor = 1 - normalizedDelta * zoomIntensity;
    
    const imageToCheck = refinedImage || originalImage;
    let minZoom = 0.1;
    
    if (imageToCheck) {
      // Use the same minimum zoom logic as Create page
      minZoom = getMinimumZoom(imageToCheck);
    }
    
    // Apply zoom with better limits
    setZoom(prev => Math.max(minZoom, Math.min(10, prev * zoomFactor)));
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

    // Check if mouse is over the image area for any active image (original or refined)
    const activeImage = refinedImage || originalImage;
    if (activeImage) {
      const canvas = canvasRef.current || beforeAfterCanvasRef.current || sideCanvasLeftRef.current || sideCanvasRightRef.current;
      if (canvas) {
        let centerX, centerY;
        
        // Calculate center position based on view mode
        if (viewMode === 'generated' || viewMode === 'before-after') {
          centerX = canvas.width / 2 + pan.x + animatedPanelOffset;
          centerY = canvas.height / 2 + pan.y;
        } else {
          // For side-by-side, use canvas center without panel offset
          centerX = canvas.width / 2 + pan.x;
          centerY = canvas.height / 2 + pan.y;
        }
        
        const scaledWidth = activeImage.width * zoom;
        const scaledHeight = activeImage.height * zoom;
        
        const imageLeft = centerX - scaledWidth / 2;
        const imageRight = centerX + scaledWidth / 2;
        const imageTop = centerY - scaledHeight / 2;
        const imageBottom = centerY + scaledHeight / 2;
        
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const isOverImage = mouseX >= imageLeft && mouseX <= imageRight && 
                           mouseY >= imageTop && mouseY <= imageBottom;
        
        setIsHoveringOverImage(isOverImage);
      }
    }

    // Update before/after divider position for before-after mode
    if (viewMode === 'before-after') {
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      setBeforeAfterPosition(Math.max(0, Math.min(100, percentage)));
    }

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
    const imageToCheck = refinedImage || originalImage;
    if (!imageToCheck) {
      setZoom(prev => Math.max(0.1, prev / 1.2));
      return;
    }
    
    // Use the same minimum zoom logic as Create page
    const minZoom = getMinimumZoom(imageToCheck);
    setZoom(prev => Math.max(minZoom, prev / 1.2));
  };

  const resetView = () => {
    const imageToCenter = originalImage || refinedImage;
    if (imageToCenter) {
      centerAndFitImage(imageToCenter);
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
    setBeforeAfterPosition(50);
  };

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
    
    // Get appropriate canvas for current view mode
    let canvas: HTMLCanvasElement | null = null;
    let availableWidth = window.innerWidth;
    
    if (viewMode === 'generated') {
      canvas = canvasRef.current;
      // Calculate panel width and adjust available space (same as Create page ImageCanvas)
      const panelWidth = editInspectorMinimized ? 0 : 396;
      availableWidth = (window.innerWidth - panelWidth);
    } else if (viewMode === 'before-after') {
      canvas = beforeAfterCanvasRef.current;
      // Also adjust for panel in before-after mode (same as generated)
      const panelWidth = editInspectorMinimized ? 0 : 396;
      availableWidth = (window.innerWidth - panelWidth);
    } else if (viewMode === 'side-by-side') {
      canvas = sideCanvasLeftRef.current; // Use left canvas as reference
      // Account for panel in side-by-side mode
      const panelWidth = editInspectorMinimized ? 0 : 396;
      const totalAvailableWidth = window.innerWidth - panelWidth;
      availableWidth = totalAvailableWidth / 2; // Half of available width after panel
    }
    
    if (!canvas) return;

    // Use same sizing logic as Create page ImageCanvas
    const padding = 150; // 150px padding from edges (same as Create page)
    const adjustedWidth = availableWidth - padding * 2;
    const availableHeight = window.innerHeight - padding * 2;
    
    const scaleX = adjustedWidth / img.width;
    const scaleY = availableHeight / img.height;
    const fitScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond original size
    
    // Ensure the scale doesn't go below minimum zoom
    const minZoom = getMinimumZoom(img);
    const scale = Math.max(fitScale, minZoom);
    
    setZoom(scale);
    setPan({ x: 0, y: 0 });
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
        link.download = `typus-airefine-image-${Date.now()}.jpg`;
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
        link.download = `typus-airefine-image-${Date.now()}.jpg`;
        link.target = '_blank'; // Ensure it doesn't navigate away
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        onDownload();
      }
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-site-white">
      {/* Generated View Canvas */}
      {viewMode === 'generated' && (
        <div 
          className="relative w-full h-full"
          onMouseEnter={() => {}}
          onMouseLeave={() => {
            setIsHoveringOverImage(false);
            handleMouseUp();
          }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-move"
            style={{ 
              transition: 'none'
            }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={() => {
              if ((originalImage || refinedImage) && !hasDragged) {
                setIsPromptModalOpen(true);
              }
            }}
          />
        </div>
      )}

      {/* Before/After View Canvas */}
      {viewMode === 'before-after' && (
        <div 
          className="relative w-full h-full"
          onMouseEnter={() => {}}
          onMouseLeave={() => {
            setIsHoveringOverImage(false);
            handleMouseUp();
          }}
        >
          <canvas
            ref={beforeAfterCanvasRef}
            className="w-full h-full cursor-move"
            style={{ 
              transition: 'none'
            }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={() => {
              if ((originalImage || refinedImage) && !hasDragged) {
                setIsPromptModalOpen(true);
              }
            }}
          />
          
          {/* Divider line indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none z-10"
            style={{ left: `${beforeAfterPosition}%` }}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
              <ScanLine className="w-4 h-4 text-gray-600" />
            </div>
          </div>
        </div>
      )}

      {/* Side by Side View Canvases */}
      {viewMode === 'side-by-side' && (
        <div 
          className="relative h-full flex"
          onMouseEnter={() => {}}
          onMouseLeave={() => {
            setIsHoveringOverImage(false);
            handleMouseUp();
          }}
        >
          {/* Left Canvas - Original Image */}
          <div className="flex-1 relative">
            <canvas
              ref={sideCanvasLeftRef}
              className="w-full h-full cursor-move"
              style={{ 
                transition: 'none'
              }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onClick={() => {
                if ((originalImage || refinedImage) && !hasDragged) {
                  setIsPromptModalOpen(true);
                }
              }}
            />
            {/* Label for Original Image */}
            <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded text-sm">
              Original
            </div>
          </div>
          
          {/* Center Divider */}
          <div className="w-px bg-gray-300"></div>
          
          {/* Right Canvas - Refined Image */}
          <div className="flex-1 relative">
            <canvas
              ref={sideCanvasRightRef}
              className="w-full h-full cursor-move"
              style={{ 
                transition: 'none'
              }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onClick={() => {
                if ((originalImage || refinedImage) && !hasDragged) {
                  setIsPromptModalOpen(true);
                }
              }}
            />
            {/* Label for Generated Image */}
            <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded text-sm">
              Generated
            </div>
          </div>
        </div>
      )}
        
      {/* Pulsating click indicator that follows mouse cursor - for all modes when hovering over image */}
      {(originalImage || refinedImage) && isHoveringOverImage && !isDragging && (
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
      
      {/* Empty State */}
      {!originalImage && !refinedImage && !loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-500">
            <Images size={128} className="text-gray-400 opacity-80 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Image Selected</h3>
            <p className="text-sm">Select an image from the left panel to start refining</p>
          </div>
        </div>
      )}

      {/* Floating View Mode Toolbar - Similar to TweakToolbar */}
      <div 
        className="absolute bottom-4 z-10"
        style={{
          left: editInspectorMinimized 
            ? '50%' 
            : `${((396 + (windowWidth - 396) / 2) / windowWidth * 100)}%`,
          transform: 'translateX(-50%)'
        }}
      >
        <div className="flex gap-2 bg-white rounded-lg px-2 py-2 shadow-lg">
          <button
            onClick={() => dispatch(setViewMode('generated'))}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap border ${
              viewMode === 'generated'
                ? 'text-red-500 border-red-500 bg-red-50' 
                : 'text-gray-500 hover:text-black hover:bg-white/50 border-transparent'
            }`}
            title="Generated"
          >
            <Eye size={16} />
            <span>Generated</span>
          </button>
          <button
            onClick={() => dispatch(setViewMode('before-after'))}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap border ${
              viewMode === 'before-after'
                ? 'text-red-500 border-red-500 bg-red-50' 
                : 'text-gray-500 hover:text-black hover:bg-white/50 border-transparent'
            }`}
            title="Before/After"
          >
            <ScanLine size={16} />
            <span>Before/After</span>
          </button>
          <button
            onClick={() => dispatch(setViewMode('side-by-side'))}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap border ${
              viewMode === 'side-by-side'
                ? 'text-red-500 border-red-500 bg-red-50' 
                : 'text-gray-500 hover:text-black hover:bg-white/50 border-transparent'
            }`}
            title="Side by Side"
          >
            <Columns2 size={16} />
            <span>Side by Side</span>
          </button>
        </div>
      </div>

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

export default RefineImageCanvas;