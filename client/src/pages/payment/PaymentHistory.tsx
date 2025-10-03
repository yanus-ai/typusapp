import MainLayout from "@/components/layout/MainLayout";
import Sidebar from "@/components/layout/Sidebar";
import React from "react";

interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
}

const history: PaymentHistoryItem[] = [
  { id: "pi_1", amount: 2000, currency: "eur", status: "succeeded", created: 1696245600 },
  { id: "pi_2", amount: 3000, currency: "eur", status: "succeeded", created: 1696332000 },
  { id: "pi_3", amount: 5000, currency: "eur", status: "failed", created: 1696418400 },
];

export default function PaymentHistory(): JSX.Element {
  return (
     <MainLayout>
             {/* Sidebar */}
              <Sidebar />
    <div className="w-full px-6 py-8 overflow-auto flex justify-center items-start">
      <div className="w-full  overflow-hidden">
        {/* <div className="bg-black text-white text-center text-sm tracking-widest py-4 font-semibold">
          PAYMENT HISTORY
        </div> */}

        <div className="px-6 py-8 space-y-4">
          {history.length === 0 ? (
            <p className="text-center text-gray-600">No payments found.</p>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 bg-white rounded-lg p-5 flex items-center justify-between transition"
              >
                <div>
                  <p className="text-sm text-gray-500">Payment ID</p>
                  <p className="font-mono text-sm text-gray-800">{item.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-medium">{(item.amount / 100).toFixed(2)} {item.currency.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p
                    className={`font-semibold ${
                      item.status === "succeeded" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {item.status}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="text-sm text-gray-700">
                    {new Date(item.created * 1000).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
    </MainLayout>
  );
}
