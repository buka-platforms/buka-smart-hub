"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dices,
  History,
  PartyPopper,
  RefreshCcw,
  Sparkles,
  Trash2,
  Trophy,
} from "lucide-react";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";

const presets = [
  {
    id: "arisan",
    label: "Lucky Draw",
    description: "Pick one winner from a group list.",
    title: "Lucky Draw Session",
    entries: [
      "Alex",
      "Jordan",
      "Taylor",
      "Morgan",
      "Casey",
      "Riley",
      "Avery",
      "Quinn",
    ],
  },
  {
    id: "giveaway",
    label: "Giveaway",
    description: "Choose one winner from a promo list.",
    title: "Giveaway Picker",
    entries: [
      "@renata",
      "@gilang",
      "@sekar",
      "@fahri",
      "@nadia",
      "@yusuf",
      "@karina",
      "@rio",
      "@dinda",
    ],
  },
  {
    id: "lunch",
    label: "Team Lunch",
    description: "Decide whose turn it is to pick the menu.",
    title: "Lunch Roulette",
    entries: ["Soto", "Bakso", "Nasi Padang", "Mie Ayam", "Sate", "Ramen"],
  },
];

const wheelColors = [
  "#f97316",
  "#fb7185",
  "#a855f7",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#84cc16",
  "#facc15",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
];

const spinDurationMs = 5200;

const parseEntries = (value: string) => {
  const entries: string[] = [];
  const normalized = new Set<string>();
  let duplicateCount = 0;

  for (const rawEntry of value.split(/\r?\n|,/)) {
    const entry = rawEntry.trim();

    if (!entry) {
      continue;
    }

    const key = entry.toLocaleLowerCase();

    if (normalized.has(key)) {
      duplicateCount += 1;
      continue;
    }

    normalized.add(key);
    entries.push(entry);
  }

  return { entries, duplicateCount };
};

const createWheelGradient = (count: number) => {
  if (count <= 0) {
    return "radial-gradient(circle at center, #e2e8f0 0%, #cbd5e1 100%)";
  }

  const sliceAngle = 360 / count;
  const parts: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const start = index * sliceAngle;
    const end = start + sliceAngle;
    const color = wheelColors[index % wheelColors.length];
    parts.push(`${color} ${start}deg ${end}deg`);
  }

  return `conic-gradient(from -90deg, ${parts.join(", ")})`;
};

const createSliceLines = (count: number) => {
  if (count <= 1) {
    return "";
  }

  const lines: string[] = [];

  for (let index = 0; index < count; index += 1) {
    lines.push(
      `<line x1="100" y1="100" x2="100" y2="10" transform="rotate(${(360 / count) * index} 100 100)" />`,
    );
  }

  return lines.join("");
};

const randomInt = (max: number) => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);

  return values[0] % max;
};

const truncateLabel = (value: string) => {
  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 15)}...`;
};

export default function SpinningWheelStudio() {
  const [title, setTitle] = useState(presets[0].title);
  const [rawEntries, setRawEntries] = useState(presets[0].entries.join("\n"));
  const [removeWinner, setRemoveWinner] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [winnerHistory, setWinnerHistory] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { entries, duplicateCount } = parseEntries(rawEntries);
  const deferredEntries = useDeferredValue(entries);
  const wheelEntries = deferredEntries.length > 0 ? deferredEntries : entries;
  const hasEnoughEntries = entries.length >= 2;
  const sliceAngle = wheelEntries.length > 0 ? 360 / wheelEntries.length : 360;
  const wheelGradient = createWheelGradient(wheelEntries.length);
  const sliceLines = createSliceLines(wheelEntries.length);

  const cancelPendingSpin = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setIsSpinning(false);
  };

  useEffect(() => {
    return () => {
      cancelPendingSpin();
    };
  }, []);

  const applyPreset = (presetId: string) => {
    const preset = presets.find((item) => item.id === presetId);

    if (!preset) {
      return;
    }

    cancelPendingSpin();

    startTransition(() => {
      setTitle(preset.title);
      setRawEntries(preset.entries.join("\n"));
      setWinner(null);
      setWinnerHistory([]);
      setRotation(0);
    });
  };

  const clearAll = () => {
    cancelPendingSpin();

    startTransition(() => {
      setRawEntries("");
      setWinner(null);
      setWinnerHistory([]);
      setRotation(0);
    });
  };

  const resetSession = () => {
    cancelPendingSpin();

    startTransition(() => {
      setWinner(null);
      setWinnerHistory([]);
      setRotation(0);
    });
  };

  const spinWheel = () => {
    if (!hasEnoughEntries || isSpinning) {
      return;
    }

    const currentEntries = entries;
    const selectedIndex = randomInt(currentEntries.length);
    const selectedWinner = currentEntries[selectedIndex];
    const centerAngle =
      selectedIndex * (360 / currentEntries.length) +
      180 / currentEntries.length;
    const extraTurns = (6 + randomInt(3)) * 360;
    const adjustment = (360 - ((rotation + centerAngle) % 360)) % 360;
    const nextRotation = rotation + extraTurns + adjustment;

    setIsSpinning(true);
    setWinner(null);
    setRotation(nextRotation);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setIsSpinning(false);

      startTransition(() => {
        setWinner(selectedWinner);
        setWinnerHistory((currentHistory) => [
          selectedWinner,
          ...currentHistory.filter((entry) => entry !== selectedWinner),
        ]);

        if (removeWinner) {
          const nextEntries = currentEntries.filter(
            (_, index) => index !== selectedIndex,
          );
          setRawEntries(nextEntries.join("\n"));
        }
      });
    }, spinDurationMs);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.18),_transparent_30%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-4 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.45)] md:p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 right-0 h-56 w-56 rounded-full bg-orange-300/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-sky-300/15 blur-3xl" />
      </div>

      <div className="relative grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/70 bg-white/75 shadow-lg backdrop-blur">
          <CardHeader className="gap-3 border-b border-slate-200/80">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                Random Picker
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                Great for group draws, giveaways, and rosters
              </Badge>
            </div>
            <CardTitle className="text-2xl text-slate-950">
              Spin a wheel that actually feels alive
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6 text-slate-600">
              Paste names, remove duplicates automatically, spin with a single
              click, and keep the winners history visible for the whole session.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 pt-6">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <label
                  htmlFor="wheel-title"
                  className="text-sm font-medium text-slate-700"
                >
                  Session title
                </label>
                <Input
                  id="wheel-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Arisan keluarga bulan ini"
                  className="border-slate-200 bg-white/80"
                />
              </div>
              <div className="flex flex-wrap items-end gap-2 md:justify-end">
                {presets.map((preset) => (
                  <Button
                    key={preset.id}
                    type="button"
                    variant="outline"
                    className="border-slate-200 bg-white"
                    onClick={() => applyPreset(preset.id)}
                    title={preset.description}
                  >
                    <Sparkles className="size-4" />
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="wheel-entries"
                    className="text-sm font-medium text-slate-700"
                  >
                    Participants or options
                  </label>
                  <p className="text-xs text-slate-500">
                    One item per line. Commas also work.
                  </p>
                </div>
                <textarea
                  id="wheel-entries"
                  value={rawEntries}
                  onChange={(event) => setRawEntries(event.target.value)}
                  placeholder={"Alya\nBima\nCitra\nDion"}
                  className="min-h-56 w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-xs transition outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70"
                />
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <Badge variant="secondary" className="rounded-full">
                    {entries.length} active entries
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    {duplicateCount} duplicates skipped
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setRemoveWinner((value) => !value)}
                    className={cn(
                      "rounded-md border px-3 py-1 font-medium transition",
                      removeWinner
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-600",
                    )}
                  >
                    Remove winner after spin: {removeWinner ? "On" : "Off"}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-950 p-4 text-white shadow-[0_22px_50px_-24px_rgba(15,23,42,0.8)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
                      Session
                    </p>
                    <p className="mt-2 text-xl font-semibold">
                      {title || "Untitled spinning wheel"}
                    </p>
                  </div>
                  <div className="rounded-full border border-white/15 bg-white/10 p-3">
                    <Dices className="size-5 text-amber-300" />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
                  <div className="min-h-24 rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-slate-400">Status</p>
                    <p className="mt-1 text-lg font-semibold">
                      {hasEnoughEntries ? "Yes" : "Need 2+"}
                    </p>
                  </div>
                  <div className="min-h-24 rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-slate-400">Mode</p>
                    <p className="mt-1 text-lg font-semibold">
                      {removeWinner ? "Unique" : "Open"}
                    </p>
                  </div>
                  <div className="min-h-24 rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-slate-400">Winners</p>
                    <p className="mt-1 text-lg font-semibold">
                      {winnerHistory.length}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-amber-300">
                    <PartyPopper className="size-4" />
                    <p className="text-xs font-semibold tracking-[0.24em] uppercase">
                      Latest result
                    </p>
                  </div>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">
                    {winner ?? "Spin the wheel to reveal a winner"}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    The winner locks in after the wheel stops, then gets saved
                    to the session history below.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="overflow-hidden border-slate-200/80 bg-slate-950 text-white shadow-[0_28px_70px_-36px_rgba(15,23,42,0.9)]">
            <CardContent className="relative px-4 pt-6 pb-5 md:px-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.26),_transparent_22%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.2),_transparent_30%)]" />
              <div className="relative">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
                      Wheel
                    </p>
                    <p className="mt-2 text-lg font-semibold">
                      {isSpinning ? "Drawing in progress..." : "Ready to spin"}
                    </p>
                  </div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                    {entries.length} options
                  </div>
                </div>

                <div className="relative mx-auto aspect-square w-full max-w-[430px]">
                  <div className="absolute top-1 left-1/2 z-20 -translate-x-1/2">
                    <div className="h-0 w-0 border-x-[18px] border-t-[30px] border-x-transparent border-t-amber-300 drop-shadow-[0_8px_16px_rgba(251,191,36,0.45)]" />
                  </div>

                  <div className="absolute inset-0 rounded-full bg-white/10 blur-2xl" />

                  <div
                    className="absolute inset-5 rounded-full border-[10px] border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_20px_40px_rgba(15,23,42,0.35)]"
                    style={{
                      backgroundImage: wheelGradient,
                      transform: `rotate(${rotation}deg)`,
                      transition: isSpinning
                        ? `transform ${spinDurationMs}ms cubic-bezier(0.16, 1, 0.3, 1)`
                        : undefined,
                    }}
                  >
                    <svg
                      viewBox="0 0 200 200"
                      className="absolute inset-0 h-full w-full text-white/40"
                      aria-hidden="true"
                      dangerouslySetInnerHTML={{
                        __html: `<g stroke="currentColor" stroke-width="1.25">${sliceLines}</g>`,
                      }}
                    />

                    {wheelEntries.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center p-10 text-center text-sm font-medium text-slate-800">
                        Add at least two names to start the draw.
                      </div>
                    ) : (
                      wheelEntries.map((entry, index) => {
                        const angle = index * sliceAngle + sliceAngle / 2;

                        return (
                          <div
                            key={`${entry}-${index}`}
                            className="absolute top-1/2 left-1/2 w-[40%] origin-left"
                            style={{
                              transform: `translateY(-50%) rotate(${angle - 90}deg)`,
                            }}
                          >
                            <div
                              className={cn(
                                "ml-7 max-w-[72%] rounded-full px-2 py-1 text-center text-[10px] font-semibold tracking-wide text-slate-950 shadow-sm",
                                wheelEntries.length > 10 &&
                                  "text-[9px] tracking-normal",
                              )}
                              style={{
                                transform: `rotate(${90 - angle}deg)`,
                                backgroundColor: "rgba(255,255,255,0.75)",
                              }}
                            >
                              {truncateLabel(entry)}
                            </div>
                          </div>
                        );
                      })
                    )}

                    <div className="absolute inset-[33%] rounded-full border border-white/25 bg-slate-950/90 shadow-[0_12px_24px_rgba(15,23,42,0.35)]" />
                    <div className="absolute inset-[39%] rounded-full bg-white/95" />
                    <div className="absolute inset-0 rounded-full ring-1 ring-white/10 ring-inset" />
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    size="lg"
                    onClick={spinWheel}
                    disabled={!hasEnoughEntries || isSpinning}
                    className="flex-1 rounded-xl bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300"
                  >
                    <Trophy className="size-4" />
                    {isSpinning ? "Spinning..." : "Spin the wheel"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={resetSession}
                    className="rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  >
                    <RefreshCcw className="size-4" />
                    Reset results
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={clearAll}
                    className="rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  >
                    <Trash2 className="size-4" />
                    Clear list
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/80 shadow-lg backdrop-blur">
            <CardHeader className="gap-2 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <History className="size-4 text-slate-500" />
                <CardTitle className="text-base text-slate-900">
                  Winners history
                </CardTitle>
              </div>
              <CardDescription>
                Keep track of previous spins during this session.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {winnerHistory.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  No winners yet. Spin the wheel and the results will appear
                  here.
                </div>
              ) : (
                <div className="grid gap-2">
                  {winnerHistory.map((entry, index) => (
                    <div
                      key={`${entry}-${index}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div>
                        <p className="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
                          Winner #{index + 1}
                        </p>
                        <p className="mt-1 font-medium text-slate-900">
                          {entry}
                        </p>
                      </div>
                      <Trophy className="size-4 text-amber-500" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
