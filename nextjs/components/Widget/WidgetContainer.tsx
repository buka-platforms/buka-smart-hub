"use client";

import { widgetVisibilityAtom } from "@/data/store";
import type { WidgetId } from "@/lib/widget-positions";
import { setWidgetVisible, triggerLayoutUpdate } from "@/lib/widget-positions";
import { useAtomValue } from "jotai";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

const WidgetDraggableSomaFM = dynamic(
  () => import("@/components/Widget/WidgetDraggableSomaFM"),
  { ssr: false },
);

// Dynamically import widgets to code-split
const WidgetDraggableWeather = dynamic(
  () => import("@/components/Widget/WidgetDraggableWeather"),
  { ssr: false },
);

const WidgetDraggableRadioPlayer = dynamic(
  () => import("@/components/Widget/WidgetDraggableRadioPlayer"),
  { ssr: false },
);

const WidgetDraggableDateTime = dynamic(
  () => import("@/components/Widget/WidgetDraggableDateTime"),
  { ssr: false },
);

const WidgetDraggableYouTubeLiveTV = dynamic(
  () => import("@/components/Widget/WidgetDraggableYouTubeLiveTV"),
  { ssr: false },
);

const WidgetDraggablePomodoro = dynamic(
  () => import("@/components/Widget/WidgetDraggablePomodoro"),
  { ssr: false },
);

const WidgetDraggableOnlineRadioBoxNowPlaying = dynamic(
  () => import("@/components/Widget/WidgetDraggableOnlineRadioBoxNowPlaying"),
  { ssr: false },
);

const WidgetLauncherDock = dynamic(
  () => import("@/components/Widget/WidgetLauncherDock"),
  { ssr: false },
);

/**
 * Hook to sync widget visibility with the layout system
 */
function useWidgetVisibilitySync(widgetId: WidgetId, visible: boolean) {
  const prevVisible = useRef(visible);

  useEffect(() => {
    setWidgetVisible(widgetId, visible);

    // Trigger layout update when visibility changes
    if (prevVisible.current !== visible) {
      prevVisible.current = visible;
      // Small delay to allow DOM to update
      requestAnimationFrame(() => {
        triggerLayoutUpdate();
      });
    }

    return () => {
      setWidgetVisible(widgetId, false);
    };
  }, [widgetId, visible]);
}

/**
 * Individual widget wrapper with visibility sync
 */
function WidgetWrapper({
  widgetId,
  visible,
  children,
}: {
  widgetId: WidgetId;
  visible: boolean;
  children: React.ReactNode;
}) {
  useWidgetVisibilitySync(widgetId, visible);

  if (!visible) return null;

  return (
    <div className="absolute top-24 left-3 z-20 animate-widget-appear md:top-24 md:left-4">
      {children}
    </div>
  );
}

/**
 * Client-side widget container that manages widget visibility
 * and renders the launcher dock
 */
export default function WidgetContainer() {
  const visibility = useAtomValue(widgetVisibilityAtom);

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {/* Widget Launcher Dock */}
      <WidgetLauncherDock />

      {/* Widgets - conditionally rendered based on visibility */}
      {/* All widgets share the same anchor point (top-left), positioning is handled via drag offsets */}

      <WidgetWrapper widgetId="time" visible={visibility.time}>
        <WidgetDraggableDateTime />
      </WidgetWrapper>

      <WidgetWrapper widgetId="radio" visible={visibility.radio}>
        <WidgetDraggableRadioPlayer />
      </WidgetWrapper>

      <WidgetWrapper widgetId="weather" visible={visibility.weather}>
        <WidgetDraggableWeather />
      </WidgetWrapper>

      <WidgetWrapper widgetId="somafm" visible={visibility.somafm}>
        <WidgetDraggableSomaFM />
      </WidgetWrapper>

      <WidgetWrapper
        widgetId="youtubelivetv"
        visible={visibility.youtubelivetv}
      >
        <WidgetDraggableYouTubeLiveTV />
      </WidgetWrapper>

      <WidgetWrapper widgetId="pomodoro" visible={visibility.pomodoro}>
        <WidgetDraggablePomodoro />
      </WidgetWrapper>

      <WidgetWrapper
        widgetId="onlineradioboxnowplaying"
        visible={visibility.onlineradioboxnowplaying}
      >
        <WidgetDraggableOnlineRadioBoxNowPlaying />
      </WidgetWrapper>
    </div>
  );
}
