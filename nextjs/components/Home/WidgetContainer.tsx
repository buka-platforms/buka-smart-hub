"use client";

import { widgetVisibilityAtom } from "@/data/store";
import { useAtomValue } from "jotai";
import dynamic from "next/dynamic";

// Dynamically import widgets to code-split
const WidgetDraggableWeather = dynamic(
  () => import("@/components/Home/WidgetDraggableWeather"),
  { ssr: false }
);

const WidgetDraggableRadioPlayer = dynamic(
  () => import("@/components/Home/WidgetDraggableRadioPlayer"),
  { ssr: false }
);

const WidgetDraggableDateTime = dynamic(
  () => import("@/components/Home/WidgetDraggableDateTime"),
  { ssr: false }
);

const WidgetLauncherDock = dynamic(
  () => import("@/components/Home/WidgetLauncherDock"),
  { ssr: false }
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
      {visibility.weather && (
        <div className="absolute bottom-111 left-3 z-20 animate-widget-appear md:bottom-113 md:left-6">
          <WidgetDraggableWeather />
        </div>
      )}

      {visibility.radio && (
        <div className="absolute bottom-72 left-3 z-20 animate-widget-appear md:bottom-74 md:left-6">
          <WidgetDraggableRadioPlayer />
        </div>
      )}

      {visibility.time && (
        <div className="absolute bottom-36 left-3 z-20 animate-widget-appear md:bottom-38 md:left-6">
          <WidgetDraggableDateTime />
        </div>
      )}
    </div>
  );
}
