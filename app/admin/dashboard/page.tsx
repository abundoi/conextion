"use client";

import * as React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  Headphones,
  DollarSign,
  Activity,
  FileText,
  Search,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Lock,
  MessageSquare,
  Send,
  Sliders,
  ChevronRight,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

interface PlatformMetrics {
  overview: {
    eligibleRegistrations: number;
    activeMembers: number;
    suspendedOrBanned: number;
    completedProfiles: number;
    profileCompletionRate: number;
  };
  engagement: {
    totalInteractions: number;
    totalLikes: number;
    totalPasses: number;
    likeRatio: number;
    mutualMatches: number;
    matchConversionRate: number;
    totalConversations: number;
    totalMessagesSent: number;
  };
  retention: {
    weeklyCohortActive: number;
    monthlyCohortActive: number;
  };
  monetization: {
    paidSubscriptions: number;
    freeSubscriptions: number;
    subscriptionConversionRate: number;
    churnedSubscriptions: number;
    churnRate: number;
    totalGrossRevenueCents: number;
    totalGrossRevenueFormatted: string;
    totalRefundedCents: number;
  };
  safetyAndModeration: {
    totalReportsFiled: number;
    pendingCases: number;
    resolvedCases: number;
    criticalSlaCases: number;
    meanResolutionTimeMinutes: number;
    moderatorWorkload: { reviewerId: string; reviewerEmail: string; casesResolved: number }[];
  };
}

interface MemberAccount {
  id: string;
  email: string;
  role: string;
  accountStatus: string;
  createdAt: string;
  profile?: {
    displayName: string;
    computedAge: number;
    gender: string;
    locationCity: string | null;
    isProfileComplete: boolean;
  } | null;
  subscriptions?: { planTier: string; status: string }[];
}

interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  escalatedToSafety: boolean;
  createdAt: string;
  user: { email: string; accountStatus: string };
  assignedTo?: { email: string } | null;
  messages: { id: string; content: string; isInternal: boolean; createdAt: string; sender: { email: string; role: string } }[];
}

interface AuditLog {
  id: string;
  action: string;
  targetEntity: string;
  targetId: string | null;
  details: any;
  createdAt: string;
  actor: { email: string; role: string };
}

interface SystemHealth {
  status: string;
  database: { connected: boolean; responseTimeMs: number };
  auth: { provider: string; operational: boolean };
  storage: { provider: string; operational: boolean };
  metrics: { totalUsers: number; memoryUsageMb: number; uptimeSeconds: number };
}

export default function EnterpriseAdminConsolePage() {
  const [activeTab, setActiveTab] = React.useState<"analytics" | "members" | "support" | "audit" | "health" | "policies">("analytics");
  const [metrics, setMetrics] = React.useState<PlatformMetrics | null>(null);
  const [accounts, setAccounts] = React.useState<MemberAccount[]>([]);
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = React.useState<SupportTicket | null>(null);
  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([]);
  const [health, setHealth] = React.useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  // Search & Filters
  const [memberSearch, setMemberSearch] = React.useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = React.useState("all");

  // Ticket Reply Form
  const [replyContent, setReplyContent] = React.useState("");
  const [isInternalNote, setIsInternalNote] = React.useState(false);
  const [isSendingReply, setIsSendingReply] = React.useState(false);

  // Policy CMS Form
  const [selectedPolicySlug, setSelectedPolicySlug] = React.useState("terms-of-service");
  const [policyTitle, setPolicyTitle] = React.useState("");
  const [policyContent, setPolicyContent] = React.useState("");
  const [isSavingPolicy, setIsSavingPolicy] = React.useState(false);

  // Role / Status Modification
  const [selectedAccount, setSelectedAccount] = React.useState<MemberAccount | null>(null);
  const [actionReason, setActionReason] = React.useState("");

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === "analytics") {
        const res = await fetch("/api/admin/metrics");
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.metrics);
        }
      } else if (activeTab === "members") {
        const query = memberSearch ? `?search=${encodeURIComponent(memberSearch)}` : "";
        const res = await fetch(`/api/admin/users${query}`);
        if (res.ok) {
          const data = await res.json();
          setAccounts(data.accounts || []);
        }
      } else if (activeTab === "support") {
        const query = ticketStatusFilter !== "all" ? `?status=${ticketStatusFilter}` : "";
        const res = await fetch(`/api/support/tickets${query}`);
        if (res.ok) {
          const data = await res.json();
          setTickets(data.tickets || []);
          if (data.tickets?.length > 0 && !selectedTicket) {
            setSelectedTicket(data.tickets[0]);
          }
        }
      } else if (activeTab === "audit") {
        const res = await fetch("/api/admin/audit-logs");
        if (res.ok) {
          const data = await res.json();
          setAuditLogs(data.logs || []);
        }
      } else if (activeTab === "health") {
        const res = await fetch("/api/admin/health");
        if (res.ok) {
          const data = await res.json();
          setHealth(data);
        }
      } else if (activeTab === "policies") {
        const res = await fetch(`/api/content/policies?slug=${selectedPolicySlug}`);
        if (res.ok) {
          const data = await res.json();
          setPolicyTitle(data.page.title);
          setPolicyContent(data.page.content);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load administration data.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, memberSearch, ticketStatusFilter, selectedTicket, selectedPolicySlug]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Reply to ticket
  const handleSendTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyContent.trim()) return;

    setIsSendingReply(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyContent.trim(),
          isInternal: isInternalNote,
        }),
      });

      if (!res.ok) throw new Error("Failed to post message.");
      const data = await res.json();

      setSelectedTicket((prev) =>
        prev ? { ...prev, messages: [...prev.messages, data.message] } : null
      );
      setReplyContent("");
      setStatusMessage(isInternalNote ? "Internal staff note attached." : "Reply sent to member.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Escalate ticket to safety
  const handleEscalateTicket = async () => {
    if (!selectedTicket) return;
    const reason = prompt("Enter justification for escalating this case to Trust & Safety:");
    if (!reason?.trim()) return;

    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      if (!res.ok) throw new Error("Failed to escalate ticket.");
      setStatusMessage("Ticket successfully escalated to Trust & Safety queue with Critical SLA.");
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Save policy
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPolicy(true);
    setError(null);
    try {
      const res = await fetch("/api/content/policies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: selectedPolicySlug,
          title: policyTitle,
          content: policyContent,
        }),
      });

      if (!res.ok) throw new Error("Failed to update policy page.");
      setStatusMessage("Policy page published successfully.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSavingPolicy(false);
    }
  };

  // Status override
  const handleStatusOverride = async (newStatus: string) => {
    if (!selectedAccount) return;
    if (!actionReason.trim()) {
      setError("Please provide an administrative reason for the audit log.");
      return;
    }

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: selectedAccount.id,
          action: "update_status",
          newStatus,
          reason: actionReason.trim(),
        }),
      });

      if (!res.ok) throw new Error("Status override failed.");
      setStatusMessage(`Account status updated to ${newStatus.toUpperCase()}.`);
      setSelectedAccount(null);
      setActionReason("");
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <LayoutDashboard className="w-6 h-6 text-rose-500" />
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
              Enterprise Admin & Analytics
            </span>
          </div>
          <Badge variant="outline" className="text-rose-400 border-rose-500/30 text-xs">
            Global Control Plane
          </Badge>
        </div>

        <div className="flex items-center space-x-3">
          <Link href="/admin/moderation">
            <Button variant="outline" size="sm" className="border-slate-700 text-xs hover:bg-slate-800">
              <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
              Safety Console
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="border-slate-700 hover:bg-slate-800 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/discovery">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs">
              Exit to App
            </Button>
          </Link>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-2 flex space-x-6 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`pb-2 border-b-2 flex items-center space-x-2 shrink-0 ${
            activeTab === "analytics" ? "border-rose-500 text-rose-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Executive Analytics</span>
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`pb-2 border-b-2 flex items-center space-x-2 shrink-0 ${
            activeTab === "members" ? "border-rose-500 text-rose-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Member Management</span>
        </button>
        <button
          onClick={() => setActiveTab("support")}
          className={`pb-2 border-b-2 flex items-center space-x-2 shrink-0 ${
            activeTab === "support" ? "border-rose-500 text-rose-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Headphones className="w-4 h-4" />
          <span>Customer Helpdesk</span>
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`pb-2 border-b-2 flex items-center space-x-2 shrink-0 ${
            activeTab === "audit" ? "border-rose-500 text-rose-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Immutable Audit Logs</span>
        </button>
        <button
          onClick={() => setActiveTab("health")}
          className={`pb-2 border-b-2 flex items-center space-x-2 shrink-0 ${
            activeTab === "health" ? "border-rose-500 text-rose-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Server className="w-4 h-4" />
          <span>System Health & Diagnostics</span>
        </button>
        <button
          onClick={() => setActiveTab("policies")}
          className={`pb-2 border-b-2 flex items-center space-x-2 shrink-0 ${
            activeTab === "policies" ? "border-rose-500 text-rose-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Policy & FAQ CMS</span>
        </button>
      </div>

      {/* Notifications / Alerts */}
      <div className="px-6 pt-4">
        {error && (
          <Alert variant="danger" className="mb-4">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <span>{error}</span>
          </Alert>
        )}
        {statusMessage && (
          <Alert variant="success" className="mb-4 bg-emerald-950/60 border-emerald-800 text-emerald-200">
            <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" />
            <span>{statusMessage}</span>
          </Alert>
        )}
      </div>

      {/* Main Container */}
      <main className="flex-1 px-6 py-4 overflow-y-auto">
        {/* Tab 1: Executive Analytics */}
        {activeTab === "analytics" && metrics && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Database-Backed Platform Performance</h2>
              <p className="text-xs text-slate-400 mt-0.5">Authoritative statistical metrics aggregated with zero re-identification.</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-4">
                  <span className="text-xs text-slate-400">Active Eligible Members</span>
                  <div className="text-2xl font-black text-slate-100 mt-1">{metrics.overview.activeMembers}</div>
                  <span className="text-[11px] text-emerald-400 mt-1 block">
                    {metrics.overview.profileCompletionRate}% profile completion
                  </span>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-4">
                  <span className="text-xs text-slate-400">Mutual Matches</span>
                  <div className="text-2xl font-black text-rose-400 mt-1">{metrics.engagement.mutualMatches}</div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {metrics.engagement.matchConversionRate}% like-to-match conversion
                  </span>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-4">
                  <span className="text-xs text-slate-400">Gross Paid Revenue</span>
                  <div className="text-2xl font-black text-amber-400 mt-1">
                    {metrics.monetization.totalGrossRevenueFormatted}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {metrics.monetization.subscriptionConversionRate}% paid subscriber share
                  </span>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-4">
                  <span className="text-xs text-slate-400">Mean Triage Resolution</span>
                  <div className="text-2xl font-black text-cyan-400 mt-1">
                    {metrics.safetyAndModeration.meanResolutionTimeMinutes}m
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {metrics.safetyAndModeration.resolvedCases} cases resolved
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Deep-Dive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Engagement Overview */}
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Discovery & Social Engagement</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Total Swipe Actions:</span>
                      <span className="font-semibold text-slate-200">{metrics.engagement.totalInteractions}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Likes vs Passes:</span>
                      <span className="font-semibold text-slate-200">
                        {metrics.engagement.totalLikes} / {metrics.engagement.totalPasses} ({metrics.engagement.likeRatio}% like)
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Active Conversations:</span>
                      <span className="font-semibold text-slate-200">{metrics.engagement.totalConversations}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Total Messages Delivered:</span>
                      <span className="font-semibold text-slate-200">{metrics.engagement.totalMessagesSent}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monetization & Churn */}
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Subscriptions & Churn</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Paid Members (Plus/Premium):</span>
                      <span className="font-semibold text-amber-400">{metrics.monetization.paidSubscriptions}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Free Members:</span>
                      <span className="font-semibold text-slate-200">{metrics.monetization.freeSubscriptions}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Canceled Memberships:</span>
                      <span className="font-semibold text-rose-400">{metrics.monetization.churnedSubscriptions}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Churn Rate:</span>
                      <span className="font-semibold text-slate-200">{metrics.monetization.churnRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Retention Cohorts */}
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Retention Cohorts</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">7-Day Cohort Retained:</span>
                      <span className="font-semibold text-emerald-400">{metrics.retention.weeklyCohortActive} members</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">30-Day Cohort Retained:</span>
                      <span className="font-semibold text-emerald-400">{metrics.retention.monthlyCohortActive} members</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Restricted / Banned:</span>
                      <span className="font-semibold text-rose-400">{metrics.overview.suspendedOrBanned} accounts</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 2: Member Account Management */}
        {activeTab === "members" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Member Directory & Account Control</h2>
                <p className="text-xs text-slate-400">Search and adjudicate accounts with appropriate administrative permissions.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadData()}
                    placeholder="Search by email or ID..."
                    className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:border-rose-500 w-64"
                  />
                </div>
                <Button size="sm" onClick={loadData} className="text-xs">
                  Search
                </Button>
              </div>
            </div>

            {/* Accounts Table */}
            <Card className="bg-slate-900 border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-950/50">
                    <tr>
                      <th className="py-3 px-4">Member</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Plan</th>
                      <th className="py-3 px-4">Age / City</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {accounts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                          No member accounts found matching search criteria.
                        </td>
                      </tr>
                    ) : (
                      accounts.map((acc) => (
                        <tr key={acc.id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-200">{acc.profile?.displayName || "Unnamed"}</div>
                            <div className="text-[11px] text-slate-400">{acc.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={acc.role === "member" ? "default" : "brand"} className="capitalize">
                              {acc.role.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                acc.accountStatus === "active"
                                  ? "success"
                                  : acc.accountStatus === "pending_verification"
                                  ? "warning"
                                  : "danger"
                              }
                              className="capitalize"
                            >
                              {acc.accountStatus.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 capitalize text-slate-300">
                            {acc.subscriptions?.[0]?.planTier || "Free"}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {acc.profile?.computedAge ? `${acc.profile.computedAge}y` : "—"} · {acc.profile?.locationCity || "—"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedAccount(acc)}
                              className="text-xs border-slate-700 hover:bg-slate-800 h-7 px-2.5"
                            >
                              Manage
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Account Action Modal / Panel */}
            {selectedAccount && (
              <Card className="bg-slate-900 border-rose-500/40 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">
                      Manage Account: {selectedAccount.email}
                    </h3>
                    <span className="text-xs text-slate-400">ID: {selectedAccount.id}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedAccount(null)} className="text-xs">
                    Close
                  </Button>
                </div>

                <div className="space-y-3">
                  <label className="text-xs text-slate-400 block">
                    Mandatory Administrative Rationale (Logged to immutable audit history):
                  </label>
                  <input
                    type="text"
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Provide reason for account status change..."
                    className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded p-2 focus:outline-none focus:border-rose-500"
                  />

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleStatusOverride("active")}
                      className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                    >
                      Set Active
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleStatusOverride("suspended")}
                      className="text-xs"
                    >
                      Suspend Account
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleStatusOverride("banned")}
                      className="text-xs bg-rose-950 border border-rose-800 text-rose-200 hover:bg-rose-900 font-bold"
                    >
                      Permanent Ban
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Tab 3: Customer Helpdesk & Support Tickets */}
        {activeTab === "support" && (
          <div className="grid grid-cols-12 gap-6 h-[calc(100vh-210px)]">
            {/* Tickets Queue */}
            <div className="col-span-12 lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Support Ticket Queue</span>
                <select
                  value={ticketStatusFilter}
                  onChange={(e) => setTicketStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs rounded px-2 py-1 text-slate-200"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_member">Waiting on Member</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
                {tickets.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    No tickets in queue.
                  </div>
                ) : (
                  tickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedTicket?.id === t.id
                          ? "bg-slate-800/80 border-l-4 border-l-rose-500"
                          : "hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <Badge variant={t.priority === "urgent" ? "danger" : t.priority === "high" ? "warning" : "default"}>
                          {t.priority.toUpperCase()}
                        </Badge>
                        <span className="text-[11px] text-slate-400">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-200 truncate">{t.subject}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{t.user.email}</div>
                      {t.escalatedToSafety && (
                        <span className="inline-block mt-1 text-[10px] text-rose-400 font-bold">
                          • Escalated to Safety
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Ticket Deep-Dive & Conversation */}
            <div className="col-span-12 lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden p-6">
              {selectedTicket ? (
                <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                  <div className="border-b border-slate-800 pb-3 flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-100">{selectedTicket.subject}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Member: {selectedTicket.user.email} · Status: <span className="capitalize">{selectedTicket.status}</span>
                      </p>
                    </div>
                    {!selectedTicket.escalatedToSafety && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleEscalateTicket}
                        className="border-rose-800 text-rose-300 hover:bg-rose-950 text-xs"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-400" />
                        Escalate to Safety
                      </Button>
                    )}
                  </div>

                  {/* Message Thread */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {selectedTicket.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3 rounded-lg text-xs ${
                          m.isInternal
                            ? "bg-amber-950/40 border border-amber-800/80 text-amber-200"
                            : m.sender.role !== "member"
                            ? "bg-slate-800 text-slate-200 ml-6"
                            : "bg-slate-950 text-slate-300 mr-6"
                        }`}
                      >
                        <div className="flex justify-between items-center text-[10px] opacity-70 mb-1">
                          <span className="font-bold">
                            {m.sender.email} ({m.isInternal ? "Confidential Staff Note" : m.sender.role})
                          </span>
                          <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reply Composer */}
                  <form onSubmit={handleSendTicketReply} className="border-t border-slate-800 pt-3 space-y-2">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={isInternalNote ? "Write internal staff observation (hidden from member)..." : "Write reply to member..."}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded p-2 focus:outline-none focus:border-rose-500"
                    />
                    <div className="flex justify-between items-center">
                      <label className="flex items-center space-x-2 text-xs text-amber-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          className="rounded border-slate-700"
                        />
                        <span>Internal Staff Note Only</span>
                      </label>
                      <Button type="submit" size="sm" disabled={isSendingReply || !replyContent.trim()} className="text-xs">
                        <Send className="w-3.5 h-3.5 mr-1" />
                        {isSendingReply ? "Sending..." : "Send"}
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                  Select a support ticket from the queue.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Immutable Audit Logs */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Immutable Security Audit Trail</h2>
              <p className="text-xs text-slate-400">Append-only operational logs recording all administrative, moderation, and billing events.</p>
            </div>

            <Card className="bg-slate-900 border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-950/50">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Target Entity</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-slate-200">
                          {log.actor?.email} ({log.actor?.role})
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-rose-400">{log.action}</td>
                        <td className="py-2.5 px-4 text-slate-300">{log.targetEntity}</td>
                        <td className="py-2.5 px-4 text-slate-400 truncate max-w-xs">
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 5: System Health */}
        {activeTab === "health" && health && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-100">System Diagnostics & Infrastructure Health</h2>
              <p className="text-xs text-slate-400">Live service telemetry and database latency monitoring.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>Database (Cloud SQL)</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    Connection: <span className="font-semibold text-emerald-400">OPERATIONAL</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Query Roundtrip: {health.database.responseTimeMs} ms
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>Identity Platform</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    Provider: {health.auth.provider}
                  </div>
                  <div className="text-xs text-slate-400">Session Engine: Verified</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>Media Storage</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    Provider: {health.storage.provider}
                  </div>
                  <div className="text-xs text-slate-400">V4 Signed Uploads: Active</div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-900 border-slate-800 p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Node.js Runtime Metrics</h3>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Memory RSS:</span>
                  <span className="font-bold text-slate-200">{health.metrics.memoryUsageMb} MB</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Process Uptime:</span>
                  <span className="font-bold text-slate-200">{health.metrics.uptimeSeconds} seconds</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Active Member Pool:</span>
                  <span className="font-bold text-slate-200">{health.metrics.totalUsers} registered</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 6: Policy & FAQ CMS */}
        {activeTab === "policies" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Content Management & Policy Editor</h2>
                <p className="text-xs text-slate-400">Super Admin control to update public policy documents and FAQs.</p>
              </div>
              <div className="flex gap-2">
                {["terms-of-service", "privacy-policy", "community-guidelines", "faq"].map((slug) => (
                  <Button
                    key={slug}
                    size="sm"
                    variant={selectedPolicySlug === slug ? "primary" : "outline"}
                    onClick={() => setSelectedPolicySlug(slug)}
                    className="text-xs capitalize"
                  >
                    {slug.replace(/-/g, " ")}
                  </Button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSavePolicy} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Document Title</label>
                <input
                  type="text"
                  value={policyTitle}
                  onChange={(e) => setPolicyTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded p-2.5 focus:outline-none focus:border-rose-500 font-semibold"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Markdown Body</label>
                <textarea
                  value={policyContent}
                  onChange={(e) => setPolicyContent(e.target.value)}
                  rows={14}
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded p-3 font-mono focus:outline-none focus:border-rose-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={isSavingPolicy} className="text-xs bg-rose-600 hover:bg-rose-500">
                  {isSavingPolicy ? "Publishing Changes..." : "Publish Document Update"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
