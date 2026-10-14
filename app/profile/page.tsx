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
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export default function ProfilePage() {
  const [profileData, setProfileData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isTogglingVisibility, setIsTogglingVisibility] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editable fields
  const [displayName, setDisplayName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [city, setCity] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [relationshipIntent, setRelationshipIntent] = React.useState("dating");

  // Editable preferences
  const [minAgePref, setMinAgePref] = React.useState(18);
  const [maxAgePref, setMaxAgePref] = React.useState(50);
  const [maxDistancePref, setMaxDistancePref] = React.useState(50);

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
        if (data.user?.preferences) {
          const pref = data.user.preferences;
          setMinAgePref(pref.minAgePreference ?? 18);
          setMaxAgePref(pref.maxAgePreference ?? 50);
          setMaxDistancePref(pref.maxDistanceKm ?? 50);
        }
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to load member profile." });
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
    setStatusMessage(null);
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
        setStatusMessage({
          type: "success",
          text: nextState
            ? "Discovery resumed. Your profile is now visible to eligible matches."
            : "Discovery paused. Your profile is temporarily hidden from candidate feeds.",
        });
      } else {
        throw new Error("Server rejected discovery toggle.");
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to update discovery visibility status." });
    } finally {
      setIsTogglingVisibility(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const payload: any = {
        profile: {
          displayName,
          bio,
          locationCity: city,
          locationCountry: country,
          relationshipIntent,
          ...(profileData?.profile?.birthdate ? { birthdate: profileData.profile.birthdate } : {}),
          ...(profileData?.profile?.gender ? { gender: profileData.profile.gender } : {}),
        },
        preferences: {
          minAgePreference: Number(minAgePref),
          maxAgePreference: Number(maxAgePref),
          maxDistanceKm: Number(maxDistancePref),
        },
      };

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile changes.");
      }

      setProfileData(data.user);
      setIsEditing(false);
      setStatusMessage({ type: "success", text: "Profile and discovery preferences successfully updated." });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to save profile modifications." });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-4">
        <div className="h-40 rounded-2xl bg-surface-900/60 animate-pulse border border-surface-800" />
        <div className="h-64 rounded-2xl bg-surface-900/60 animate-pulse border border-surface-800" />
      </div>
    );
  }

  const p = profileData?.profile;
  const primaryPhoto = profileData?.photos?.find((ph: any) => ph.isPrimary)?.publicUrl || profileData?.photos?.[0]?.publicUrl;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Feedback Alert */}
      {statusMessage && (
        <Alert
          variant={statusMessage.type === "success" ? "success" : "destructive"}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs underline opacity-80 hover:opacity-100 ml-4"
          >
            Dismiss
          </button>
        </Alert>
      )}

      {/* Top Banner & Visibility Pause Control */}
      <Card className="border-surface-800 bg-surface-900/90 overflow-hidden shadow-xl shadow-black/20">
        <div className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4 border-b border-surface-800">
          <div className="flex items-center gap-4">
            {primaryPhoto ? (
              <div className="relative h-18 w-18 overflow-hidden rounded-2xl border-2 border-brand-500/40 shadow-lg shadow-brand-500/20">
                <img
                  src={primaryPhoto}
                  alt={p?.displayName || "Profile photo"}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-rose-400 text-white shadow-xl shadow-brand-500/20">
                <User className="h-8 w-8" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">
                  {p?.displayName || "Member Profile"}
                </h1>
                <Badge variant="brand" className="gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  18+ Verified
                </Badge>
              </div>
              <p className="text-xs text-surface-400 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-brand-400" />
                {p?.locationCity ? `${p.locationCity}, ${p.locationCountry || ""}` : "Location not set"}
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
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Active (Visible in Discovery)
            </span>
          ) : (
            <span className="text-amber-400 font-semibold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> Paused (Hidden from Candidates)
            </span>
          )}
        </div>
      </Card>

      {/* Photos Gallery */}
      <Card className="border-surface-800 bg-surface-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-brand-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Profile Photos</h3>
          </div>
          <Link href="/onboarding">
            <Button variant="ghost" size="sm" className="text-xs text-brand-400 hover:text-brand-300">
              Manage Media
            </Button>
          </Link>
        </div>

        {profileData?.photos?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {profileData.photos.map((photo: any) => (
              <div
                key={photo.id}
                className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-surface-800 bg-surface-950"
              >
                <img
                  src={photo.publicUrl}
                  alt="Profile"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-300"
                />
                {photo.isPrimary && (
                  <div className="absolute top-2 left-2 rounded-md bg-brand-600/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                    Primary
                  </div>
                )}
                {photo.moderationStatus && photo.moderationStatus !== "approved" && (
                  <div className="absolute bottom-2 left-2 rounded-md bg-amber-500/90 px-2 py-0.5 text-[10px] font-medium text-black capitalize">
                    {photo.moderationStatus.replace("_", " ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 border border-dashed border-surface-800 rounded-xl text-center">
            <ImageIcon className="h-10 w-10 text-surface-600 mb-2" />
            <p className="text-xs text-surface-400">No profile photos uploaded yet.</p>
            <Link href="/onboarding" className="mt-3">
              <Button size="sm" variant="outline" className="text-xs">
                Upload First Photo
              </Button>
            </Link>
          </div>
        )}
      </Card>

      {/* Profile Details or Edit Form */}
      {isEditing ? (
        <Card className="border-surface-800 bg-surface-900 p-6 shadow-xl">
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-surface-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-brand-400" />
                Edit Profile & Discovery Preferences
              </h3>
            </div>

            <div className="space-y-4">
              <Input
                label="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. San Francisco"
                />
                <Input
                  label="Country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. United States"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-300">
                  Relationship Intent
                </label>
                <select
                  value={relationshipIntent}
                  onChange={(e) => setRelationshipIntent(e.target.value)}
                  className="w-full rounded-xl border border-surface-700 bg-surface-950 px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                >
                  <option value="dating">Dating (Intentional Discovery)</option>
                  <option value="long_term">Long-Term Relationship</option>
                  <option value="casual">Casual & Companionship</option>
                  <option value="friendship">Friendship & Networking</option>
                  <option value="open_to_options">Open to Options</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-300">Bio</label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a short introduction, your passions, or what makes you smile..."
                  className="w-full rounded-xl border border-surface-700 bg-surface-950 p-3 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              {/* Discovery Match Preferences */}
              <div className="pt-4 border-t border-surface-800 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Sliders className="h-4 w-4 text-brand-400" />
                  <span>Discovery Filter Preferences</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    type="number"
                    label="Min Candidate Age"
                    min={18}
                    max={maxAgePref}
                    value={minAgePref}
                    onChange={(e) => setMinAgePref(Number(e.target.value))}
                  />
                  <Input
                    type="number"
                    label="Max Candidate Age"
                    min={minAgePref}
                    max={99}
                    value={maxAgePref}
                    onChange={(e) => setMaxAgePref(Number(e.target.value))}
                  />
                  <Input
                    type="number"
                    label="Max Distance (km)"
                    min={5}
                    max={500}
                    value={maxDistancePref}
                    onChange={(e) => setMaxDistancePref(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-surface-800">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSaving} className="gap-2">
                <CheckCircle2 className="h-4 w-4" /> Save Profile & Preferences
              </Button>
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

            <div className="flex flex-wrap items-center gap-4 text-xs text-surface-400 pt-3 border-t border-surface-800">
              <span>Intent: <strong className="text-white capitalize">{p?.relationshipIntent?.replace("_", " ")}</strong></span>
              <span>&bull;</span>
              <span>Age: <strong className="text-white">{p?.computedAge} years old</strong></span>
              {profileData?.preferences && (
                <>
                  <span>&bull;</span>
                  <span>Looking for: <strong className="text-white">Ages {profileData.preferences.minAgePreference}–{profileData.preferences.maxAgePreference}</strong></span>
                </>
              )}
            </div>
          </Card>

          {/* Interests */}
          {profileData?.interests?.length > 0 && (
            <Card className="border-surface-800 bg-surface-900/60 p-6 space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Selected Interests</h3>
              <div className="flex flex-wrap gap-2">
                {profileData.interests.map((ui: any) => (
                  <Badge key={ui.interest.id} variant="default" className="bg-surface-800 text-surface-200 border-surface-700">
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
                    className="rounded-xl border border-surface-800 bg-surface-950/60 p-4 space-y-1.5"
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
