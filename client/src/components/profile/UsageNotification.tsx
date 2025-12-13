import { FC, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppSelector } from '@/hooks/useAppSelector';
import { Settings, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import subscriptionService from '@/services/subscriptionService';
import { useTranslation } from '@/hooks/useTranslation';

export const UsageNotification: FC = () => {
  const { user, subscription, credits } = useAppSelector(state => state.auth);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const firstName = user?.fullName?.split(' ')[0] || t('profile.user');
  const timeOfDay = getTimeOfDay(t);

  const handleManageSubscription = async () => {
    setIsLoading(true);

    try {
      // Check if user has an active subscription
      if (!subscription || subscription.status !== 'ACTIVE' || !subscription.stripeCustomerId) {
        // No active subscription, redirect to subscription page
        navigate('/subscription');
        return;
      }

      // User has active subscription, redirect to Stripe portal
      await subscriptionService.redirectToPortal();
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      // Fallback to local subscription page
      navigate('/subscription');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate credit usage properly
  const getPlanCredits = (planType: string) => {
    switch (planType) {
      case 'STARTER': return 50;
      case 'EXPLORER': return 150;
      case 'PRO': return 1000;
      default: return subscription?.credits || 50;
    }
  };
  const planCredits = getPlanCredits(subscription?.planType || 'FREE'); 
  const availableCredits = credits; // Credits user has remaining (actual available credits)
  
  // Calculate credits used from plan properly
  // If user has less than plan allocation, that's how much they used
  // If user has more (bonus credits), they used 0 from plan
  const usedFromPlan = planCredits > availableCredits 
    ? planCredits - availableCredits 
    : 0;
  
  const percentageUsed = planCredits > 0 
    ? Math.min(100, Math.round((usedFromPlan / planCredits) * 100))
    : 0;
  
  const planType = subscription?.planType || 'STARTER';
  
  return (
    <Card className="bg-lightgray border-0">
      <CardContent className="p-6">
        <div className="flex flex-col space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-gray-800">{t('profile.hey', { firstName })}</p>
            <p className="text-lg text-foreground">
              {timeOfDay}. {t('profile.youreOnThe')} <span className="font-medium">{getPlanName(planType, t)}</span> {t('profile.with')} <span className="text-primary font-medium bg-darkgray px-2 rounded-none">{availableCredits.toLocaleString()} {t('profile.creditsAvailable')}</span> ({t('profile.plan')}: {planCredits.toLocaleString()}, {percentageUsed}% {t('profile.used')}).
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="default"
              className="flex items-center gap-2 bg-gradient text-white"
              onClick={handleManageSubscription}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Settings className="h-4 w-4" />
              )}
              {isLoading ? t('profile.loading') : t('profile.manageSubscription')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to get time of day greeting
function getTimeOfDay(t: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t('profile.goodMorning');
  if (hour < 17) return t('profile.goodAfternoon');
  return t('profile.goodEvening');
}

// Helper function to get readable plan name
function getPlanName(planType: string, t: (key: string) => string): string {
  switch (planType) {
    case 'STARTER': return t('profile.starterPlan');
    case 'EXPLORER': return t('profile.explorerPlan');
    case 'PRO': return t('profile.proPlan');
    default: return t('profile.unknownPlan');
  }
}

export default UsageNotification;