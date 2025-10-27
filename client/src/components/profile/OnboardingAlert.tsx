import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useOnboarding } from '@/components/onboarding/hooks/useOnboarding';

const OnboardingAlert: React.FC = () => {
  const { shouldShowQuestionnaire } = useOnboarding();

  // Don't show alert if onboarding is completed or still loading
  if (!shouldShowQuestionnaire) {
    return null;
  }

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        <div className="flex items-center justify-between">
          <span className="font-medium">
            Complete your profile to get the most out of our platform
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-4 border-orange-300 text-orange-700 hover:bg-orange-100"
            onClick={() => {
              // This will trigger the onboarding questionnaire
              window.location.reload();
            }}
          >
            Complete Profile
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default OnboardingAlert;
