import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface LightTooltipProps {
  children: React.ReactNode;
  text: string;
  direction?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const LightTooltip: React.FC<LightTooltipProps> = ({ 
  children, 
  text,
  direction = 'top',
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
          y = rect.top - 8;
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
        transform = 'translateX(-50%) translateY(-100%)';
    }

    return {
      position: 'fixed' as const,
      left: position.x,
      top: position.y,
      transform,
      zIndex: 9999,
    };
  };

  const renderTriangle = () => {
    const triangleSize = 8;
    const triangleStyle: React.CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
      zIndex: 1,
    };

    switch (direction) {
      case 'top':
        return (
          <>
            {/* Border triangle */}
            <div
              style={{
                ...triangleStyle,
                bottom: -triangleSize - 1,
                left: '50%',
                transform: 'translateX(-50%)',
                borderLeft: `${triangleSize + 1}px solid transparent`,
                borderRight: `${triangleSize + 1}px solid transparent`,
                borderTop: `${triangleSize + 1}px solid #d1d5db`,
              }}
            />
            {/* Main triangle */}
            <div
              style={{
                ...triangleStyle,
                bottom: -triangleSize,
                left: '50%',
                transform: 'translateX(-50%)',
                borderLeft: `${triangleSize}px solid transparent`,
                borderRight: `${triangleSize}px solid transparent`,
                borderTop: `${triangleSize}px solid #f3f4f6`,
              }}
            />
          </>
        );
      case 'bottom':
        return (
          <>
            {/* Border triangle */}
            <div
              style={{
                ...triangleStyle,
                top: -triangleSize - 1,
                left: '50%',
                transform: 'translateX(-50%)',
                borderLeft: `${triangleSize + 1}px solid transparent`,
                borderRight: `${triangleSize + 1}px solid transparent`,
                borderBottom: `${triangleSize + 1}px solid #d1d5db`,
              }}
            />
            {/* Main triangle */}
            <div
              style={{
                ...triangleStyle,
                top: -triangleSize,
                left: '50%',
                transform: 'translateX(-50%)',
                borderLeft: `${triangleSize}px solid transparent`,
                borderRight: `${triangleSize}px solid transparent`,
                borderBottom: `${triangleSize}px solid #f3f4f6`,
              }}
            />
          </>
        );
      case 'left':
        return (
          <>
            {/* Border triangle */}
            <div
              style={{
                ...triangleStyle,
                right: -triangleSize - 1,
                top: '50%',
                transform: 'translateY(-50%)',
                borderTop: `${triangleSize + 1}px solid transparent`,
                borderBottom: `${triangleSize + 1}px solid transparent`,
                borderLeft: `${triangleSize + 1}px solid #d1d5db`,
              }}
            />
            {/* Main triangle */}
            <div
              style={{
                ...triangleStyle,
                right: -triangleSize,
                top: '50%',
                transform: 'translateY(-50%)',
                borderTop: `${triangleSize}px solid transparent`,
                borderBottom: `${triangleSize}px solid transparent`,
                borderLeft: `${triangleSize}px solid #f3f4f6`,
              }}
            />
          </>
        );
      case 'right':
        return (
          <>
            {/* Border triangle */}
            <div
              style={{
                ...triangleStyle,
                left: -triangleSize - 1,
                top: '50%',
                transform: 'translateY(-50%)',
                borderTop: `${triangleSize + 1}px solid transparent`,
                borderBottom: `${triangleSize + 1}px solid transparent`,
                borderRight: `${triangleSize + 1}px solid #d1d5db`,
              }}
            />
            {/* Main triangle */}
            <div
              style={{
                ...triangleStyle,
                left: -triangleSize,
                top: '50%',
                transform: 'translateY(-50%)',
                borderTop: `${triangleSize}px solid transparent`,
                borderBottom: `${triangleSize}px solid transparent`,
                borderRight: `${triangleSize}px solid #f3f4f6`,
              }}
            />
          </>
        );
      default:
        return (
          <>
            {/* Border triangle */}
            <div
              style={{
                ...triangleStyle,
                bottom: -triangleSize - 1,
                left: '50%',
                transform: 'translateX(-50%)',
                borderLeft: `${triangleSize + 1}px solid transparent`,
                borderRight: `${triangleSize + 1}px solid transparent`,
                borderTop: `${triangleSize + 1}px solid #d1d5db`,
              }}
            />
            {/* Main triangle */}
            <div
              style={{
                ...triangleStyle,
                bottom: -triangleSize,
                left: '50%',
                transform: 'translateX(-50%)',
                borderLeft: `${triangleSize}px solid transparent`,
                borderRight: `${triangleSize}px solid transparent`,
                borderTop: `${triangleSize}px solid #f3f4f6`,
              }}
            />
          </>
        );
    }
  };

  const renderTooltip = () => {
    if (!isVisible) return null;

    return createPortal(
      <div style={getTooltipStyle()}>
        <div 
          className={`relative transition-all duration-200 ease-out ${
            isAnimating 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-95 translate-y-1'
          }`}
        >
          <div className="bg-gray-100 text-gray-800 text-xs px-3 py-2 rounded-lg shadow-lg border border-gray-200 whitespace-nowrap relative z-10">
            {text}
          </div>
          {renderTriangle()}
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

export default LightTooltip;
