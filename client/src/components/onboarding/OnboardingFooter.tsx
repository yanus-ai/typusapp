import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, CheckIcon } from "lucide-react";
import { useWizard } from "react-use-wizard";
import { useFormContext } from "react-hook-form";
import onboardingService from "@/services/onboardingService";
import { useMemo } from "react";
import { useCheckout } from "@/contexts/CheckoutContext";
import subscriptionService from "@/services/subscriptionService";

// Field names for each step (0-indexed)
const STEP_FIELDS = [
  ['firstName', 'lastName', 'companyName'], // Step 0
  ['streetAndNumber', 'city', 'postcode', 'state', 'country'], // Step 1
  ['software'], // Step 2
  ['status'], // Step 3
  ['moneySpentForOneImage'], // Step 4
  ['phoneNumber', 'whatsappConsent', 'privacyTermsConsent'], // Step 5
];

enum STEPS {
  INFORMATION = 0,
  ADDRESS = 1,
  SOFTWARE = 2,
  STATUS = 3,
  MONEY_SPENT_FOR_ONE_IMAGE = 4,
  PHONE_NUMBER = 5,
}

export default function OnboardingFooter() {
  const { isFirstStep, isLastStep, nextStep, previousStep, activeStep } = useWizard();
  const { formState, handleSubmit, trigger, watch } = useFormContext();
  const { pendingCheckout, clearPendingCheckout, setShowOnboarding } = useCheckout();

  const onSubmit = async (data: any) => {
    try {
      await onboardingService.submitOnboardingData(data);
      
      // Clear the showOnboarding flag
      setShowOnboarding(false);
      
      // If there's a pending checkout, redirect to checkout after onboarding completion
      if (pendingCheckout) {
        try {
          await subscriptionService.redirectToCheckout(
            pendingCheckout.planType,
            pendingCheckout.billingCycle,
            pendingCheckout.isEducational
          );
          clearPendingCheckout();
        } catch (checkoutError) {
          console.error('Error redirecting to checkout:', checkoutError);
          // If checkout fails, still reload to show completion
          window.location.reload();
        }
      } else {
        // No pending checkout, just reload
        window.location.reload();
      }
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

  const isSkippable = useMemo(() => {
    const fields = STEP_FIELDS[activeStep] || [];
    if (activeStep === STEPS.INFORMATION || activeStep === STEPS.ADDRESS) {
      const values = watch(fields);
      return !values.some(value => !!value)
    }
    return false;
  }, [activeStep, isLastStep, watch()]);

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
        <button
          onClick={isLastStep ? handleSubmit(onSubmit) : (isSkippable ? nextStep : handleNext)}
          className="!px-6 flex items-center flex-shrink-0 py-1 rounded-none bg-white shadow-sm text-sm h-full transition-colors cursor-pointer hover:shadow-md font-medium gap-2"
          disabled={formState.isSubmitting}
        >
          {formState.isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
              {isSkippable ? 'I\'ll do this later' : isLastStep ? "Completing..." : "Loading..."}
            </>
          ) : (
            <>
              {isSkippable ? "I'll do this later" : isLastStep ? "Complete" : "Next"}
              {isLastStep ? (
                <CheckIcon className="w-4 h-4 ml-2" />
              ) : (
                <ArrowRight className="w-4 h-4 ml-2" />
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
