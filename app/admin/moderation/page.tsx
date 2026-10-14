"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  User,
  MessageSquare,
  CheckCircle,
  XCircle,
  Ban,
  AlertOctagon,
  FileText,
  Send,
  Eye,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

interface ModerationCase {
  id: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "pending" | "reviewed" | "dismissed";
  details: string | null;
  evidence: any;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reporter: { id: string; email: string; role: string };
  reported: {
    id: string;
    email: string;
    accountStatus: string;
    profile?: {
      displayName: string;
      computedAge: number;
      gender: string;
      bio: string | null;
      locationCity: string | null;
    } | null;
    photos?: { id: string; publicUrl: string; isPrimary: boolean; moderationStatus: string }[];
  };
  notes: { id: string; note: string; createdAt: string; author: { email: string; role: string } }[];
}

interface Appeal {
  id: string;
  userId: string;
  caseId: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  decisionNotes: string | null;
  createdAt: string;
  user: { id: string; email: string; accountStatus: string };
  reviewer?: { email: string } | null;
}

export default function ModerationPortalPage() {
  const [activeTab, setActiveTab] = React.useState<"cases" | "appeals" | "slas">("cases");
  const [cases, setCases] = React.useState<ModerationCase[]>([]);
  const [appeals, setAppeals] = React.useState<Appeal[]>([]);
  const [selectedCase, setSelectedCase] = React.useState<ModerationCase | null>(null);
  const [selectedAppeal, setSelectedAppeal] = React.useState<Appeal | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  // Note form state
  const [newNote, setNewNote] = React.useState("");
  const [isSubmittingNote, setIsSubmittingNote] = React.useState(false);

  // Enforcement action state
  const [actionRationale, setActionRationale] = React.useState("");
  const [isExecutingAction, setIsExecutingAction] = React.useState(false);

  // Appeal decision state
  const [appealNotes, setAppealNotes] = React.useState("");
  const [isExecutingAppeal, setIsExecutingAppeal] = React.useState(false);

  // Filter state
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("pending");

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch moderation cases
      const queryParams = new URLSearchParams();
      if (statusFilter !== "all") queryParams.append("status", statusFilter);
      if (priorityFilter !== "all") queryParams.append("priority", priorityFilter);

      const casesRes = await fetch(`/api/moderation/cases?${queryParams.toString()}`);
      if (!casesRes.ok) {
        if (casesRes.status === 403) throw new Error("Access restricted: Staff privileges required.");
        throw new Error("Failed to load moderation cases.");
      }
      const casesData = await casesRes.json();
      setCases(casesData.cases || []);

      if (casesData.cases?.length > 0 && !selectedCase) {
        setSelectedCase(casesData.cases[0]);
      }

      // 2. Fetch appeals
      const appealsRes = await fetch("/api/moderation/appeals");
      if (appealsRes.ok) {
        const appealsData = await appealsRes.json();
        setAppeals(appealsData.appeals || []);
        if (appealsData.appeals?.length > 0 && !selectedAppeal) {
          setSelectedAppeal(appealsData.appeals[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load moderation data.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, priorityFilter, selectedCase, selectedAppeal]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle adding internal note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !newNote.trim()) return;

    setIsSubmittingNote(true);
    try {
      const res = await fetch(`/api/moderation/cases/${selectedCase.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save note.");
      }

      const noteData = await res.json();
      setSelectedCase((prev) =>
        prev ? { ...prev, notes: [...prev.notes, noteData.note] } : null
      );
      setNewNote("");
      setActionSuccess("Internal case note attached.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Handle resolving case / enforcement action
  const handleEnforcementAction = async (
    actionTaken: "dismiss" | "warning" | "reject_content" | "suspend" | "ban"
  ) => {
    if (!selectedCase) return;
    if (!actionRationale.trim()) {
      setError("Please provide a written rationale for the audit record.");
      return;
    }

    setIsExecutingAction(true);
    setError(null);
    try {
      const res = await fetch(`/api/moderation/cases/${selectedCase.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution: actionRationale.trim(),
          actionTaken,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to execute enforcement action.");
      }

      setActionSuccess(`Case successfully resolved with action: ${actionTaken.toUpperCase()}`);
      setActionRationale("");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExecutingAction(false);
    }
  };

  // Handle resolving appeal
  const handleResolveAppeal = async (decision: "approved" | "rejected") => {
    if (!selectedAppeal) return;
    if (!appealNotes.trim()) {
      setError("Decision notes are required for appeal resolution.");
      return;
    }

    setIsExecutingAppeal(true);
    setError(null);
    try {
      const res = await fetch("/api/moderation/appeals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appealId: selectedAppeal.id,
          decision,
          decisionNotes: appealNotes.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resolve appeal.");
      }

      setActionSuccess(`Appeal marked ${decision.toUpperCase()}.`);
      setAppealNotes("");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExecutingAppeal(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return <Badge variant="danger" className="animate-pulse bg-red-600 text-white font-bold">CRITICAL SLA</Badge>;
      case "high":
        return <Badge className="bg-orange-500 text-white font-semibold">HIGH</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500 text-slate-950 font-semibold">MEDIUM</Badge>;
      default:
        return <Badge variant="default">LOW</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-rose-400 to-amber-300 bg-clip-text text-transparent">
              Trust & Safety Console
            </span>
          </div>
          <Badge variant="outline" className="text-rose-400 border-rose-500/30 text-xs">
            Admin Portal
          </Badge>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="border-slate-700 hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Queue
          </Button>
          <Link href="/discovery">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              Back to App
            </Button>
          </Link>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-2 flex space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("cases")}
          className={`pb-2 border-b-2 flex items-center space-x-2 ${
            activeTab === "cases"
              ? "border-rose-500 text-rose-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          <span>Moderation Queue ({cases.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("appeals")}
          className={`pb-2 border-b-2 flex items-center space-x-2 ${
            activeTab === "appeals"
              ? "border-rose-500 text-rose-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Member Appeals ({appeals.filter((a) => a.status === "pending").length})</span>
        </button>
        <button
          onClick={() => setActiveTab("slas")}
          className={`pb-2 border-b-2 flex items-center space-x-2 ${
            activeTab === "slas"
              ? "border-rose-500 text-rose-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>SLA Policies & Triage</span>
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
        {actionSuccess && (
          <Alert className="mb-4 bg-emerald-950/60 border-emerald-800 text-emerald-200">
            <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" />
            <span>{actionSuccess}</span>
          </Alert>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 px-6 py-4 flex gap-6 overflow-hidden">
        {activeTab === "cases" && (
          <div className="flex-1 grid grid-cols-12 gap-6 h-full">
            {/* Left Column: Cases Queue */}
            <div className="col-span-12 lg:col-span-5 flex flex-col h-[calc(100vh-210px)] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              {/* Queue Controls */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/80">
                <div className="flex items-center space-x-2">
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-xs rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="all">All Priorities</option>
                    <option value="critical">Critical Only</option>
                    <option value="high">High Only</option>
                    <option value="medium">Medium Only</option>
                    <option value="low">Low Only</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-xs rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="pending">Pending Review</option>
                    <option value="reviewed">Resolved</option>
                    <option value="all">All Statuses</option>
                  </select>
                </div>
                <span className="text-xs text-slate-400">{cases.length} cases</span>
              </div>

              {/* Case Cards List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
                {cases.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    No cases match the selected filter criteria.
                  </div>
                ) : (
                  cases.map((c) => {
                    const isSelected = selectedCase?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCase(c)}
                        className={`p-4 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-slate-800/80 border-l-4 border-l-rose-500"
                            : "hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          {getPriorityBadge(c.priority)}
                          <span className="text-[11px] text-slate-400">
                            {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-slate-200 capitalize">
                          {c.category.replace(/_/g, " ")}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 truncate">
                          Target: <span className="text-slate-300">{c.reported.email}</span>
                        </div>
                        {c.details && (
                          <div className="text-xs text-slate-400 mt-1 line-clamp-2 italic bg-slate-950/40 p-1.5 rounded">
                            &ldquo;{c.details}&rdquo;
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                          <span>Status: <span className="capitalize text-slate-300">{c.status}</span></span>
                          <span>{c.notes.length} internal notes</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Case Deep-Dive & Action Console */}
            <div className="col-span-12 lg:col-span-7 flex flex-col h-[calc(100vh-210px)] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              {selectedCase ? (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Case Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h2 className="text-lg font-bold capitalize text-slate-100">
                          Case #{selectedCase.id.substring(0, 8)}: {selectedCase.category.replace(/_/g, " ")}
                        </h2>
                        {getPriorityBadge(selectedCase.priority)}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Reported by <span className="text-slate-300">{selectedCase.reporter.email}</span> on{" "}
                        {new Date(selectedCase.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={selectedCase.status === "pending" ? "outline" : "default"}>
                      {selectedCase.status.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Reported Member Profile */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center">
                      <User className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
                      Reported Account Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400">Email:</span>{" "}
                        <span className="text-slate-200 font-medium">{selectedCase.reported.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Account Status:</span>{" "}
                        <span className="font-semibold text-rose-400 capitalize">
                          {selectedCase.reported.accountStatus}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Display Name:</span>{" "}
                        <span className="text-slate-200 font-medium">
                          {selectedCase.reported.profile?.displayName || "Not set"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Computed Age:</span>{" "}
                        <span className="text-slate-200 font-medium">
                          {selectedCase.reported.profile?.computedAge || "N/A"} yrs
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400">Bio:</span>{" "}
                        <span className="text-slate-300 italic">
                          {selectedCase.reported.profile?.bio || "No biography provided."}
                        </span>
                      </div>
                    </div>

                    {/* Member Uploaded Photos */}
                    {selectedCase.reported.photos && selectedCase.reported.photos.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-800">
                        <span className="text-xs text-slate-400 block mb-2">Uploaded Profile Media:</span>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {selectedCase.reported.photos.map((photo) => (
                            <div key={photo.id} className="relative w-20 h-24 rounded overflow-hidden border border-slate-700 bg-slate-900 shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photo.publicUrl} alt="Reported photo" className="w-full h-full object-cover" />
                              {photo.isPrimary && (
                                <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[9px] text-center text-rose-300 py-0.5">
                                  Primary
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Allegation & Evidence */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center">
                      <FileText className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                      Reported Incident Evidence
                    </h3>
                    <div className="text-xs text-slate-300 bg-slate-900 p-3 rounded border border-slate-800">
                      {selectedCase.details || "No narrative details submitted with report."}
                    </div>
                  </div>

                  {/* Internal Notes Thread */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center">
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                      Confidential Staff Notes ({selectedCase.notes.length})
                    </h3>
                    <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                      {selectedCase.notes.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No notes attached yet.</p>
                      ) : (
                        selectedCase.notes.map((n) => (
                          <div key={n.id} className="text-xs bg-slate-900 p-2.5 rounded border border-slate-800">
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                              <span className="font-semibold text-slate-300">{n.author.email} ({n.author.role})</span>
                              <span>{new Date(n.createdAt).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-slate-200">{n.note}</p>
                          </div>
                        ))
                      )}
                    </div>
                    {/* Add note form */}
                    <form onSubmit={handleAddNote} className="flex gap-2">
                      <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add staff observation or triage note..."
                        className="flex-1 bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-3 py-2 focus:outline-none focus:border-rose-500"
                      />
                      <Button type="submit" size="sm" disabled={isSubmittingNote || !newNote.trim()}>
                        <Send className="w-3.5 h-3.5 mr-1" />
                        Attach
                      </Button>
                    </form>
                  </div>

                  {/* Enforcement & Adjudication Console */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2 flex items-center">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                      Adjudication & Enforcement
                    </h3>
                    <p className="text-xs text-slate-400 mb-3">
                      Automated systems flag violations, but final sanctions require human review. Provide rationale before confirming enforcement.
                    </p>
                    <textarea
                      value={actionRationale}
                      onChange={(e) => setActionRationale(e.target.value)}
                      placeholder="Mandatory rationale for audit log (e.g. 'Confirmed policy violation: verified underage indicator in photo metadata')..."
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded p-2.5 mb-3 focus:outline-none focus:border-rose-500"
                    />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEnforcementAction("dismiss")}
                        disabled={isExecutingAction}
                        className="text-xs border-slate-700 hover:bg-slate-800"
                      >
                        Dismiss (No Violation)
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEnforcementAction("warning")}
                        disabled={isExecutingAction}
                        className="text-xs bg-yellow-600 hover:bg-yellow-500 text-slate-950 font-semibold"
                      >
                        Issue Warning
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEnforcementAction("reject_content")}
                        disabled={isExecutingAction}
                        className="text-xs bg-orange-600 hover:bg-orange-500 text-white font-semibold"
                      >
                        Reject Content
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleEnforcementAction("suspend")}
                        disabled={isExecutingAction}
                        className="text-xs bg-red-700 hover:bg-red-600 font-semibold"
                      >
                        Suspend Account
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleEnforcementAction("ban")}
                        disabled={isExecutingAction}
                        className="text-xs bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 font-bold"
                      >
                        <Ban className="w-3.5 h-3.5 mr-1" />
                        Permanent Ban
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                  Select a case from the queue to view details and adjudicate.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Appeals Tab */}
        {activeTab === "appeals" && (
          <div className="flex-1 grid grid-cols-12 gap-6 h-full">
            {/* Appeals List */}
            <div className="col-span-12 lg:col-span-5 flex flex-col h-[calc(100vh-210px)] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-slate-900/80">
                <h3 className="text-sm font-semibold text-slate-200">Pending Appeals Queue</h3>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
                {appeals.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    No member appeals currently pending review.
                  </div>
                ) : (
                  appeals.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => setSelectedAppeal(a)}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedAppeal?.id === a.id
                          ? "bg-slate-800/80 border-l-4 border-l-rose-500"
                          : "hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <Badge variant={a.status === "pending" ? "default" : "outline"}>
                          {a.status.toUpperCase()}
                        </Badge>
                        <span className="text-[11px] text-slate-400">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 font-medium">Member: {a.user.email}</div>
                      <div className="text-xs text-slate-400 mt-1 line-clamp-2 italic">
                        &ldquo;{a.reason}&rdquo;
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Appeal Adjudication */}
            <div className="col-span-12 lg:col-span-7 flex flex-col h-[calc(100vh-210px)] bg-slate-900 border border-slate-800 rounded-xl p-6 overflow-y-auto">
              {selectedAppeal ? (
                <div className="space-y-6">
                  <div className="border-b border-slate-800 pb-4">
                    <h2 className="text-lg font-bold text-slate-100">
                      Appeal Review #{selectedAppeal.id.substring(0, 8)}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Submitted by {selectedAppeal.user.email} (Status: {selectedAppeal.user.accountStatus})
                    </p>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Member Justification Statement
                    </h3>
                    <p className="text-sm text-slate-200 italic bg-slate-900 p-3 rounded border border-slate-800">
                      &ldquo;{selectedAppeal.reason}&rdquo;
                    </p>
                  </div>

                  {selectedAppeal.status === "pending" ? (
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-4">
                      <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                        Adjudicate Appeal
                      </h3>
                      <textarea
                        value={appealNotes}
                        onChange={(e) => setAppealNotes(e.target.value)}
                        placeholder="Provide detailed reviewer notes for decision justification..."
                        rows={3}
                        className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded p-2.5 focus:outline-none focus:border-rose-500"
                      />
                      <div className="flex space-x-3">
                        <Button
                          size="sm"
                          onClick={() => handleResolveAppeal("approved")}
                          disabled={isExecutingAppeal}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                        >
                          <CheckCircle className="w-4 h-4 mr-1.5" />
                          Approve Appeal & Restore Account
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleResolveAppeal("rejected")}
                          disabled={isExecutingAppeal}
                          className="bg-rose-700 hover:bg-rose-600"
                        >
                          <XCircle className="w-4 h-4 mr-1.5" />
                          Reject Appeal & Maintain Sanctions
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                      <Badge variant="outline" className="mb-2">Resolved: {selectedAppeal.status.toUpperCase()}</Badge>
                      <p className="text-xs text-slate-300">
                        Decision Notes: {selectedAppeal.decisionNotes || "No notes recorded."}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                  Select an appeal from the queue to review and adjudicate.
                </div>
              )}
            </div>
          </div>
        )}

        {/* SLAs Policy Tab */}
        {activeTab === "slas" && (
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-8 overflow-y-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Trust & Safety SLA Policies</h2>
              <p className="text-sm text-slate-400 mt-1">
                Standard Operating Procedures for incident triage, evidence evaluation, and human-in-the-loop decisions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-950 border-red-900/50">
                <CardContent className="p-5">
                  <div className="flex items-center space-x-2 text-red-400 font-bold mb-2">
                    <ShieldAlert className="w-5 h-5" />
                    <span>Critical Priority (&lt; 15 Minute SLA)</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                    <li>Underage suspicion: Profile discovery automatically hidden upon report.</li>
                    <li>Credible threats of physical violence or extortion.</li>
                    <li>Unlawful non-consensual media distribution.</li>
                    <li>Requires Safety Admin review and mandatory audit trail logging.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-slate-950 border-orange-900/50">
                <CardContent className="p-5">
                  <div className="flex items-center space-x-2 text-orange-400 font-bold mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>High Priority (&lt; 2 Hour SLA)</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                    <li>Severe harassment, hate speech, or stalking allegations.</li>
                    <li>Commercial prostitution or financial exploitation scams.</li>
                    <li>Automated suspension recommended pending human affirmation.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-slate-950 border-yellow-900/50">
                <CardContent className="p-5">
                  <div className="flex items-center space-x-2 text-yellow-400 font-bold mb-2">
                    <Clock className="w-5 h-5" />
                    <span>Medium Priority (&lt; 12 Hour SLA)</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                    <li>Inappropriate or sexually explicit profile imagery.</li>
                    <li>Spamming, commercial advertising, or social media handle promotion.</li>
                    <li>Sanction: Content rejection with educational warning.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-slate-950 border-slate-800">
                <CardContent className="p-5">
                  <div className="flex items-center space-x-2 text-slate-300 font-bold mb-2">
                    <User className="w-5 h-5" />
                    <span>Low Priority (&lt; 24 Hour SLA)</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                    <li>Identity impersonation or misleading profile statistics.</li>
                    <li>Minor conversational disputes without immediate safety risk.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
