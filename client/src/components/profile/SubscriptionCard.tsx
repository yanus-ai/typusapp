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
  
  if (!subscription) return null;
  
  const planName = getPlanName(subscription.planType);
  const expirationDate = subscription.currentPeriodEnd 
    ? formatDate(new Date(subscription.currentPeriodEnd))
    : 'N/A';
  
  // Calculate usage based on actual available credits vs plan allocation
  const planCredits = subscription.credits;
  const usedCredits = Math.max(0, planCredits - credits);
  const percentageUsed = planCredits > 0 
    ? Math.min(100, Math.round((usedCredits / planCredits) * 100))
    : 0;

  const handleUpgradeClick = () => {
    navigate('/subscription');
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
              {subscription.planType === 'FREE' ? (
                <Button 
                  variant="outline" 
                  className="bg-gradient text-white"
                  size="sm"
                  onClick={handleUpgradeClick}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Upgrade Plan
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleManageSubscription}
                  disabled={loading}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {loading ? 'Loading...' : 'Manage'}
                </Button>
              )}
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
            <p className="text-sm text-muted-foreground">Renews on {expirationDate}</p>
          </div>
          
          {subscription.billingCycle === 'YEARLY' && (
            <div className="bg-primary/10 p-3 rounded-md">
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
    case 'FREE': return 'Free Plan';
    case 'BASIC': return 'Basic Plan';
    case 'PRO': return 'Pro Plan';
    case 'ENTERPRISE': return 'Enterprise Plan';
    default: return 'Unknown Plan';
  }
}

export default SubscriptionCard;