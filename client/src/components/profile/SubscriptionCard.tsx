import { FC } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppSelector } from '@/hooks/useAppSelector';
import { Progress } from "@/components/ui/progress";
import { CreditCard, Clock } from 'lucide-react';
import { formatDate } from '@/utils/helpers';

export const SubscriptionCard: FC = () => {
  const { subscription, credits } = useAppSelector(state => state.auth);
  
  if (!subscription) return null;
  
  const planName = getPlanName(subscription.planType);
  const expirationDate = subscription.currentPeriodEnd 
    ? formatDate(new Date(subscription.currentPeriodEnd))
    : 'N/A';
  
  const percentageUsed = subscription.credits > 0 
    ? Math.min(100, Math.round(((subscription.credits - credits) / subscription.credits) * 100))
    : 0;
  
  return (
    <Card className="bg-lightgray border-0">
      <CardContent className="p-6">
        <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <h3 className="text-xl font-semibold">{planName}</h3>
            </div>
            
            <Button 
              variant="outline" 
              className="bg-gradient text-white"
              size="sm"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <p className="text-sm text-muted-foreground">Credits Used</p>
              <p className="text-sm font-medium">{subscription.credits - credits} / {subscription.credits}</p>
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