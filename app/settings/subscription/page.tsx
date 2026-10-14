"use client";

import * as React from "react";
import Link from "next/link";
import {
  Crown,
  Sparkles,
  Check,
  Zap,
  RotateCcw,
  Heart,
  MessageCircle,
  Eye,
  Sliders,
  ShieldCheck,
  ArrowLeft,
  CreditCard,
  Receipt,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

interface SubscriptionData {
  planTier: "free" | "plus" | "premium";
  status: string;
  isPaidActive: boolean;
  entitlements: {
    dailyLikes: number;
    dailyCompliments: number;
    dailyRewinds: number;
    seeWhoLikedYou: boolean;
    advancedFilters: boolean;
    priorityDiscovery: boolean;
    unlimitedMessaging: boolean;
    safetyControls: boolean;
  };
  quotas: {
    likesUsedToday: number;
    likesRemaining: number;
    complimentsUsedToday: number;
    complimentsRemaining: number;
  };
}

interface Invoice {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  receiptUrl: string | null;
  billingReason: string | null;
  createdAt: string;
}

export default function SubscriptionSettingsPage() {
  const [data, setData] = React.useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [billingInterval, setBillingInterval] = React.useState<"month" | "year">("month");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCheckingOut, setIsCheckingOut] = React.useState<string | null>(null);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSubscriptionInfo = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [subRes, invRes] = await Promise.all([
        fetch("/api/subscriptions/current"),
        fetch("/api/subscriptions/invoices"),
      ]);

      if (subRes.ok) {
        const subData = await subRes.json();
        setData(subData.entitlements);
      }

      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.invoices || []);
      }
    } catch (err: any) {
      console.error("Failed to load subscription details", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSubscriptionInfo();
  }, [fetchSubscriptionInfo]);

  const handleUpgrade = async (planTier: "plus" | "premium") => {
    setIsCheckingOut(planTier);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planTier,
          billingInterval,
          returnUrl: window.location.href,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to create checkout session.");

      // Redirect to Stripe Checkout
      if (resData.checkoutUrl) {
        window.location.href = resData.checkoutUrl;
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Checkout failed." });
      setIsCheckingOut(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You will retain access until the end of the billing period.")) {
      return;
    }

    setIsCancelling(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ immediate: false }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to cancel subscription.");

      setStatusMessage({ type: "success", text: resData.message });
      fetchSubscriptionInfo();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to cancel subscription." });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/discovery">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
          </Link>
          <div className="flex items-center space-x-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg font-bold tracking-tight text-slate-100">
              Membership & Subscriptions
            </h1>
          </div>
        </div>
        <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-xs">
          Test Mode / Sandbox
        </Badge>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-8">
        {/* Status Alerts */}
        {statusMessage && (
          <Alert
            variant={statusMessage.type === "error" ? "danger" : "success"}
            className={
              statusMessage.type === "success"
                ? "bg-emerald-950/60 border-emerald-800 text-emerald-200"
                : ""
            }
          >
            {statusMessage.text}
          </Alert>
        )}

        {/* Current Plan Overview Card */}
        {data && (
          <Card className="bg-slate-900 border-slate-800 overflow-hidden">
            <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-800/80">
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Current Plan</span>
                  <Badge variant={data.isPaidActive ? "brand" : "default"} className="capitalize">
                    {data.planTier.toUpperCase()}
                  </Badge>
                  <Badge variant={data.status === "active" ? "success" : "warning"} className="capitalize">
                    {data.status}
                  </Badge>
                </div>
                <h2 className="text-2xl font-black text-slate-100">
                  {data.planTier === "premium"
                    ? "Conextion Premium Membership"
                    : data.planTier === "plus"
                    ? "Conextion Plus Membership"
                    : "Conextion Free Tier"}
                </h2>
                <p className="text-xs text-slate-400">
                  {data.isPaidActive
                    ? "Your active membership grants elevated discovery and unlimited connections."
                    : "Upgrade to Plus or Premium for unlimited likes, rewind capability, and priority discovery."}
                </p>
              </div>

              {data.isPaidActive && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 shrink-0 text-xs"
                >
                  {isCancelling ? "Processing..." : "Cancel Subscription"}
                </Button>
              )}
            </div>

            {/* Quota Usage Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-800/60 bg-slate-950/40 p-4 text-xs">
              <div className="p-3">
                <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  Daily Likes
                </span>
                <span className="text-base font-bold text-slate-200">
                  {data.entitlements.dailyLikes === Infinity ? "Unlimited" : `${data.quotas.likesRemaining} remaining`}
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5">
                  Used today: {data.quotas.likesUsedToday}
                </span>
              </div>

              <div className="p-3">
                <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Compliments / Icebreakers
                </span>
                <span className="text-base font-bold text-slate-200">
                  {data.entitlements.dailyCompliments === 0 ? "0 / day (Plus+)" : `${data.quotas.complimentsRemaining} remaining`}
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5">
                  Used today: {data.quotas.complimentsUsedToday}
                </span>
              </div>

              <div className="p-3">
                <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                  Pass Rewinds
                </span>
                <span className="text-base font-bold text-slate-200">
                  {data.entitlements.dailyRewinds === Infinity
                    ? "Unlimited"
                    : data.entitlements.dailyRewinds === 0
                    ? "Locked (Plus+)"
                    : `${data.entitlements.dailyRewinds} / day`}
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5">
                  Undo last pass
                </span>
              </div>

              <div className="p-3">
                <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                  See Who Liked You
                </span>
                <span className="text-base font-bold text-slate-200">
                  {data.entitlements.seeWhoLikedYou ? "Enabled" : "Locked (Premium)"}
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5">
                  Direct match preview
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Billing Interval Toggle */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center">
            <button
              onClick={() => setBillingInterval("month")}
              className={`px-5 py-2 text-xs font-semibold rounded-lg transition-all ${
                billingInterval === "month"
                  ? "bg-rose-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingInterval("year")}
              className={`px-5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                billingInterval === "year"
                  ? "bg-rose-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Annual Billing</span>
              <span className="bg-amber-400 text-slate-950 text-[10px] font-bold px-1.5 py-0.2 rounded">
                Save 33%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing & Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* FREE PLAN */}
          <Card className="bg-slate-900 border-slate-800 flex flex-col justify-between">
            <CardContent className="p-6 space-y-6">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Basic Tier</span>
                <h3 className="text-xl font-bold text-slate-100 mt-1">Conextion Free</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-100">$0</span>
                  <span className="text-xs text-slate-400 ml-1">/ forever</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Genuine connections and full safety protections with standard daily limits.
                </p>
              </div>

              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>25 daily candidate likes</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Unlimited messaging with matches</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Full blocking & safety reporting</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>GDPR data export & privacy controls</span>
                </li>
              </ul>
            </CardContent>

            <div className="p-6 pt-0">
              <Button
                variant="outline"
                disabled
                className="w-full text-xs border-slate-700 text-slate-400"
              >
                {data?.planTier === "free" ? "Active Plan" : "Basic Tier"}
              </Button>
            </div>
          </Card>

          {/* PLUS PLAN */}
          <Card className="bg-slate-900 border-rose-500/30 relative flex flex-col justify-between shadow-lg shadow-rose-950/20">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-[10px] tracking-wider uppercase px-3 py-0.5 rounded-full shadow">
              Most Popular
            </div>

            <CardContent className="p-6 space-y-6">
              <div>
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Elevated Dating</span>
                <h3 className="text-xl font-bold text-slate-100 mt-1">Conextion Plus</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-100">
                    {billingInterval === "year" ? "$9.99" : "$14.99"}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">/ month</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Unlimited swiping, rewind control, and advanced lifestyle discovery filters.
                </p>
              </div>

              <ul className="space-y-3 text-xs text-slate-200">
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Unlimited candidate likes</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>5 rewind passes per day</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>3 complimentary icebreakers daily</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Advanced lifestyle & intent filters</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Ad-free premium discovery</span>
                </li>
              </ul>
            </CardContent>

            <div className="p-6 pt-0">
              <Button
                variant="primary"
                onClick={() => handleUpgrade("plus")}
                disabled={data?.planTier === "plus" || isCheckingOut !== null}
                className="w-full text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md shadow-rose-600/30"
              >
                {data?.planTier === "plus"
                  ? "Current Active Plan"
                  : isCheckingOut === "plus"
                  ? "Initializing Checkout..."
                  : "Upgrade to Plus"}
              </Button>
            </div>
          </Card>

          {/* PREMIUM PLAN */}
          <Card className="bg-slate-900 border-amber-500/30 flex flex-col justify-between shadow-lg shadow-amber-950/20">
            <CardContent className="p-6 space-y-6">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Ultimate VIP</span>
                <h3 className="text-xl font-bold text-slate-100 mt-1">Conextion Premium</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-100">
                    {billingInterval === "year" ? "$19.99" : "$29.99"}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">/ month</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  The definitive discovery suite with priority matching exposure and direct admirer reveal.
                </p>
              </div>

              <ul className="space-y-3 text-xs text-slate-200">
                <li className="flex items-center gap-2 font-medium">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>See who liked you before matching</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Priority candidate discovery (2x matching exposure)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Unlimited candidate rewinds</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>10 complimentary icebreakers daily</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Global Passport travel mode</span>
                </li>
              </ul>
            </CardContent>

            <div className="p-6 pt-0">
              <Button
                variant="primary"
                onClick={() => handleUpgrade("premium")}
                disabled={data?.planTier === "premium" || isCheckingOut !== null}
                className="w-full text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/30"
              >
                {data?.planTier === "premium"
                  ? "Current Active Plan"
                  : isCheckingOut === "premium"
                  ? "Initializing Checkout..."
                  : "Upgrade to Premium"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Invoice & Payment History */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100 flex items-center">
                <Receipt className="w-4 h-4 mr-2 text-rose-500" />
                Payment & Billing History
              </h2>
              <span className="text-xs text-slate-400">{invoices.length} transactions</span>
            </div>

            {invoices.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No billing transactions recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5">Amount</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5">Description</th>
                      <th className="py-2.5 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="py-3 text-slate-300">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 font-semibold text-slate-100">
                          ${(inv.amountCents / 100).toFixed(2)} {inv.currency.toUpperCase()}
                        </td>
                        <td className="py-3">
                          <Badge
                            variant={
                              inv.status === "succeeded"
                                ? "success"
                                : inv.status === "refunded"
                                ? "warning"
                                : "danger"
                            }
                            className="capitalize text-[10px]"
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-slate-400 capitalize">
                          {inv.billingReason?.replace(/_/g, " ") || "Subscription"}
                        </td>
                        <td className="py-3 text-right">
                          {inv.receiptUrl ? (
                            <a
                              href={inv.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 font-medium"
                            >
                              <span>View Receipt</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
