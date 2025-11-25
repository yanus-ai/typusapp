import { FC, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppSelector } from '@/hooks/useAppSelector';
import { Progress } from "@/components/ui/progress";
import { CreditCard, Clock, Settings } from 'lucide-react';
import { formatDate } from '@/utils/helpers';
import subscriptionService from '@/services/subscriptionService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const SubscriptionCard: FC = () => {
  const { subscription, credits } = useAppSelector(state => state.auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Check if subscription is usable (active or cancelled but not expired)
  const isSubscriptionUsable = (subscription: any) => {
    if (!subscription) return false;

    const now = new Date();
    const periodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : now;

    return (
      subscription.status === 'ACTIVE' ||
      (subscription.status === 'CANCELLED_AT_PERIOD_END' && now <= periodEnd)
    );
  };

  if (!isSubscriptionUsable(subscription)) return null;

  const isCancelledAtPeriodEnd = subscription.status === 'CANCELLED_AT_PERIOD_END';
  
  const planName = getPlanName(subscription.planType);
  const expirationDate = subscription.currentPeriodEnd 
    ? formatDate(new Date(subscription.currentPeriodEnd))
    : 'N/A';
  
  // Calculate usage based on actual available credits vs plan allocation
  const getPlanCredits = (planType: string) => {
    switch (planType) {
      case 'STARTER': return 50;
      case 'EXPLORER': return 150;
      case 'PRO': return 1000;
      default: return subscription.credits;
    }
  };
  const planCredits = getPlanCredits(subscription.planType);
  const usedCredits = Math.max(0, planCredits - credits);
  const percentageUsed = planCredits > 0 
    ? Math.min(100, Math.round((usedCredits / planCredits) * 100))
    : 0;

  const handleUpgradeClick = async () => {
    try {
      console.log('Upgrade button clicked - redirecting to Stripe checkout');
      // Redirect to subscription page where user can select the correct plan type
      navigate('/subscription');
    } catch (error) {
      console.error('Failed to navigate to subscription page:', error);
      toast.error('Failed to start upgrade process');
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      await subscriptionService.redirectToPortal();
    } catch (error) {
      console.error('Failed to open subscription portal:', error);
      toast.error('Failed to open subscription management');
    } finally {
      setLoading(false);
    }
  };

  // Check if user can upgrade (not already on PRO plan)
  const canUpgrade = subscription.planType !== 'PRO';
  
  return (
    <Card className="bg-lightgray border-0">
      <CardContent className="p-6">
        <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <h3 className="text-xl font-semibold">{planName}</h3>
            </div>
            
            <div className="flex gap-2">
              {canUpgrade && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleUpgradeClick}
                >
                  Upgrade
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageSubscription}
                disabled={loading}
              >
                <Settings className="h-4 w-4 mr-2" />
                {loading ? 'Loading...' : 'Manage'}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <p className="text-sm text-muted-foreground">Credits Used</p>
              <p className="text-sm font-medium">{credits} credits available (Plan: {planCredits})</p>
            </div>
            <Progress value={percentageUsed} />
          </div>
          
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isCancelledAtPeriodEnd ? `Ends on ${expirationDate}` : `Renews on ${expirationDate}`}
            </p>
          </div>
          
          {isCancelledAtPeriodEnd && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-none">
              <p className="text-sm text-yellow-800 font-medium">Subscription Cancelled</p>
              <p className="text-sm text-yellow-700">Your subscription ends on {expirationDate}. You can still use your credits until then.</p>
            </div>
          )}

          {subscription.billingCycle === 'YEARLY' && !isCancelledAtPeriodEnd && (
            <div className="bg-primary/10 p-3 rounded-none">
              <p className="text-sm text-primary">You're saving 20% with annual billing!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to get readable plan name
function getPlanName(planType: string): string {
  switch (planType) {
    case 'STARTER': return 'Starter Plan';
    case 'EXPLORER': return 'Explorer Plan';
    case 'PRO': return 'Pro Plan';
    default: return 'Unknown Plan';
  }
}

export default SubscriptionCard;