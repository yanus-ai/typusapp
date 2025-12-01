import { useState } from "react";
import TypusLogoBlack from "@/assets/images/typus_logo_black_transparent.png";
import GoogleLogo from "@/assets/images/google.png";
import LogoMwike from "@/assets/images/logo_mwike.png";
import EuKofinanziert from "@/assets/images/eu_kofinanziert.png";
import EuKofinanziertEn from "@/assets/images/eu-kofinanziert-von-der-europaeischen-union-en.png.png";
import { useClientLanguage } from "@/hooks/useClientLanguage";

interface VideoSectionProps {
  className?: string;
}

const VideoSection = ({ className = "" }: VideoSectionProps) => {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const language = useClientLanguage();

  const handleVideoLoad = () => {
    setIsVideoLoaded(true);
  };

  const handleVideoError = () => {
    setHasError(true);
    setIsVideoLoaded(true);
  };

  return (
    <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
      <div className="relative rounded-none overflow-hidden bg-gray-100 max-w-5xl w-full aspect-video" style={{ filter: 'drop-shadow(0 15px 15px rgb(0 0 0 / 0.15))' }}>
        {/* Loading skeleton/placeholder */}
        {!isVideoLoaded && (
          <div className="absolute inset-0 bg-site-white flex items-center justify-center">
            <div className="text-center">
              <img src={TypusLogoBlack} alt="Typus Logo" className="mx-auto h-24 w-auto mb-2" />
              <p className="text-sm text-gray-600 mt-4">Experience TYPUS.AI in action</p>
            </div>
          </div>
        )}

        {/* Error fallback with branded background */}
        {hasError && (
          <div className="absolute inset-0 bg-site-white flex items-center justify-center">
            <div className="text-center px-8">
              <img src={TypusLogoBlack} alt="Typus Logo" className="mx-auto h-24 w-auto mb-2" />
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

      {/* Google Reviews Section */}
      <div className="mt-8 max-w-5xl w-full">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-none bg-white shadow-md flex items-center justify-center">
            <img src={GoogleLogo} alt="Google Logo" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">GOOGLE REVIEWS</h3>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center">
            {[...Array(4)].map((_, i) => (
              <svg key={i} className={`w-5 h-5 ${i < 4 ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            ))}
            {/* Half star for 4.5 rating */}
            <div className="relative">
              <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              <svg className="w-5 h-5 text-yellow-400 absolute top-0 left-0 overflow-hidden" style={{clipPath: 'inset(0 50% 0 0)'}} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </div>
          </div>
            <span className="text-lg font-semibold text-gray-800">4.5/5</span>
            <span className="text-sm text-gray-600 ml-2">(based on 90+ reviews)</span>
        </div>

        <blockquote className="text-gray-700 italic mb-4">
          "FANTASTIC! GREAT EXPERIENCE AND IMPRESSIVE QUALITY! EASY TO WORK AND FAST OUTPUT!"
        </blockquote>

        <div className="flex flex-wrap gap-8 items-center justify-center mt-8">
          <img src={LogoMwike} alt="" className="max-h-[200px] max-w-[280px]" />
          <img src={language === 'de' ? EuKofinanziert : EuKofinanziertEn} alt="" className="max-h-[200px] max-w-[250px]" />
        </div>

        {/* <div className="text-sm text-gray-500">
          ROLAND WOBORSKY, SELF-EMPLOYED
        </div> */}
      </div>
    </div>
  );
};

export default VideoSection;