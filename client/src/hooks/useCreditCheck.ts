import React from 'react';
import { useAppSelector } from './useAppSelector';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface CreditCheckResult {
  hasCredits: boolean;
  showUpgradePrompt: () => void;
  checkCreditsBeforeAction: (requiredCredits?: number) => boolean;
}

export const useCreditCheck = (): CreditCheckResult => {
  const { credits, subscription } = useAppSelector(state => state.auth);
  const navigate = useNavigate();

  const showUpgradePrompt = () => {
    toast.error(
      "You've run out of credits! Upgrade your plan to continue generating amazing content.",
      {
        duration: 6000,
      }
    );
  };

  const checkCreditsBeforeAction = (requiredCredits: number = 1): boolean => {
    if (credits < requiredCredits) {
      showUpgradePrompt();
      return false;
    }
    return true;
  };

  // const showLowCreditsWarning = () => {
  //   if (credits <= 10 && credits > 0) {
  //     toast(
  //       `You have ${credits} credits remaining. Consider upgrading your plan soon.`,
  //       {
  //         duration: 5000,
  //         icon: '⚠️',
  //       }
  //     );
  //   }
  // };

  // Auto-show low credits warning when credits get low
  // React.useEffect(() => {
  //   if (credits <= 10 && credits > 0) {
  //     const timer = setTimeout(() => {
  //       showLowCreditsWarning();
  //     }, 1000); // Show after 1 second to avoid spam
      
  //     return () => clearTimeout(timer);
  //   }
  // }, [credits]);

  return {
    hasCredits: credits > 0,
    showUpgradePrompt,
    checkCreditsBeforeAction,
  };
};