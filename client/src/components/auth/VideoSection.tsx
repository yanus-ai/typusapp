import { useState } from "react";
import TypusLogoBlack from "@/assets/images/typus_logo_black.png";

interface VideoSectionProps {
  className?: string;
}

const VideoSection = ({ className = "" }: VideoSectionProps) => {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleVideoLoad = () => {
    setIsVideoLoaded(true);
  };

  const handleVideoError = () => {
    setHasError(true);
    setIsVideoLoaded(true);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Loading skeleton/placeholder */}
      {!isVideoLoaded && (
        <div className="absolute inset-0 bg-site-white flex items-center justify-center">
          <div className="text-center">
            <img src={TypusLogoBlack} alt="Typus Logo" className="mx-auto h-12 w-auto mb-6" />
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-gray-600 mt-2">Experience TYPUS.AI in action</p>
          </div>
        </div>
      )}

      {/* Error fallback with branded background */}
      {hasError && (
        <div className="absolute inset-0 bg-site-white flex items-center justify-center">
          <div className="text-center px-8">
            <img src={TypusLogoBlack} alt="Typus Logo" className="mx-auto h-16 w-auto mb-6" />
            <h1 className="text-2xl font-light font-source-serif tracking-[2.5px] text-gray-800 mb-2">
              TYPUS.AI
            </h1>
            <h3 className="text-lg font-medium text-gray-700 mb-4">AI-Powered Architectural Visualization</h3>
            <p className="text-sm text-gray-600 mb-6">Transform your ideas into stunning architectural renderings</p>
            <div className="flex justify-center space-x-6 text-xs text-gray-500">
              <span>• Real-time rendering</span>
              <span>• Advanced AI algorithms</span>
              <span>• Professional results</span>
            </div>
          </div>
        </div>
      )}

      {/* Video element */}
      <video
        className={`w-full h-full object-cover transition-opacity duration-500 ${
          isVideoLoaded && !hasError ? 'opacity-100' : 'opacity-0'
        }`}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedData={handleVideoLoad}
        onError={handleVideoError}
      >
        <source src="https://prai-vision.s3.eu-central-1.amazonaws.com/INTRO_typus_newlogo.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoSection;