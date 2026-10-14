"use client";

import * as React from "react";
import Link from "next/link";
import {
  Heart,
  X,
  MessageCircle,
  Shield,
  Sparkles,
  MapPin,
  Filter,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

interface Candidate {
  id: string;
  displayName: string;
  computedAge: number;
  gender: string;
  bio: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  relationshipIntent: string;
  photos: { id: string; publicUrl: string; isPrimary: boolean }[];
  interests: { id: string; name: string; slug: string }[];
  prompts: { id: string; promptText: string; answer: string }[];
  compatibility: {
    score: number;
    percentage: number;
    highlights: string[];
    sharedInterests: string[];
    intentAligned: boolean;
    distanceKm?: number;
  };
}

export default function DiscoveryPage() {
  const [candidates, setCandidates] = React.useState<Candidate[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Active Photo Carousel within Candidate Card
  const [activePhotoIndex, setActivePhotoIndex] = React.useState(0);

  // Compliment Modal State
  const [isComplimentOpen, setIsComplimentOpen] = React.useState(false);
  const [complimentText, setComplimentText] = React.useState("");
  const [isSendingCompliment, setIsSendingCompliment] = React.useState(false);

  // Safety / Report Modal State
  const [isReportOpen, setIsReportOpen] = React.useState(false);
  const [reportCategory, setReportCategory] = React.useState("harassment");
  const [reportDetails, setReportDetails] = React.useState("");

  // Match Modal State
  const [mutualMatchPartner, setMutualMatchPartner] = React.useState<Candidate | null>(null);

  // Filter Drawer State
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [minAgeFilter, setMinAgeFilter] = React.useState(18);
  const [maxAgeFilter, setMaxAgeFilter] = React.useState(45);
  const [intentFilter, setIntentFilter] = React.useState("");

  const fetchFeed = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (minAgeFilter) params.set("minAge", minAgeFilter.toString());
      if (maxAgeFilter) params.set("maxAge", maxAgeFilter.toString());
      if (intentFilter) params.set("intent", intentFilter);

      const res = await fetch(`/api/discovery?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load discovery candidates.");
      }
      const data = await res.json();
      setCandidates(data.candidates || []);
      setCurrentIndex(0);
      setActivePhotoIndex(0);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [minAgeFilter, maxAgeFilter, intentFilter]);

  React.useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const currentCandidate = candidates[currentIndex];

  async function handleInteraction(type: "like" | "pass" | "compliment", comment?: string) {
    if (!currentCandidate) return;

    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: currentCandidate.id,
          type,
          comment,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register interaction.");

      if (data.isMatch) {
        setMutualMatchPartner(currentCandidate);
      }

      // Advance to next card
      setCurrentIndex((prev) => prev + 1);
      setActivePhotoIndex(0);
      setIsComplimentOpen(false);
      setComplimentText("");
    } catch (err: any) {
      alert(err.message || "Failed to interact.");
    }
  }

  async function handleBlock() {
    if (!currentCandidate) return;
    if (!confirm(`Are you sure you want to block ${currentCandidate.displayName}? You will never see each other again.`)) {
      return;
    }

    try {
      await fetch("/api/safety/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId: currentCandidate.id, reason: "Member initiated block" }),
      });
      setCurrentIndex((prev) => prev + 1);
      setActivePhotoIndex(0);
    } catch (err: any) {
      alert(err.message || "Failed to block member.");
    }
  }

  async function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCandidate) return;

    try {
      await fetch("/api/safety/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedId: currentCandidate.id,
          category: reportCategory,
          details: reportDetails,
        }),
      });
      setIsReportOpen(false);
      alert("Safety report received. Our trust & safety team has been notified.");
      setCurrentIndex((prev) => prev + 1);
      setActivePhotoIndex(0);
    } catch (err: any) {
      alert(err.message || "Failed to submit safety report.");
    }
  }

  return (
    <div className="container mx-auto max-w-xl px-4 py-8">
      {/* Top Header Controls */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>Discover</span>
          <span className="rounded-md bg-brand-500/20 px-2 py-0.5 text-xs font-semibold text-brand-300">
            Active
          </span>
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="gap-1.5"
          >
            <Filter className="h-4 w-4" />
            <span>Preferences</span>
          </Button>
          <Link href="/matches">
            <Button size="sm" variant="secondary" className="gap-1.5">
              <Heart className="h-4 w-4 text-brand-400" />
              <span>Matches</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Drawer */}
      {isFilterOpen && (
        <Card className="mb-6 border-brand-500/30 bg-surface-900 p-4">
          <h4 className="text-sm font-bold text-white mb-3">Adjust Discovery Filters</h4>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="text-xs text-surface-400 block mb-1">Min Age ({minAgeFilter})</label>
              <input
                type="range"
                min={18}
                max={60}
                value={minAgeFilter}
                onChange={(e) => setMinAgeFilter(parseInt(e.target.value, 10))}
                className="w-full accent-brand-500"
              />
            </div>
            <div>
              <label className="text-xs text-surface-400 block mb-1">Max Age ({maxAgeFilter})</label>
              <input
                type="range"
                min={minAgeFilter}
                max={99}
                value={maxAgeFilter}
                onChange={(e) => setMaxAgeFilter(parseInt(e.target.value, 10))}
                className="w-full accent-brand-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsFilterOpen(false)}>
              Close
            </Button>
            <Button size="sm" onClick={() => { setIsFilterOpen(false); fetchFeed(); }}>
              Apply Filters
            </Button>
          </div>
        </Card>
      )}

      {/* Loading Skeleton State */}
      {isLoading && (
        <Card className="h-[650px] w-full animate-pulse border-surface-800 bg-surface-900/60 p-6 flex flex-col justify-between">
          <div className="h-3/5 w-full rounded-2xl bg-surface-800/80" />
          <div className="space-y-3">
            <div className="h-6 w-1/3 rounded-lg bg-surface-800" />
            <div className="h-4 w-2/3 rounded-lg bg-surface-800" />
            <div className="h-10 w-full rounded-xl bg-surface-800" />
          </div>
        </Card>
      )}

      {/* Error State */}
      {!isLoading && errorMessage && (
        <Card className="border-red-500/30 bg-surface-900 p-8 text-center space-y-4">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="text-xl font-bold text-white">Discovery Unavailable</h3>
          <p className="text-sm text-surface-400">{errorMessage}</p>
          <Button onClick={fetchFeed} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Try Again
          </Button>
        </Card>
      )}

      {/* Empty Feed State */}
      {!isLoading && !errorMessage && (!currentCandidate || currentIndex >= candidates.length) && (
        <Card className="border-surface-800 bg-surface-900/60 p-12 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10 text-brand-400">
            <Sparkles className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-bold text-white">You&apos;re All Caught Up!</h3>
          <p className="text-sm text-surface-400 max-w-sm mx-auto">
            You have reviewed all available profiles matching your preferences. Try broadening your age range or checking back later.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsFilterOpen(true)}>
              Expand Preferences
            </Button>
            <Button onClick={fetchFeed} className="gap-1.5">
              <RotateCcw className="h-4 w-4" /> Refresh Feed
            </Button>
          </div>
        </Card>
      )}

      {/* Active Candidate Card */}
      {!isLoading && !errorMessage && currentCandidate && (
        <div className="relative">
          <Card className="overflow-hidden border-surface-800 bg-surface-900 shadow-2xl">
            {/* Photos & Hero Header */}
            <div className="relative aspect-[4/5] w-full bg-surface-950">
              {currentCandidate.photos.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentCandidate.photos[activePhotoIndex]?.publicUrl || currentCandidate.photos[0].publicUrl}
                  alt={currentCandidate.displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-surface-900 text-surface-600">
                  <span>No photo available</span>
                </div>
              )}

              {/* Photo Navigation Overlay */}
              {currentCandidate.photos.length > 1 && (
                <>
                  <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
                    {currentCandidate.photos.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          i === activePhotoIndex ? "bg-white" : "bg-white/30"
                        }`}
                      />
                    ))}
                  </div>
                  {activePhotoIndex > 0 && (
                    <button
                      onClick={() => setActivePhotoIndex((p) => p - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/70 backdrop-blur-sm"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}
                  {activePhotoIndex < currentCandidate.photos.length - 1 && (
                    <button
                      onClick={() => setActivePhotoIndex((p) => p + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/70 backdrop-blur-sm"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}
                </>
              )}

              {/* Gradient Overlay */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/20 to-transparent" />

              {/* Identity & Basic Info */}
              <div className="absolute bottom-4 left-4 right-4 space-y-1.5 text-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
                    <span>{currentCandidate.displayName}</span>
                    <span className="text-surface-300 font-normal text-2xl">
                      {currentCandidate.computedAge}
                    </span>
                  </h2>
                  <Badge variant="brand" className="text-xs px-2.5 py-1">
                    {currentCandidate.compatibility.percentage}% Match
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-surface-300">
                  {currentCandidate.locationCity && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-brand-400" />
                      {currentCandidate.locationCity}
                      {currentCandidate.locationCountry ? `, ${currentCandidate.locationCountry}` : ""}
                    </span>
                  )}
                  <span>&bull;</span>
                  <span className="capitalize">{currentCandidate.relationshipIntent.replace("_", " ")}</span>
                </div>
              </div>
            </div>

            {/* Profile Content Body */}
            <CardContent className="space-y-5 p-5">
              {/* Transparent Compatibility Highlights */}
              {currentCandidate.compatibility.highlights.length > 0 && (
                <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-3">
                  <span className="text-[11px] font-bold text-brand-400 uppercase tracking-wider block mb-1.5">
                    Compatibility Insights
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentCandidate.compatibility.highlights.map((h, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-surface-800/80 px-2 py-0.5 text-xs text-surface-200 border border-surface-700"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio */}
              {currentCandidate.bio && (
                <p className="text-sm text-surface-200 leading-relaxed">
                  {currentCandidate.bio}
                </p>
              )}

              {/* Prompts */}
              {currentCandidate.prompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="rounded-xl border border-surface-800 bg-surface-950/40 p-4 space-y-1"
                >
                  <p className="text-xs font-semibold text-brand-400">{prompt.promptText}</p>
                  <p className="text-sm font-medium text-white">{prompt.answer}</p>
                </div>
              ))}

              {/* Interests */}
              {currentCandidate.interests.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-surface-400 block mb-2">Interests</span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentCandidate.interests.map((interest) => (
                      <Badge key={interest.id} variant="default">
                        {interest.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Safety Actions */}
              <div className="pt-2 border-t border-surface-800 flex justify-between items-center text-xs text-surface-500">
                <button
                  onClick={handleBlock}
                  className="hover:text-red-400 transition-colors"
                >
                  Block Member
                </button>
                <button
                  onClick={() => setIsReportOpen(true)}
                  className="hover:text-amber-400 transition-colors flex items-center gap-1"
                >
                  <Shield className="h-3.5 w-3.5" /> Report Profile
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Action Bar: Pass, Compliment, Like */}
          <div className="mt-4 flex items-center justify-center gap-6">
            <button
              onClick={() => handleInteraction("pass")}
              aria-label="Pass"
              className="flex h-14 w-14 items-center justify-center rounded-full border border-surface-700 bg-surface-900 text-surface-400 shadow-lg hover:border-surface-600 hover:text-white active:scale-95 transition-all"
            >
              <X className="h-6 w-6" />
            </button>

            <button
              onClick={() => setIsComplimentOpen(true)}
              aria-label="Send Compliment"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-surface-700 bg-surface-900 text-blue-400 shadow-lg hover:border-blue-500 hover:text-blue-300 active:scale-95 transition-all"
            >
              <MessageCircle className="h-5 w-5" />
            </button>

            <button
              onClick={() => handleInteraction("like")}
              aria-label="Like"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-brand-600 to-brand-500 text-white shadow-xl shadow-brand-500/30 hover:scale-105 active:scale-95 transition-all"
            >
              <Heart className="h-8 w-8 fill-current" />
            </button>
          </div>
        </div>
      )}

      {/* Compliment Note Modal */}
      {isComplimentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md border-surface-800 bg-surface-900 p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Send a Compliment</h3>
            <p className="text-xs text-surface-400">
              Break the ice with a thoughtful message attached to your like.
            </p>
            <textarea
              rows={3}
              value={complimentText}
              onChange={(e) => setComplimentText(e.target.value)}
              placeholder="I noticed your passion for..."
              className="w-full rounded-xl border border-surface-700 bg-surface-950 p-3 text-sm text-white focus:border-brand-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsComplimentOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => handleInteraction("compliment", complimentText)}
                disabled={!complimentText.trim()}
              >
                Send Compliment & Like
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Safety Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md border-surface-800 bg-surface-900 p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-400" /> Report Member
            </h3>
            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-surface-400 block mb-1">Reason for Report</label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="w-full rounded-xl border border-surface-700 bg-surface-950 p-2.5 text-sm text-white focus:outline-none"
                >
                  <option value="underage_suspicion">Underage Suspicion (Strict 18+)</option>
                  <option value="harassment">Harassment or Abusive Behavior</option>
                  <option value="inappropriate_content">Inappropriate or Explicit Imagery</option>
                  <option value="spam_or_scam">Commercial Spam or Financial Scam</option>
                  <option value="impersonation">Fake Profile or Impersonation</option>
                  <option value="safety_concern">Immediate Safety Threat</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-surface-400 block mb-1">Additional Context</label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Please provide any relevant details for our moderation team..."
                  className="w-full rounded-xl border border-surface-700 bg-surface-950 p-3 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsReportOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger">
                  Submit Report
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Mutual Match Modal */}
      {mutualMatchPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="text-center space-y-6 max-w-sm animate-in fade-in zoom-in duration-300">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-brand-600 to-rose-400 text-white shadow-2xl shadow-brand-500/50">
              <Heart className="h-10 w-10 fill-current" />
            </div>

            <h2 className="text-4xl font-extrabold tracking-tight text-white">
              It&apos;s a Match!
            </h2>

            <p className="text-surface-300 text-sm">
              You and <strong className="text-white">{mutualMatchPartner.displayName}</strong> liked each other.
            </p>

            <div className="flex flex-col gap-3 pt-4">
              <Link href="/matches">
                <Button size="lg" className="w-full">
                  Go to Matches
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setMutualMatchPartner(null)}
              >
                Keep Swiping
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
