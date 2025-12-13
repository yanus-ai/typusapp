import { FC, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppSelector } from '@/hooks/useAppSelector';
import { useCreditData } from '@/hooks/useCreditData';
import { Zap, Calendar, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { t } = useTranslation();

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
      return { color: 'text-green-600', bgColor: 'bg-green-50', message: t('profile.healthyUsage') };
    } else if (percentageAvailable > 20) {
      return { color: 'text-yellow-600', bgColor: 'bg-yellow-50', message: t('profile.moderateUsage') };
    } else {
      return { color: 'text-red-600', bgColor: 'bg-red-50', message: t('profile.highUsageConsiderUpgrading') };
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
              {t('profile.creditUsageOverview')}
            </h3>
          </div>

          <div className="space-y-4">
            {/* Main Usage Stats - Shows actual available credits vs plan allocation */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-none">
                <div className="text-2xl font-bold text-gray-900">
                  {availableCredits.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">{t('profile.availableNow')}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-none">
                <div className="text-2xl font-bold text-gray-900">
                  {usedFromPlan.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">{t('profile.usedFromPlan')}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-none">
                <div className="text-2xl font-bold text-gray-900">
                  {planCredits.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">{t('profile.planAllocation')}</div>
              </div>
            </div>

            {/* Progress Bar - Subscription Credits */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('profile.subscriptionCredits')}</span>
                <span className="font-medium">{usedFromPlan.toLocaleString()}/{planCredits.toLocaleString()}</span>
              </div>
              <Progress 
                value={percentageUsed} 
                className="h-2" 
              />
              <div className="text-xs text-gray-500 text-center">
                {t('profile.usedFromPlanAllocation', { percentage: percentageUsed })}
              </div>
            </div>

            {/* Progress Bar - Top-Up Credits */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('profile.topUpCredits')}</span>
                <span className="font-medium">{topUpUsed.toLocaleString()}/{topUpTotalPurchased.toLocaleString()}</span>
              </div>
              <Progress 
                value={creditData?.topUp.usagePercentage || 0} 
                className="h-2" 
              />
              <div className="text-xs text-gray-500 text-center">
                {topUpTotalPurchased > 0 
                  ? t('profile.usedOfPurchasedTopUp', { percentage: creditData?.topUp.usagePercentage || 0 })
                  : t('profile.noTopUpCreditsPurchased')
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
                  {t('profile.renews', { date: renewalDate })}
                </div>
              )}
            </div>

            {/* Bonus Credits Info */}
            {availableCredits > planCredits && (
              <div className="flex items-start gap-2 p-3 bg-green-50 rounded-none border border-green-200">
                <Zap className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-green-800">{t('profile.bonusCreditsAvailable')}</div>
                  <div className="text-green-700">
                    {t('profile.extraCreditsBeyondPlan', { amount: (availableCredits - planCredits).toLocaleString() })}
                  </div>
                </div>
              </div>
            )}

            {/* Cancellation Notice */}
            {isCancelledAtPeriodEnd && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-none border border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-yellow-800">{t('profile.subscriptionCancelled')}</div>
                  <div className="text-yellow-700">
                    {t('profile.subscriptionEndsOn', { date: renewalDate })}
                  </div>
                </div>
              </div>
            )}

            {/* Low Credits Warning */}
            {percentageAvailable < 20 && !isCancelledAtPeriodEnd && (
              <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-none border border-orange-200">
                <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-orange-800">{t('profile.runningLowOnCredits')}</div>
                  <div className="text-orange-700">
                    {t('profile.considerUpgradingOrPurchasing')}
                  </div>
                </div>
              </div>
            )}

            {/* Plan Info */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t('profile.currentPlan')}</span>
                <span className="font-medium">
                  {getPlanName(subscription?.planType || '', t)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600">{t('profile.billingCycle')}</span>
                <span className="font-medium">
                  {getBillingCycleName(subscription?.billingCycle || '', t)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to get readable plan name
function getPlanName(planType: string, t: (key: string) => string): string {
  switch (planType.toUpperCase()) {
    case 'STARTER': return t('profile.starterPlan');
    case 'EXPLORER': return t('profile.explorerPlan');
    case 'PRO': return t('profile.proPlan');
    default: return t('profile.unknownPlan');
  }
}

// Helper function to get readable billing cycle name
function getBillingCycleName(billingCycle: string, t: (key: string) => string): string {
  const normalized = billingCycle.replace('_', ' ').toUpperCase();
  if (normalized.includes('MONTHLY')) return t('profile.monthly');
  if (normalized.includes('YEARLY') || normalized.includes('ANNUAL')) return t('profile.yearly');
  if (normalized.includes('SIX') || normalized.includes('6')) return t('profile.sixMonth');
  return billingCycle.replace('_', ' ').toLowerCase();
}

export default CreditUsageCard;