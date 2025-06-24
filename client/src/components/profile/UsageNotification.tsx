import { FC } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppSelector } from '@/hooks/useAppSelector';
import { Settings, Package } from 'lucide-react';

interface UsageNotificationProps {
  percentage?: number;
}

export const UsageNotification: FC<UsageNotificationProps> = ({ 
  percentage = 0 
}) => {
  const { user } = useAppSelector(state => state.auth);
  const firstName = user?.fullName?.split(' ')[0] || 'User';
  const timeOfDay = getTimeOfDay();
  
  return (
    <Card className="bg-white shadow-sm border-0 bg-lightgray">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-secondary-foreground">Hey {firstName}!</p>
            <p className="text-lg text-foreground">
              Good {timeOfDay}. You're on the <span className="font-medium">Free plan</span> and have used <span className="text-primary font-medium bg-darkgray px-2 rounded-md">{percentage}%</span> of your daily compute budget. Upgrade now to unlock more compute and premium features.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 pt-2">
            <Button 
              variant="default" 
              className="flex items-center gap-2 bg-gradient text-white"
            >
              <Settings className="h-4 w-4" />
              Manage Subscription
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center gap-2 bg-gradient text-white"
            >
              <Package className="h-4 w-4" />
              Buy Compute packs
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

export default UsageNotification;