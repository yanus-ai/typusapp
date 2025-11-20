import React from "react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loader from '@/assets/animations/loader.lottie';

interface ImageSkeletonProps {
  aspectRatio?: string;
}

export const ImageSkeleton: React.FC<ImageSkeletonProps> = ({ aspectRatio = '4/3' }) => {
  return (
    <div 
      className="w-full h-full bg-gray-200 overflow-hidden relative flex items-center justify-center"
      style={{ aspectRatio }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
      </div>
      <div className="relative z-10">
        <DotLottieReact
          src={loader}
          autoplay
          loop
          style={{
            width: 120,
            height: 120,
          }}
        />
      </div>
    </div>
  );
};

