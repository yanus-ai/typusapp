import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import OnboardingPopup from "@/components/onboarding/OnboardingPopup";
import { PromptInputContainer } from "@/components/creation-prompt";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { setIsPromptModalOpen } from "@/features/create/createUISlice";

const CreatePageSimplified: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const dispatch = useAppDispatch();
  const isPromptModalOpen = useAppSelector(
    (state) => state.createUI.isPromptModalOpen
  );
  const [forceShowOnboarding, setForceShowOnboarding] =
    useState<boolean>(false);

  const handleStartTour = () => {
    setCurrentStep(0);
    setForceShowOnboarding(true);
  };

  React.useEffect(() => {
    dispatch(setIsPromptModalOpen(true));
  }, [dispatch]);

  return (
    <MainLayout currentStep={currentStep} onStartTour={handleStartTour}>
      <OnboardingPopup
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        forceShow={forceShowOnboarding}
      />
      {(isPromptModalOpen || currentStep === 4) && (
        <div className="flex-1 flex overflow-hidden relative items-center justify-center">
          <PromptInputContainer />
        </div>
      )}
    </MainLayout>
  );
};

export default CreatePageSimplified;
