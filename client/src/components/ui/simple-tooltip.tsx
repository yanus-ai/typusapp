import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SimpleTooltipProps {
  children: React.ReactNode;
  text: string;
  direction?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const SimpleTooltip: React.FC<SimpleTooltipProps> = ({ 
  children, 
  text,
  direction = 'bottom',
  className = ""
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let x = 0;
      let y = 0;

      switch (direction) {
        case 'top':
          x = rect.left + rect.width / 2;
          y = rect.top - 8;
          break;
        case 'bottom':
          x = rect.left + rect.width / 2;
          y = rect.bottom + 8;
          break;
        case 'left':
          x = rect.left - 8;
          y = rect.top + rect.height / 2;
          break;
        case 'right':
          x = rect.right + 8;
          y = rect.top + rect.height / 2;
          break;
        default:
          x = rect.left + rect.width / 2;
          y = rect.bottom + 8;
      }

      setPosition({ x, y });
      setIsAnimating(true);
    }
  }, [isVisible, direction]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getTooltipStyle = () => {
    let transform = '';
    
    switch (direction) {
      case 'top':
        transform = 'translateX(-50%) translateY(-100%)';
        break;
      case 'bottom':
        transform = 'translateX(-50%)';
        break;
      case 'left':
        transform = 'translateX(-100%) translateY(-50%)';
        break;
      case 'right':
        transform = 'translateY(-50%)';
        break;
      default:
        transform = 'translateX(-50%)';
    }

    return {
      position: 'fixed' as const,
      left: position.x,
      top: position.y,
      transform,
      zIndex: 9999,
    };
  };

  const renderTooltip = () => {
    if (!isVisible) return null;

    return createPortal(
      <div style={getTooltipStyle()}>
        <div className={`bg-white text-gray-800 text-xs px-3 py-2 rounded-lg shadow-lg border border-gray-200 whitespace-nowrap transition-all duration-200 ease-out ${
          isAnimating 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 translate-y-1'
        }`}>
          {text}
        </div>
      </div>,
      document.body
    );
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsAnimating(false);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 150); // Slight delay to allow animation to complete
  };

  return (
    <div 
      ref={triggerRef}
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ overflow: 'visible' }}
    >
      {children}
      {renderTooltip()}
    </div>
  );
};

export default SimpleTooltip;
