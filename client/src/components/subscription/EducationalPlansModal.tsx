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

  const getPlanCardClass = (plan: PricingPlan) => {
    if (plan.planType === 'STARTER') return 'bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 text-white border-gray-600 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300';
    if (plan.planType === 'EXPLORER') return 'bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white border-gray-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 relative';
    if (plan.planType === 'PRO') return 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white border-gray-800 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300';
    return 'bg-white border-gray-200';
  };

  const getFeatures = (planType: string) => {
    const baseFeatures = {
      STARTER: [
        '50 credits per month',
        'Basic image generation',
        'Standard support',
        '25% student discount',
      ],
      EXPLORER: [
        '150 credits per month',
        'Advanced image generation',
        'Priority processing',
        '25% student discount',
      ],
      PRO: [
        '1,000 credits per month',
        'Professional features',
        'Fastest processing',
        '25% student discount',
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
        <div className="flex justify-center mb-8">
          <div className="bg-white border border-gray-200 p-1 rounded-xl flex shadow-sm">
            <button
              onClick={() => onBillingCycleChange('MONTHLY')}
              className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                billingCycle === 'MONTHLY'
                  ? 'bg-gradient-to-r from-gray-800 to-black text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => onBillingCycleChange('YEARLY')}
              className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 relative ${
                billingCycle === 'YEARLY'
                  ? 'bg-gradient-to-r from-gray-800 to-black text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Yearly Billing
              <span
                className="ml-2 text-xs bg-yellow-100 text-yellow-800 border-yellow-200"
              >
                Save 25%
              </span>
            </button>
          </div>
        </div>

        {/* Educational Plans Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {educationalPlans.map((plan) => {
            const { display, period } = getPlanPrice(plan);
            const features = getFeatures(plan.planType);
            const isPopular = plan.planType === 'EXPLORER';
            
            return (
              <div key={plan.planType} className="relative">
                <Card
                  className={`relative overflow-hidden ${getPlanCardClass(plan)} ${
                    isPopular ? 'ring-2 ring-gray-400 ring-opacity-60' : ''
                  }`}
                >
                  <CardContent className="p-8">
                    {/* Student Badge */}
                    <div className="absolute top-4 right-4">
                      <span className="bg-white/20 text-white border-white/30 font-semibold px-2 py-1 rounded-full text-sm">
                        🎓 Student
                      </span>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                      <p className="text-sm opacity-90 mb-6 leading-relaxed">{plan.description}</p>
                      
                      <div className="mb-6">
                        <div className="text-4xl font-bold mb-1">{display}</div>
                        <div className="text-sm opacity-75 font-medium">{period}</div>
                        {billingCycle === 'YEARLY' && (
                          <div className="text-xs opacity-75 mt-1">Save 25% compared to monthly</div>
                        )}
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-3 mb-8">
                      {features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-start space-x-3">
                          <div className="bg-white/20 rounded-full p-1 mt-0.5">
                            <CheckIcon className="h-3 w-3 flex-shrink-0" />
                          </div>
                          <span className="text-sm leading-relaxed">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={() => handleEducationalUpgrade(plan.planType)}
                      disabled={!isStudent || upgrading === plan.planType}
                      className={`w-full py-3 font-bold text-base transition-all duration-200 ${
                        'bg-white text-gray-900 hover:bg-gray-50 shadow-md hover:shadow-lg'
                      }`}
                      size="lg"
                    >
                      {upgrading === plan.planType ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-gray-900 mr-3"></div>
                          Processing...
                        </>
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
