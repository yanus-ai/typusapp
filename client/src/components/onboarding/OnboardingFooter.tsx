import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { useWizard } from "react-use-wizard";
import { useFormContext } from "react-hook-form";
import onboardingService from "@/services/onboardingService";

// Field names for each step (0-indexed)
const STEP_FIELDS = [
  ['software'], // Step 0
  ['status'], // Step 1
  ['moneySpentForOneImage'], // Step 2
  ['companyName', 'streetAndNumber', 'city', 'postcode', 'state', 'country'], // Step 3
  ['phoneNumber'], // Step 4
];

export default function OnboardingFooter() {
  const { isFirstStep, isLastStep, nextStep, previousStep, activeStep } = useWizard();
  const { formState, handleSubmit, trigger } = useFormContext();

  const onSubmit = async (data: any) => {
    try {
      await onboardingService.submitOnboardingData(data)
      window.location.reload()
    } catch (error) {
      console.error('Error submitting onboarding data:', error);
    }
  };

  const handleNext = async () => {
    // Skip validation for step 3 (InformationQuestion) as it's optional
    if (activeStep === 3) {
      nextStep();
      return;
    }

    // Get the fields for the current step
    const fields = STEP_FIELDS[activeStep] || [];
    
    // Trigger validation for current step fields only
    const isValid = await trigger(fields);
    
    // Only proceed if validation passes
    if (isValid) {
      nextStep();
    }
  };

  // Show skip button for step 3 (InformationQuestion)
  const showSkipButton = activeStep === 3;

  return (
    <div className="flex justify-between mt-8">
      <Button
        variant="outline"
        onClick={previousStep}
        disabled={isFirstStep}
        className="flex items-center border-0 shadow-none"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Previous
      </Button>

      <div className="flex space-x-3">
        {showSkipButton && (
          <Button
            variant="outline"
            onClick={nextStep}
            className="flex items-center border-0 shadow-none"
          >
            I'll do this later
          </Button>
        )}
        <Button
          onClick={isLastStep ? handleSubmit(onSubmit) : handleNext}
          className="flex items-center text-white"
          disabled={formState.isSubmitting}
        >
          {formState.isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {isLastStep ? "Completing..." : "Loading..."}
            </>
          ) : (
            <>
              {isLastStep ? "Complete" : "Next"}
              {isLastStep ? (
                <CheckCircle className="w-4 h-4 ml-2" />
              ) : (
                <ArrowRight className="w-4 h-4 ml-2" />
              )}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
