import MainLayout from "@/components/layout/MainLayout";
import Sidebar from "@/components/layout/Sidebar";
import { useEffect, useState, useRef, useCallback } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Receipt, CreditCard } from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import squareSpinner from '@/assets/animations/square-spinner.lottie';

interface PaymentHistoryItem {
  id: string;
  payment_intent_id?: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  description?: string;
  receipt_url?: string;
  receipt_number?: string;
  invoice_pdf?: string;
  invoice_number?: string;
  payment_method?: string;
}

interface PaymentHistoryResponse {
  payments: PaymentHistoryItem[];
  hasMore: boolean;
  totalCount: number;
  nextStartingAfter?: string;
}

export default function PaymentHistory() {
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextStartingAfter, setNextStartingAfter] = useState<string | null>(null);

  // Ref for infinite scroll observer
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchPaymentHistory = async (startingAfter?: string) => {
    try {
      if (startingAfter) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setHistory([]);
      }

      const params = new URLSearchParams();
      params.append('limit', '20');
      if (startingAfter) {
        params.append('starting_after', startingAfter);
      }

      const response = await api.get(`/subscription/payment-history?${params.toString()}`);
      const data: PaymentHistoryResponse = response.data;

      if (startingAfter) {
        // Append to existing history
        setHistory(prev => [...prev, ...data.payments]);
      } else {
        // Replace history
        setHistory(data.payments);
      }

      setHasMore(data.hasMore);
      setNextStartingAfter(data.nextStartingAfter || null);
    } catch (err: any) {
      console.error('Error fetching payment history:', err);
      setError('Failed to load payment history');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (nextStartingAfter && !loadingMore && hasMore) {
      fetchPaymentHistory(nextStartingAfter);
    }
  }, [nextStartingAfter, loadingMore, hasMore]);

  // Infinite scroll effect
  useEffect(() => {
    if (!observerRef.current || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
      }
    );

    observer.observe(observerRef.current);

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore, loading]);

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'canceled':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <MainLayout>
        <Sidebar />
        <div className="w-full space-y-6 p-6 flex-1 overflow-auto">
          <div className="flex items-center justify-center min-h-96">
            <DotLottieReact
              src={squareSpinner}
              loop
              autoplay
              style={{ width: 80, height: 80 }}
            />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Sidebar />
      <div className="w-full space-y-6 p-6 flex-1 overflow-auto">
        <div className='max-w-7xl mx-auto'>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight font-siggnal">Payment History</h1>
            <p className="text-sm text-gray-600 mt-2">
              View your complete payment and billing history
            </p>
          </div>

          {/* Content */}
          {error ? (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-6 text-center">
                <div className="text-red-600 mb-2">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                </div>
                <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Payment History</h3>
                <p className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          ) : history.length === 0 ? (
            <Card className="bg-site-white border-0 shadow-none">
              <CardContent className="p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <Receipt className="h-16 w-16 mx-auto mb-4" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment History</h3>
                <p className="text-gray-600 mb-6">You haven't made any payments yet.</p>
                <Button
                  variant="outline"
                  className="bg-white text-black border-0 shadow hover:shadow-md"
                  onClick={() => window.location.href = '/subscription'}
                >
                  View Subscription Plans
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <Card key={item.id} className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="px-6">
                    <div className="flex items-center justify-between">
                      {/* Payment Info */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Payment Intent ID & Description */}
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Payment ID</p>
                          <p className="font-mono text-sm text-gray-900 font-medium">
                            {item.payment_intent_id || item.id}
                          </p>
                          {item.description && (
                            <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                          )}
                        </div>

                        {/* Amount */}
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Amount</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {formatAmount(item.amount, item.currency)}
                          </p>
                        </div>

                        {/* Status */}
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Status</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </div>

                        {/* Date */}
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Date</p>
                          <p className="text-sm text-gray-900">
                            {new Date(item.created * 1000).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(item.created * 1000).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Receipt Link */}
                      {item.receipt_url && (
                        <div className="ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            <a
                              href={item.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                            >
                              <Receipt className="h-4 w-4" />
                              Receipt
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Infinite scroll loading indicator */}
          {hasMore && (
            <div ref={observerRef} className="mt-8 flex justify-center py-4">
              {loadingMore && (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                  <span className="text-sm">Loading more payments...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
