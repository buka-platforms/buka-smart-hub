"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { T } from "@/lib/app";
import { resetWidgetPosition } from "@/lib/widget-positions";
import {
  ControlFrom,
  controls,
  events,
  position as positionPlugin,
  useCompartment,
  useDraggable,
} from "@neodrag/react";
import { useWidgetPosition } from "./useWidgetPosition";
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
import { useCallback, useEffect, useState } from "react";

const FORMAT_STORAGE_KEY = "widgetDateTimeFormat";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";

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

export default function WidgetDraggableDateTime() {
  const { position, isPositionLoaded, draggableRef, handleDragEnd } =
    useWidgetPosition({ widgetId: "time" });
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(() => {
    if (typeof window === "undefined") return "12h";
    const saved = localStorage.getItem(FORMAT_STORAGE_KEY);
    return saved === "24h" ? "24h" : "12h";
  });

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
    resetWidgetPosition("time");
  }, []);

  // Reactive position plugin
  const positionCompartment = useCompartment(
    () => positionPlugin({ current: position }),
    [position.x, position.y],
  );

  useDraggable(draggableRef, () => [
    controls({
      allow: ControlFrom.selector("[data-drag-handle]"),
      block: ControlFrom.selector("a, button"),
      priority: "allow",
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

  const isVisible =
    isPositionLoaded && currentTime !== null && visibility.time !== false;

  return (
    <DropdownMenu
      open={moreMenuOpen}
      onOpenChange={setMoreMenuOpen}
      modal={false}
    >
      <div
        ref={draggableRef}
        data-widget-id="time"
        className={`pointer-events-auto absolute z-50 flex transform-gpu rounded-lg bg-black/80 shadow-lg ring-1 ring-white/15 backdrop-blur-md transition-[opacity,transform] duration-300 will-change-transform data-[neodrag-state=dragging]:shadow-none data-[neodrag-state=dragging]:transition-none ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {/* Vertical "DateTime" Label - Drag Handle */}
        <div
          data-drag-handle
          className="flex cursor-grab items-center justify-center border-r border-white/10 px-1 transition-colors hover:bg-white/5 data-[neodrag-state=dragging]:cursor-grabbing"
        >
          <span className="transform-[rotate(180deg)] text-[10px] font-semibold tracking-widest text-white/50 uppercase [writing-mode:vertical-rl]">
            Time
          </span>
        </div>

        {/* Main Column */}
        <div className="flex w-75 flex-col">
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
            setVisibility((prev) => ({ ...prev, time: false }));
            try {
              localStorage.setItem(
                WIDGET_VISIBILITY_KEY,
                JSON.stringify({ ...visibility, time: false }),
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
