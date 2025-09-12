import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Download, Eye, ScanLine, Columns2, Images, Wand2, ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setViewMode } from '@/features/refine/refineSlice';
import { downloadImageFromUrl } from '@/utils/helpers';

interface RefineCanvasProps {
  selectedImageId: number | null;
  selectedImageUrl: string | null;
  operations: any[];
  viewMode: 'generated' | 'before-after' | 'side-by-side';
  isGenerating: boolean;
  error: string | null;
  setIsPromptModalOpen?: (isOpen: boolean) => void;
  onDownload?: () => void;
  onOpenGallery?: () => void;
}

const RefineCanvas: React.FC<RefineCanvasProps> = ({
  selectedImageId,
  selectedImageUrl,
  operations,
  viewMode,
  isGenerating,
  error,
  setIsPromptModalOpen,
  onDownload,
  onOpenGallery
}) => {
  const dispatch = useAppDispatch();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beforeAfterCanvasRef = useRef<HTMLCanvasElement>(null);
  const sideCanvasLeftRef = useRef<HTMLCanvasElement>(null);
  const sideCanvasRightRef = useRef<HTMLCanvasElement>(null);
  
  // Enhanced state management
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [beforeAfterPosition, setBeforeAfterPosition] = useState(50);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [refinedImage, setRefinedImage] = useState<HTMLImageElement | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  // Removed initialImageLoaded as it's no longer needed - always center when new image loads

  // Get the latest completed operation
  const latestRefinedImage = [...operations]
    .filter(op => op.status === 'COMPLETED' && op.processedImageUrl)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];

  // Image loading effects
  useEffect(() => {
    if (selectedImageUrl) {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        // Always center and fit the image when a new image is loaded
        centerAndFitImage(img);
      };
      img.onerror = (error) => {
        console.error('🖼️ RefineCanvas: Failed to load original image:', error);
      };
      img.src = selectedImageUrl;
    } else {
      setOriginalImage(null);
    }
  }, [selectedImageUrl]);

  useEffect(() => {
    if (latestRefinedImage?.processedImageUrl) {
      const img = new Image();
      img.onload = () => {
        setRefinedImage(img);
      };
      img.onerror = (error) => {
        console.error('🖼️ RefineCanvas: Failed to load refined image:', error);
      };
      img.src = latestRefinedImage.processedImageUrl;
    } else {
      setRefinedImage(null);
    }
  }, [latestRefinedImage?.processedImageUrl]);

  // Canvas drawing function
  const drawCanvas = useCallback((canvas: HTMLCanvasElement, imageToRender: HTMLImageElement | null) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !imageToRender) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2 + pan.x;
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
  }, [zoom, pan]);

  // Draw before/after comparison
  const drawBeforeAfterCanvas = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !originalImage) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2 + pan.x;
    const centerY = canvas.height / 2 + pan.y;
    const scaledWidth = originalImage.width * zoom;
    const scaledHeight = originalImage.height * zoom;

    const imageX = centerX - scaledWidth / 2;
    const imageY = centerY - scaledHeight / 2;

    // Draw original image
    ctx.drawImage(originalImage, imageX, imageY, scaledWidth, scaledHeight);

    // Draw refined image with clipping if available
    if (refinedImage) {
      ctx.save();
      const clipWidth = (beforeAfterPosition / 100) * canvas.width;
      ctx.rect(0, 0, clipWidth, canvas.height);
      ctx.clip();
      ctx.drawImage(refinedImage, imageX, imageY, scaledWidth, scaledHeight);
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
  }, [zoom, pan, originalImage, refinedImage, beforeAfterPosition]);

  // Enhanced mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setHasDragged(false);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Update mouse position for hover effects
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });

    if (isDragging) {
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
    }

    // Update before/after divider position for before-after mode
    if (viewMode === 'before-after') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      setBeforeAfterPosition(Math.max(0, Math.min(100, percentage)));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    const normalizedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 100);
    const zoomIntensity = 0.002;
    const zoomFactor = 1 - normalizedDelta * zoomIntensity;
    
    setZoom(prev => Math.max(0.1, Math.min(10, prev * zoomFactor)));
  };

  const zoomIn = () => {
    setZoom(prev => Math.min(10, prev * 1.2));
  };

  const zoomOut = () => {
    setZoom(prev => Math.max(0.1, prev / 1.2));
  };

  const resetView = () => {
    if (originalImage) {
      centerAndFitImage(originalImage);
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
    setBeforeAfterPosition(50);
  };

  const centerAndFitImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const padding = 50;
    const availableWidth = canvas.width - padding * 2;
    const availableHeight = canvas.height - padding * 2;
    
    const scaleX = availableWidth / img.width;
    const scaleY = availableHeight / img.height;
    const scale = Math.min(scaleX, scaleY, 1);
    
    setZoom(scale);
    setPan({ x: 0, y: 0 });
  };

  const downloadImage = async () => {
    const imageUrl = latestRefinedImage?.processedImageUrl || selectedImageUrl;
    if (imageUrl) {
      await downloadImageFromUrl(
        imageUrl, 
        `typus-airefined-image-${selectedImageId || Date.now()}.jpg`,
        setIsDownloading
      );
    }
  };


  // Canvas resize and drawing effects
  useEffect(() => {
    const resizeCanvas = () => {
      const canvases = [canvasRef, beforeAfterCanvasRef, sideCanvasLeftRef, sideCanvasRightRef];
      canvases.forEach(ref => {
        const canvas = ref.current;
        if (canvas) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          
          // Redraw canvas after resize
          if (viewMode === 'before-after' && ref === beforeAfterCanvasRef) {
            drawBeforeAfterCanvas(canvas);
          } else if (viewMode === 'side-by-side') {
            if (ref === sideCanvasLeftRef) {
              drawCanvas(canvas, originalImage);
            } else if (ref === sideCanvasRightRef) {
              drawCanvas(canvas, refinedImage);
            }
          } else if (ref === canvasRef) {
            const imageToShow = refinedImage || originalImage;
            drawCanvas(canvas, imageToShow);
          }
        }
      });
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [drawCanvas, drawBeforeAfterCanvas, originalImage, refinedImage, viewMode]);

  // Draw effects for each view mode
  useEffect(() => {
    if (viewMode === 'generated') {
      const canvas = canvasRef.current;
      const imageToShow = refinedImage || originalImage;
      if (canvas && imageToShow) {
        drawCanvas(canvas, imageToShow);
      }
    } else if (viewMode === 'before-after') {
      const canvas = beforeAfterCanvasRef.current;
      if (canvas && originalImage) {
        drawBeforeAfterCanvas(canvas);
      }
    } else if (viewMode === 'side-by-side') {
      const leftCanvas = sideCanvasLeftRef.current;
      const rightCanvas = sideCanvasRightRef.current;
      
      if (leftCanvas && originalImage) {
        drawCanvas(leftCanvas, originalImage);
      }
      
      if (rightCanvas && refinedImage) {
        drawCanvas(rightCanvas, refinedImage);
      } else if (rightCanvas) {
        const ctx = rightCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, rightCanvas.width, rightCanvas.height);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, rightCanvas.width, rightCanvas.height);
        }
      }
    }
  }, [zoom, pan, viewMode, originalImage, refinedImage, beforeAfterPosition, drawCanvas, drawBeforeAfterCanvas]);

  return (
    <div className="fixed inset-0 w-screen h-screen bg-white">
      {/* Generated View Canvas */}
      {viewMode === 'generated' && (
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
              transition: 'none'
            }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
          
          {/* Pulsating click indicator */}
          {selectedImageUrl && isHovering && !isDragging && (
            <div 
              className="absolute pointer-events-none z-10"
              style={{
                left: mousePos.x - 32,
                top: mousePos.y - 32,
              }}
            >
              <div className="relative">
                <div className="absolute inset-0 w-16 h-16 bg-gray-500/20 rounded-full animate-ping"></div>
                <div className="absolute inset-0 w-16 h-16 bg-gray-500/30 rounded-full animate-pulse"></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Before/After View Canvas */}
      {viewMode === 'before-after' && (
        <div 
          className="relative w-full h-full"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => {
            setIsHovering(false);
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
          
          {/* Help text */}
          {originalImage && refinedImage && (
            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-3 py-2 rounded text-sm">
              Move mouse to compare before/after
            </div>
          )}
        </div>
      )}

      {/* Side by Side View Canvases */}
      {viewMode === 'side-by-side' && (
        <div 
          className="relative w-full h-full flex"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => {
            setIsHovering(false);
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
            />
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
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedImageUrl && !isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-500">
            <Images size={128} className="text-gray-400 opacity-80 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Image Selected</h3>
            <p className="text-sm">Select an image from the left panel to start refining</p>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isGenerating && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-30">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="text-gray-900">Refining image...</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={downloadImage}
          disabled={!selectedImageUrl && !latestRefinedImage?.processedImageUrl}
          className="cursor-pointer p-2 bg-white/10 hover:bg-white/20 text-black rounded-md text-xs backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
          title="Download Image"
        >
          {isDownloading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
        </button>
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

      {/* Context Toolbar - Above View Mode Toolbar */}
      {selectedImageUrl && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPromptModalOpen?.(true)}
              className="px-3 py-2 text-xs bg-white/80 hover:bg-white"
              title="AI Refine"
            >
              <Wand2 className="w-4 h-4 mr-1" />
              AI Refine
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenGallery?.()}
              className="px-3 py-2 text-xs bg-white/80 hover:bg-white"
              title="Open Gallery"
            >
              <ImageIcon className="w-4 h-4 mr-1" />
              Gallery
            </Button>
          </div>
        </div>
      )}

      {/* Floating View Mode Toolbar - Similar to TweakToolbar */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex gap-2 bg-[#F0F0F0] backdrop-blur-sm rounded-lg px-2 py-2 shadow-lg">
          <button
            onClick={() => dispatch(setViewMode('generated'))}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              viewMode === 'generated'
                ? 'bg-white text-black shadow-lg' 
                : 'text-gray-500 hover:text-black hover:bg-white/50'
            }`}
            title="Generated"
          >
            <Eye size={16} />
            <span>Generated</span>
          </button>
          <button
            onClick={() => dispatch(setViewMode('before-after'))}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              viewMode === 'before-after'
                ? 'bg-white text-black shadow-lg' 
                : 'text-gray-500 hover:text-black hover:bg-white/50'
            }`}
            title="Before/After"
          >
            <ScanLine size={16} />
            <span>Before/After</span>
          </button>
          <button
            onClick={() => dispatch(setViewMode('side-by-side'))}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              viewMode === 'side-by-side'
                ? 'bg-white text-black shadow-lg' 
                : 'text-gray-500 hover:text-black hover:bg-white/50'
            }`}
            title="Side by Side"
          >
            <Columns2 size={16} />
            <span>Side by Side</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-20">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefineCanvas;
