import { FC, useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppSelector } from '@/hooks/useAppSelector';
import subscriptionService, { PricingPlan } from '@/services/subscriptionService';
import { CheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import MainLayout from '@/components/layout/MainLayout';
import Sidebar from '@/components/layout/Sidebar';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import squareSpinner from '@/assets/animations/square-spinner.lottie';

export const SubscriptionPage: FC = () => {
  const { subscription } = useAppSelector(state => state.auth);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [educationalPlans, setEducationalPlans] = useState<PricingPlan[]>([]);
  const [isStudent, setIsStudent] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [educationalBillingCycle, setEducationalBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  // Set initial billing cycle based on current subscription or default to monthly
  useEffect(() => {
    if (subscription && subscription.billingCycle) {
      setBillingCycle(subscription.billingCycle);
      setEducationalBillingCycle(subscription.billingCycle);
    } else {
      setBillingCycle('MONTHLY');
      setEducationalBillingCycle('MONTHLY');
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

  const handleEducationalUpgrade = async (planType: 'STARTER' | 'EXPLORER' | 'PRO') => {
    if (!isStudent) {
      toast.error('Educational plans are only available for verified students');
      return;
    }

    try {
      setUpgrading(planType);
      await subscriptionService.redirectToCheckout(planType, educationalBillingCycle, true);
    } catch (error) {
      console.error('Failed to start educational upgrade process:', error);
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
    return subscription?.planType === planType && subscription?.billingCycle === billingCycle && subscription?.status === 'ACTIVE';
  };

  const canUpgradeToPlan = (planType: string) => {
    if (!subscription || subscription.status !== 'ACTIVE') return true; // No active subscription means they can get any plan
    
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
    if (!subscription || subscription.status !== 'ACTIVE') return false;
    
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

  const getEducationalPlanPrice = (plan: PricingPlan) => {
    const price = educationalBillingCycle === 'MONTHLY' ? plan.prices.monthly : plan.prices.yearly;
    const displayPrice = subscriptionService.formatPrice(price);
    
    if (educationalBillingCycle === 'YEARLY') {
      const monthlyEquivalent = subscriptionService.getMonthlyEquivalent(price);
      return { display: `${displayPrice} ${monthlyEquivalent}`, period: '/Year' };
    }
    
    return { display: displayPrice, period: '/Month' };
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <DotLottieReact
          src={squareSpinner}
          loop
          autoplay
          style={{ width: 80, height: 80 }}
        />
      </div>
    );
  }``

  return (
    <MainLayout>
      {/* Sidebar */}
      <Sidebar />

      <div className="w-full px-6 py-8 overflow-auto">
        <div className='max-w-7xl mx-auto'>
          {/* Header */}
          <div className="text-center my-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-6 font-siggnal">Professional Plans</h1>
          </div>

          {/* Professional Plans */}
          <div className="mb-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Professional Plans</h2>
            </div>
            
            {/* Professional Plans Billing Toggle */}
            <div className="flex flex-col items-center mb-8">
              <div className="bg-white p-1 rounded-full flex mb-2 relative">
                <button
                  onClick={() => setBillingCycle('YEARLY')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                    billingCycle === 'YEARLY'
                      ? 'bg-red-50 text-red-500 border border-red-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Yearly Billing
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    75% OFF
                  </span>
                </button>
                <button
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                    billingCycle === 'MONTHLY'
                      ? 'bg-red-50 text-red-500 border border-red-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Monthly Billing
                </button>
              </div>
              {billingCycle === 'YEARLY' && (
                <p className="text-gray-600 text-sm">Switch to Yearly to save <span className="font-semibold">75%</span></p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const priceInfo = getPlanPrice(plan);
              const isCurrent = isCurrentPlan(plan.planType);
              
              return (
                <Card key={plan.planType} className={`relative bg-white border-2 bg-white ${
                  isCurrent ? 'border-red-400 shadow-lg' : 'border-transparent'
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
                          {billingCycle === 'YEARLY' 
                            ? subscriptionService.formatPrice(plan.prices.yearly / 12)
                            : priceInfo.display.split(' ')[0]
                          }
                        </span>
                        <span className="text-lg text-gray-600 ml-1">
                          {'/ month'}
                        </span>
                      </div>
                      {billingCycle === 'YEARLY' ? (
                        <p className="text-gray-600 mt-1">
                          Billed yearly <span className='font-bold text-black'>{`(${subscriptionService.formatPrice(plan.prices.yearly)}/year)`}</span>
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600 mt-1">
                          {'Billed monthly'}
                        </p>
                      )}
                      <p className='text-gray-600 mt-2 text-sm'>Plus 19% VAT</p>
                    </div>
                    
                    {billingCycle === 'YEARLY' && (
                      <div className="flex items-center text-sm text-gray-600 mb-4">
                        <span>Save {subscriptionService.formatPrice((plan.prices.monthly * 12) - plan.prices.yearly)} with annual billing 75% off</span>
                      </div>
                    )}
                    
                    {/* Features */}
                    <div className="space-y-3 mb-6 flex-1">
                      {plan.planType === 'STARTER' && (
                        <>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">50 CREDITS /month (e.g. 30 base images and 10 Refinements )</span>
                          </div>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">OPT. CREDITS TOP UPS</span>
                          </div>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">UNLIMITED CONCURRENT JOBS</span>
                          </div>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">INTEGRATED REFINER</span>
                          </div>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">CANCEL ANYTIME</span>
                          </div>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">SECURE PAYMENT ON STRIPE</span>
                          </div>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">ALL PLUGIN INTEGRATIONS</span>
                          </div>
                        </>
                      )}
                      {plan.planType === 'EXPLORER' && (
                        <>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">150 CREDITS /month (e.g. 100 base images and 10 Refinements )</span>
                          </div>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">OPT. CREDITS TOP UPS</span>
                          </div>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">2 CONCURRENT JOBS</span>
                          </div>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">INTEGRATED REFINER</span>
                          </div>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">CANCEL ANYTIME</span>
                          </div>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">SECURE PAYMENT ON STRIPE</span>
                          </div>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">ALL PLUGIN INTEGRATIONS</span>
                          </div>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">RESOLUTION UP TO 4K</span>
                          </div>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">NO QUEUE</span>
                          </div>
                        </>
                      )}
                      {plan.planType === 'PRO' && (
                        <>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">1000 CREDITS /month (e.g. 800 base images and 40 Refinements)</span>
                          </div>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">ALL FEATURES FROM EXPLORER</span>
                          </div>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">4 CONCURRENT JOBS</span>
                          </div>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">PREMIUM LIVE VIDEO CALL SUPPORT</span>
                          </div>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">INCREASED SPEED OF GENERATION</span>
                          </div>
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                            <span className="text-sm text-gray-700">RESOLUTION UP TO 13K</span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Action Button */}
                    <Button
                      onClick={
                        isStudent
                          ? undefined
                          : subscription && subscription.status === 'ACTIVE'
                          ? handleManageSubscription
                          : () => handleUpgrade(plan.planType as 'STARTER' | 'EXPLORER' | 'PRO')
                      }
                      disabled={isStudent}
                      className={`w-full rounded-lg font-medium ${
                        isStudent
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          : isCurrent
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-800 text-white hover:bg-gray-700'
                      }`}
                    >
                      {upgrading === plan.planType
                        ? 'Loading...'
                        : isCurrent
                        ? 'Manage Subscription'
                        : !subscription || subscription.status !== 'ACTIVE'
                        ? 'Subscribe'
                        : canUpgradeToPlan(plan.planType)
                        ? 'Upgrade Plan'
                        : canDowngradeToPlan(plan.planType)
                        ? 'Downgrade Plan'
                        : 'Subscribe'
                      }
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </div>

          {/* Educational Plans Section */}
          <div className="mt-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">🎓 Educational Plans</h2>
              <p className="text-lg text-gray-700">Exclusive pricing for students and educators</p>
            </div>

            {/* Educational Plans Billing Toggle */}
            <div className="flex flex-col items-center mb-8">
              <div className="bg-white p-1 rounded-full flex mb-2 relative">
                <button
                  onClick={() => setEducationalBillingCycle('YEARLY')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                    educationalBillingCycle === 'YEARLY'
                      ? 'bg-red-50 text-red-500 border border-red-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Yearly Billing
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    75% OFF
                  </span>
                </button>
                <button
                  onClick={() => setEducationalBillingCycle('MONTHLY')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                    educationalBillingCycle === 'MONTHLY'
                      ? 'bg-red-50 text-red-500 border border-red-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Monthly Billing
                </button>
              </div>
              {educationalBillingCycle === 'YEARLY' && (
                <p className="text-gray-600 text-sm">Switch to Yearly to save <span className="font-semibold">75%</span></p>
              )}
            </div>

            {/* Student verification notice */}
            {!isStudent && (
              <div className="bg-red-500/10 border border-red-300 rounded-xl p-5 mb-8 shadow-sm max-w-4xl mx-auto">
                <div className="flex items-start space-x-3">
                  <div className="bg-red-100 rounded-full p-2">
                    <CheckIcon className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-700 text-base mb-1">Student Verification Required</h3>
                    <p className="text-red-600 text-sm leading-relaxed">
                      Educational plans are exclusively available for verified students. Please register with a university email address or contact support to verify your student status.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Educational Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {educationalPlans.map((plan) => {
                const priceInfo = getEducationalPlanPrice(plan);
                
                return (
                  <Card key={`edu-${plan.planType}`} className="relative bg-white border-2 border-gray-200 rounded-2xl overflow-hidden border-transparent">
                    <CardContent className="p-6 h-full flex flex-col">
                      {/* Plan Name */}
                      <h3 className="text-lg font-semibold mb-4 text-gray-700">
                        {plan.planType} - Student
                      </h3>
                      
                      {/* Price */}
                      <div className="mb-4">
                        <div className="flex items-baseline">
                          <span className="text-3xl font-bold text-black">
                            {educationalBillingCycle === 'YEARLY' 
                              ? subscriptionService.formatPrice(plan.prices.yearly / 12)
                              : priceInfo.display.split(' ')[0]
                            }
                          </span>
                          <span className="text-lg text-gray-600 ml-1">
                            {'/ month'}
                          </span>
                        </div>
                        {educationalBillingCycle === 'YEARLY' ? (
                          <p className="text-gray-600 mt-1">
                            Billed yearly <span className='font-bold text-black'>{`(${subscriptionService.formatPrice(plan.prices.yearly)}/year)`}</span>
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600 mt-1">
                            {'Billed monthly'}
                          </p>
                        )}
                        <p className='text-gray-600 mt-2 text-sm'>Plus 19% VAT</p>
                      </div>
                      
                      {educationalBillingCycle === 'YEARLY' && (
                        <div className="flex items-center text-sm text-gray-600 mb-4">
                          <span>Save {subscriptionService.formatPrice((plan.prices.monthly * 12) - plan.prices.yearly)} with annual billing 75% off</span>
                        </div>
                      )}
                      
                      {/* Features */}
                      <div className="space-y-3 mb-6 flex-1">
                        {plan.planType === 'STARTER' && (
                          <>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">50 CREDITS /month (e.g. 30 base images and 10 Refinements )</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">OPT. CREDITS TOP UPS</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">UNLIMITED CONCURRENT JOBS</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">INTEGRATED REFINER</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">CANCEL ANYTIME</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">SECURE PAYMENT ON STRIPE</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">ALL PLUGIN INTEGRATIONS</span>
                            </div>
                          </>
                        )}
                        {plan.planType === 'EXPLORER' && (
                          <>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">150 CREDITS /month (e.g. 100 base images and 10 Refinements )</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">OPT. CREDITS TOP UPS</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">2 CONCURRENT JOBS</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">INTEGRATED REFINER</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">CANCEL ANYTIME</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">SECURE PAYMENT ON STRIPE</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">ALL PLUGIN INTEGRATIONS</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">RESOLUTION UP TO 4K</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">NO QUEUE</span>
                            </div>
                          </>
                        )}
                        {plan.planType === 'PRO' && (
                          <>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">1000 CREDITS /month (e.g. 800 base images and 40 Refinements)</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">ALL FEATURES FROM EXPLORER</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">4 CONCURRENT JOBS</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">PREMIUM LIVE VIDEO CALL SUPPORT</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">INCREASED SPEED OF GENERATION</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">RESOLUTION UP TO 13K</span>
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Action Button */}
                      <Button
                        onClick={
                          !isStudent
                            ? undefined
                            : subscription && subscription.status === 'ACTIVE'
                            ? handleManageSubscription
                            : () => handleEducationalUpgrade(plan.planType)
                        }
                        disabled={!isStudent || upgrading === plan.planType}
                        className={`w-full rounded-lg font-medium transition-all duration-200 ${
                          !isStudent 
                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                            : 'bg-gray-800 text-white hover:bg-gray-700'
                        }`}
                      >
                        {upgrading === plan.planType ? (
                          'Loading...'
                        ) : (
                          'Subscribe'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default SubscriptionPage;