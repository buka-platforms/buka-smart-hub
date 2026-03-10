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
const TARGET_DATE_KEY = "widgetBiorhythmTargetDate";
const WIDGET_VERSION = "0.1.0";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toLocalInputDate(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
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
  const [targetDate, setTargetDate] = useState(() => {
    const today = toLocalInputDate(new Date());
    if (typeof window === "undefined") return today;
    try {
      return localStorage.getItem(TARGET_DATE_KEY) || today;
    } catch {
      return today;
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
      localStorage.setItem(TARGET_DATE_KEY, targetDate);
    } catch {
      // Ignore storage errors
    }
  }, [targetDate]);

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
        },
        {
          key: "emotional",
          label: "Emotional",
          period: 28,
          value: Math.sin((2 * Math.PI * days) / 28),
        },
        {
          key: "intellectual",
          label: "Intellectual",
          period: 33,
          value: Math.sin((2 * Math.PI * days) / 33),
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
                <div className="text-[11px] text-white/60">
                  Days since birth:{" "}
                  <span className="font-semibold text-white/85">
                    {calculation.days}
                  </span>
                </div>
                {calculation.cycles?.map((cycle) => {
                  const percentage = Math.round(cycle.value * 100);
                  const fillWidth = `${Math.abs(percentage)}%`;
                  const positive = cycle.value >= 0;

                  return (
                    <div key={cycle.key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-white/85">
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
                          className={`h-full ${
                            positive ? "bg-emerald-400/90" : "bg-rose-400/90"
                          }`}
                          style={{ width: fillWidth }}
                        />
                      </div>
                    </div>
                  );
                })}
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
