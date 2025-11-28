import { setIsModalOpen } from "@/features/gallery/gallerySlice";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

type Step = {
  id: number;
  text: string;
  position: "top-center" | "top-right" | "top-right-gap" | "center-right" | "center";
};

const steps: Step[] = [
  {
    id: 1,
    text: " TYPUS.AI is designed to give architects full creative control. The workflow is organized into three sections: Create, Edit, and Refine. Together, they make it easy to turn ideas into polished images.",
    position: "top-center",
  },
  {
    id: 2,
    text: " First, by clicking the top-right corner, you can manage your account, download plugins, and subscribe to a plan.",
    position: "top-right",
  },
  {
    id: 3,
    text: " From here, you can enter the Gallery to organize your images and dynamically send them to different sections.",
    position: "top-right-gap",
  },
  {
    id: 4,
    text: " Once inside a mode, you'll find the Input and Output History on the sides. You can reuse your previous inputs by clicking the plus icon.",
    position: "center-right",
  },
  {
    id: 5,
    text: " In the center, you will see the main canvas. By clicking on an image, you can access different settings. Subscribe to a plan to get started Let's go!",
    position: "center",
  },
];

export default function OnboardingPopup({ currentStep, setCurrentStep, forceShow = false }: { currentStep: number, setCurrentStep: (step: number) => void, forceShow?: boolean }) {

  const [showPopup, setShowPopup] = useState<boolean>(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceShow) {
      setShowPopup(true);
      return;
    }

    const checkOnboardingConditions = () => {
      const onboardingSeen = localStorage.getItem("onboardingSeen");
      const welcomeSeen = localStorage.getItem("welcomeSeen");
      const showWelcome = localStorage.getItem("showWelcome");

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
    localStorage.setItem("onboardingSeen", "true");
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
  },[currentStep])

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
        className="absolute bg-white rounded-none shadow-2xl p-4 max-w-sm mx-4 pointer-events-auto transform transition-all duration-300"
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
          <p className="text-gray-800 text-lg leading-relaxed">
            {steps[currentStep]?.text}
          </p>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center">
          <div>
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-5 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
              >
                Back
              </button>
            )}
          </div>
          
          <button
            onClick={handleNext}
            className="px-4 py-2 flex items-center flex-shrink-0 rounded-none bg-white shadow-sm text-sm h-full transition-colors cursor-pointer hover:shadow-md font-medium gap-2"
          >
            {currentStep === steps.length - 1 ? "View Plans" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
