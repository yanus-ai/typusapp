import { FC, useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppSelector } from '@/hooks/useAppSelector';
import subscriptionService, { PricingPlan } from '@/services/subscriptionService';
import { CheckIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import MainLayout from '@/components/layout/MainLayout';
import Sidebar from '@/components/layout/Sidebar';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loader from '@/assets/animations/loader.lottie';
import { Link } from 'react-router-dom';

export const SubscriptionPage: FC = () => {
  const { subscription } = useAppSelector(state => state.auth);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [educationalPlans, setEducationalPlans] = useState<PricingPlan[]>([]);
  const [isStudent, setIsStudent] = useState(false);
  // Standard plans only use THREE_MONTHLY, no toggle needed
  const billingCycle = 'THREE_MONTHLY';
  const [educationalBillingCycle, setEducationalBillingCycle] = useState<'MONTHLY' | 'SIX_MONTHLY' | 'YEARLY'>('MONTHLY');
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  // Set initial billing cycle for educational plans based on current subscription
  useEffect(() => {
    if (subscription && subscription.billingCycle && ['MONTHLY', 'YEARLY'].includes(subscription.billingCycle)) {
      setEducationalBillingCycle(subscription.billingCycle as 'MONTHLY' | 'YEARLY');
    } else {
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

      // If user has existing subscription, redirect to Stripe portal
      if (subscription && subscription.status === 'ACTIVE') {
        console.log(`🔄 User has active subscription - redirecting to Stripe portal for plan change`);
        await subscriptionService.redirectToPortal();
      } else {
        // New subscription - use checkout (standard plans use THREE_MONTHLY)
        console.log(`🔄 Creating new subscription for ${planType}/THREE_MONTHLY`);
        await subscriptionService.redirectToCheckout(planType, 'THREE_MONTHLY', false);
      }

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

      // If user has existing subscription, redirect to Stripe portal
      if (subscription && subscription.status === 'ACTIVE') {
        console.log(`🔄 User has active subscription - redirecting to Stripe portal for educational plan change`);
        await subscriptionService.redirectToPortal();
      } else {
        // New educational subscription - use checkout
        console.log(`🔄 Creating new educational subscription for ${planType}/${educationalBillingCycle}`);
        await subscriptionService.redirectToCheckout(planType, educationalBillingCycle, true);
      }

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
    return subscription?.planType === planType && subscription?.billingCycle === billingCycle && subscription?.status === 'ACTIVE' && subscription?.isEducational !== true;
  };

  const isCurrentEducationalPlan = (planType: string) => {
    return subscription?.planType === planType && subscription?.billingCycle === educationalBillingCycle && subscription?.status === 'ACTIVE' && subscription?.isEducational === true;
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

  // All subscription changes now go through Stripe Customer Portal

  const getPlanPrice = (plan: PricingPlan) => {
    // Standard plans only use THREE_MONTHLY
    const price = plan.prices.threeMonthly || 0;
    const period = '/3 Months';
    const displayPrice = subscriptionService.formatPrice(price);
    const monthlyEquivalent = `(€${(price / 3 / 100).toFixed(0)}/month)`;
    return { display: `${displayPrice} ${monthlyEquivalent}`, period, threeMonthPrice: price };
  };

  const getEducationalPlanPrice = (plan: PricingPlan) => {
    let price: number;
    let period: string;
    let displayPrice: string;
    
    if (educationalBillingCycle === 'MONTHLY') {
      price = plan.prices.monthly || 0;
      period = '/Month';
      displayPrice = subscriptionService.formatPrice(price);
    } else {
      price = plan.prices.yearly || 0;
      period = '/Year';
      displayPrice = subscriptionService.formatPrice(price);
      const monthlyEquivalent = subscriptionService.getMonthlyEquivalent(price);
      return { display: `${displayPrice} ${monthlyEquivalent}`, period };
    }
    
    return { display: displayPrice, period };
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <DotLottieReact
          src={loader}
          loop
          autoplay
          style={{ transform: 'scale(3)', width: 80, height: 80 }}
        />
      </div>
    );
  }

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
            {/* Trial Notice */}
            <div className="flex flex-col items-center mb-8">
              <div className="bg-green-50 border border-green-200 rounded-none p-4 mb-4 max-w-2xl">
                <p className="text-green-800 text-center font-semibold">
                  <span className="text-green-600 font-bold">1-day free trial</span> for professional Architects | Sign up with company email account to get started.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const priceInfo = getPlanPrice(plan);
                const isCurrent = isCurrentPlan(plan.planType);
                
                return (
                  <Card key={plan.planType} className={`relative border-2 bg-white ${
                    isCurrent ? 'border-red-400 shadow-lg' : 'border-transparent'
                  } rounded-none overflow-hidden`}>
                    <CardContent className="p-6 h-full flex flex-col">
                      {/* Plan Name */}
                      <h3 className="text-lg font-semibold mb-4 text-gray-700">
                        {plan.planType}
                      </h3>
                      
                      {/* Price */}
                      <div className="mb-4">
                        <div className="flex items-baseline">
                          <span className="text-3xl font-bold text-black">
                            {subscriptionService.formatPrice(priceInfo.threeMonthPrice / 3)}
                          </span>
                          <span className="text-lg text-gray-600 ml-1">
                            /month
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1 text-sm">
                          <span className='font-semibold'>{priceInfo.display.split(' ')[0]}</span>
                          <span className='text-gray-600'> billed every 3 months</span>
                        </p>
                        <p className='text-gray-600 mt-2 text-sm'>Plus 19% VAT</p>
                        <p className='text-green-600 mt-2 text-sm font-semibold'>1-day free trial</p>
                      </div>
                      
                      
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
                              <span className="text-sm text-gray-700 uppercase">2k resolution</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700 uppercase">all plugin integrations</span>
                            </div>
                            <div className="flex items-center">
                              <X className="h-4 w-4 mr-3 flex-shrink-0 text-gray-400" />
                              <span className="text-sm text-gray-500 uppercase">no support</span>
                            </div>
                            <div className="flex items-center">
                              <X className="h-4 w-4 mr-3 flex-shrink-0 text-gray-400" />
                              <span className="text-sm text-gray-500 uppercase">no image editing</span>
                            </div>
                            <div className="flex items-center">
                              <X className="h-4 w-4 mr-3 flex-shrink-0 text-gray-400" />
                              <span className="text-sm text-gray-500 uppercase">no upscale</span>
                            </div>
                            <div className="flex items-center">
                              <X className="h-4 w-4 mr-3 flex-shrink-0 text-gray-400" />
                              <span className="text-sm text-gray-500 uppercase">no credit top ups</span>
                            </div>
                          </>
                        )}
                        {plan.planType === 'EXPLORER' && (
                          <>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700">150 CREDITS /month (e.g. 100 base images and 10 Refinements)</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700 uppercase">4k resolution (2 concurrent job)</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700 uppercase">all plugin integrations</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700 uppercase">email support</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700 uppercase">image editing</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700 uppercase">limited upscaling</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700 uppercase">credit top ups</span>
                            </div>
                          </>
                        )}
                        {plan.planType === 'PRO' && (
                          <>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700 uppercase">1000 CREDITS /month (e.g. 800 base images and 40 Refinements)</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700 uppercase">4k resolution (4 concurrent job)</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700 uppercase">all plugin integrations</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700 uppercase">email support</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700 uppercase">image editing</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700 uppercase">edit by chat</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700 uppercase">upscale up to 13k</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700 uppercase">credit top ups</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-red-500" />
                              <span className="text-sm text-gray-700 uppercase">onboarding video call</span>
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Action Button */}
                      <Button
                        type='button'
                        onClick={
                          isStudent
                            ? undefined
                            : isCurrent
                            ? handleManageSubscription
                            : () => handleUpgrade(plan.planType as 'STARTER' | 'EXPLORER' | 'PRO')
                        }
                        disabled={isStudent}
                        className={`tracking-widest text-sm uppercase px-6 py-2 rounded-none transition-all duration-200 ease-in-out flex items-center justify-center gap-2 ${
                          isStudent
                            ? 'bg-black text-white opacity-70 cursor-not-allowed'
                            : isCurrent
                            ? 'bg-black text-white border border-black'
                            : 'text-white border border-transparent hover:border-black hover:bg-transparent hover:text-black'
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
                  className={`px-4 py-2 rounded-none text-sm font-medium transition-all duration-200 ease-in-out flex items-center gap-2 ${
                    educationalBillingCycle === 'YEARLY'
                      ? 'bg-black text-white border border-black'
                      : 'text-gray-600 border border-transparent hover:border-black hover:bg-transparent hover:text-black'
                  }`}
                >
                  Yearly
                  <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full ml-1">75% off</span>
                </button>
                <button
                  onClick={() => setEducationalBillingCycle('MONTHLY')}
                  className={`px-4 py-2 rounded-none text-sm font-medium transition-all duration-200 ease-in-out ${
                    educationalBillingCycle === 'MONTHLY'
                      ? 'bg-black text-white border border-black'
                      : 'text-gray-600 border border-transparent hover:border-black hover:bg-transparent hover:text-black'
                  }`}
                >
                  Monthly
                </button>
              </div>
              {educationalBillingCycle === 'YEARLY' && (
                <p className="text-gray-600 text-sm">Switch to Yearly to save <span className="font-semibold">75%</span></p>
              )}
            </div>

            {/* Student verification notice */}
            {!isStudent && (
              <div className="bg-red-500/10 border border-red-300 rounded-none p-5 mb-8 shadow-sm max-w-4xl mx-auto">
                <div className="flex items-start space-x-3">
                  <div className="bg-red-100 rounded-full p-2">
                    <CheckIcon className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-700 text-base mb-1">Student Verification Required</h3>
                    <p className="text-red-600 text-sm leading-relaxed">
                      Educational plans are exclusively available for verified students and educators. Please register with a university email address to verify your status.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Educational Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {educationalPlans.map((plan) => {
                const priceInfo = getEducationalPlanPrice(plan);
                const isCurrentEdu = isCurrentEducationalPlan(plan.planType);
                
                return (
                  <Card key={`edu-${plan.planType}`} className={`relative border-2 bg-white ${
                    isCurrentEdu ? 'border-red-400 shadow-lg' : 'border-transparent'
                  } rounded-none overflow-hidden`}>
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
                              ? subscriptionService.formatPrice((plan.prices.yearly || 0) / 12)
                              : priceInfo.display.split(' ')[0]
                            }
                          </span>
                          <span className="text-lg text-gray-600 ml-1">
                            {'/ month'}
                          </span>
                        </div>
                        {educationalBillingCycle === 'YEARLY' ? (
                          <p className="text-gray-600 mt-1">
                            Billed yearly <span className='font-bold text-black'>{`(${subscriptionService.formatPrice(plan.prices.yearly || 0)}/year)`}</span>
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600 mt-1">
                            {'Billed monthly'}
                          </p>
                        )}
                        <p className='text-green-600 mt-2 text-sm font-semibold'>1-day free trial</p>
                        <p className='text-gray-600 mt-2 text-sm'>Plus 19% VAT</p>
                      </div>
                      
                      {educationalBillingCycle === 'YEARLY' && (
                        <div className="flex items-center text-sm text-gray-600 mb-4">
                          <span>Save {subscriptionService.formatPrice((plan.prices.monthly! * 12) - plan.prices.yearly!)} with annual billing 75% off</span>
                        </div>
                      )}
                      
                      {educationalBillingCycle === 'SIX_MONTHLY' && (
                        <div className="flex items-center text-sm text-gray-600 mb-4">
                          <span>Save {subscriptionService.formatPrice((plan.prices.monthly! * 6) - plan.prices.sixMonthly!)} with 6-month billing 66% off</span>
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
                            : isCurrentEdu
                            ? handleManageSubscription
                            : () => handleEducationalUpgrade(plan.planType)
                        }
                        disabled={!isStudent || upgrading === plan.planType}
                        className={`w-full rounded-none font-medium transition-all duration-200 ease-in-out ${
                          !isStudent
                            ? 'bg-black text-white opacity-70 cursor-not-allowed'
                            : isCurrentEdu
                            ? 'bg-black text-white border border-black'
                            : 'text-white border border-transparent hover:border-black hover:bg-transparent hover:text-black'
                        }`}
                      >
                        {upgrading === plan.planType ? (
                          'Loading...'
                        ) : isCurrentEdu ? (
                          'Manage Subscription'
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
        <div className="flex justify-center space-x-6 text-sm mt-20 mb-6">
          <Link
            to="/terms"
            target="_blank"
            className={`hover:text-gray-600 ${location.pathname === '/terms' ? 'text-black font-semibold underline' : 'text-gray-800'}`}
          >
            Terms of Service
          </Link>
          <Link
            to="/data-privacy"
            target="_blank"
            className={`hover:text-gray-600 ${location.pathname === '/data-privacy' ? 'text-black font-semibold underline' : 'text-gray-800'}`}
          >
            Data Privacy
          </Link>
          <Link
            to="/imprint"
            target="_blank"
            className={`hover:text-gray-600 ${location.pathname === '/imprint' ? 'text-black font-semibold underline' : 'text-gray-800'}`}
          >
            Imprint
          </Link>
        </div>
      </div>
    </MainLayout>
  );
};

export default SubscriptionPage;