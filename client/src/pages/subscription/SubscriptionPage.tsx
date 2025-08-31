import { FC, useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppSelector } from '@/hooks/useAppSelector';
import subscriptionService, { PricingPlan } from '@/services/subscriptionService';
import { CheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import MainLayout from '@/components/layout/MainLayout';
import Sidebar from '@/components/layout/Sidebar';
import EducationalPlansModal from '@/components/subscription/EducationalPlansModal';

export const SubscriptionPage: FC = () => {
  const { subscription } = useAppSelector(state => state.auth);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [educationalPlans, setEducationalPlans] = useState<PricingPlan[]>([]);
  const [isStudent, setIsStudent] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [showEducationalModal, setShowEducationalModal] = useState(false);

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
      setPlans(plansData.regularPlans);
      setEducationalPlans(plansData.educationalPlans);
      setIsStudent(plansData.isStudent);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      toast.error('Failed to load pricing plans');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planType: 'STARTER' | 'EXPLORER' | 'PRO') => {
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
    return subscription?.planType === planType && subscription?.billingCycle === billingCycle;
  };

  const canUpgradeToPlan = (planType: string) => {
    if (!subscription) return true; // No subscription means they can get any plan
    
    // If it's the exact same plan and billing cycle, they can't upgrade to it
    if (subscription.planType === planType && subscription.billingCycle === billingCycle) {
      return false;
    }
    
    // If it's the same plan type but different billing cycle, allow the change
    if (subscription.planType === planType && subscription.billingCycle !== billingCycle) {
      return true;
    }
    
    // For different plan types, check hierarchy
    const planHierarchy = { 'STARTER': 1, 'EXPLORER': 2, 'PRO': 3 };
    const currentLevel = planHierarchy[subscription.planType as keyof typeof planHierarchy] || 0;
    const targetLevel = planHierarchy[planType as keyof typeof planHierarchy] || 0;
    
    return targetLevel > currentLevel;
  };

  const canDowngradeToPlan = (planType: string) => {
    if (!subscription) return false;
    
    // If it's the exact same plan and billing cycle, they can't downgrade to it
    if (subscription.planType === planType && subscription.billingCycle === billingCycle) {
      return false;
    }
    
    // If it's the same plan type but different billing cycle, allow the change
    if (subscription.planType === planType && subscription.billingCycle !== billingCycle) {
      return true;
    }
    
    // For different plan types, check hierarchy
    const planHierarchy = { 'STARTER': 1, 'EXPLORER': 2, 'PRO': 3 };
    const currentLevel = planHierarchy[subscription.planType as keyof typeof planHierarchy] || 0;
    const targetLevel = planHierarchy[planType as keyof typeof planHierarchy] || 0;
    
    return targetLevel < currentLevel;
  };

  const getPlanPrice = (plan: PricingPlan) => {
    const price = billingCycle === 'MONTHLY' ? plan.prices.monthly : plan.prices.yearly;
    const displayPrice = subscriptionService.formatPrice(price);
    
    if (billingCycle === 'YEARLY') {
      const monthlyEquivalent = subscriptionService.getMonthlyEquivalent(price);
      return { display: `${displayPrice} ${monthlyEquivalent}`, period: '/Year' };
    }
    
    return { display: displayPrice, period: '/Month' };
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

      <div className="container mx-auto px-6 py-8 overflow-auto">
        <div className='max-w-7xl mx-auto'>
          {/* Header */}
          <div className="text-center my-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Professional Plans</h1>
            {/* Student & Educator Link */}
            <div className="text-center">
              <Button 
                variant="outline" 
                className="text-lg py-6 px-4"
                onClick={() => setShowEducationalModal(true)}
              >
                🎓 View Plans for Students & Educators
              </Button>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gray-100 p-1 rounded-full flex mb-2">
              <button
                onClick={() => setBillingCycle('YEARLY')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  billingCycle === 'YEARLY'
                    ? 'bg-gray-300 text-gray-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Yearly Billing
              </button>
              <button
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  billingCycle === 'MONTHLY'
                    ? 'bg-black text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Monthly Billing
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {plans.map((plan) => {
              const priceInfo = getPlanPrice(plan);
              const isCurrent = isCurrentPlan(plan.planType);
              
              return (
                <Card key={plan.planType} className={`relative bg-white border-2 ${
                  isCurrent ? 'border-red-400 shadow-lg' : 'border-gray-200'
                } rounded-2xl overflow-hidden`}>
                  <CardContent className="p-6 h-full flex flex-col">
                    {/* Plan Name */}
                    <h3 className="text-lg font-semibold mb-4 text-gray-700">
                      {plan.planType}
                    </h3>
                    
                    {/* Price */}
                    <div className="mb-4">
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-black">
                          {priceInfo.display.split(' ')[0]}
                        </span>
                        <span className="text-lg text-gray-600 ml-1"> / month</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 capitalize">Billed {billingCycle}</p>
                    </div>
                    
                    {billingCycle === 'YEARLY' && (
                      <div className="flex items-center text-sm text-gray-600 mb-4">
                        <span>Save with annual billing (20% off)</span>
                        <span className="ml-1">↗</span>
                      </div>
                    )}
                    
                    {/* Features */}
                    <div className="space-y-3 mb-6 flex-1">
                      <div className="flex items-center">
                        <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-orange-500" />
                        <span className="text-sm text-gray-700">{plan.credits.toLocaleString()} credits per {billingCycle.toLowerCase().replace('ly', '')}</span>
                      </div>
                      <div className="flex items-center">
                        <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-orange-500" />
                        <span className="text-sm text-gray-700">Shared Purchased Compute resource</span>
                      </div>
                      <div className="flex items-center">
                        <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-orange-500" />
                        <span className="text-sm text-gray-700">Access all Praii features</span>
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    <Button
                      onClick={
                        isCurrent
                          ? handleManageSubscription
                          : canUpgradeToPlan(plan.planType)
                          ? () => handleUpgrade(plan.planType as 'STARTER' | 'EXPLORER' | 'PRO')
                          : canDowngradeToPlan(plan.planType)
                          ? handleManageSubscription
                          : undefined
                      }
                      className={`w-full rounded-lg font-medium ${
                        isCurrent
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-800 text-white hover:bg-gray-700'
                      }`}
                    >
                      {upgrading === plan.planType
                        ? 'Loading...'
                        : isCurrent
                        ? 'Active'
                        : canUpgradeToPlan(plan.planType)
                        ? 'Upgrade Plan'
                        : canDowngradeToPlan(plan.planType)
                        ? 'Downgrade Plan'
                        : 'Upgrade Plan'
                      }
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Educational Plans Modal */}
          <EducationalPlansModal
            isOpen={showEducationalModal}
            onClose={() => setShowEducationalModal(false)}
            educationalPlans={educationalPlans}
            isStudent={isStudent}
            billingCycle={billingCycle}
            onBillingCycleChange={setBillingCycle}
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default SubscriptionPage;