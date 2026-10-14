"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, MessageSquare, UserX, Sparkles, MapPin, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MatchItem {
  matchId: string;
  matchedAt: string;
  partner: {
    id: string;
    displayName: string;
    computedAge: number;
    locationCity: string | null;
    locationCountry: string | null;
    relationshipIntent: string;
    photoUrl: string | null;
  };
}

export default function MatchesPage() {
  const [matches, setMatches] = React.useState<MatchItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [unmatchingId, setUnmatchingId] = React.useState<string | null>(null);

  const fetchMatches = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/matches");
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
      }
    } catch {
      // Handle gracefully
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  async function handleUnmatch(matchId: string, partnerName: string) {
    if (!confirm(`Are you sure you want to unmatch with ${partnerName}? This will end the connection permanently.`)) {
      return;
    }

    setUnmatchingId(matchId);
    try {
      const res = await fetch("/api/matches", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      if (res.ok) {
        setMatches((prev) => prev.filter((m) => m.matchId !== matchId));
      }
    } catch {
      alert("Failed to unmatch.");
    } finally {
      setUnmatchingId(null);
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span>Your Matches</span>
            <span className="rounded-full bg-brand-500/20 px-2.5 py-0.5 text-xs font-bold text-brand-300">
              {matches.length}
            </span>
          </h1>
          <p className="text-xs text-surface-400 mt-1">
            Mutual connections where both members expressed intentional interest.
          </p>
        </div>
        <Link href="/discovery">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Compass className="h-4 w-4" /> Discover More
          </Button>
        </Link>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-72 animate-pulse border-surface-800 bg-surface-900/60" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && matches.length === 0 && (
        <Card className="border-surface-800 bg-surface-900/60 p-12 text-center space-y-4 max-w-md mx-auto">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10 text-brand-400">
            <Heart className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-white">No Matches Yet</h3>
          <p className="text-xs text-surface-400">
            When you and another member mutually like each other, your match will appear right here.
          </p>
          <Link href="/discovery">
            <Button className="gap-2">
              <Compass className="h-4 w-4" /> Start Swiping
            </Button>
          </Link>
        </Card>
      )}

      {/* Matches Grid */}
      {!isLoading && matches.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {matches.map((item) => (
            <Card
              key={item.matchId}
              className="overflow-hidden border-surface-800 bg-surface-900 hover:border-surface-700 transition-all flex flex-col"
            >
              <div className="relative aspect-[4/5] w-full bg-surface-950">
                {item.partner.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.partner.photoUrl}
                    alt={item.partner.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-surface-900 text-surface-600 text-xs">
                    No photo
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/20 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h4 className="text-lg font-bold">
                    {item.partner.displayName}, {item.partner.computedAge}
                  </h4>
                  {item.partner.locationCity && (
                    <p className="text-xs text-surface-300 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-brand-400" />
                      {item.partner.locationCity}
                    </p>
                  )}
                </div>
              </div>

              <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <Badge variant="brand">
                    {item.partner.relationshipIntent.replace("_", " ")}
                  </Badge>
                  <span className="text-surface-500 text-[11px]">
                    Matched {new Date(item.matchedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 gap-1.5">
                    <MessageSquare className="h-4 w-4" /> Chat
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUnmatch(item.matchId, item.partner.displayName)}
                    isLoading={unmatchingId === item.matchId}
                    title="Unmatch"
                  >
                    <UserX className="h-4 w-4 text-surface-400" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
