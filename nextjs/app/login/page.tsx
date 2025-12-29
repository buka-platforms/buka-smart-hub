import { Login } from "@/components/login";
import Link from "next/link";

/* eslint-disable @next/next/no-img-element */
export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden p-6 md:p-10">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10 bg-linear-to-br from-violet-500 via-purple-500 to-fuchsia-500">
        {/* Animated floating orbs */}
        <div className="absolute top-1/4 left-1/4 h-96 w-96 animate-pulse rounded-full bg-pink-400/30 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-80 w-80 animate-pulse rounded-full bg-cyan-400/30 blur-3xl [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-yellow-400/20 blur-3xl [animation-delay:2s]" />
        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-rose-400/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-transparent" />
        {/* Noise texture overlay */}
        <div className="[background-image:url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] absolute inset-0 opacity-20" />
      </div>

      <div className="relative flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 self-center font-medium text-white drop-shadow-lg"
        >
          <div className="flex h-6 w-6 items-center justify-center">
            <img src="/assets/images/logo-white.svg" alt="Logo" />
          </div>
          {process.env.NEXT_PUBLIC_APP_TITLE}
        </Link>
        <Login />
      </div>
    </div>
  );
}
