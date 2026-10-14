import Link from "next/link";
import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-surface-800 bg-surface-950 py-10 text-xs text-surface-500">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-brand-500" />
            <span className="font-semibold text-surface-300">Conextion Adult Relationship Discovery</span>
            <span>&bull; Strict 18+ Age Assurance Enforced</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/terms" className="hover:text-surface-300 transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-surface-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/safety" className="hover:text-surface-300 transition-colors">
              Community Guidelines
            </Link>
            <Link href="/support" className="hover:text-surface-300 transition-colors">
              Support
            </Link>
          </div>
        </div>
        <div className="mt-6 border-t border-surface-900 pt-6 text-center text-[11px] text-surface-600">
          &copy; {new Date().getFullYear()} Conextion Inc. All rights reserved. Zero tolerance for underage access, non-consensual imagery, or harassment.
        </div>
      </div>
    </footer>
  );
}
