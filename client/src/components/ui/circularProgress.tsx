import React from 'react';

interface CircularProgressProps {
  /** Size of the circular progress in pixels */
  size: number;
  /** Color of the progress fill */
  fillColor?: string;
  /** Color of the background circle */
  backgroundColor?: string;
  /** Total value for progress calculation */
  total: number;
  /** Current value for progress calculation */
  current: number;
  /** Additional CSS classes */
  className?: string;
  /** Width of the stroke */
  strokeWidth?: number;
  /** Whether to show the background circle */
  showBackground?: boolean;
  /** Animation duration in milliseconds */
  animationDuration?: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  size,
  fillColor = '#4ade80',
  backgroundColor = '#e5e7eb',
  total,
  current,
  className = '',
  strokeWidth = 4,
  showBackground = true,
  animationDuration = 300,
}) => {
  // Calculate progress percentage (0-100)
  const progressPercentage = Math.min(100, Math.max(0, (current / total) * 100));
  
  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (progressPercentage / 100) * circumference;
  const center = size / 2;

  // Base circle parameters
  const baseCircleProps = {
    cx: center,
    cy: center,
    r: radius,
    fill: 'none',
    strokeWidth,
  };

  return (
    <div className={`inline-block ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
        role="progressbar"
        aria-valuenow={Math.round(progressPercentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress: ${Math.round(progressPercentage)}%`}
      >
        {/* Background circle */}
        {showBackground && (
          <circle
            {...baseCircleProps}
            stroke={backgroundColor}
            className="opacity-100"
          />
        )}
        
        {/* Progress circle */}
        <circle
          {...baseCircleProps}
          stroke={fillColor}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
          style={{
            transition: `stroke-dashoffset ${animationDuration}ms ease-in-out`,
          }}
        />
      </svg>
    </div>
  );
};

export default CircularProgress;
