"use client";

import { widgetVisibilityAtom } from "@/data/store";
import type { WidgetId } from "@/lib/widget-positions";
import { setWidgetVisible, triggerLayoutUpdate, getWidgetOrder } from "@/lib/widget-positions";
import { useAtomValue } from "jotai";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

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

const WidgetDraggableQuran = dynamic(
  () => import("@/components/Widget/WidgetDraggableQuran"),
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

  return <div className="animate-widget-appear">{children}</div>;
}

/**
 * Client-side widget container that manages widget visibility
 * and renders the launcher dock
 */
export default function WidgetContainer() {
  const visibility = useAtomValue(widgetVisibilityAtom);
  const [order, setOrder] = useState<WidgetId[]>(() => getWidgetOrder());

  useEffect(() => {
    const onOrder = (e: Event) => {
      const custom = e as CustomEvent<WidgetId[]>;
      const detail = custom.detail;
      if (Array.isArray(detail)) setOrder(detail);
    };

    window.addEventListener("widget-order-changed", onOrder as EventListener);
    return () => window.removeEventListener("widget-order-changed", onOrder as EventListener);
  }, []);

  return (
    <div className="pointer-events-none z-20" style={{ gridTemplateRows: "auto 1fr", display: "grid" }}>
      {/* Widget Launcher Dock */}
      <WidgetLauncherDock />

      {/* Widgets - rendered in slot order (flex flow). */}
      <div className="pointer-events-auto flex flex-wrap gap-3 p-3">
        {order.map((id) => {
          switch (id) {
            case "time":
              return (
                <WidgetWrapper key={id} widgetId={id} visible={visibility[id]}>
                  <WidgetDraggableDateTime />
                </WidgetWrapper>
              );
            case "radio":
              return (
                <WidgetWrapper key={id} widgetId={id} visible={visibility[id]}>
                  <WidgetDraggableRadioPlayer />
                </WidgetWrapper>
              );
            case "weather":
              return (
                <WidgetWrapper key={id} widgetId={id} visible={visibility[id]}>
                  <WidgetDraggableWeather />
                </WidgetWrapper>
              );
            case "somafm":
              return (
                <WidgetWrapper key={id} widgetId={id} visible={visibility[id]}>
                  <WidgetDraggableSomaFM />
                </WidgetWrapper>
              );
            case "youtubelivetv":
              return (
                <WidgetWrapper key={id} widgetId={id} visible={visibility[id]}>
                  <WidgetDraggableYouTubeLiveTV />
                </WidgetWrapper>
              );
            case "pomodoro":
              return (
                <WidgetWrapper key={id} widgetId={id} visible={visibility[id]}>
                  <WidgetDraggablePomodoro />
                </WidgetWrapper>
              );
            case "quran":
              return (
                <WidgetWrapper key={id} widgetId={id} visible={visibility[id]}>
                  <WidgetDraggableQuran />
                </WidgetWrapper>
              );
            case "onlineradioboxnowplaying":
              return (
                <WidgetWrapper key={id} widgetId={id} visible={visibility[id]}>
                  <WidgetDraggableOnlineRadioBoxNowPlaying />
                </WidgetWrapper>
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
