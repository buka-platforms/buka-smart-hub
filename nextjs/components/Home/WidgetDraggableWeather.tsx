"use client";

import { requestHeadersStateAtom } from "@/data/store";
import {
  ControlFrom,
  controls,
  events,
  position as positionPlugin,
  useCompartment,
  useDraggable,
} from "@neodrag/react";
import { useAtomValue } from "jotai";
import { Droplets, Thermometer, Wind } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";

const POSITION_STORAGE_KEY = "widgetDraggableWeatherPosition";

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

/* eslint-disable @next/next/no-img-element */
export default function WidgetDraggableWeather() {
  const draggableRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const requestHeaders = useAtomValue(requestHeadersStateAtom);
  const appId = process.env.NEXT_PUBLIC_OPENWEATHERMAP_APP_ID;

  const { data, error, isLoading } = useSWR(
    requestHeaders &&
      requestHeaders["x-vercel-ip-latitude"] &&
      requestHeaders["x-vercel-ip-longitude"]
      ? `https://api.openweathermap.org/data/2.5/weather?lat=${requestHeaders["x-vercel-ip-latitude"]}&lon=${requestHeaders["x-vercel-ip-longitude"]}&units=metric&appid=${appId}`
      : null,
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 900000, // 15 minutes
    },
  );

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

  // Handle drag end to save position
  const handleDragEnd = useCallback(
    (data: { offset: { x: number; y: number } }) => {
      const newPosition = { x: data.offset.x, y: data.offset.y };
      setPosition(newPosition);
      savePosition(newPosition.x, newPosition.y);
    },
    [],
  );

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

  // Determine visibility
  const isVisible = isPositionLoaded && !isLoading && !error && data;

  return (
    <div
      ref={draggableRef}
      className={`pointer-events-auto absolute z-50 flex transform-gpu cursor-grab rounded-lg bg-black/80 shadow-lg backdrop-blur-md transition-opacity duration-300 will-change-transform data-[neodrag-state=dragging]:shadow-none ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      {/* Vertical "Weather" Label */}
      <div className="flex items-center justify-center border-r border-white/10 px-1">
        <span className="transform-[rotate(180deg)] text-[10px] font-semibold tracking-widest text-white/50 uppercase [writing-mode:vertical-rl]">
          Weather
        </span>
      </div>

      {/* Main Content */}
      <div className="flex w-56 items-center gap-3 p-3">
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
          <Link
            href="/apps/weather"
            className="block overflow-hidden text-xs text-white/60 hover:text-white/80"
          >
            <span className="truncate">
              {data?.name}
              {data?.sys?.country ? `, ${data.sys.country}` : ""}
            </span>
          </Link>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-white">
              {data ? parseInt(data.main.temp) : "--"}°
            </span>
            <span className="text-xs text-white/60">C</span>
          </div>
          <span
            className="truncate text-xs text-white/70 capitalize"
            title={data?.weather[0].description}
          >
            {data?.weather[0].description}
          </span>
        </div>

        {/* Additional Info */}
        <div className="flex shrink-0 flex-col gap-1 text-[10px] text-white/50">
          <div
            className="flex items-center gap-1"
            title={`Feels like ${data?.main.feels_like ? Math.round(data.main.feels_like) : "--"}°C`}
          >
            <Thermometer className="h-3 w-3" />
            <span>
              {data?.main.feels_like ? Math.round(data.main.feels_like) : "--"}°
            </span>
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
            title={`Wind ${data?.wind.speed ? Math.round(data.wind.speed * 3.6) : "--"} km/h`}
          >
            <Wind className="h-3 w-3" />
            <span>
              {data?.wind.speed ? Math.round(data.wind.speed * 3.6) : "--"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
