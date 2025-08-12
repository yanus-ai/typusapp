import { FC } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppSelector } from '@/hooks/useAppSelector';
import { Settings, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UsageNotification: FC = () => {
  const { user, subscription, credits } = useAppSelector(state => state.auth);
  const navigate = useNavigate();
  
  const firstName = user?.fullName?.split(' ')[0] || 'User';
  const timeOfDay = getTimeOfDay();
  
  // Calculate credit usage based on actual available credits
  const planCredits = subscription?.credits || 100; // Plan's credit allocation
  const availableCredits = credits; // Credits user has remaining (actual available credits)
  const usedFromPlan = Math.max(0, planCredits - availableCredits); // Credits used from plan
  const percentageUsed = planCredits > 0 
    ? Math.min(100, Math.max(0, Math.round((usedFromPlan / planCredits) * 100)))
    : 0;
  
  const planType = subscription?.planType || 'FREE';
  const isPaidPlan = planType !== 'FREE';
  
  return (
    <Card className="bg-white shadow-sm border-0 bg-lightgray">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-secondary-foreground">Hey {firstName}!</p>
            <p className="text-lg text-foreground">
              Good {timeOfDay}. You're on the <span className="font-medium">{getPlanName(planType)}</span> with <span className="text-primary font-medium bg-darkgray px-2 rounded-md">{availableCredits.toLocaleString()} credits available</span> (Plan: {planCredits.toLocaleString()}, {percentageUsed}% used).
              {!isPaidPlan && ' Upgrade now to unlock more compute and premium features.'}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 pt-2">
            <Button 
              variant="default" 
              className="flex items-center gap-2 bg-gradient text-white"
              onClick={() => navigate('/subscription')}
            >
              <Settings className="h-4 w-4" />
              Manage Subscription
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center gap-2 bg-gradient text-white"
              onClick={() => navigate('/credits')}
            >
              <Package className="h-4 w-4" />
              Buy Additional Credits
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to get time of day greeting
function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

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

export default UsageNotification;