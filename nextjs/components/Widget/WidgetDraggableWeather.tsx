"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { requestHeadersStateAtom, widgetVisibilityAtom } from "@/data/store";
import {
  calculateAutoArrangePositions,
  getSavedWidgetPosition,
  observeWidget,
  resetWidgetPosition,
  saveWidgetPosition,
  unobserveWidget,
} from "@/lib/widget-positions";
import { useAtom, useAtomValue } from "jotai";
import { Droplets, MoreHorizontal, Thermometer, Wind } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";

const UNIT_STORAGE_KEY = "widgetWeatherUnit";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";
const WIDGET_ID = "weather";

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
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
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
      if (saved) {
        setPosition(saved);
      } else {
        const positions = calculateAutoArrangePositions();
        setPosition(positions[WIDGET_ID] || { x: 0, y: 0 });
      }
      setIsPositionLoaded(true);
    });
  }, []);

  // Register ResizeObserver for layout updates
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    observeWidget(WIDGET_ID, el);
    return () => unobserveWidget(WIDGET_ID);
  }, []);

  // Listen for widget position reset events
  useEffect(() => {
    const handleReset = (e: Event) => {
      const customEvent = e as CustomEvent<
        Record<string, { x: number; y: number }>
      >;
      const detail = customEvent.detail || {};
      if (Object.prototype.hasOwnProperty.call(detail, WIDGET_ID)) {
        const newPos = detail[WIDGET_ID];
        if (newPos) setPosition(newPos);
      } else if (Object.keys(detail).length > 1) {
        const newPos = detail[WIDGET_ID];
        if (newPos) setPosition(newPos);
      }
    };
    window.addEventListener("widget-positions-reset", handleReset);
    return () =>
      window.removeEventListener("widget-positions-reset", handleReset);
  }, []);

  // Drag handlers - only from left label
  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      setIsDragging(true);
      dragStartRef.current = {
        x: clientX,
        y: clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [position],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientX, e.clientY);
    },
    [handleDragStart],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handleDragStart(touch.clientX, touch.clientY);
    },
    [handleDragStart],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      setPosition({
        x: dragStartRef.current.posX + deltaX,
        y: dragStartRef.current.posY + deltaY,
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.x;
      const deltaY = touch.clientY - dragStartRef.current.y;
      setPosition({
        x: dragStartRef.current.posX + deltaX,
        y: dragStartRef.current.posY + deltaY,
      });
    };

    const handleEnd = () => {
      setIsDragging(false);
      saveWidgetPosition(WIDGET_ID, position.x, position.y);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, position]);

  // Determine visibility
  const isVisible =
    isPositionLoaded &&
    !error &&
    (data || isLoading) &&
    visibility.weather !== false;

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
    <DropdownMenu
      open={moreMenuOpen}
      onOpenChange={setMoreMenuOpen}
      modal={false}
    >
      <div
        ref={containerRef}
        data-widget-id="weather"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        className={`pointer-events-auto absolute z-50 flex transform-gpu rounded-lg bg-black/80 shadow-lg ring-1 ring-white/15 backdrop-blur-md transition-opacity duration-300 will-change-transform ${isDragging ? "shadow-none" : ""} ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {/* Vertical "Weather" Label - Drag Handle */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={`flex items-center justify-center border-r border-white/10 px-1 transition-colors select-none hover:bg-white/5 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        >
          <span className="transform-[rotate(180deg)] text-[10px] font-semibold tracking-widest text-white/50 uppercase [writing-mode:vertical-rl]">
            Weather
          </span>
        </div>

        {/* Main Column */}
        <div className="flex w-64 flex-col">
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
            setVisibility((prev) => ({ ...prev, weather: false }));
            try {
              localStorage.setItem(
                WIDGET_VISIBILITY_KEY,
                JSON.stringify({ ...visibility, weather: false }),
              );
            } catch {}
          }}
        >
          Hide widget
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => mutate()} className="cursor-pointer">
          Refresh weather
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={toggleUnit} className="cursor-pointer">
          Switch to {unit === "metric" ? "Fahrenheit" : "Celsius"}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault();
            setMoreMenuOpen(false);
            requestAnimationFrame(() => {
              resetWidgetPosition("weather");
            });
          }}
        >
          Reset widget position
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
