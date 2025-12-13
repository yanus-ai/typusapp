import { setIsModalOpen } from "@/features/gallery/gallerySlice";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getOnboardingTranslations } from "./translations";
import { useClientLanguage } from "@/hooks/useClientLanguage";
import { useOnboardingKeys } from "./hooks/useOnboardingKeys";
import colormap1 from "@/assets/colormaps/colormap1.png";
import colormap2 from "@/assets/colormaps/colormap2.png";
import colormap3 from "@/assets/colormaps/colormap3.png";
import colormap4 from "@/assets/colormaps/colormap4.png";
import colormap5 from "@/assets/colormaps/colormap5.png";

const colorMaps = [
  { id: 1, src: colormap1, alt: "Color Map Example 1" },
  { id: 2, src: colormap2, alt: "Color Map Example 2" },
  { id: 3, src: colormap3, alt: "Color Map Example 3" },
  { id: 4, src: colormap4, alt: "Color Map Example 4" },
  { id: 5, src: colormap5, alt: "Color Map Example 5" },
];

const EXAMPLE_TEXTURE_URL = "https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/thumbnails/162434e1-e809-426a-989a-dceaa70629ea.png";

type Step = {
  id: number;
  text: string;
  position: "top-center" | "top-right" | "top-right-gap" | "center-right" | "center" | "bottom-center" | "center-top" | "texture-info";
};

export default function OnboardingPopup({ currentStep, setCurrentStep, forceShow = false }: { currentStep: number, setCurrentStep: (step: number) => void, forceShow?: boolean }) {
  const language = useClientLanguage();
  const t = getOnboardingTranslations(language);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const popupRef = useRef<HTMLDivElement>(null);
  const { onboardingSeenKey, welcomeSeenKey, showWelcomeKey } = useOnboardingKeys();

  const steps: Step[] = useMemo(() => t.popupSteps.map((text, index) => ({
    id: index + 1,
    text,
    position: [
      "top-center", // Step 1
      "top-right", // Step 2
      "top-right-gap", // Step 3
      "center-right", // Step 4
      "center-top", // Step 5
      "bottom-center", // Step 6
      "texture-info", // Step 7
      "top-center", // Step 8
      "center-top", // Step 9
    ][index] as Step["position"],
  })), [t]);

  useEffect(() => {
    if (forceShow) {
      setShowPopup(true);
      return;
    }

    const checkOnboardingConditions = () => {
      const onboardingSeen = localStorage.getItem(onboardingSeenKey);
      const welcomeSeen = localStorage.getItem(welcomeSeenKey);
      const showWelcome = localStorage.getItem(showWelcomeKey);

      // Show onboarding ONLY if:
      // 1. User hasn't seen onboarding yet AND
      // 2. Welcome dialog was already seen (welcomeSeen = true) AND
      // 3. Welcome dialog is not currently showing (showWelcome = false)
      if (!onboardingSeen && welcomeSeen === 'true' && showWelcome === 'false') {
        setShowPopup(true);
      }
    };

    // Check immediately
    checkOnboardingConditions();

    // Listen for custom event when welcome dialog closes
    const handleWelcomeDialogClosed = () => {
      // Small delay to ensure localStorage is updated
      setTimeout(() => {
        checkOnboardingConditions();
      }, 100);
    };

    window.addEventListener('welcomeDialogClosed', handleWelcomeDialogClosed);
    window.addEventListener('storage', checkOnboardingConditions);

    return () => {
      window.removeEventListener('welcomeDialogClosed', handleWelcomeDialogClosed);
      window.removeEventListener('storage', checkOnboardingConditions);
    };
  }, [forceShow]);

  const handleCloseOnboarding = () => {
    localStorage.setItem(onboardingSeenKey, "true");
    setShowPopup(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate("/subscription")
      handleCloseOnboarding();
    }
  };

  useEffect(() => {
    if(currentStep !== 2) {
      dispatch(setIsModalOpen(false))
    }
    // Complete onboarding if step is beyond the last step
    if (currentStep >= steps.length) {
      // navigate("/subscription");
      handleCloseOnboarding();
    }
  },[currentStep, steps.length, navigate])

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle click outside the popup
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
      handleCloseOnboarding();
      setCurrentStep(0);
    }
  };

  // Don't hide popup for steps 6 and 7 - show custom highlighting instead
  if (!showPopup) return null;

  const getPositionStyle = (position: Step["position"]): React.CSSProperties => {
    switch (position) {
      case "top-center":
        return { top: "50px", left: "50%", transform: "translateX(-50%)" };
      case "top-right":
        return { top: "50px", right: "20px" };
      case "top-right-gap":
        return { top: "60px", right: "50px" };
      case "center-right":
        return { top: "50%", right: "120px", transform: "translateY(-50%)" };
      case "center":
        return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
      case "bottom-center":
        return { bottom: "40%", left: "50%", transform: "translateX(-50%, -50%)" };
      case "center-top":
        return { top: "30%", left: "50%", transform: "translateX(-50%)" };
      case "texture-info":
        return { bottom: "3%", left: "60%", transform: "translateX(-50%)" };
      default:
        return {};
    }
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[1000] pointer-events-none"
      onClick={handleOverlayClick}
    >
      {/* Background overlay with smooth transition - now clickable */}
      <div className="fixed inset-0 bg-black/60 pointer-events-auto transition-opacity duration-300"></div>
      
      {/* Popup container with ref for click outside detection */}
      <div
        ref={popupRef}
          className={`absolute bg-white rounded-none shadow-2xl p-4 mx-4 pointer-events-auto transform transition-all duration-300 ${
          currentStep === 7 ? 'max-w-4xl' : currentStep === 8 ? 'max-w-md' : 'max-w-sm'
        }`}
        style={getPositionStyle(steps[currentStep]?.position)}
      >
        {/* Progress indicator */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1 rounded-none transition-all duration-300 ${
                  index <= currentStep ? 'bg-black' : 'bg-gray-200'
                } ${index === currentStep ? 'w-6' : 'w-3'}`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-gray-500">
            {currentStep + 1}/{steps.length}
          </span>
        </div>

        {/* Content */}
        <div className="mb-6">
          {/* Step 6: Show color map images */}
          {currentStep === 7 && (
            <div className="space-y-6">
              {/* Color Map Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {colorMaps.map((colormap) => (
                  <div
                    key={colormap.id}
                    className="relative aspect-video bg-gray-100 rounded-none overflow-hidden border border-gray-200"
                  >
                    <img
                      src={colormap.src}
                      alt={colormap.alt}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ))}
              </div>
              {/* Instructional Text */}
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-none">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {language === 'de'
                    ? "Um noch mehr Kontrolle über Regionen zu haben wählen Sie\n1) das SDXL AI Model.\n2) und laden Sie anschließend über \"Create Regions\" eine Farbkarte hoch.\nDann können Sie Materialien aus unserem Katalog präzise zuweisen.\nAlternativ können Sie unsere Plugin-Integrationen verwenden - dann geschieht das alles automatisch."
                    : "To have even more control over regions, select\n1) the SDXL AI Model.\n2) and then upload a color map via \"Create Regions\".\nThen you can precisely assign materials from our catalog.\nAlternatively, you can use our plugin integrations - then everything happens automatically."}
                </p>
              </div>
            </div>
          )}
          
          {/* Step 8: Show texture example */}
          {currentStep === 6 && (
            <div className="space-y-6">
              {/* Main Text */}
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-none">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {language === 'de'
                    ? "Sie können entweder Ihre eigenen Texturproben hochladen oder einfach Texturen aus unserem Katalog per Drag & Drop hinzufügen."
                    : "You can either upload your own texture samples or simply drag and drop textures from our catalog."}
                </p>
              </div>

              {/* Example Image */}
              <div className="flex justify-center">
                <div className="relative w-20 h-20 rounded overflow-hidden border border-gray-200 bg-gray-100">
                  <img
                    src={EXAMPLE_TEXTURE_URL}
                    alt="Example texture"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Additional Text */}
              <div className="text-center">
                <p className="text-xs text-gray-600">
                  {language === 'de'
                    ? "Öffnen Sie den Katalog, indem Sie auf \"Katalog öffnen\" klicken"
                    : "Open up the catalog by clicking on \"Open Catalog\""}
                </p>
              </div>
            </div>
          )}

          {/* Regular text for other steps */}
          {currentStep !== 6 && currentStep !== 7 && (
            <p className="text-gray-800 text-lg leading-relaxed">
              {steps[currentStep]?.text}
            </p>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center">
          <div>
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-5 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
              >
                {t.back}
              </button>
            )}
          </div>
          
          <button
            onClick={handleNext}
            className="px-4 py-2 flex items-center flex-shrink-0 rounded-none bg-white shadow-sm text-sm h-full transition-colors cursor-pointer hover:shadow-md font-medium gap-2"
          >
            {currentStep === steps.length - 1 ? t.viewPlans : t.next}
          </button>
        </div>
      </div>
    </div>
  );
}
