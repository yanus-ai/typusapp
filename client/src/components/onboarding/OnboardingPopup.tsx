import React, { useState, useEffect } from "react";
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
    text: " In the center, you will see the main canvas. By clicking on an image, you can access different settings. Subscribe to a plan to get started Let’s go!",
    position: "center",
  },
];

export default function OnboardingPopup({ currentStep, setCurrentStep }: { currentStep: number, setCurrentStep: (step: number) => void }) {
  
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Show only for first login
    const seen = localStorage.getItem("onboardingSeen");
    if (!seen) {
      setShowPopup(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      navigate("/subscription")
      localStorage.setItem("onboardingSeen", "true");
      setShowPopup(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
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
<div className="fixed inset-0 flex items-center justify-center z-[999] pointer-events-none">
  {/* Background overlay with smooth transition */}
  <div className="fixed inset-0 bg-black/60  pointer-events-auto transition-opacity duration-300"></div>
  
  {/* Popup container */}
  <div
    className="absolute bg-white rounded-2xl shadow-2xl p-4 max-w-sm mx-4 pointer-events-auto transform transition-all duration-300"
    style={getPositionStyle(steps[currentStep]?.position)}
  >
    {/* Progress indicator */}
    <div className="flex justify-between items-center mb-4">
      <div className="flex space-x-1">
        {steps.map((_, index) => (
          <div
            key={index}
            className={`h-1 rounded-full transition-all duration-300 ${
              index <= currentStep ? 'bg-red-500' : 'bg-gray-200'
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
        className="px-3 py-2 bg-red-500 text-white rounded-lg font-medium transition-all duration-200 transform"
      >
        {currentStep === steps.length - 1 ? "View Plans" : "Next"}
      </button>
    </div>
  </div>
</div>
  );
}
