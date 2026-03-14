"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Confetti } from "@neoconfetti/react";
import { Gift, History, RefreshCcw, Trash2, Trophy } from "lucide-react";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";

const presets = [
  {
    id: "sample",
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
      "@alex",
      "@jordan",
      "@taylor",
      "@morgan",
      "@casey",
      "@riley",
      "@avery",
      "@quinn",
      "@cameron",
    ],
  },
  {
    id: "lunch",
    label: "Team Lunch",
    description: "Decide whose turn it is to pick the menu.",
    title: "Lunch Roulette",
    entries: ["Pizza", "Burgers", "Tacos", "Salad", "Sandwiches", "Ramen"],
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
  const [winnerDialogOpen, setWinnerDialogOpen] = useState(false);
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
      setWinnerDialogOpen(false);
      setRotation(0);
    });
  };

  const clearAll = () => {
    cancelPendingSpin();

    startTransition(() => {
      setRawEntries("");
      setWinner(null);
      setWinnerHistory([]);
      setWinnerDialogOpen(false);
      setRotation(0);
    });
  };

  const resetSession = () => {
    cancelPendingSpin();

    startTransition(() => {
      setWinner(null);
      setWinnerHistory([]);
      setWinnerDialogOpen(false);
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
    setWinnerDialogOpen(false);
    setRotation(nextRotation);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setIsSpinning(false);

      startTransition(() => {
        setWinner(selectedWinner);
        setWinnerDialogOpen(true);
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
    <>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* ─── Wheel hero ─── */}
        <div className="relative overflow-hidden rounded-lg bg-slate-950 shadow-[0_32px_80px_-20px_rgba(15,23,42,0.7)]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-amber-400/20 blur-[100px]" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-violet-500/10 blur-[80px]" />
            <div className="absolute -right-20 bottom-16 h-64 w-64 rounded-full bg-cyan-400/10 blur-[80px]" />
          </div>

          <div className="relative px-6 pt-7 pb-8 md:px-10 md:pt-9 md:pb-10">
            {/* Top bar */}
            <div className="mb-8 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-400">
                  {title || "Spinning Wheel"}
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
                  {isSpinning
                    ? "Drawing in progress..."
                    : winner
                      ? winner
                      : "Ready to spin"}
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {winnerHistory.length > 0 && (
                  <span className="rounded-md bg-amber-400/15 px-3 py-1.5 text-xs font-semibold text-amber-300">
                    {winnerHistory.length}{" "}
                    {winnerHistory.length === 1 ? "winner" : "winners"}
                  </span>
                )}
                <span className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-300">
                  {entries.length} entries
                </span>
              </div>
            </div>

            {/* Wheel */}
            <div className="relative mx-auto aspect-square w-full max-w-105">
              <div className="absolute top-0 left-1/2 z-20 -translate-x-1/2">
                <div className="h-0 w-0 border-x-16 border-t-28 border-x-transparent border-t-amber-300 drop-shadow-[0_6px_14px_rgba(251,191,36,0.5)]" />
              </div>

              <div className="absolute inset-0 rounded-full bg-white/6 blur-2xl" />

              {/* Outer ring — solid dark frame */}
              <div className="absolute inset-4 rounded-full bg-slate-800 p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_20px_40px_rgba(0,0,0,0.5)]">
                {/* Inner wheel — gradient lives here, clipped by the ring */}
                <div
                  className="relative h-full w-full rounded-full"
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
                    className="absolute inset-0 h-full w-full text-white/30"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{
                      __html: `<g stroke="currentColor" stroke-width="1">${sliceLines}</g>`,
                    }}
                  />

                  {wheelEntries.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center p-10 text-center text-sm font-medium text-slate-400">
                      Add at least two entries to start.
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
                              "ml-6 max-w-[72%] rounded-full px-2 py-0.5 text-center text-[10px] font-semibold tracking-wide text-slate-950",
                              wheelEntries.length > 10 &&
                                "text-[9px] tracking-normal",
                            )}
                            style={{
                              transform: `rotate(${90 - angle}deg)`,
                              backgroundColor: "rgba(255,255,255,0.82)",
                            }}
                          >
                            {truncateLabel(entry)}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Center hub */}
                  <div className="absolute inset-[32%] rounded-full border-2 border-slate-700 bg-slate-900 shadow-[0_8px_24px_rgba(0,0,0,0.4)]" />
                  <div className="absolute inset-[38%] rounded-full bg-white shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)]" />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mx-auto mt-8 flex max-w-sm items-center justify-center gap-3">
              <Button
                type="button"
                size="lg"
                onClick={spinWheel}
                disabled={!hasEnoughEntries || isSpinning}
                className="flex-1 rounded-lg bg-amber-400 text-base font-bold text-slate-950 shadow-[0_0_32px_rgba(251,191,36,0.3)] hover:bg-amber-300 disabled:shadow-none"
              >
                <Trophy className="size-5" />
                {isSpinning ? "Spinning..." : "Spin"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={resetSession}
                title="Reset results"
                className="rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <RefreshCcw className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={clearAll}
                title="Clear all entries"
                className="rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            {/* Latest winner inline */}
            {winner && (
              <div className="mx-auto mt-6 max-w-sm rounded-lg border border-amber-400/20 bg-amber-400/10 px-5 py-3 text-center">
                <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-300/70 uppercase">
                  Latest winner
                </p>
                <p className="mt-1 text-lg font-bold text-white">{winner}</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Setup & History ─── */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Setup panel */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Setup</h3>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    title={preset.description}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Input
                id="wheel-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Session title"
                className="border-slate-200 bg-slate-50/60"
              />
              <textarea
                id="wheel-entries"
                value={rawEntries}
                onChange={(event) => setRawEntries(event.target.value)}
                placeholder={"Alex\nJordan\nTaylor\nMorgan"}
                className="min-h-55 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 transition outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-md bg-slate-100 px-2 py-1 font-medium">
                  {entries.length} entries
                </span>
                {duplicateCount > 0 && (
                  <span className="rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-700">
                    {duplicateCount} skipped
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setRemoveWinner((value) => !value)}
                  className={cn(
                    "ml-auto rounded-md border px-2.5 py-1 font-medium transition",
                    removeWinner
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-500",
                  )}
                >
                  Auto-remove: {removeWinner ? "On" : "Off"}
                </button>
              </div>
            </div>
          </div>

          {/* Winners panel */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <History className="size-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Winners</h3>
              {winnerHistory.length > 0 && (
                <span className="ml-auto rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                  {winnerHistory.length}
                </span>
              )}
            </div>

            {winnerHistory.length === 0 ? (
              <div className="flex min-h-55 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400">
                Winners will appear here
              </div>
            ) : (
              <div className="space-y-2">
                {winnerHistory.map((entry, index) => (
                  <div
                    key={`${entry}-${index}`}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-3",
                      index === 0
                        ? "border-amber-200 bg-amber-50"
                        : "border-slate-100 bg-slate-50",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        index === 0
                          ? "bg-amber-400 text-slate-950"
                          : "bg-slate-200 text-slate-600",
                      )}
                    >
                      {index + 1}
                    </div>
                    <span className="font-medium text-slate-900">{entry}</span>
                    {index === 0 && (
                      <Trophy className="ml-auto size-4 text-amber-500" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Winner dialog ─── */}
      <Dialog open={winnerDialogOpen} onOpenChange={setWinnerDialogOpen}>
        <DialogContent className="overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-xl">
          <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(180deg,#020617_0%,#0f172a_48%,#111827_100%)] p-7 text-white shadow-[0_30px_90px_-30px_rgba(15,23,42,0.9)]">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-8 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-amber-300/20 blur-3xl" />
              <div className="absolute right-0 bottom-0 h-44 w-44 rounded-full bg-fuchsia-500/15 blur-3xl" />
              {winnerDialogOpen && (
                <Confetti
                  class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  colors={[
                    "#f97316",
                    "#fb7185",
                    "#a855f7",
                    "#3b82f6",
                    "#06b6d4",
                    "#10b981",
                    "#facc15",
                    "#ef4444",
                  ]}
                  particleCount={180}
                  particleSize={10}
                  particleShape="mix"
                  force={0.3}
                  duration={3600}
                  stageHeight={560}
                  stageWidth={560}
                />
              )}
            </div>

            <div className="relative">
              <Badge className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-slate-950">
                Winner Revealed
              </Badge>
              <DialogHeader className="mt-5 text-left">
                <div className="flex items-center gap-3">
                  <div className="rounded-full border border-white/10 bg-white/10 p-3 text-amber-300">
                    <Gift className="size-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-3xl font-semibold tracking-tight text-white">
                      Congrats {winner ?? "Winner"}
                    </DialogTitle>
                    <DialogDescription className="mt-2 max-w-md text-base leading-7 text-slate-300">
                      The wheel has spoken.{" "}
                      <span className="font-medium text-white">
                        {winner ?? "Your selected entry"}
                      </span>{" "}
                      takes this round.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
                    Session
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {title || "Lucky draw"}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
                    Winners so far
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {winnerHistory.length}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <Button
                  type="button"
                  onClick={() => setWinnerDialogOpen(false)}
                  className="rounded-lg bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300"
                >
                  Celebrate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWinnerDialogOpen(false)}
                  className="rounded-lg border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
