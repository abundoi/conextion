import Link from "next/link";
import { ShieldCheck, Heart, Lock, EyeOff, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background Glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-brand-600/20 via-brand-500/10 to-transparent blur-3xl" />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold text-brand-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Strict 18+ Adults-Only &bull; Verified Identities Only</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl sm:leading-tight">
            Authentic Connections, <br />
            <span className="bg-gradient-to-r from-brand-400 to-rose-300 bg-clip-text text-transparent">
              Engineered with Privacy.
            </span>
          </h1>

          <p className="mt-6 text-base text-surface-400 sm:text-lg sm:leading-relaxed">
            Discover intentional relationships on an enterprise platform designed from the ground up for safety, cryptographic consent, and zero unwanted exposure.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full gap-2">
                <Heart className="h-5 w-5 fill-current" />
                <span>Begin Your Journey</span>
              </Button>
            </Link>
            <Link href="/safety" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <span>Safety & Verification</span>
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-surface-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-brand-400" /> 18+ Age Attestation
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-brand-400" /> Bidirectional Privacy
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-brand-400" /> Instant Block & Shield
            </span>
          </div>
        </div>
      </section>

      {/* Safety & Architecture Pillars */}
      <section className="container mx-auto px-4 py-16 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-surface-800 bg-surface-900/60">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Guaranteed Adult Gate</h3>
              <p className="mt-2 text-sm text-surface-400">
                Underage accounts are categorically denied access via server-enforced date-of-birth verification and immutable audit records.
              </p>
            </CardContent>
          </Card>

          <Card className="border-surface-800 bg-surface-900/60">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Private Media Vault</h3>
              <p className="mt-2 text-sm text-surface-400">
                Member photos are stored in private cloud buckets with client-side signed uploads and pre-display content moderation.
              </p>
            </CardContent>
          </Card>

          <Card className="border-surface-800 bg-surface-900/60">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <EyeOff className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Atomic Block Protection</h3>
              <p className="mt-2 text-sm text-surface-400">
                Blocking is bidirectional and relational: once applied, profiles, messages, and discovery cards disappear permanently.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
