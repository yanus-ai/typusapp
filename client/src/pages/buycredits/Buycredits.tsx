import MainLayout from "@/components/layout/MainLayout";
import Sidebar from "@/components/layout/Sidebar";
import { Check, Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useAppSelector } from "@/hooks/useAppSelector";
import { toast } from "sonner";
import subscriptionService from "@/services/subscriptionService";
import { useCreditData } from "@/hooks/useCreditData";
import { useTranslation } from "@/hooks/useTranslation";

type CreditPlan = {
  id: number;
  credits: number;
  price: string;
  features: string[];
};

// Helper function to get plan features based on language
const getPlanFeatures = (t: (key: string) => string): string[] => {
  return [
    t('payment.creditsDoNotExpire'),
    t('payment.activePlanRequired'),
    t('payment.noRefundsOnTopUps')
  ];
};

// Helper function to check if subscription is usable
const isSubscriptionUsable = (subscription: any) => {
  if (!subscription) return false;

  const now = new Date();
  const periodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : now;

  return (
    subscription.status === 'ACTIVE' ||
    (subscription.status === 'CANCELLED_AT_PERIOD_END' && now <= periodEnd)
  );
};

export default function Buycredits(): React.JSX.Element {
  const { subscription, credits } = useAppSelector(state => state.auth);
  const { creditData } = useCreditData();
  const [loading, setLoading] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    // Check for success/cancel parameters
    const params = new URLSearchParams(window.location.search);

    if (params.get('success') === 'true') {
      toast.success(t('payment.creditsPurchasedSuccess'));
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('canceled') === 'true') {
      toast.error(t('payment.creditPurchaseCanceled'));
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [t]);

  const handleCreditPurchase = async (plan: CreditPlan) => {
    try {
      setLoading(plan.id.toString());
      
      // Check if user has active subscription
      if (!isSubscriptionUsable(subscription)) {
        toast.error(t('payment.needActiveSubscription'));
        return;
      }

      // Convert price to cents (remove € and multiply by 100)
      const amountInCents = parseInt(plan.price.replace(' €', '')) * 100;

      // Use subscription service for credit checkout
      await subscriptionService.redirectToCreditCheckout(plan.credits, amountInCents);
    } catch (error: any) {
      console.error('Failed to create credit checkout session:', error);
      toast.error(error.response?.data?.message || t('payment.failedToStartCreditPurchase'));
    } finally {
      setLoading(null);
    }
  };

  const hasActiveSubscription = isSubscriptionUsable(subscription);

  // Derive credit summary using real creditData with fallback to Redux
  const availableCredits = creditData?.total.available ?? credits ?? 0;
  const planAllocation = creditData?.subscription.planAllocation ?? (subscription?.planType === 'EXPLORER' ? 150 : subscription?.planType === 'PRO' ? 1000 : 50);
  const usedFromPlan = availableCredits >= planAllocation ? 0 : Math.max(0, planAllocation - availableCredits);
  const topUpRemaining = creditData?.topUp.remaining ?? 0;

  // Get plan features based on current language
  const planFeatures = getPlanFeatures(t);

  // Define plans with localized features
  const PLANS: CreditPlan[] = [
    { id: 1, credits: 50, price: "20 €", features: planFeatures },
    { id: 2, credits: 100, price: "30 €", features: planFeatures },
    { id: 3, credits: 300, price: "50 €", features: planFeatures },
  ];

  return (
     <MainLayout>
        {/* Sidebar */}
              <Sidebar />
    <div className="w-full px-6 py-8 overflow-auto">
      <div className="w-full h-full">
        <div className="" />

        {/* <div className="bg-black text-white text-center text-xs tracking-widest py-3">
          Buy Extra Credits
        </div> */}

        <div className="px-8 md:px-12 lg:px-20 py-12">
          {/* Credit summary */}
          <div className="max-w-3xl mx-auto grid grid-cols-3 gap-4 mb-8">
            <div className="text-center p-3 bg-gray-50 rounded-none">
              <div className="text-2xl font-bold text-gray-900">{availableCredits.toLocaleString()}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">{t('payment.availableNow')}</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-none">
              <div className="text-2xl font-bold text-gray-900">{usedFromPlan.toLocaleString()}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">{t('payment.usedFromPlan')}</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-none">
              <div className="text-2xl font-bold text-gray-900">{planAllocation.toLocaleString()}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">{t('payment.planAllocation')}</div>
            </div>
          </div>

          {/* Top-up summary (shown only if any top-up exists) */}
          {topUpRemaining > 0 && (
            <div className="max-w-3xl mx-auto mb-6 text-center text-xs text-gray-600">
              {t('payment.topUpRemaining')} <span className="font-semibold">{topUpRemaining.toLocaleString()}</span>
            </div>
          )}
          {!hasActiveSubscription && (
            <div className="bg-red-50 border border-red-200 rounded-none p-6 mb-8 max-w-2xl mx-auto">
              <div className="flex items-center space-x-3">
                <div className="bg-red-100 rounded-full p-2">
                  <Check className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-red-700 text-base mb-1">{t('payment.subscriptionRequired')}</h3>
                  <p className="text-red-600 text-sm">
                    {t('payment.needActiveSubscriptionForCredits')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 items-start justify-items-center">
            {PLANS.map((plan) => (
              <article
                key={plan.id}
                className={`w-full max-w-xs bg-white text-black p-6 shadow-sm transition-all duration-200 rounded-none ${
                  !hasActiveSubscription ? 'opacity-50' : ''
                }`}
                aria-label={t('payment.topUpCreditsForPrice', { credits: plan.credits, price: plan.price })}>

                <header className="flex items-center justify-between mb-4">
                  <h3 className="text-base tracking-widest">{plan.credits} {t('payment.credits')}</h3>
                  <div className="text-sm font-semibold">{plan.price}</div>
                </header>

                <ul className="space-y-2 text-xs opacity-90 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
               <Check className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span className="leading-4">{f.toUpperCase()}</span>
                    </li>
                  ))}
                </ul>

                <div className="text-center">
                  <button 
                    onClick={() => handleCreditPurchase(plan)}
                    disabled={!hasActiveSubscription || loading === plan.id.toString()}
                    className={`tracking-widest text-sm uppercase px-6 py-2 rounded-none transition-all duration-200 ease-in-out flex items-center justify-center gap-2 ${
                      !hasActiveSubscription 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'text-gray-600 border border-transparent hover:border-black hover:bg-transparent hover:text-black'
                    }`}
                  >
                    {loading === plan.id.toString() ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('payment.processing')}
                      </>
                    ) : (
                      t('payment.topUp')
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-12 text-center text-xs tracking-wider text-gray-500">
            {t('payment.onlySubscribedUsersCanPurchase')}
          </p>
        </div>
      </div>
    </div>
    </MainLayout>
  );
}
