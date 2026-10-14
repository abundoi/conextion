import Link from "next/link";
import { ShieldCheck, Heart, User, LogOut } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-surface-800 bg-surface-950/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center space-x-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-lg shadow-brand-500/25">
            <Heart className="h-5 w-5 fill-current" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Conextion
          </span>
          <span className="rounded-md bg-surface-800 px-2 py-0.5 text-[10px] font-semibold text-brand-400 border border-brand-500/20">
            18+
          </span>
        </Link>

        <nav className="flex items-center space-x-4">
          <Link
            href="/discovery"
            className="flex items-center space-x-1.5 text-xs font-medium text-surface-300 hover:text-white transition-colors"
          >
            <span>Discover</span>
          </Link>
          <Link
            href="/matches"
            className="flex items-center space-x-1.5 text-xs font-medium text-surface-300 hover:text-white transition-colors"
          >
            <span>Matches</span>
          </Link>
          <Link
            href="/profile"
            className="hidden sm:flex items-center space-x-1.5 text-xs font-medium text-surface-300 hover:text-white transition-colors"
          >
            <User className="h-4 w-4" />
            <span>Profile</span>
          </Link>
          <Link
            href="/safety"
            className="hidden md:flex items-center space-x-1.5 text-xs font-medium text-surface-400 hover:text-white transition-colors"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Safety</span>
          </Link>
          <Link
            href="/login"
            className="text-xs font-medium text-surface-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/20 hover:bg-brand-500 transition-all"
          >
            Join Now
          </Link>
        </nav>
      </div>
    </header>
  );
}
