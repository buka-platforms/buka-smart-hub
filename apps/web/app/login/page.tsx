import { Login } from "@/components/login";
import Link from "next/link";

/* eslint-disable @next/next/no-img-element */
export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden p-6 md:p-10">
      <style>{`
        @keyframes orb-drift-1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          25% { transform: translate(60px, -80px) scale(1.08); }
          50% { transform: translate(100px, 40px) scale(0.94); }
          75% { transform: translate(-30px, 70px) scale(1.05); }
        }
        @keyframes orb-drift-2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          25% { transform: translate(-80px, 60px) scale(0.92); }
          50% { transform: translate(-50px, -70px) scale(1.1); }
          75% { transform: translate(70px, -30px) scale(0.97); }
        }
        @keyframes orb-drift-3 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(50px, 80px) scale(1.12); }
          66% { transform: translate(-60px, 30px) scale(0.88); }
        }
        @keyframes orb-drift-4 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-40px, -60px) scale(0.9); }
          66% { transform: translate(70px, -20px) scale(1.07); }
        }
        @keyframes aurora-sweep {
          0%, 100% { opacity: 0.3; transform: scaleX(1); }
          50% { opacity: 0.6; transform: scaleX(1.15); }
        }
        .orb-1 { animation: orb-drift-1 20s ease-in-out infinite; }
        .orb-2 { animation: orb-drift-2 26s ease-in-out infinite; }
        .orb-3 { animation: orb-drift-3 18s ease-in-out infinite; }
        .orb-4 { animation: orb-drift-4 23s ease-in-out infinite; }
        .aurora-line { animation: aurora-sweep 8s ease-in-out infinite; }
        .aurora-line-2 { animation: aurora-sweep 11s ease-in-out infinite reverse; }
      `}</style>

      {/* Deep cosmic background */}
      <div className="absolute inset-0 -z-10 bg-[#030712]">
        {/* Drifting aurora orbs */}
        <div className="orb-1 absolute top-[8%] left-[12%] h-140 w-140 rounded-full bg-violet-600/22 blur-[140px]" />
        <div className="orb-2 absolute right-[8%] bottom-[12%] h-120 w-120 rounded-full bg-indigo-500/18 blur-[120px]" />
        <div className="orb-3 absolute top-[45%] right-[18%] h-95 w-95 rounded-full bg-cyan-400/14 blur-[100px]" />
        <div className="orb-4 absolute bottom-[8%] left-[18%] h-105 w-105 rounded-full bg-fuchsia-500/18 blur-[110px]" />

        {/* Dot matrix */}
        <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />

        {/* Aurora horizon streaks */}
        <div className="aurora-line absolute top-[28%] right-0 left-0 h-px bg-linear-to-r from-transparent via-violet-400/40 to-transparent" />
        <div className="aurora-line-2 absolute top-[65%] right-0 left-0 h-px bg-linear-to-r from-transparent via-cyan-300/25 to-transparent" />
        <div className="aurora-line absolute right-0 bottom-[20%] left-0 h-px bg-linear-to-r from-transparent via-fuchsia-400/20 to-transparent" />

        {/* Top glow horizon */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-transparent via-violet-400/60 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-violet-500/10 to-transparent" />

        {/* Radial vignette — keeps focus on the center card */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_50%,transparent_35%,#030712_100%)]" />
      </div>

      <div className="relative flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 self-center font-medium text-white/90 drop-shadow-[0_0_12px_rgba(167,139,250,0.5)]"
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
