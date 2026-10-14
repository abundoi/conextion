"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { verifyAgeEligibility } from "@/lib/auth/age-assurance";
import {
  Heart,
  ShieldCheck,
  Sparkles,
  Camera,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Compass,
} from "lucide-react";

interface InterestItem {
  id: string;
  slug: string;
  name: string;
  category: string;
}

export default function OnboardingPage() {
  const router = useRouter();

  // Wizard Step: 1 = Basic, 2 = Preferences, 3 = Interests, 4 = Prompts, 5 = Photos, 6 = Review
  const [step, setStep] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Available metadata from server
  const [availableInterests, setAvailableInterests] = React.useState<InterestItem[]>([]);
  const [availablePrompts, setAvailablePrompts] = React.useState<string[]>([]);

  // Step 1: Basic
  const [displayName, setDisplayName] = React.useState("");
  const [birthdate, setBirthdate] = React.useState("");
  const [gender, setGender] = React.useState("woman");
  const [city, setCity] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [relationshipIntent, setRelationshipIntent] = React.useState("dating");
  const [bio, setBio] = React.useState("");

  // Step 2: Preferences
  const [minAge, setMinAge] = React.useState(21);
  const [maxAge, setMaxAge] = React.useState(38);
  const [maxDistanceKm, setMaxDistanceKm] = React.useState(50);
  const [interestedGenders, setInterestedGenders] = React.useState<string[]>(["man", "woman"]);

  // Step 3: Selected Interests
  const [selectedInterests, setSelectedInterests] = React.useState<string[]>([]);

  // Step 4: Prompts
  const [prompt1Text, setPrompt1Text] = React.useState("A life goal of mine is...");
  const [prompt1Answer, setPrompt1Answer] = React.useState("");
  const [prompt2Text, setPrompt2Text] = React.useState("Together, we could...");
  const [prompt2Answer, setPrompt2Answer] = React.useState("");

  // Step 5: Photos
  const [uploadedPhotos, setUploadedPhotos] = React.useState<{ id: string; url: string }[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);

  React.useEffect(() => {
    async function loadInitial() {
      try {
        const res = await fetch("/api/onboarding");
        if (res.ok) {
          const data = await res.json();
          setAvailableInterests(data.availableInterests || []);
          setAvailablePrompts(data.availablePrompts || []);
          if (data.user?.profile) {
            const p = data.user.profile;
            setDisplayName(p.displayName || "");
            if (p.birthdate) setBirthdate(p.birthdate.split("T")[0]);
            setGender(p.gender || "woman");
            setCity(p.locationCity || "");
            setCountry(p.locationCountry || "");
            setRelationshipIntent(p.relationshipIntent || "dating");
            setBio(p.bio || "");
          }
          if (data.user?.preferences) {
            const pref = data.user.preferences;
            setMinAge(pref.minAgePreference);
            setMaxAge(pref.maxAgePreference);
            setMaxDistanceKm(pref.maxDistanceKm);
            if (pref.interestedInGenders?.length) {
              setInterestedGenders(pref.interestedInGenders);
            }
          }
        }
      } catch (err) {
        // Fallback gracefully
      }
    }
    loadInitial();
  }, []);

  function toggleInterest(slug: string) {
    setSelectedInterests((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  function toggleInterestedGender(g: string) {
    setInterestedGenders((prev) =>
      prev.includes(g) ? prev.filter((item) => item !== g) : [...prev, g]
    );
  }

  async function handleNextStep() {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (step === 1) {
        if (!displayName.trim()) throw new Error("Please enter your display name.");
        if (!birthdate) throw new Error("Please enter your birth date.");

        const ageCheck = verifyAgeEligibility(birthdate);
        if (!ageCheck.isEligible) {
          throw new Error(ageCheck.reason || "You must be 18+ to proceed.");
        }

        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: "basic",
            data: {
              displayName,
              birthdate,
              gender,
              locationCity: city,
              locationCountry: country,
              relationshipIntent,
              bio,
            },
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to save profile.");
        }
        setStep(2);
      } else if (step === 2) {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: "preferences",
            data: {
              minAgePreference: minAge,
              maxAgePreference: maxAge,
              maxDistanceKm,
              interestedInGenders: interestedGenders,
            },
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to save preferences.");
        }
        setStep(3);
      } else if (step === 3) {
        if (selectedInterests.length < 2) {
          throw new Error("Please choose at least 2 interests to power compatibility matching.");
        }
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: "interests",
            data: { interestSlugs: selectedInterests },
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to save interests.");
        }
        setStep(4);
      } else if (step === 4) {
        const prompts = [];
        if (prompt1Answer.trim()) prompts.push({ promptText: prompt1Text, answer: prompt1Answer });
        if (prompt2Answer.trim()) prompts.push({ promptText: prompt2Text, answer: prompt2Answer });

        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: "prompts",
            data: { prompts },
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to save prompts.");
        }
        setStep(5);
      } else if (step === 5) {
        setStep(6);
      } else if (step === 6) {
        // Final Publication
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: "publish" }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to publish profile.");
        }
        router.push("/discovery");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  // Handle Photo Upload
  async function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setErrorMessage(null);

    try {
      // 1. Get signed upload URL
      const urlRes = await fetch("/api/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          fileSizeBytes: file.size,
        }),
      });

      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error || "Failed to get upload URL.");

      // 2. Upload directly to GCS via PUT
      await fetch(urlData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      // 3. Confirm upload on backend
      const confirmRes = await fetch("/api/media/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath: urlData.storagePath,
          isPrimary: uploadedPhotos.length === 0,
        }),
      });

      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmData.error || "Failed to confirm photo.");

      setUploadedPhotos((prev) => [
        ...prev,
        { id: confirmData.photo.id, url: confirmData.photo.publicUrl },
      ]);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold text-surface-400 mb-2">
          <span>Step {step} of 6</span>
          <span className="text-brand-400">
            {step === 1 && "Basic Profile"}
            {step === 2 && "Discovery Preferences"}
            {step === 3 && "Interests & Lifestyle"}
            {step === 4 && "Prompts & Bio"}
            {step === 5 && "Photo Upload"}
            {step === 6 && "Review & Publish"}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-300"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>
      </div>

      <Card className="border-surface-800 bg-surface-900/90 shadow-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
              {step === 1 && <Heart className="h-5 w-5" />}
              {step === 2 && <Compass className="h-5 w-5" />}
              {step === 3 && <Sparkles className="h-5 w-5" />}
              {step === 4 && <ShieldCheck className="h-5 w-5" />}
              {step === 5 && <Camera className="h-5 w-5" />}
              {step === 6 && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
            </div>
            <div>
              <CardTitle>
                {step === 1 && "Tell Us About Yourself"}
                {step === 2 && "Who Are You Looking For?"}
                {step === 3 && "Passions & Interests"}
                {step === 4 && "Conversations & Prompts"}
                {step === 5 && "Profile Photos"}
                {step === 6 && "Profile Preview & Publication"}
              </CardTitle>
              <CardDescription>
                {step === 1 && "Basic information to personalize your discovery experience."}
                {step === 2 && "Configure server-side age and distance filters."}
                {step === 3 && "Select at least 2 tags to calculate compatibility matches."}
                {step === 4 && "Give other members a window into your world."}
                {step === 5 && "Upload verified, high-resolution portrait photos."}
                {step === 6 && "Confirm your adult assurance and publish your profile."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMessage && (
            <Alert variant="danger">
              <span>{errorMessage}</span>
            </Alert>
          )}

          {/* STEP 1: BASIC PROFILE */}
          {step === 1 && (
            <div className="space-y-4">
              <Input
                label="Display Name"
                placeholder="Alex"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Date of Birth"
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  hint="Strict 18+ requirement. Kept private."
                  required
                />

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-surface-300">
                    Gender Identity
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-xl border border-surface-700 bg-surface-900/60 px-4 py-3 text-sm text-white focus:border-brand-500 focus:outline-none"
                  >
                    <option value="woman">Woman</option>
                    <option value="man">Man</option>
                    <option value="nonbinary">Non-binary</option>
                    <option value="other">Prefer to describe</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="City"
                  placeholder="New York"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <Input
                  label="Country"
                  placeholder="United States"
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
                  className="w-full rounded-xl border border-surface-700 bg-surface-900/60 px-4 py-3 text-sm text-white focus:border-brand-500 focus:outline-none"
                >
                  <option value="dating">Dating & Getting to Know People</option>
                  <option value="long_term">Long-Term Relationship</option>
                  <option value="casual">Casual & Companionship</option>
                  <option value="friendship">Meaningful Friendship</option>
                  <option value="open_to_options">Open to Options</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-300">Bio</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a glimpse into who you are..."
                  className="w-full rounded-xl border border-surface-700 bg-surface-900/60 p-3 text-sm text-white placeholder-surface-500 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: PREFERENCES */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Age Preference: <span className="text-brand-400 font-bold">{minAge} – {maxAge}</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Minimum Age (18+)"
                    type="number"
                    min={18}
                    max={maxAge}
                    value={minAge}
                    onChange={(e) => setMinAge(parseInt(e.target.value, 10))}
                  />
                  <Input
                    label="Maximum Age"
                    type="number"
                    min={minAge}
                    max={99}
                    value={maxAge}
                    onChange={(e) => setMaxAge(parseInt(e.target.value, 10))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Maximum Distance: <span className="text-brand-400 font-bold">{maxDistanceKm} km</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={maxDistanceKm}
                  onChange={(e) => setMaxDistanceKm(parseInt(e.target.value, 10))}
                  className="w-full accent-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Interested In Seeing
                </label>
                <div className="flex flex-wrap gap-2">
                  {["woman", "man", "nonbinary"].map((g) => {
                    const isSelected = interestedGenders.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleInterestedGender(g)}
                        className={`rounded-xl border px-4 py-2 text-sm font-medium capitalize transition-all ${
                          isSelected
                            ? "border-brand-500 bg-brand-500/20 text-brand-300"
                            : "border-surface-700 bg-surface-800 text-surface-400 hover:text-white"
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: INTERESTS */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-surface-400">
                Choose interests to calculate explainable compatibility matches:
              </p>
              <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto p-1">
                {availableInterests.map((item) => {
                  const isSelected = selectedInterests.includes(item.slug);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleInterest(item.slug)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                        isSelected
                          ? "border-brand-500 bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                          : "border-surface-700 bg-surface-800 text-surface-300 hover:border-surface-600"
                      }`}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-semibold text-brand-400">
                {selectedInterests.length} selected
              </p>
            </div>
          )}

          {/* STEP 4: PROMPTS */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-surface-400">Prompt 1</label>
                <select
                  value={prompt1Text}
                  onChange={(e) => setPrompt1Text(e.target.value)}
                  className="w-full rounded-xl border border-surface-700 bg-surface-900/60 px-3 py-2 text-sm text-white focus:outline-none"
                >
                  {availablePrompts.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Your answer..."
                  value={prompt1Answer}
                  onChange={(e) => setPrompt1Answer(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-surface-400">Prompt 2</label>
                <select
                  value={prompt2Text}
                  onChange={(e) => setPrompt2Text(e.target.value)}
                  className="w-full rounded-xl border border-surface-700 bg-surface-900/60 px-3 py-2 text-sm text-white focus:outline-none"
                >
                  {availablePrompts.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Your answer..."
                  value={prompt2Answer}
                  onChange={(e) => setPrompt2Answer(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 5: PHOTOS */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {uploadedPhotos.map((photo, i) => (
                  <div
                    key={photo.id}
                    className="relative aspect-[3/4] overflow-hidden rounded-xl border border-surface-700 bg-surface-800"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt="Profile photo"
                      className="h-full w-full object-cover"
                    />
                    {i === 0 && (
                      <span className="absolute bottom-2 left-2 rounded-md bg-brand-600/90 px-2 py-0.5 text-[10px] font-bold text-white">
                        Primary
                      </span>
                    )}
                  </div>
                ))}

                <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-surface-700 bg-surface-800/40 p-4 text-center transition-all hover:border-brand-500 hover:bg-surface-800/60">
                  <Camera className="h-6 w-6 text-surface-400 mb-2" />
                  <span className="text-xs font-medium text-surface-300">
                    {isUploadingPhoto ? "Uploading..." : "Add Photo"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoFileChange}
                    disabled={isUploadingPhoto}
                  />
                </label>
              </div>
              <p className="text-xs text-surface-400">
                All photos are held in a secure private cloud bucket and reviewed for community safety guidelines.
              </p>
            </div>
          )}

          {/* STEP 6: REVIEW & PUBLISH */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-surface-800 bg-surface-950/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-white">{displayName}</h4>
                  <Badge variant="brand">{relationshipIntent.replace("_", " ")}</Badge>
                </div>
                <p className="text-xs text-surface-400">
                  Location: {city ? `${city}, ${country}` : "Location not specified"}
                </p>
                {bio && <p className="text-sm text-surface-300 italic">&ldquo;{bio}&rdquo;</p>}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {selectedInterests.map((s) => (
                    <Badge key={s} variant="default" className="text-[11px]">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> Ready to Activate
                </span>
                <p>
                  By publishing, your profile will become visible to eligible candidates matching your discovery criteria. Precise birthdate and coordinates remain strictly hidden.
                </p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={isLoading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          ) : (
            <div />
          )}

          <Button onClick={handleNextStep} isLoading={isLoading}>
            {step === 6 ? "Publish & Start Discovering" : "Continue"}
            {step < 6 && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
