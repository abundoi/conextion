"use client";

import * as React from "react";
import Link from "next/link";
import {
  Shield,
  Download,
  Trash2,
  Undo2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  EyeOff,
  Clock,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

export default function PrivacySettingsPage() {
  const [hasPendingDeletion, setHasPendingDeletion] = React.useState(false);
  const [scheduledPurgeAt, setScheduledPurgeAt] = React.useState<string | null>(null);
  const [deletionReason, setDeletionReason] = React.useState("");
  const [isExporting, setIsExporting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  React.useEffect(() => {
    // Check deletion status on load
    fetch("/api/privacy/delete")
      .then((res) => res.json())
      .then((data) => {
        if (data.hasPendingDeletion && data.deletionRequest) {
          setHasPendingDeletion(true);
          setScheduledPurgeAt(data.deletionRequest.scheduledPurgeAt);
        }
      })
      .catch((err) => console.error("Failed to check deletion status", err));
  }, []);

  const handleDownloadExport = async () => {
    setIsExporting(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/privacy/export");
      if (!res.ok) throw new Error("Failed to compile data export.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conextion-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatusMessage({
        type: "success",
        text: "GDPR Article 15 data export package successfully compiled and downloaded.",
      });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Export failed." });
    } finally {
      setIsExporting(false);
    }
  };

  const handleScheduleDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("Are you sure? Your profile will immediately be hidden and permanently purged in 30 days.")) {
      return;
    }

    setIsDeleting(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/privacy/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deletionReason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule account deletion.");

      setHasPendingDeletion(true);
      setScheduledPurgeAt(data.scheduledPurgeAt);
      setStatusMessage({
        type: "success",
        text: data.message,
      });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to schedule deletion." });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    setIsCancelling(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/privacy/delete", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel deletion.");

      setHasPendingDeletion(false);
      setScheduledPurgeAt(null);
      setStatusMessage({
        type: "success",
        text: "Account deletion request has been cancelled. Your profile is restored.",
      });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to cancel deletion." });
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
            <Shield className="w-5 h-5 text-rose-500" />
            <h1 className="text-lg font-bold tracking-tight text-slate-100">
              Privacy & Data Protection Center
            </h1>
          </div>
        </div>
        <Badge variant="outline" className="text-slate-400 border-slate-700 text-xs">
          GDPR & CCPA Compliant
        </Badge>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-6 space-y-6">
        {/* Status Messages */}
        {statusMessage && (
          <Alert
            variant={statusMessage.type === "error" ? "danger" : "success"}
            className={
              statusMessage.type === "success"
                ? "bg-emerald-950/60 border-emerald-800 text-emerald-200"
                : ""
            }
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 mr-2" />
            )}
            <span>{statusMessage.text}</span>
          </Alert>
        )}

        {/* Pending Deletion Warning Banner */}
        {hasPendingDeletion && (
          <div className="bg-rose-950/50 border border-rose-800/80 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-rose-400 font-bold">
                <Clock className="w-5 h-5" />
                <span>Account Scheduled for Permanent Deletion</span>
              </div>
              <p className="text-xs text-slate-300">
                Your profile is hidden from discovery. All personal records, messages, and photos will be permanently purged on{" "}
                <span className="font-semibold text-rose-300">
                  {scheduledPurgeAt ? new Date(scheduledPurgeAt).toLocaleDateString() : "30 days"}
                </span>.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelDeletion}
              disabled={isCancelling}
              className="border-rose-700 bg-rose-900/40 text-rose-200 hover:bg-rose-900 font-semibold shrink-0"
            >
              <Undo2 className="w-4 h-4 mr-1.5" />
              Cancel Deletion & Restore
            </Button>
          </div>
        )}

        {/* Section 1: Privacy Guarantees */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-100 flex items-center">
              <Lock className="w-4 h-4 mr-2 text-rose-500" />
              Platform Privacy Architecture
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
              <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80">
                <div className="font-semibold text-slate-200 mb-1 flex items-center">
                  <EyeOff className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                  Confidential Date of Birth
                </div>
                Your full date of birth is securely stored in isolated backend tables for age-assurance and is never transmitted to other members. Only your computed age is displayed.
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80">
                <div className="font-semibold text-slate-200 mb-1 flex items-center">
                  <Shield className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                  Approximate Location Privacy
                </div>
                Precise GPS coordinates are never exposed publicly. Distance calculations are fuzzed on the server and only general city/country are displayed.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: GDPR Article 15 Data Portability */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center">
                  <Download className="w-4 h-4 mr-2 text-rose-500" />
                  Right of Access & Data Portability (GDPR Art. 15)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Download a complete, machine-readable JSON archive containing all personal data, consent logs, match history, and profile records.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleDownloadExport}
                disabled={isExporting}
                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold shrink-0"
              >
                <Download className="w-4 h-4 mr-1.5" />
                {isExporting ? "Generating Package..." : "Download Data Archive"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Right to Erasure (GDPR Article 17) */}
        {!hasPendingDeletion && (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-rose-400 flex items-center">
                  <Trash2 className="w-4 h-4 mr-2 text-rose-500" />
                  Account Deletion & Right to Erasure (GDPR Art. 17)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Initiating account deletion immediately hides your profile from discovery and revokes active sessions. A 30-day compliance retention window is provided before irreversible data purge.
                </p>
              </div>

              <form onSubmit={handleScheduleDeletion} className="space-y-3">
                <input
                  type="text"
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="Optional: Tell us why you're leaving (e.g. 'Found someone', 'Taking a break')..."
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded p-2.5 focus:outline-none focus:border-rose-500"
                />
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  disabled={isDeleting}
                  className="bg-rose-700 hover:bg-rose-600 font-semibold"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  {isDeleting ? "Scheduling Deletion..." : "Schedule Account Deletion (30-Day Window)"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Section 4: Consent Agreement History */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-100 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-rose-500" />
              Active Consents & Policy Acknowledgments
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded border border-slate-800">
                <div>
                  <div className="font-semibold text-slate-200">18+ Adult Eligibility Attestation</div>
                  <div className="text-[11px] text-slate-400">Verified during onboarding</div>
                </div>
                <Badge variant="outline" className="text-emerald-400 border-emerald-800">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded border border-slate-800">
                <div>
                  <div className="font-semibold text-slate-200">Terms of Service (v1.0.0)</div>
                  <div className="text-[11px] text-slate-400">Binding arbitration and community guidelines</div>
                </div>
                <Badge variant="outline" className="text-emerald-400 border-emerald-800">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded border border-slate-800">
                <div>
                  <div className="font-semibold text-slate-200">Privacy Policy (v1.0.0)</div>
                  <div className="text-[11px] text-slate-400">Data processing & retention schedule</div>
                </div>
                <Badge variant="outline" className="text-emerald-400 border-emerald-800">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
