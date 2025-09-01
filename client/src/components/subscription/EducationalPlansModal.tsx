import { FC, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckIcon, AlertCircleIcon } from 'lucide-react';
import { PricingPlan } from '@/services/subscriptionService';
import subscriptionService from '@/services/subscriptionService';
import { toast } from 'sonner';

interface EducationalPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  educationalPlans: PricingPlan[];
  isStudent: boolean;
  billingCycle: 'MONTHLY' | 'YEARLY';
  onBillingCycleChange: (cycle: 'MONTHLY' | 'YEARLY') => void;
}

const EducationalPlansModal: FC<EducationalPlansModalProps> = ({
  isOpen,
  onClose,
  educationalPlans,
  isStudent,
  billingCycle,
  onBillingCycleChange,
}) => {
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const handleEducationalUpgrade = async (planType: 'STARTER' | 'EXPLORER' | 'PRO') => {
    if (!isStudent) {
      toast.error('Educational plans are only available for verified students');
      return;
    }

    try {
      setUpgrading(planType);
      await subscriptionService.redirectToCheckout(planType, billingCycle, true);
    } catch (error) {
      console.error('Failed to start educational upgrade process:', error);
      toast.error('Failed to start upgrade process');
      setUpgrading(null);
    }
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


  const getFeatures = (planType: string) => {
    const baseFeatures = {
      STARTER: [
        '50 CREDITS /month (e.g. 30 base images and 10 Refinements )',
        'OPT. CREDITS TOP UPS',
        'UNLIMITED CONCURRENT JOBS',
        'INTEGRATED REFINER',
        'CANCEL ANYTIME',
        'SECURE PAYMENT ON STRIPE',
        'ALL PLUGIN INTEGRATIONS',
      ],
      EXPLORER: [
        '150 CREDITS /month (e.g. 100 base images and 10 Refinements )',
        'OPT. CREDITS TOP UPS',
        '2 CONCURRENT JOBS',
        'INTEGRATED REFINER',
        'CANCEL ANYTIME',
        'SECURE PAYMENT ON STRIPE',
        'ALL PLUGIN INTEGRATIONS',
        'RESOLUTION UP TO 4K',
        'NO QUEUE',
      ],
      PRO: [
        '1000 CREDITS /month (e.g. 800 base images and 40 Refinements)',
        'ALL FEATURES FROM EXPLORER',
        '4 CONCURRENT JOBS',
        'PREMIUM LIVE VIDEO CALL SUPPORT',
        'INCREASED SPEED OF GENERATION',
        'RESOLUTION UP TO 13K',
      ],
    };
    return baseFeatures[planType as keyof typeof baseFeatures] || [];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto p-0 bg-white">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 border-b">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center text-gray-900 mb-2">
              🎓 Educational Plans
            </DialogTitle>
            <p className="text-center text-gray-700 text-lg">
              Exclusive pricing for students and educators
            </p>
          </DialogHeader>
        </div>
        
        <div className="p-6 bg-white">{/* Ensure white background for main content */}

        {/* Student verification notice */}
        {!isStudent && (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-300 rounded-xl p-6 mb-8 shadow-sm">
            <div className="flex items-start space-x-4">
              <div className="bg-gray-200 rounded-full p-2">
                <AlertCircleIcon className="h-6 w-6 text-gray-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-lg mb-2">Student Verification Required</h3>
                <p className="text-gray-700 leading-relaxed">
                  Educational plans are exclusively available for verified students. Please register with a university email address or contact support to verify your student status.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gray-100 p-1 rounded-full flex mb-2 relative">
            <button
              onClick={() => onBillingCycleChange('YEARLY')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                billingCycle === 'YEARLY'
                  ? 'border border-black border-2 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Yearly Billing
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                75% OFF
              </span>
            </button>
            <button
              onClick={() => onBillingCycleChange('MONTHLY')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                billingCycle === 'MONTHLY'
                  ? 'border border-black border-2 shadow-sm'
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

        {/* Educational Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {educationalPlans.map((plan) => {
            const { display } = getPlanPrice(plan);
            const features = getFeatures(plan.planType);
            
            return (
              <div key={plan.planType} className="relative">
                <Card
                  className="relative bg-white border-2 border-gray-200 rounded-2xl overflow-hidden h-full"
                >
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
                            ? subscriptionService.formatPrice(plan.prices.yearly)
                            : display.split(' ')[0]
                          }
                        </span>
                        <span className="text-lg text-gray-600 ml-1">
                          {billingCycle === 'YEARLY' ? ' / year' : ' / month'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {billingCycle === 'YEARLY' 
                          ? `Billed yearly (${subscriptionService.formatPrice(plan.prices.yearly / 12)}/month)`
                          : 'Billed monthly'
                        }
                      </p>
                    </div>
                    
                    {billingCycle === 'YEARLY' && (
                      <div className="flex items-center text-sm text-gray-600 mb-4">
                        <span>Save {subscriptionService.formatPrice((plan.prices.monthly * 12) - plan.prices.yearly)} with annual billing 75% off</span>
                      </div>
                    )}

                    {/* Features */}
                    <div className="space-y-3 mb-6 flex-1">
                      {features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center">
                          <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-orange-500" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={() => handleEducationalUpgrade(plan.planType)}
                      disabled={!isStudent || upgrading === plan.planType}
                      className="w-full rounded-lg font-medium bg-gray-800 text-white hover:bg-gray-700"
                    >
                      {upgrading === plan.planType ? (
                        'Loading...'
                      ) : !isStudent ? (
                        'Student Verification Required'
                      ) : (
                        `Get ${plan.planType} Plan`
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
        
        </div>{/* End main content */}
      </DialogContent>
    </Dialog>
  );
};

export default EducationalPlansModal;
