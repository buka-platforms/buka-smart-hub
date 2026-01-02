"use client";

import { widgetVisibilityAtom } from "@/data/store";
import { useAtomValue } from "jotai";
import dynamic from "next/dynamic";

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

const WidgetLauncherDock = dynamic(
  () => import("@/components/Widget/WidgetLauncherDock"),
  { ssr: false },
);

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
      {/* All widgets share the same anchor point (bottom-left), positioning is handled via drag offsets */}
      {visibility.time && (
        <div className="absolute top-24 left-3 z-20 animate-widget-appear md:top-24 md:left-4">
          <WidgetDraggableDateTime />
        </div>
      )}

      {visibility.radio && (
        <div className="absolute top-24 left-3 z-20 animate-widget-appear md:top-24 md:left-4">
          <WidgetDraggableRadioPlayer />
        </div>
      )}

      {visibility.weather && (
        <div className="absolute top-24 left-3 z-20 animate-widget-appear md:top-24 md:left-4">
          <WidgetDraggableWeather />
        </div>
      )}

      {visibility.somafm && (
        <div className="absolute top-24 left-3 z-20 animate-widget-appear md:top-24 md:left-4">
          <WidgetDraggableSomaFM />
        </div>
      )}

      {visibility.livetv && (
        <div className="absolute top-24 left-3 z-20 animate-widget-appear md:top-24 md:left-4">
          <WidgetDraggableYouTubeLiveTV />
        </div>
      )}
    </div>
  );
}
