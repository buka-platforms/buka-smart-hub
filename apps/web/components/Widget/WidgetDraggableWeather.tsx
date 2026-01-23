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
import { requestHeadersStateAtom, widgetVisibilityAtom } from "@/data/store";
import {
  getSavedWidgetPosition,
  observeWidget,
  resetWidgetPosition,
  swapWidgetPositions,
  triggerLayoutUpdate,
  unobserveWidget,
} from "@/lib/widget-positions";
import type { WidgetId } from "@/lib/widget-positions";
import { useAtom, useAtomValue } from "jotai";
import { Droplets, MoreHorizontal, Thermometer, Wind } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";

const UNIT_STORAGE_KEY = "widgetWeatherUnit";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";
const WIDGET_ID = "weather";
const WIDGET_VERSION = "1.0.0";

interface WeatherData {
  weather: { icon: string; description: string; main: string }[];
  main: {
    temp: string;
    feels_like: number;
    humidity: number;
    temp_min: number;
    temp_max: number;
  };
  wind: {
    speed: number;
  };
  name: string;
  sys: {
    country: string;
  };
}

const fetcher = async (
  ...args: [RequestInfo, RequestInit?]
): Promise<WeatherData> => {
  const res = await fetch(...args);
  return res.json();
};

/* eslint-disable @next/next/no-img-element */
export default function WidgetDraggableWeather() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const positionRef = useRef(position);

  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [unit, setUnit] = useState<"metric" | "imperial">(() => {
    if (typeof window === "undefined") return "metric";
    const savedUnit = localStorage.getItem(UNIT_STORAGE_KEY);
    return savedUnit === "metric" || savedUnit === "imperial"
      ? (savedUnit as "metric" | "imperial")
      : "metric";
  });
  const requestHeaders = useAtomValue(requestHeadersStateAtom);
  const appId = process.env.NEXT_PUBLIC_OPENWEATHERMAP_APP_ID;

  const { data, error, isLoading, mutate } = useSWR(
    requestHeaders &&
      requestHeaders["x-vercel-ip-latitude"] &&
      requestHeaders["x-vercel-ip-longitude"]
      ? `https://api.openweathermap.org/data/2.5/weather?lat=${requestHeaders["x-vercel-ip-latitude"]}&lon=${requestHeaders["x-vercel-ip-longitude"]}&units=${unit}&appid=${appId}`
      : null,
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 900000, // 15 minutes
    },
  );

  const toggleUnit = useCallback(() => {
    setUnit((prev) => {
      const next = prev === "metric" ? "imperial" : "metric";
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(UNIT_STORAGE_KEY, next);
        } catch {
          /* noop */
        }
      }
      return next;
    });
  }, []);

  // Load position from localStorage (or auto-arrange) on mount
  useEffect(() => {
    queueMicrotask(() => {
      const saved = getSavedWidgetPosition(WIDGET_ID);
      const initial = saved ?? { x: 0, y: 0 };
      setPosition(initial);
      positionRef.current = initial;
      // Position is applied by WidgetContainer wrapper; do not set per-widget transform here.
      setIsPositionLoaded(true);
    });
  }, []);

  // Register ResizeObserver for layout updates
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

  // Drag/drop handlers for swapping positions between widgets
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData("text/widget-id", WIDGET_ID);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const source = e.dataTransfer.getData("text/widget-id");
    if (source && source !== WIDGET_ID) {
      // perform swap
      swapWidgetPositions(source as WidgetId, WIDGET_ID as WidgetId);
    }
  }, []);

  const resetPosition = useCallback(() => resetWidgetPosition(WIDGET_ID), []);

  // Determine visibility
  const isVisible =
    isPositionLoaded &&
    !error &&
    (data || isLoading) &&
    visibility[WIDGET_ID] !== false;

  const temperatureUnit = unit === "metric" ? "C" : "F";
  const temperatureValue = data ? Math.round(Number(data.main.temp)) : "--";
  const feelsLikeValue = data?.main.feels_like
    ? Math.round(data.main.feels_like)
    : "--";
  const windSpeedValue = data?.wind.speed;
  const windSpeed = windSpeedValue
    ? Math.round(unit === "metric" ? windSpeedValue * 3.6 : windSpeedValue)
    : "--";
  const windLabel = unit === "metric" ? "km/h" : "mph";

  return (
    <>
      <div
        ref={containerRef}
        data-widget-id={WIDGET_ID}
        className={`pointer-events-auto flex rounded-lg bg-black/80 shadow-lg ring-1 ring-white/15 ${isDragging ? "shadow-none transition-none" : "transition-opacity duration-300"} ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {/* Top Title - Drag Handle */}

        {/* Main Column */}
        <div className="flex w-full flex-col">
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`flex h-8 cursor-move items-center gap-2 border-b border-white/10 px-3 select-none ${isDragging ? "opacity-60" : "opacity-100"}`}
          >
            <span className="text-[10px] leading-none font-semibold tracking-widest text-white/50 uppercase">
              Weather
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
                    onContextMenu={(e) => e.preventDefault()}
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
                    onSelect={() => mutate()}
                    className="cursor-pointer"
                  >
                    Refresh weather
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={toggleUnit}
                    className="cursor-pointer"
                  >
                    Switch to {unit === "metric" ? "Fahrenheit" : "Celsius"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={(e) => {
                      e.preventDefault();
                      setMoreMenuOpen(false);
                      requestAnimationFrame(resetPosition);
                    }}
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
            </div>
          </div>
          {/* Weather Row */}
          <div className="flex items-center gap-3 p-3">
            {/* Weather Icon */}
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-white/10">
              {data && (
                <img
                  src={`https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`}
                  alt={data.weather[0].description}
                  title={data.weather[0].description}
                  className="pointer-events-none h-full w-full object-contain"
                  draggable={false}
                />
              )}
            </div>

            {/* Weather Info */}
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              <span className="block truncate text-xs text-white/60">
                {data?.name}
                {data?.sys?.country ? `, ${data.sys.country}` : ""}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-white">
                  {temperatureValue}°
                </span>
                <span className="text-xs text-white/60">{temperatureUnit}</span>
              </div>
              <span
                className="max-w-full truncate text-xs text-white/70"
                title={
                  data?.weather[0].description
                    ? data.weather[0].description.charAt(0).toUpperCase() +
                      data.weather[0].description.slice(1)
                    : ""
                }
              >
                {data?.weather[0].description
                  ? data.weather[0].description.charAt(0).toUpperCase() +
                    data.weather[0].description.slice(1)
                  : ""}
              </span>
            </div>

            {/* Additional Info */}
            <div className="flex shrink-0 flex-col gap-1 text-[10px] text-white/50">
              <div
                className="flex items-center gap-1"
                title={`Feels like ${feelsLikeValue}°${temperatureUnit}`}
              >
                <Thermometer className="h-3 w-3" />
                <span>{feelsLikeValue}°</span>
              </div>
              <div
                className="flex items-center gap-1"
                title={`Humidity ${data?.main.humidity || "--"}%`}
              >
                <Droplets className="h-3 w-3" />
                <span>{data?.main.humidity || "--"}%</span>
              </div>
              <div
                className="flex items-center gap-1"
                title={`Wind ${windSpeed} ${windLabel}`}
              >
                <Wind className="h-3 w-3" />
                <span>
                  {windSpeed} {windLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Separator and action bar */}
          <div className="border-t border-white/10" />
          <div className="flex items-center gap-2 px-3 py-2 text-[10px] leading-tight">
            <button
              onClick={toggleUnit}
              className="flex h-8 cursor-pointer items-center rounded-full border border-white/10 bg-white/10 px-3 text-[10px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white/20"
              title={`Switch to ${unit === "metric" ? "Fahrenheit" : "Celsius"}`}
            >
              <span>°{unit === "metric" ? "F" : "C"}</span>
            </button>

            <Link
              href="/apps/weather"
              className="flex h-8 items-center justify-center rounded-full border border-white/10 bg-white/10 px-3 text-[10px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white/20"
              title="Open weather app"
            >
              More
            </Link>
          </div>
        </div>
      </div>

      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>About Weather Widget</DialogTitle>
            <DialogDescription className="mt-2 text-left">
              Shows current weather conditions, temperature, humidity, and wind
              speed for your location using OpenWeatherMap data.
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
