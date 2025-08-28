import { FC, useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppSelector } from '@/hooks/useAppSelector';
import subscriptionService, { PricingPlan } from '@/services/subscriptionService';
import { CheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import MainLayout from '@/components/layout/MainLayout';
import Sidebar from '@/components/layout/Sidebar';

export const SubscriptionPage: FC = () => {
  const { subscription } = useAppSelector(state => state.auth);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  // Set initial billing cycle based on current subscription
  useEffect(() => {
    if (subscription && subscription.billingCycle) {
      setBillingCycle(subscription.billingCycle);
    }
  }, [subscription]);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const plansData = await subscriptionService.getPricingPlans();
      setPlans(plansData);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      toast.error('Failed to load pricing plans');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planType: 'BASIC' | 'PRO' | 'ENTERPRISE') => {
    try {
      setUpgrading(planType);
      await subscriptionService.redirectToCheckout(planType, billingCycle);
    } catch (error) {
      console.error('Failed to start upgrade process:', error);
      toast.error('Failed to start upgrade process');
      setUpgrading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      await subscriptionService.redirectToPortal();
    } catch (error) {
      console.error('Failed to open subscription portal:', error);
      toast.error('Failed to open subscription management');
    }
  };

  const isCurrentPlan = (planType: string) => {
    return subscription?.planType === planType;
  };

  const canUpgradeToPlan = (planType: string) => {
    if (!subscription) return false;
    
    const planHierarchy = { 'FREE': 0, 'BASIC': 1, 'PRO': 2, 'ENTERPRISE': 3 };
    const currentLevel = planHierarchy[subscription.planType as keyof typeof planHierarchy] || 0;
    const targetLevel = planHierarchy[planType as keyof typeof planHierarchy] || 0;
    
    return targetLevel > currentLevel;
  };

  const canDowngradeToPlan = (planType: string) => {
    if (!subscription) return false;
    
    const planHierarchy = { 'FREE': 0, 'BASIC': 1, 'PRO': 2, 'ENTERPRISE': 3 };
    const currentLevel = planHierarchy[subscription.planType as keyof typeof planHierarchy] || 0;
    const targetLevel = planHierarchy[planType as keyof typeof planHierarchy] || 0;
    
    return targetLevel < currentLevel && subscription.planType !== 'FREE';
  };

  const getPlanPrice = (plan: PricingPlan) => {
    if (plan.planType === 'FREE') return { display: '$0', period: '/Month' };
    
    const price = billingCycle === 'MONTHLY' ? plan.prices.monthly : plan.prices.yearly;
    const displayPrice = subscriptionService.formatPrice(price);
    
    if (billingCycle === 'YEARLY') {
      const monthlyEquivalent = subscriptionService.getMonthlyEquivalent(price);
      return { display: `${displayPrice} ${monthlyEquivalent}`, period: '/Month' };
    }
    
    return { display: displayPrice, period: '/Month' };
  };

  const getPlanCardClass = (plan: PricingPlan) => {
    if (plan.planType === 'FREE') return 'bg-gray-900 text-white border-gray-700';
    if (plan.planType === 'BASIC') return 'bg-blue-600 text-white border-blue-500';
    if (plan.planType === 'PRO') return 'bg-blue-700 text-white border-blue-600';
    if (plan.planType === 'ENTERPRISE') return 'bg-blue-800 text-white border-blue-700';
    return 'bg-white border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }``

  return (
    <MainLayout>
      {/* Sidebar */}
      <Sidebar />

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center my-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Praii Plans</h1>
          <p className="text-xl text-gray-600">Update to gain access to Pro features and generate more, faster</p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 p-1 rounded-lg flex">
            <button
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'MONTHLY'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'YEARLY'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {plans.map((plan) => {
            const priceInfo = getPlanPrice(plan);
            const isCurrent = isCurrentPlan(plan.planType);
            
            return (
              <Card key={plan.planType} className={`${getPlanCardClass(plan)} relative`}>
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      CURRENT PLAN
                    </div>
                  </div>
                )}
                <CardContent className="p-6 h-full flex flex-col">
                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold mb-4">{plan.name.replace(' Plan', '')}</h3>
                  
                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold">
                        {priceInfo.display.split(' ')[0]}
                      </span>
                      {priceInfo.display.includes(' ') && (
                        <span className="text-lg ml-1">
                          {priceInfo.display.split(' ')[1]}
                        </span>
                      )}
                      <span className="text-sm opacity-75 ml-1">{priceInfo.period}</span>
                    </div>
                    {billingCycle === 'YEARLY' && plan.planType !== 'FREE' && (
                      <p className="text-sm opacity-75 mt-1">Billed yearly</p>
                    )}
                    {isCurrent && subscription && subscription.currentPeriodEnd && (
                      <p className="text-sm opacity-75 mt-1">
                        {subscription.planType === 'FREE' 
                          ? 'No billing required'
                          : `Next billing: ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                        }
                      </p>
                    )}
                  </div>
                  
                  {/* Features */}
                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center">
                      <CheckIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                      <span className="text-sm font-medium">{plan.credits.toLocaleString()} credits per {billingCycle.toLowerCase().replace('ly', '')}</span>
                    </div>
                    <div className="flex items-center">
                      <CheckIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                      <span className="text-sm">Shared Purchased Compute resource</span>
                    </div>
                    <div className="flex items-center">
                      <CheckIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                      <span className="text-sm">Access all Praii features</span>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <Button
                    onClick={
                      isCurrent && subscription?.planType !== 'FREE'
                        ? handleManageSubscription
                        : canUpgradeToPlan(plan.planType)
                        ? () => handleUpgrade(plan.planType as 'BASIC' | 'PRO' | 'ENTERPRISE')
                        : canDowngradeToPlan(plan.planType)
                        ? handleManageSubscription
                        : undefined
                    }
                    disabled={
                      upgrading === plan.planType ||
                      (plan.planType === 'FREE' && !canUpgradeToPlan(plan.planType)) ||
                      (isCurrent && plan.planType === 'FREE')
                    }
                    className={`w-full ${
                      isCurrent
                        ? plan.planType === 'FREE'
                          ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                          : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-300'
                        : canUpgradeToPlan(plan.planType)
                        ? 'bg-white text-gray-900 hover:bg-gray-100'
                        : canDowngradeToPlan(plan.planType)
                        ? 'bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-300'
                        : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    }`}
                    variant={
                      isCurrent && subscription?.planType !== 'FREE' 
                        ? "outline" 
                        : canDowngradeToPlan(plan.planType)
                        ? "outline"
                        : "secondary"
                    }
                  >
                    {upgrading === plan.planType
                      ? 'Loading...'
                      : isCurrent
                      ? subscription?.planType === 'FREE'
                        ? 'Current Plan'
                        : 'Manage Subscription'
                      : canUpgradeToPlan(plan.planType)
                      ? 'Upgrade Plan'
                      : canDowngradeToPlan(plan.planType)
                      ? 'Downgrade (via Portal)'
                      : 'Not Available'
                    }
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Student & Educator Link */}
        <div className="text-center">
          <Button 
            variant="outline" 
            className="bg-black text-white hover:bg-gray-800 border-black"
          >
            View Plans for Student & Educators
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default SubscriptionPage;