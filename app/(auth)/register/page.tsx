"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/auth/firebase-client";
import { verifyAgeEligibility } from "@/lib/auth/age-assurance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Heart, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [birthdate, setBirthdate] = React.useState("");
  const [ageAttestation, setAgeAttestation] = React.useState(false);
  const [termsConsent, setTermsConsent] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    // Password match check
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    // Strict 18+ Age Assurance Gate
    if (!birthdate) {
      setErrorMessage("Date of birth is required to verify adult eligibility.");
      return;
    }

    const ageCheck = verifyAgeEligibility(birthdate);
    if (!ageCheck.isEligible) {
      setErrorMessage(ageCheck.reason || "You must be at least 18 years of age to join Conextion.");
      return;
    }

    if (!ageAttestation) {
      setErrorMessage("You must certify that you are at least 18 years of age.");
      return;
    }

    if (!termsConsent) {
      setErrorMessage("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setIsLoading(true);

    try {
      let idToken: string;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        idToken = await userCredential.user.getIdToken();
      } catch (fbErr: any) {
        if (fbErr.code === "auth/email-already-in-use") {
          throw new Error("An account with this email address already exists.");
        }
        throw new Error(fbErr.message || "Failed to create user with identity provider.");
      }

      // Exchange ID token for secure session cookie
      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          birthdate,
          computedAge: ageCheck.computedAge,
        }),
      });

      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) {
        throw new Error(sessionData.error || "Failed to initialize member account.");
      }

      router.push("/profile/setup");
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during registration.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg border-surface-800 bg-surface-900/90 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-lg shadow-brand-500/25">
            <Heart className="h-6 w-6 fill-current" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Your Account</CardTitle>
          <CardDescription>
            Join an exclusive adults-only relationship discovery community.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            {errorMessage && (
              <Alert variant="danger">
                <span className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  {errorMessage}
                </span>
              </Alert>
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Password"
                type="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <Input
              label="Date of Birth (Must be 18+)"
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              required
              hint="Your exact birthdate is kept private and used only for age assurance."
            />

            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ageAttestation}
                  onChange={(e) => setAgeAttestation(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-surface-700 bg-surface-800 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-xs text-surface-300">
                  <strong className="text-white">18+ Certification:</strong> I certify and attest under penalty of account termination that I am at least 18 years of age.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsConsent}
                  onChange={(e) => setTermsConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-surface-700 bg-surface-800 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-xs text-surface-300">
                  I agree to the{" "}
                  <Link href="/terms" className="text-brand-400 underline hover:text-brand-300">
                    Terms of Service
                  </Link>
                  ,{" "}
                  <Link href="/privacy" className="text-brand-400 underline hover:text-brand-300">
                    Privacy Policy
                  </Link>
                  , and Community Guidelines.
                </span>
              </label>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Complete Registration (18+)
            </Button>

            <p className="text-center text-xs text-surface-400">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-brand-400 hover:text-brand-300">
                Sign In
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
