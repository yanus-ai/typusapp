import React, { useState, useRef } from 'react';

type TooltipDirection = 'top' | 'bottom' | 'left' | 'right';

interface VideoTooltipProps {
  children: React.ReactNode;
  videoSrc: string;
  title?: string;
  description?: string;
  className?: string;
  direction?: TooltipDirection;
}

const VideoTooltip: React.FC<VideoTooltipProps> = ({ 
  children, 
  videoSrc, 
  title, 
  description,
  className = "",
  direction = 'bottom'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.load();
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleVideoLoaded = () => {
    setIsVideoLoaded(true);
  };

  const getPositionClasses = () => {
    switch (direction) {
      case 'top':
        return {
          container: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
          arrow: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-white border-l-[6px] border-r-[6px] border-t-[6px]'
        };
      case 'bottom':
        return {
          container: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
          arrow: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-white border-l-[6px] border-r-[6px] border-b-[6px]'
        };
      case 'left':
        return {
          container: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
          arrow: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-white border-t-[6px] border-b-[6px] border-l-[6px]'
        };
      case 'right':
        return {
          container: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
          arrow: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-white border-t-[6px] border-b-[6px] border-r-[6px]'
        };
      default:
        return {
          container: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
          arrow: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-white border-l-[6px] border-r-[6px] border-b-[6px]'
        };
    }
  };

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {isVisible && (() => {
        const { container, arrow } = getPositionClasses();
        return (
          <div className={`absolute ${container} z-50`}>
            <div className="bg-white rounded-lg shadow-xl p-3 border border-gray-200 w-full min-w-[200px]">
              {title && (
                <h3 className="font-semibold text-sm text-gray-900 mb-2">{title}</h3>
              )}
              
              <div className="relative rounded-md overflow-hidden bg-gray-100">
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="w-full h-auto max-h-[397px] object-contain"
                  muted
                  loop
                  autoPlay
                  playsInline
                  preload="metadata"
                  onLoadedData={handleVideoLoaded}
                  onError={() => setIsVideoLoaded(false)}
                />
                
                {!isVideoLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 border-t-transparent"></div>
                  </div>
                )}
              </div>
              
              {description && (
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{description}</p>
              )}
              
              {/* Arrow */}
              <div className={`absolute ${arrow}`}>
                <div className="w-0 h-0"></div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default VideoTooltip;