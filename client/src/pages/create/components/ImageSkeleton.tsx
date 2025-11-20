import React from "react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loader from '@/assets/animations/loader.lottie';

interface ImageSkeletonProps {
  aspectRatio?: string;
}

export const ImageSkeleton: React.FC<ImageSkeletonProps> = ({ aspectRatio = '4/3' }) => {
  return (
    <div 
      className="w-full h-full bg-gray-50 overflow-hidden relative flex items-center justify-center"
      style={{ aspectRatio }}
    >
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

