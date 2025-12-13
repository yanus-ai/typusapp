import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useOnboarding } from '@/components/onboarding/hooks/useOnboarding';
import { useCheckout } from '@/contexts/CheckoutContext';
import { useTranslation } from '@/hooks/useTranslation';

const OnboardingAlert: React.FC = () => {
  const { isOnboardingCompleted } = useOnboarding();
  const { setShowOnboarding } = useCheckout();
  const { t } = useTranslation();

  // Don't show alert if onboarding is completed or still loading
  if (isOnboardingCompleted) {
    return null;
  }

  const handleCompleteProfile = () => {
    // Set showOnboarding flag to trigger the onboarding questionnaire
    setShowOnboarding(true);
  };

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {t('profile.onboardingAlert.message')}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-4 border-orange-300 text-orange-700 hover:bg-orange-100"
            onClick={handleCompleteProfile}
          >
            {t('profile.onboardingAlert.buttonText')}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default OnboardingAlert;
