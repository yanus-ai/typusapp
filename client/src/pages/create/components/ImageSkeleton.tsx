import React from "react";

interface ImageSkeletonProps {
  aspectRatio?: string;
}

export const ImageSkeleton: React.FC<ImageSkeletonProps> = ({ aspectRatio = '4/3' }) => {
  return (
    <div 
      className="w-full h-full bg-gray-200 overflow-hidden relative"
      style={{ aspectRatio }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
      </div>
    </div>
  );
};

