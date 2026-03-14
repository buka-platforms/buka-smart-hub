"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { widgetVisibilityAtom } from "@/data/store";
import {
  getSavedWidgetPosition,
  observeWidget,
  swapWidgetPositions,
  triggerLayoutUpdate,
  unobserveWidget,
  type WidgetId,
} from "@/lib/widget-positions";
import { useAtom } from "jotai";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const WIDGET_ID = "biorhythm";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";
const BIRTH_DATE_KEY = "widgetBiorhythmBirthDate";
const DISPLAY_MODE_KEY = "widgetBiorhythmDisplayMode";
const WIDGET_VERSION = "0.1.0";
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const CHART_WIDTH = 240;
const CHART_HEIGHT = 56;
const SINE_STYLES: Record<
  string,
  { line: string; marker: string; label: string }
> = {
  physical: {
    line: "rgba(110, 231, 183, 0.95)",
    marker: "rgba(167, 243, 208, 1)",
    label: "text-emerald-200",
  },
  emotional: {
    line: "rgba(125, 211, 252, 0.95)",
    marker: "rgba(186, 230, 253, 1)",
    label: "text-sky-200",
  },
  intellectual: {
    line: "rgba(253, 164, 175, 0.95)",
    marker: "rgba(255, 205, 210, 1)",
    label: "text-rose-200",
  },
};

type DisplayMode = "bar" | "sine";

function toLocalInputDate(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function getTodayInputDate(): string {
  return toLocalInputDate(new Date());
}

function toUtcTimestamp(dateValue: string): number | null {
  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day);
}

function getCycleLabel(value: number): string {
  const abs = Math.abs(value);
  if (abs < 0.05) return "Critical day";
  if (value > 0) return "Positive phase";
  return "Low phase";
}

function buildSinePath(phase: number): string {
  const amplitude = CHART_HEIGHT * 0.36;
  const centerY = CHART_HEIGHT / 2;
  const samples = 64;
  let d = "";

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = t * CHART_WIDTH;
    const y = centerY - Math.sin(2 * Math.PI * (t + phase)) * amplitude;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }

  return d;
}

export default function WidgetDraggableBiorhythm() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [birthDate, setBirthDate] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(BIRTH_DATE_KEY) || "";
    } catch {
      return "";
    }
  });
  const [targetDate, setTargetDate] = useState(getTodayInputDate);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    if (typeof window === "undefined") return "bar";
    try {
      const saved = localStorage.getItem(DISPLAY_MODE_KEY);
      return saved === "sine" ? "sine" : "bar";
    } catch {
      return "bar";
    }
  });
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);

  useEffect(() => {
    queueMicrotask(() => setIsPositionLoaded(true));
  }, []);

  useEffect(() => {
    try {
      if (birthDate) localStorage.setItem(BIRTH_DATE_KEY, birthDate);
      else localStorage.removeItem(BIRTH_DATE_KEY);
    } catch {
      // Ignore storage errors
    }
  }, [birthDate]);

  useEffect(() => {
    try {
      localStorage.setItem(DISPLAY_MODE_KEY, displayMode);
    } catch {
      // Ignore storage errors
    }
  }, [displayMode]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    observeWidget(WIDGET_ID, el);
    try {
      triggerLayoutUpdate();
    } catch {}
    return () => unobserveWidget(WIDGET_ID);
  }, []);

  useEffect(() => {
    try {
      triggerLayoutUpdate();
    } catch {}
  }, [displayMode]);

  useEffect(() => {
    const handleReset = (e: Event) => {
      const customEvent = e as CustomEvent<
        Record<string, { x: number; y: number }>
      >;
      const detail = customEvent.detail || {};
      if (!getSavedWidgetPosition(WIDGET_ID)) {
        if (
          Object.prototype.hasOwnProperty.call(detail, WIDGET_ID) ||
          Object.keys(detail).length > 1
        ) {
          setIsPositionLoaded(true);
        }
      }
    };
    window.addEventListener("widget-positions-reset", handleReset);
    return () =>
      window.removeEventListener("widget-positions-reset", handleReset);
  }, []);

  const calculation = useMemo(() => {
    if (!birthDate) {
      return { error: "Set your birth date to see biorhythm cycles.", days: 0 };
    }

    const birthTs = toUtcTimestamp(birthDate);
    const targetTs = toUtcTimestamp(targetDate);
    if (!birthTs || !targetTs) {
      return { error: "Invalid date input.", days: 0 };
    }

    const days = Math.floor((targetTs - birthTs) / DAY_IN_MS);
    if (days < 0) {
      return { error: "Target date must be on or after birth date.", days };
    }

    return {
      days,
      cycles: [
        {
          key: "physical",
          label: "Physical",
          period: 23,
          value: Math.sin((2 * Math.PI * days) / 23),
          phase: ((days % 23) + 23) % 23,
        },
        {
          key: "emotional",
          label: "Emotional",
          period: 28,
          value: Math.sin((2 * Math.PI * days) / 28),
          phase: ((days % 28) + 28) % 28,
        },
        {
          key: "intellectual",
          label: "Intellectual",
          period: 33,
          value: Math.sin((2 * Math.PI * days) / 33),
          phase: ((days % 33) + 33) % 33,
        },
      ],
    };
  }, [birthDate, targetDate]);

  const isVisible = isPositionLoaded && visibility[WIDGET_ID] !== false;

  return (
    <>
      <div
        ref={containerRef}
        data-widget-id={WIDGET_ID}
        className={`pointer-events-auto flex rounded-lg bg-black/80 shadow-lg ring-1 ring-white/15 ${
          isDragging
            ? "shadow-none transition-none"
            : "transition-opacity duration-300"
        } ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div className="flex w-full flex-col">
          <div
            draggable
            onDragStart={(e) => {
              try {
                e.dataTransfer?.setData("text/widget-id", WIDGET_ID);
                if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
              } catch {}
              setIsDragging(true);
            }}
            onDragEnd={() => setIsDragging(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              try {
                const src = e.dataTransfer?.getData("text/widget-id");
                if (src && src !== WIDGET_ID) {
                  swapWidgetPositions(src as WidgetId, WIDGET_ID as WidgetId);
                }
              } catch {}
            }}
            className={`flex h-8 cursor-move items-center gap-2 border-b border-white/10 px-3 select-none ${
              isDragging ? "opacity-60" : "opacity-100"
            }`}
          >
            <span className="text-[10px] leading-none font-semibold tracking-widest text-white/50 uppercase">
              Biorhythm
            </span>
            <div className="ml-auto">
              <DropdownMenu
                open={moreMenuOpen}
                onOpenChange={setMoreMenuOpen}
                modal={false}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="More options"
                    className="flex h-5 w-5 min-w-5 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/3 text-white/50 transition-colors hover:bg-white/8"
                    title="More options"
                  >
                    <MoreHorizontal className="h-2.5 w-2.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={6}
                  className="min-w-40"
                >
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={(e) => {
                      e.preventDefault();
                      setMoreMenuOpen(false);
                      setVisibility((prev) => ({
                        ...prev,
                        [WIDGET_ID]: false,
                      }));
                      try {
                        localStorage.setItem(
                          WIDGET_VISIBILITY_KEY,
                          JSON.stringify({ ...visibility, [WIDGET_ID]: false }),
                        );
                      } catch {}
                    }}
                  >
                    Hide widget
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setMoreMenuOpen(false);
                      setAboutDialogOpen(true);
                    }}
                    className="cursor-pointer"
                  >
                    About widget
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="space-y-3 p-3">
            <div className="grid gap-2">
              <label className="text-[11px] font-medium text-white/70">
                Birth date
              </label>
              <Input
                type="date"
                value={birthDate}
                max={targetDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="h-8 border-white/15 bg-white/5 text-white"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[11px] font-medium text-white/70">
                Target date
              </label>
              <Input
                type="date"
                value={targetDate}
                min={birthDate || undefined}
                onChange={(e) => setTargetDate(e.target.value)}
                className="h-8 border-white/15 bg-white/5 text-white"
              />
            </div>

            {calculation.error ? (
              <p className="rounded-md border border-amber-300/30 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-200">
                {calculation.error}
              </p>
            ) : (
              <div className="space-y-2 rounded-md border border-white/10 bg-white/5 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] text-white/60">
                    Days since birth:{" "}
                    <span className="font-semibold text-white/85">
                      {calculation.days}
                    </span>
                  </div>
                  <div className="inline-flex rounded-md border border-white/15 bg-black/30 p-0.5">
                    <button
                      type="button"
                      onClick={() => setDisplayMode("bar")}
                      className={`cursor-pointer rounded px-2 py-1 text-[10px] font-semibold ${
                        displayMode === "bar"
                          ? "bg-white/20 text-white"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      Bar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisplayMode("sine")}
                      className={`cursor-pointer rounded px-2 py-1 text-[10px] font-semibold ${
                        displayMode === "sine"
                          ? "bg-white/20 text-white"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      Sine
                    </button>
                  </div>
                </div>
                {displayMode === "bar" ? (
                  calculation.cycles?.map((cycle) => {
                    const percentage = Math.round(cycle.value * 100);
                    const positive = cycle.value >= 0;
                    const fillWidth = `${Math.abs(percentage)}%`;
                    const style = SINE_STYLES[cycle.key];

                    return (
                      <div key={cycle.key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={`font-medium ${style.label}`}>
                            {cycle.label}
                          </span>
                          <span
                            className={
                              positive ? "text-emerald-300" : "text-rose-300"
                            }
                          >
                            {percentage > 0 ? "+" : ""}
                            {percentage}% • {getCycleLabel(cycle.value)}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full"
                            style={{
                              backgroundColor: style.line,
                              width: fillWidth,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="space-y-2 rounded-md border border-white/10 bg-black/20 p-2">
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      {calculation.cycles?.map((cycle) => {
                        const percentage = Math.round(cycle.value * 100);
                        const style = SINE_STYLES[cycle.key];
                        return (
                          <div
                            key={`legend-${cycle.key}`}
                            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1"
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: style.line }}
                            />
                            <span className={`font-medium ${style.label}`}>
                              {cycle.label}
                            </span>
                            <span className="text-white/60">
                              {percentage > 0 ? "+" : ""}
                              {percentage}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <svg
                      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                      className="h-14 w-full"
                      aria-hidden="true"
                    >
                      <line
                        x1="0"
                        y1={CHART_HEIGHT / 2}
                        x2={CHART_WIDTH}
                        y2={CHART_HEIGHT / 2}
                        stroke="rgba(255,255,255,0.20)"
                        strokeDasharray="4 3"
                      />
                      {calculation.cycles?.map((cycle) => {
                        const phaseRatio = cycle.phase / cycle.period;
                        const wavePath = buildSinePath(phaseRatio);
                        const markerX = phaseRatio * CHART_WIDTH;
                        const markerY =
                          CHART_HEIGHT / 2 -
                          cycle.value * (CHART_HEIGHT * 0.36);
                        const style = SINE_STYLES[cycle.key];

                        return (
                          <g key={`line-${cycle.key}`}>
                            <path
                              d={wavePath}
                              fill="none"
                              stroke={style.line}
                              strokeWidth="2"
                            />
                            <circle
                              cx={markerX}
                              cy={markerY}
                              r="2.75"
                              fill={style.marker}
                            />
                          </g>
                        );
                      })}
                    </svg>
                    <div className="grid gap-0.5 text-[10px] text-white/60">
                      {calculation.cycles?.map((cycle) => (
                        <div key={`day-${cycle.key}`}>
                          {cycle.label}: Cycle day {cycle.phase + 1} /{" "}
                          {cycle.period}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>About Biorhythm Widget</DialogTitle>
            <DialogDescription className="mt-2 text-left">
              Track three classic biorhythm cycles based on your birth date:
              physical (23 days), emotional (28 days), and intellectual (33
              days).
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">Version</span>
            <span className="text-sm font-medium">{WIDGET_VERSION}</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
