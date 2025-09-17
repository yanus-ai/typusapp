import React, { useRef, useEffect, useState } from 'react';
import { Images, ZoomIn, ZoomOut, Maximize2, Download, Grid3X3, Share2, Edit, Sparkles, Loader2 } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { downloadImageFromUrl } from '@/utils/helpers';
import { useAppSelector } from '@/hooks/useAppSelector';
import loader from '@/assets/animations/loader.lottie';

interface ImageCanvasProps {
  setIsPromptModalOpen: (isOpen: boolean) => void;
  imageUrl?: string;
  onClose?: () => void;
  loading?: boolean;
  error?: string | null;
  editInspectorMinimized?: boolean;
  onDownload?: () => void;
  onOpenGallery?: () => void;
  onShare?: (imageUrl: string) => void;
  onEdit?: (imageId?: number) => void;
  onUpscale?: (imageId?: number) => void;
  imageId?: number;
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({ imageUrl, setIsPromptModalOpen, editInspectorMinimized = false, onDownload, onOpenGallery, onShare, onEdit, onUpscale, imageId }) => {
  // Generation state from Redux
  const isGenerating = useAppSelector(state => state.createUI.isGenerating);
  const generatingInputImageId = useAppSelector(state => state.createUI.generatingInputImageId);
  const selectedImageId = useAppSelector(state => state.createUI.selectedImageId);
  const selectedImageType = useAppSelector(state => state.createUI.selectedImageType);

  // Determine if we should show generation overlay
  const shouldShowGenerationOverlay = isGenerating &&
    selectedImageType === 'input' &&
    selectedImageId === generatingInputImageId;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isHoveringOverImage, setIsHoveringOverImage] = useState(false); // New state for image hover
  const [initialImageLoaded, setInitialImageLoaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [animatedPanelOffset, setAnimatedPanelOffset] = useState(() => {
    // Initialize with correct offset based on initial panel state
    const panelWidth = editInspectorMinimized ? 0 : 396;
    return panelWidth / 2;
  });
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.onload = () => {
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
      setImage(null);
      setInitialImageLoaded(false);
    }
  }, [imageUrl]);

  useEffect(() => {
    drawCanvas();
  }, [zoom, pan, image, animatedPanelOffset, shouldShowGenerationOverlay]);

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
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (image) {
      // Use the animated panel offset for smooth transitions
      const centerX = canvas.width / 2 + pan.x + animatedPanelOffset;
      const centerY = canvas.height / 2 + pan.y;
      const scaledWidth = image.width * zoom;
      const scaledHeight = image.height * zoom;

      // Apply blur effect if generating
      if (shouldShowGenerationOverlay) {
        ctx.filter = 'blur(3px)';
      } else {
        ctx.filter = 'none';
      }

      ctx.drawImage(
        image,
        centerX - scaledWidth / 2,
        centerY - scaledHeight / 2,
        scaledWidth,
        scaledHeight
      );

      // Reset filter for other drawings
      ctx.filter = 'none';
    }
  };

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

    // Check if mouse is over the image area
    if (image) {
      const canvas = canvasRef.current;
      if (canvas) {
        const centerX = canvas.width / 2 + pan.x + animatedPanelOffset;
        const centerY = canvas.height / 2 + pan.y;
        const scaledWidth = image.width * zoom;
        const scaledHeight = image.height * zoom;
        
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
    if (!image) return;
    
    const minZoom = getMinimumZoom(image);
    setZoom(prev => Math.max(minZoom, prev / 1.2));
  };

  const resetView = () => {
    if (image) {
      centerAndFitImage(image);
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Calculate panel width and adjust available space based on current panel state
    const panelWidth = editInspectorMinimized ? 0 : 396; // Total width of both panels
    const padding = 150; // 50px padding from edges
    const availableWidth = (canvas.width - panelWidth) - padding * 2; // Subtract panel width from available space
    const availableHeight = canvas.height - padding * 2;
    
    const scaleX = availableWidth / img.width;
    const scaleY = availableHeight / img.height;
    const fitScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond original size
    
    // Ensure the scale doesn't go below minimum zoom
    const minZoom = getMinimumZoom(img);
    const scale = Math.max(fitScale, minZoom);
    
    setZoom(scale);
    setPan({ x: 0, y: 0 }); // Center the image (drawCanvas will handle the panel offset)
  };

  const handleDownload = async () => {
    if (imageUrl && onDownload) {
      await downloadImageFromUrl(
        imageUrl, 
        `typus-ai-create-image-${Date.now()}.jpg`,
        setIsDownloading
      );
      onDownload();
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-site-white">
      <div 
        className="relative w-full h-full"
        onMouseEnter={() => {/* Mouse enter handler - image hover is handled in mousemove */}}
        onMouseLeave={() => {
          setIsHoveringOverImage(false);
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
            if (imageUrl && !hasDragged && !shouldShowGenerationOverlay) {
              setIsPromptModalOpen(true);
            }
          }}
        />
        
        {/* Lottie GPS Signal Animation that appears when hovering over image */}
        {imageUrl && isHoveringOverImage && !isDragging && image && canvasRef.current && (
          <div 
            className="absolute pointer-events-none z-10"
            style={{
              left: canvasRef.current.width / 2 + pan.x + animatedPanelOffset,
              top: canvasRef.current.height / 2 + pan.y,
              transform: 'translate(-50%, -50%)', // Center the animation perfectly
            }}
          >
            <DotLottieReact 
              src="/gps-signal.json"
              loop={true}
              autoplay={true}
              style={{ 
                width: 500, 
                height: 500,
                opacity: 0.8
              }}
            />
          </div>
        )}

        {/* Action buttons overlay when hovering over image */}
        {imageUrl && isHoveringOverImage && !isDragging && image && canvasRef.current && (
          <div 
            className="absolute z-20 pointer-events-none"
            style={{
              left: canvasRef.current.width / 2 + pan.x + animatedPanelOffset,
              top: canvasRef.current.height / 2 + pan.y,
              transform: 'translate(-50%, -50%)',
              width: image.width * zoom,
              height: image.height * zoom,
            }}
          >
            {/* Top-left: Share button */}
            <div className="absolute top-3 left-3 pointer-events-auto">
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
            <div className="absolute top-3 right-3 pointer-events-auto">
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

            {/* Bottom-left: Edit button */}
            <div className="absolute bottom-3 left-3 pointer-events-auto">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(imageId);
                  }}
                  className="bg-black/20 hover:bg-black/40 text-white px-3 py-2 rounded-lg text-sm font-bold tracking-wider transition-all duration-200 cursor-pointer"
                  title="Edit Image"
                >
                  EDIT
                </button>
              )}
            </div>

            {/* Bottom-right: Upscale button */}
            <div className="absolute bottom-3 right-3 pointer-events-auto">
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

        {/* Generation spinner overlay */}
        {shouldShowGenerationOverlay && image && canvasRef.current && (
          <div
            className="absolute pointer-events-none z-30"
            style={{
              left: canvasRef.current.width / 2 + pan.x + animatedPanelOffset,
              top: canvasRef.current.height / 2 + pan.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <DotLottieReact
              src={loader}
              autoplay
              loop
              style={{
                width: 300,
                height: 300,
                filter: 'drop-shadow(0 0 10px rgba(0, 0, 0, 0.5))'
              }}
            />
          </div>
        )}
      </div>

      {!imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Images size={128} className="text-white opacity-80" />
        </div>
      )}

      <div className="absolute bottom-1 right-4 flex gap-2">
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