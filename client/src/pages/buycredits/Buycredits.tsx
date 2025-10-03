import MainLayout from "@/components/layout/MainLayout";
import Sidebar from "@/components/layout/Sidebar";
import { Check } from "lucide-react";
import React from "react";

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

export default function Buycredits(): JSX.Element {
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 items-start justify-items-center">
            {PLANS.map((plan) => (
              <article
                key={plan.id}
                className="w-full max-w-xs bg-white text-black p-6 shadow-sm transition-all duration-200 rounded-xl"
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
                  <button className="tracking-widest text-sm uppercase bg-red-50 text-red-500 border border-red-200 px-6 py-2 rounded-md  transition-colors duration-150">
                    Top up
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
