import React, { useCallback, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Download, ZoomIn, ZoomOut, RotateCcw, Maximize, Minimize } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { HistoryImage } from "./GenerationGrid";
import { downloadImage } from "@/utils/downloadUtils";
import toast from "react-hot-toast";
import LightTooltip from "@/components/ui/light-tooltip";
import { useTranslation } from "@/hooks/useTranslation";

interface ImageLightboxProps {
  isOpen: boolean;
  image: HistoryImage | null;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  isOpen,
  image,
  onClose,
}) => {
  const { t } = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const imageUrl = image 
    ? (image.imageUrl || image.thumbnailUrl)
    : undefined;

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Download handler
  const handleDownload = useCallback(async () => {
    if (!imageUrl) return;
    
    try {
      await downloadImage(imageUrl, `image-${image?.id || Date.now()}`);
      toast.success(t('create.lightbox.imageDownloadedSuccess'));
    } catch (error) {
      console.error('Download error:', error);
      toast.error(t('create.lightbox.downloadFailed'));
    }
  }, [imageUrl, image?.id]);

  // Fullscreen handler
  const handleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
      toast.error(t('create.lightbox.fullscreenFailed'));
    }
  }, []);

  // Reset fullscreen on close
  useEffect(() => {
    if (!isOpen && document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, [isOpen]);

  if (!isOpen || !image || !imageUrl) {
    return null;
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-opacity duration-200 cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
        role="button"
      />
      
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-label={t('create.lightbox.imagePreview')}
        onClick={onClose}
      >
        <div
          ref={containerRef}
          className="relative w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col items-center justify-center pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Action Bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-end z-20">
            <div className="flex items-center gap-2">
              <LightTooltip text={isFullscreen ? t('create.lightbox.exitFullscreen') : t('create.lightbox.enterFullscreen')} direction="bottom">
                <button
                  onClick={handleFullscreen}
                  className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-none shadow-lg transition-all hover:scale-110 cursor-pointer"
                  aria-label={isFullscreen ? t('create.lightbox.exitFullscreenAria') : t('create.lightbox.enterFullscreenAria')}
                >
                  {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
              </LightTooltip>
              <LightTooltip text={t('create.lightbox.download')} direction="bottom">
                <button
                  onClick={handleDownload}
                  className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-none shadow-lg transition-all hover:scale-110 cursor-pointer"
                  aria-label={t('create.lightbox.downloadImageAria')}
                >
                  <Download size={18} />
                </button>
              </LightTooltip>
              <button
                onClick={onClose}
                className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-none shadow-lg transition-all hover:scale-110 cursor-pointer"
                aria-label={t('create.lightbox.closeDialog')}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Image Container with Zoom/Pan */}
          <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
            <TransformWrapper
              initialScale={1}
              minScale={0.1}
              maxScale={10}
              wheel={{ step: 0.1 }}
              doubleClick={{ disabled: false, step: 1.5 }}
              panning={{ disabled: false }}
              centerOnInit={true}
              limitToBounds={false}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  {/* Zoom Controls */}
                  <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                    <LightTooltip text={t('create.lightbox.zoomIn')} direction="bottom">
                      <button
                        onClick={() => zoomIn()}
                        className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-none shadow-lg transition-all hover:scale-110 cursor-pointer"
                        aria-label={t('create.lightbox.zoomInAria')}
                      >
                        <ZoomIn size={18} />
                      </button>
                    </LightTooltip>
                    <LightTooltip text={t('create.lightbox.zoomOut')} direction="bottom">
                      <button
                        onClick={() => zoomOut()}
                        className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-none shadow-lg transition-all hover:scale-110 cursor-pointer"
                        aria-label={t('create.lightbox.zoomOutAria')}
                      >
                        <ZoomOut size={18} />
                      </button>
                    </LightTooltip>
                    <LightTooltip text={t('create.lightbox.resetView')} direction="bottom">
                      <button
                        onClick={() => resetTransform()}
                        className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-none shadow-lg transition-all hover:scale-110 cursor-pointer"
                        aria-label={t('create.lightbox.resetViewAria')}
                      >
                        <RotateCcw size={18} />
                      </button>
                    </LightTooltip>
                  </div>

                  <TransformComponent
                    wrapperClass="w-full h-full flex items-center justify-center"
                    contentClass="flex items-center justify-center"
                  >
                    <img
                      src={imageUrl}
                      alt={`Variation ${image.variationNumber || ''}`}
                      className="max-w-full max-h-full object-contain rounded-none shadow-2xl"
                      draggable={false}
                    />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

