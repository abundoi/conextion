import Link from "next/link";
import { ShieldCheck, Lock, AlertTriangle, EyeOff, UserCheck, HeartHandshake } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SafetyPage() {
  return (
    <div className="container mx-auto px-4 py-16 sm:px-6 max-w-4xl">
      <div className="text-center mb-12">
        <Badge variant="brand" className="mb-4">Trust, Safety & Compliance</Badge>
        <h1 className="text-3xl font-extrabold text-white sm:text-5xl">
          Safety at Every Layer
        </h1>
        <p className="mt-4 text-surface-400">
          Our uncompromising commitment to legal compliance, adult age assurance, and member security.
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-brand-500/10 p-2.5 text-brand-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <CardTitle>Strict 18+ Age Assurance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-surface-300 text-sm space-y-3 leading-relaxed">
            <p>
              Conextion is an adults-only discovery platform. Every applicant must undergo date-of-birth verification. Any attempt by an individual under the age of 18 to create an account is permanently rejected and logged for anti-circumvention audits.
            </p>
            <p>
              We employ automated heuristics and third-party identity verification (IDV) for accounts exhibiting suspicious activity or geolocation anomalies.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400">
                <EyeOff className="h-6 w-6" />
              </div>
              <CardTitle>Atomic Bidirectional Blocking</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-surface-300 text-sm space-y-3 leading-relaxed">
            <p>
              Your peace of mind is paramount. When you block another member, the block is applied instantly and bidirectionally at the database engine level.
            </p>
            <ul className="list-disc list-inside space-y-1 text-surface-400">
              <li>Neither party will appear in the other&apos;s discovery feed or search results.</li>
              <li>Existing match conversations are instantly terminated and wiped from active view.</li>
              <li>The blocked user receives no alert or notification to protect your privacy and safety.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-400">
                <Lock className="h-6 w-6" />
              </div>
              <CardTitle>Content Moderation & Private Storage</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-surface-300 text-sm space-y-3 leading-relaxed">
            <p>
              Photos uploaded by members are stored in private cloud storage buckets that are not publicly indexable.
            </p>
            <p>
              All newly uploaded media is placed in a <code className="text-brand-300 bg-surface-800 px-1.5 py-0.5 rounded">pending_review</code> state until inspected by automated safety models and certified moderation staff. Non-consensual imagery, hate speech, and violent content result in immediate account termination.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
