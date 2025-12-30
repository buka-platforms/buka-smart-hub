"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { T } from "@/lib/app";
import {
  ControlFrom,
  controls,
  events,
  position as positionPlugin,
  useCompartment,
  useDraggable,
} from "@neodrag/react";
import "@fontsource-variable/rubik";
import {
  Calendar,
  Clock,
  Moon,
  MoreHorizontal,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const POSITION_STORAGE_KEY = "widgetDraggableDateTimePosition";
const FORMAT_STORAGE_KEY = "widgetDraggableDateTimeFormat";

type TimeFormat = "12h" | "24h";

// Helper to get saved position from localStorage
function getSavedPosition(): { x: number; y: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(POSITION_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        return parsed;
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}

// Helper to save position to localStorage
function savePosition(x: number, y: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({ x, y }));
  } catch {
    // Ignore storage errors
  }
}

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

export default function WidgetDraggableDateTime() {
  const draggableRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(() => {
    if (typeof window === "undefined") return "12h";
    const saved = localStorage.getItem(FORMAT_STORAGE_KEY);
    return saved === "24h" ? "24h" : "12h";
  });

  // Load position from localStorage on mount
  useEffect(() => {
    const saved = getSavedPosition();
    queueMicrotask(() => {
      if (saved) {
        setPosition(saved);
      }
      setIsPositionLoaded(true);
    });
  }, []);

  // Update time every second
  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date());
    updateTime();

    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Handle drag end to save position
  const handleDragEnd = useCallback(
    (data: { offset: { x: number; y: number } }) => {
      const newPosition = { x: data.offset.x, y: data.offset.y };
      setPosition(newPosition);
      savePosition(newPosition.x, newPosition.y);
    },
    [],
  );

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
    setPosition({ x: 0, y: 0 });
    savePosition(0, 0);
  }, []);

  // Reactive position plugin
  const positionCompartment = useCompartment(
    () => positionPlugin({ current: position }),
    [position.x, position.y],
  );

  useDraggable(draggableRef, () => [
    controls({
      block: ControlFrom.selector("a, button"),
    }),
    events({
      onDragEnd: handleDragEnd,
    }),
    positionCompartment,
  ]);

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

  const isVisible = isPositionLoaded && currentTime !== null;

  return (
    <DropdownMenu>
      <div
        ref={draggableRef}
        className={`pointer-events-auto absolute z-50 flex transform-gpu cursor-grab rounded-lg bg-black/80 shadow-lg backdrop-blur-md transition-opacity duration-300 will-change-transform data-[neodrag-state=dragging]:cursor-grabbing data-[neodrag-state=dragging]:shadow-none ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {/* Vertical "DateTime" Label */}
        <div className="flex items-center justify-center border-r border-white/10 px-1">
          <span className="transform-[rotate(180deg)] text-[10px] font-semibold tracking-widest text-white/50 uppercase [writing-mode:vertical-rl]">
            Time
          </span>
        </div>

        {/* Main Column */}
        <div className="flex w-72 flex-col">
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
              className="flex h-8 cursor-pointer items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 text-[10px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white/20"
              title={`Switch to ${timeFormat === "12h" ? "24-hour" : "12-hour"} format`}
            >
              <Clock className="h-3.5 w-3.5" />
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
        <DropdownMenuItem onSelect={toggleTimeFormat}>
          Switch to {timeFormat === "12h" ? "24-hour" : "12-hour"} format
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={resetPosition}>
          Reset widget position
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
