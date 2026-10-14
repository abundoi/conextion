"use client";

import * as React from "react";
import Link from "next/link";
import {
  User,
  ShieldCheck,
  Pause,
  Play,
  Settings,
  Heart,
  Camera,
  MapPin,
  Sparkles,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function ProfilePage() {
  const [profileData, setProfileData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isTogglingVisibility, setIsTogglingVisibility] = React.useState(false);

  // Editable fields
  const [displayName, setDisplayName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [city, setCity] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [relationshipIntent, setRelationshipIntent] = React.useState("dating");

  const fetchProfile = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfileData(data.user);
        if (data.user?.profile) {
          const p = data.user.profile;
          setDisplayName(p.displayName || "");
          setBio(p.bio || "");
          setCity(p.locationCity || "");
          setCountry(p.locationCountry || "");
          setRelationshipIntent(p.relationshipIntent || "dating");
        }
      }
    } catch {
      // Handle gracefully
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleToggleDiscovery() {
    if (!profileData?.profile) return;
    const nextState = !profileData.profile.isVisible;

    setIsTogglingVisibility(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: nextState }),
      });
      if (res.ok) {
        setProfileData((prev: any) => ({
          ...prev,
          profile: { ...prev.profile, isVisible: nextState },
        }));
      }
    } catch {
      alert("Failed to toggle discovery status.");
    } finally {
      setIsTogglingVisibility(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            displayName,
            birthdate: profileData.profile.birthdate,
            gender: profileData.profile.gender,
            bio,
            locationCity: city,
            locationCountry: country,
            relationshipIntent,
          },
        }),
      });
      if (res.ok) {
        setIsEditing(false);
        fetchProfile();
      }
    } catch {
      alert("Failed to save profile changes.");
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Card className="h-96 animate-pulse border-surface-800 bg-surface-900/60" />
      </div>
    );
  }

  const p = profileData?.profile;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Top Banner & Visibility Pause Control */}
      <Card className="border-surface-800 bg-surface-900/90 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4 border-b border-surface-800">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-rose-400 text-white shadow-xl shadow-brand-500/20">
              <User className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">
                  {p?.displayName || "Member Profile"}
                </h1>
                <Badge variant="brand">18+ Verified</Badge>
              </div>
              <p className="text-xs text-surface-400 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-brand-400" />
                {p?.locationCity ? `${p.locationCity}, ${p.locationCountry}` : "Location not set"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant={p?.isVisible ? "outline" : "primary"}
              size="sm"
              onClick={handleToggleDiscovery}
              isLoading={isTogglingVisibility}
              className="gap-1.5"
            >
              {p?.isVisible ? (
                <>
                  <Pause className="h-4 w-4 text-amber-400" /> Pause Discovery
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Resume Discovery
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsEditing(!isEditing)}
              className="gap-1.5"
            >
              <Edit3 className="h-4 w-4" /> {isEditing ? "Cancel" : "Edit Profile"}
            </Button>
          </div>
        </div>

        {/* Discovery Status Notice */}
        <div className="px-6 py-3 bg-surface-950/60 flex items-center justify-between text-xs">
          <span className="text-surface-400">Discovery Status:</span>
          {p?.isVisible ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Active (Visible in Discovery)
            </span>
          ) : (
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> Paused (Hidden from Candidates)
            </span>
          )}
        </div>
      </Card>

      {/* Profile Details or Edit Form */}
      {isEditing ? (
        <Card className="border-surface-800 bg-surface-900 p-6">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">Edit Profile Details</h3>

            <Input
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Input
                label="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-surface-300">
                Relationship Intent
              </label>
              <select
                value={relationshipIntent}
                onChange={(e) => setRelationshipIntent(e.target.value)}
                className="w-full rounded-xl border border-surface-700 bg-surface-950 px-4 py-3 text-sm text-white focus:outline-none"
              >
                <option value="dating">Dating</option>
                <option value="long_term">Long-Term Relationship</option>
                <option value="casual">Casual & Companionship</option>
                <option value="friendship">Friendship</option>
                <option value="open_to_options">Open to Options</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-surface-300">Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-xl border border-surface-700 bg-surface-950 p-3 text-sm text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Bio & Details */}
          <Card className="border-surface-800 bg-surface-900/60 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">About Me</h3>
            <p className="text-sm text-surface-200 leading-relaxed">
              {p?.bio || "No biography provided yet. Add a few sentences to share your story."}
            </p>

            <div className="flex items-center gap-4 text-xs text-surface-400 pt-2 border-t border-surface-800">
              <span>Intent: <strong className="text-white capitalize">{p?.relationshipIntent?.replace("_", " ")}</strong></span>
              <span>&bull;</span>
              <span>Age: <strong className="text-white">{p?.computedAge} years old</strong></span>
            </div>
          </Card>

          {/* Interests */}
          {profileData?.interests?.length > 0 && (
            <Card className="border-surface-800 bg-surface-900/60 p-6 space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Selected Interests</h3>
              <div className="flex flex-wrap gap-2">
                {profileData.interests.map((ui: any) => (
                  <Badge key={ui.interest.id} variant="default">
                    {ui.interest.name}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Prompts */}
          {profileData?.prompts?.length > 0 && (
            <Card className="border-surface-800 bg-surface-900/60 p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Profile Prompts</h3>
              <div className="space-y-3">
                {profileData.prompts.map((prompt: any) => (
                  <div
                    key={prompt.id}
                    className="rounded-xl border border-surface-800 bg-surface-950/40 p-4 space-y-1"
                  >
                    <p className="text-xs font-semibold text-brand-400">{prompt.promptText}</p>
                    <p className="text-sm font-medium text-white">{prompt.answer}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
