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
import { T } from "@/lib/app";
import {
  getSavedWidgetPosition,
  observeWidget,
  resetWidgetPosition,
  swapWidgetPositions,
  triggerLayoutUpdate,
  unobserveWidget,
} from "@/lib/widget-positions";
import "@fontsource-variable/rubik";
import { widgetVisibilityAtom } from "@/data/store";
import { useAtom } from "jotai";
import {
  Calendar,
  Moon,
  MoreHorizontal,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const FORMAT_STORAGE_KEY = "widgetDateTimeFormat";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";
const WIDGET_VERSION = "1.0.0";

type TimeFormat = "12h" | "24h";

// Get time of day icon based on hour
function TimeOfDayIcon({
  hour,
  className,
}: {
  hour: number;
  className?: string;
}) {
  if (hour >= 5 && hour < 7) return <Sunrise className={className} />;
  if (hour >= 7 && hour < 17) return <Sun className={className} />;
  if (hour >= 17 && hour < 19) return <Sunset className={className} />;
  return <Moon className={className} />;
}

// Get greeting based on hour
function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";
  return "Good Night";
}

// Format time in 24h format
function format24h(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${hours < 10 ? "0" + hours : hours}:${minutes < 10 ? "0" + minutes : minutes}`;
}

const WIDGET_ID = "time";

export default function WidgetDraggableDateTime() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const positionRef = useRef(position);
  const [isDragging, setIsDragging] = useState(false);

  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(() => {
    if (typeof window === "undefined") return "12h";
    const saved = localStorage.getItem(FORMAT_STORAGE_KEY);
    return saved === "24h" ? "24h" : "12h";
  });

  // Load position from localStorage on mount
  useEffect(() => {
    queueMicrotask(() => {
      const saved = getSavedWidgetPosition(WIDGET_ID);
      const initial = saved ?? { x: 0, y: 0 };
      setPosition(initial);
      positionRef.current = initial;
      setIsPositionLoaded(true);
    });
  }, []);

  // Register with ResizeObserver for automatic layout updates
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    observeWidget(WIDGET_ID, el);
    try {
      triggerLayoutUpdate();
    } catch {}
    return () => unobserveWidget(WIDGET_ID);
  }, []);

  // Listen for widget position reset events
  useEffect(() => {
    const handleReset = (e: Event) => {
      const customEvent = e as CustomEvent<
        Record<string, { x: number; y: number }>
      >;
      const detail = customEvent.detail || {};
      // Only update if we do NOT have a saved position
      if (!getSavedWidgetPosition(WIDGET_ID)) {
        if (Object.prototype.hasOwnProperty.call(detail, WIDGET_ID)) {
          const newPos = detail[WIDGET_ID];
          if (newPos) setPosition(newPos);
        } else if (Object.keys(detail).length > 1) {
          const newPos = detail[WIDGET_ID];
          if (newPos) setPosition(newPos);
        }
      }
    };

    window.addEventListener("widget-positions-reset", handleReset);
    return () =>
      window.removeEventListener("widget-positions-reset", handleReset);
  }, []);

  // Drag/Drop swap handlers will be attached to the left label below
  const handleDragStart = useCallback((e: React.DragEvent) => {
    try {
      e.dataTransfer?.setData("text/widget-id", WIDGET_ID);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    } catch {}
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => setIsDragging(false), []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    try {
      const src = e.dataTransfer?.getData("text/widget-id");
      if (src && src !== WIDGET_ID) {
        swapWidgetPositions(src as any, WIDGET_ID as any);
      }
    } catch {}
  }, []);

  // Update time every second
  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date());
    updateTime();

    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Toggle time format
  const toggleTimeFormat = useCallback(() => {
    setTimeFormat((prev) => {
      const next = prev === "12h" ? "24h" : "12h";
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(FORMAT_STORAGE_KEY, next);
        } catch {
          /* noop */
        }
      }
      return next;
    });
  }, []);

  // Reset position
  const resetPosition = useCallback(() => {
    resetWidgetPosition(WIDGET_ID);
  }, []);

  // Derived values
  const userLocale =
    typeof navigator !== "undefined" ? navigator.language : "en-US";

  const formattedTime = currentTime
    ? timeFormat === "12h"
      ? T.format(currentTime)
      : format24h(currentTime)
    : "--:--";

  const meridiem =
    currentTime && timeFormat === "12h"
      ? currentTime.getHours() >= 12
        ? "PM"
        : "AM"
      : "";

  const seconds = currentTime
    ? currentTime.getSeconds().toString().padStart(2, "0")
    : "00";

  const dayOfWeek = currentTime
    ? currentTime.toLocaleString(userLocale, { weekday: "long" })
    : "";

  const monthDay = currentTime
    ? currentTime.toLocaleString(userLocale, { month: "long", day: "numeric" })
    : "";

  const year = currentTime ? currentTime.getFullYear() : "";

  const hour = currentTime ? currentTime.getHours() : 12;
  const greeting = getGreeting(hour);

  const isVisible =
    isPositionLoaded && currentTime !== null && visibility[WIDGET_ID] !== false;

  return (
    <>
      <DropdownMenu
        open={moreMenuOpen}
        onOpenChange={setMoreMenuOpen}
        modal={false}
      >
        <div
          ref={containerRef}
          data-widget-id={WIDGET_ID}
          className={`pointer-events-auto z-50 flex rounded-lg bg-black/80 shadow-lg ring-1 ring-white/15 ${isDragging ? "shadow-none transition-none" : "transition-opacity duration-300"} ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          {/* Top Title - Drag Handle */}

          {/* Main Column */}
          <div className="flex w-full flex-col">
            <div
              draggable
              onDragStart={(e) => {
                try {
                  e.dataTransfer?.setData("text/widget-id", WIDGET_ID);
                  if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
                } catch {}
              }}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                try {
                  const src = e.dataTransfer?.getData("text/widget-id");
                  if (src && src !== WIDGET_ID) swapWidgetPositions(src as any, WIDGET_ID as any);
                } catch {}
              }}
              className={`flex items-center h-8 px-3 gap-2 cursor-move select-none border-b border-white/10 ${isDragging ? "opacity-60" : "opacity-100"}`}
            >
              <span className="text-[10px] font-semibold tracking-widest text-white/50 uppercase leading-none">Time</span>
            </div>
            {/* DateTime Row */}
            <div className="flex items-center gap-3 p-3">
              {/* Time of Day Icon */}
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-linear-to-br from-white/15 to-white/5">
                <TimeOfDayIcon
                  hour={hour}
                  className="h-8 w-8 text-amber-300/90"
                />
              </div>

              {/* Time Display */}
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <span className="text-xs text-white/60">{greeting}</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-rubik text-3xl font-light tracking-tight text-white">
                    {formattedTime}
                  </span>
                  {timeFormat === "12h" && (
                    <span className="text-sm font-medium text-white/70">
                      {meridiem}
                    </span>
                  )}
                  <span className="ml-0.5 text-xs text-white/40 tabular-nums">
                    :{seconds}
                  </span>
                </div>
              </div>

              {/* Date Info */}
              <div className="flex shrink-0 flex-col items-end gap-0.5 text-right text-[10px] text-white/50">
                <div className="flex items-center gap-1" title="Day of week">
                  <span className="font-medium text-white/70">{dayOfWeek}</span>
                </div>
                <div className="flex items-center gap-1" title="Date">
                  <Calendar className="h-3 w-3" />
                  <span>{monthDay}</span>
                </div>
                <div className="flex items-center gap-1" title="Year">
                  <span>{year}</span>
                </div>
              </div>
            </div>

            {/* Separator and action bar */}
            <div className="border-t border-white/10" />
            <div className="flex items-center gap-2 px-3 py-2 text-[10px] leading-tight">
              <button
                onClick={toggleTimeFormat}
                className="flex h-8 cursor-pointer items-center rounded-full border border-white/10 bg-white/10 px-3 text-[10px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white/20"
                title={`Switch to ${timeFormat === "12h" ? "24-hour" : "12-hour"} format`}
              >
                <span>{timeFormat === "12h" ? "24H" : "12H"}</span>
              </button>

              <div className="ml-auto">
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/20"
                    title="More options"
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
              </div>
            </div>
          </div>
        </div>
        <DropdownMenuContent align="end" sideOffset={6} className="min-w-40">
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              setMoreMenuOpen(false);
              setVisibility((prev) => ({ ...prev, [WIDGET_ID]: false }));
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
            onSelect={toggleTimeFormat}
            className="cursor-pointer"
          >
            Switch to {timeFormat === "12h" ? "24-hour" : "12-hour"} format
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setMoreMenuOpen(false);
              requestAnimationFrame(() => {
                resetPosition();
              });
            }}
            className="cursor-pointer"
          >
            Reset widget position
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

      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>About Date & Time Widget</DialogTitle>
            <DialogDescription className="mt-2 text-left">
              Shows current time with friendly greetings and beautiful icons
              that change with the time of day.
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
