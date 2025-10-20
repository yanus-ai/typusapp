import { FC, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppSelector } from '@/hooks/useAppSelector';
import { useCreditData } from '@/hooks/useCreditData';
import { Zap, Calendar, AlertCircle } from 'lucide-react';

// Helper function to get plan credits
const getPlanCredits = (planType: string) => {
  switch (planType) {
    case 'STARTER': return 50;
    case 'EXPLORER': return 150;
    case 'PRO': return 1000;
    default: return 50;
  }
};

export const CreditUsageCard: FC = () => {
  const { subscription, credits } = useAppSelector(state => state.auth);
  const { creditData } = useCreditData();

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

  // Get renewal date if available
  const renewalDate = useMemo(() => subscription?.currentPeriodEnd 
  ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
  : null, [subscription]);

  // Only show for usable subscriptions
  if (!isSubscriptionUsable(subscription)) return null;

  const isCancelledAtPeriodEnd = subscription?.status === 'CANCELLED_AT_PERIOD_END';
  
  // Use real credit data if available, otherwise fallback to calculated values
  const availableCredits = creditData?.total.available || credits;
  const planCredits = creditData?.subscription.planAllocation || getPlanCredits(subscription!.planType);
  const usedFromPlan = creditData?.subscription.used || 0;
  const topUpUsed = creditData?.topUp.totalUsed || 0;
  const topUpTotalPurchased = creditData?.topUp.totalPurchased || 0;
  
  // Calculate percentages
  const percentageUsed = creditData?.subscription.usagePercentage || 0;
  const percentageAvailable = 100 - percentageUsed;

  // Determine status color and message
  const getStatusInfo = () => {
    if (percentageAvailable > 50) {
      return { color: 'text-green-600', bgColor: 'bg-green-50', message: 'Healthy usage' };
    } else if (percentageAvailable > 20) {
      return { color: 'text-yellow-600', bgColor: 'bg-yellow-50', message: 'Moderate usage' };
    } else {
      return { color: 'text-red-600', bgColor: 'bg-red-50', message: 'High usage - consider upgrading' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Card className="bg-lightgray border-0">
      <CardContent className="p-6">
        <div className="flex flex-col space-y-6">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Credit Usage Overview
            </h3>
          </div>

          <div className="space-y-4">
            {/* Main Usage Stats - Shows actual available credits vs plan allocation */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {availableCredits.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Available Now</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {usedFromPlan.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Used from Plan</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {planCredits.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Plan Allocation</div>
              </div>
            </div>

            {/* Progress Bar - Subscription Credits */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subscription Credits</span>
                <span className="font-medium">{usedFromPlan.toLocaleString()}/{planCredits.toLocaleString()}</span>
              </div>
              <Progress 
                value={percentageUsed} 
                className="h-2" 
              />
              <div className="text-xs text-gray-500 text-center">
                {percentageUsed}% used from plan allocation
              </div>
            </div>

            {/* Progress Bar - Top-Up Credits */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Top-Up Credits</span>
                <span className="font-medium">{topUpUsed.toLocaleString()}/{topUpTotalPurchased.toLocaleString()}</span>
              </div>
              <Progress 
                value={creditData?.topUp.usagePercentage || 0} 
                className="h-2" 
              />
              <div className="text-xs text-gray-500 text-center">
                {topUpTotalPurchased > 0 
                  ? `${creditData?.topUp.usagePercentage || 0}% used of purchased top-up credits`
                  : 'No top-up credits purchased'
                }
              </div>
            </div>

            {/* Status and Additional Info */}
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.bgColor}`}>
                <div className={`w-2 h-2 rounded-full bg-current ${statusInfo.color}`}></div>
                <span className={`text-xs font-medium ${statusInfo.color}`}>
                  {statusInfo.message}
                </span>
              </div>
              
              {renewalDate && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  Renews {renewalDate}
                </div>
              )}
            </div>

            {/* Bonus Credits Info */}
            {availableCredits > planCredits && (
              <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <Zap className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-green-800">Bonus credits available!</div>
                  <div className="text-green-700">
                    You have {(availableCredits - planCredits).toLocaleString()} extra credits beyond your plan allocation.
                  </div>
                </div>
              </div>
            )}

            {/* Cancellation Notice */}
            {isCancelledAtPeriodEnd && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-yellow-800">Subscription Cancelled</div>
                  <div className="text-yellow-700">
                    Your subscription will end on {renewalDate}. You can continue using your remaining credits until then.
                  </div>
                </div>
              </div>
            )}

            {/* Low Credits Warning */}
            {percentageAvailable < 20 && !isCancelledAtPeriodEnd && (
              <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-orange-800">Running low on credits</div>
                  <div className="text-orange-700">
                    Consider upgrading your plan or purchasing additional credits to continue generating.
                  </div>
                </div>
              </div>
            )}

            {/* Plan Info */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Current Plan</span>
                <span className="font-medium capitalize">
                  {subscription?.planType.toLowerCase()} Plan
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600">Billing Cycle</span>
                <span className="font-medium capitalize">
                  {subscription?.billingCycle.toLowerCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreditUsageCard;