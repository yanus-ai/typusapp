import MainLayout from "@/components/layout/MainLayout";
import Sidebar from "@/components/layout/Sidebar";
import { Check, Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useAppSelector } from "@/hooks/useAppSelector";
import { toast } from "sonner";
import subscriptionService from "@/services/subscriptionService";

type CreditPlan = {
  id: number;
  credits: number;
  price: string;
  features: string[];
};

const PLANS: CreditPlan[] = [
  { id: 1, credits: 50, price: "20 €", features: ["Credits do not expire", "Active plan required", "No refunds on top ups"] },
  { id: 2, credits: 100, price: "30 €", features: ["Credits do not expire", "Active plan required", "No refunds on top ups"] },
  { id: 3, credits: 300, price: "50 €", features: ["Credits do not expire", "Active plan required", "No refunds on top ups"] },
];

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
  const { subscription } = useAppSelector(state => state.auth);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    // Check for success/cancel parameters
    const params = new URLSearchParams(window.location.search);

    if (params.get('success') === 'true') {
      toast.success('Credits purchased successfully! Your credits have been added to your account.');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('canceled') === 'true') {
      toast.error('Credit purchase was canceled.');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleCreditPurchase = async (plan: CreditPlan) => {
    try {
      setLoading(plan.id.toString());
      
      // Check if user has active subscription
      if (!isSubscriptionUsable(subscription)) {
        toast.error('You need an active subscription to purchase credits. Please subscribe to a plan first.');
        return;
      }

      // Convert price to cents (remove € and multiply by 100)
      const amountInCents = parseInt(plan.price.replace(' €', '')) * 100;

      // Use subscription service for credit checkout
      await subscriptionService.redirectToCreditCheckout(plan.credits, amountInCents);
    } catch (error: any) {
      console.error('Failed to create credit checkout session:', error);
      toast.error(error.response?.data?.message || 'Failed to start credit purchase');
    } finally {
      setLoading(null);
    }
  };

  const hasActiveSubscription = isSubscriptionUsable(subscription);

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
          {!hasActiveSubscription && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 max-w-2xl mx-auto">
              <div className="flex items-center space-x-3">
                <div className="bg-red-100 rounded-full p-2">
                  <Check className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-red-700 text-base mb-1">Subscription Required</h3>
                  <p className="text-red-600 text-sm">
                    You need an active subscription to purchase additional credits. Please subscribe to a monthly or yearly plan first.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 items-start justify-items-center">
            {PLANS.map((plan) => (
              <article
                key={plan.id}
                className={`w-full max-w-xs bg-white text-black p-6 shadow-sm transition-all duration-200 rounded-xl ${
                  !hasActiveSubscription ? 'opacity-50' : ''
                }`}
                aria-label={`Top up ${plan.credits} credits for ${plan.price}`}>

                <header className="flex items-center justify-between mb-4">
                  <h3 className="text-base tracking-widest">{plan.credits} CREDITS</h3>
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
                    className={`tracking-widest text-sm uppercase px-6 py-2 rounded-md transition-colors duration-150 flex items-center justify-center gap-2 ${
                      !hasActiveSubscription 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100'
                    }`}
                  >
                    {loading === plan.id.toString() ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Top up'
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-12 text-center text-xs tracking-wider text-gray-500">
            ONLY SUBSCRIBED USERS CAN PURCHASE ADDITIONAL CREDITS. FIRST SUBSCRIBE TO A MONTHLY OR YEARLY PLAN.
          </p>
        </div>
      </div>
    </div>
    </MainLayout>
  );
}
