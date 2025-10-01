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
    <div className={`flex items-center justify-center p-6 ${className}`}>
      <div className="relative rounded-4xl overflow-hidden bg-gray-100 max-w-5xl w-full aspect-video" style={{ filter: 'drop-shadow(0 15px 15px rgb(0 0 0 / 0.15))' }}>
        {/* Loading skeleton/placeholder */}
        {!isVideoLoaded && (
          <div className="absolute inset-0 bg-site-white flex items-center justify-center">
            <div className="text-center">
              <img src={TypusLogoBlack} alt="Typus Logo" className="mx-auto h-12 w-auto mb-6" />
              <p className="text-sm text-gray-600 mt-4">Experience TYPUS.AI in action</p>
            </div>
          </div>
        )}

        {/* Error fallback with branded background */}
        {hasError && (
          <div className="absolute inset-0 bg-site-white flex items-center justify-center">
            <div className="text-center px-8">
              <img src={TypusLogoBlack} alt="Typus Logo" className="mx-auto h-12 w-auto mb-4" />
              <h1 className="text-xl font-light font-source-serif tracking-[2.5px] text-gray-800 mb-2">
                TYPUS.AI
              </h1>
              <h3 className="text-base font-medium text-gray-700 mb-3">AI-Powered Visualization</h3>
              <p className="text-xs text-gray-600 mb-4">Transform your ideas into stunning renderings</p>
              <div className="flex justify-center space-x-3 text-xs text-gray-500">
                <span>• AI-powered</span>
                <span>• Real-time</span>
                <span>• Professional</span>
              </div>
            </div>
          </div>
        )}

        {/* Video element */}
        <video
          className={`w-full h-full object-contain transition-opacity duration-500 ${
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
    </div>
  );
};

export default VideoSection;