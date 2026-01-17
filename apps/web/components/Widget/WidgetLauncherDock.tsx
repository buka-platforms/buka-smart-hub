"use client";

import { widgetVisibilityAtom, type WidgetId } from "@/data/store";
import { resetAllWidgetPositions } from "@/lib/widget-positions";
import { useAtom } from "jotai";
import {
  AppWindow,
  BookOpen,
  Clock,
  CloudSun,
  GripVertical,
  LayoutGrid,
  LayoutTemplate,
  Music,
  Radio,
  Rss,
  Timer,
  Tv,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const DOCK_POSITION_KEY = "widgetLauncherDockPosition";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";

// Widget configuration
const WIDGETS: {
  id: WidgetId;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    id: "weather",
    label: "Weather",
    icon: <CloudSun className="h-5 w-5" />,
    description: "Current weather conditions",
  },
  {
    id: "radio",
    label: "Radio",
    icon: <Radio className="h-5 w-5" />,
    description: "Internet radio player",
  },
  {
    id: "time",
    label: "Time",
    icon: <Clock className="h-5 w-5" />,
    description: "Date and time display",
  },
  {
    id: "pomodoro",
    label: "Pomodoro",
    icon: <Timer className="h-5 w-5" />,
    description: "Focus timer with breaks",
  },
  {
    id: "somafm",
    label: "SomaFM",
    icon: <Music className="h-5 w-5" />,
    description: "SomaFM streaming radio player",
  },
  {
    id: "youtubelivetv",
    label: "Live TV",
    icon: <Tv className="h-5 w-5" />,
    description: "Watch live TV channels",
  },
  {
    id: "onlineradioboxnowplaying",
    label: "Now Playing",
    icon: <Rss className="h-5 w-5" />,
    description: "Live radio now playing list",
  },
  {
    id: "quran",
    label: "Quran",
    icon: <BookOpen className="h-5 w-5" />,
    description: "Read and listen to the Quran",
  },
];

// Mini dock shows first N widgets
const MINI_DOCK_COUNT = 3;

export default function WidgetLauncherDock() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);

  // Toggle widget visibility
  const toggleWidget = useCallback(
    (widgetId: WidgetId) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setVisibility((prev: any) => {
        const newVisibility = { ...prev, [widgetId]: !prev[widgetId] };
        try {
          localStorage.setItem(
            WIDGET_VISIBILITY_KEY,
            JSON.stringify(newVisibility),
          );
        } catch {
          // Ignore errors
        }
        return newVisibility;
      });
    },
    [setVisibility],
  );

  // Reset dock position (no-op for static dock)
  const resetPosition = useCallback(() => {}, []);

  // Get widgets to show in mini dock
  const miniDockWidgets = WIDGETS.slice(0, MINI_DOCK_COUNT);
  const allWidgets = WIDGETS;

  // Count visible widgets
  const visibleCount = Object.values(visibility).filter(Boolean).length;

  // Always render
  const isVisible = true;

  // Close expanded dock when clicking outside or pressing Escape
  useEffect(() => {
    if (!isExpanded) return;

    const handlePointerDown = (e: Event) => {
      if (!containerRef.current) return;
      const target = e.target as Node | null;
      if (target && !containerRef.current.contains(target)) {
        setIsExpanded(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsExpanded(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExpanded]);

  return (
    <div
      className={`pointer-events-auto z-50 mt-5 ml-3 flex transform-gpu cursor-pointer justify-self-start overflow-hidden rounded-lg bg-black/80 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl transition-opacity duration-200 will-change-transform md:mt-5 md:ml-4 ${
        isExpanded ? "flex-col" : "flex-row"
      } ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      style={{ justifySelf: "start" }}
    >
      {/* Drag Handle - Visual indicator for dragging */}
      <div
        className={`flex shrink-0 items-center justify-center border-white/10 text-white/40 transition-colors select-none hover:bg-white/10 hover:text-white/70 ${
          isExpanded ? "border-b px-3 py-2" : "border-r p-3"
        }`}
      >
        <GripVertical className={isExpanded ? "h-4 w-4" : "h-5 w-5"} />
        {isExpanded && <span className="ml-2 text-xs font-medium">Dock</span>}
      </div>

      {/* Mini Dock Mode */}
      {!isExpanded && (
        <div className="flex items-center gap-1 p-1.5">
          {miniDockWidgets.map((widget) => {
            const isActive = visibility[widget.id];
            return (
              <button
                key={widget.id}
                onClick={() => toggleWidget(widget.id)}
                className={`group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                    : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
                }`}
                title={`${isActive ? "Hide" : "Show"} ${widget.label}`}
              >
                {widget.icon}
                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-black/80 bg-green-400" />
                )}
              </button>
            );
          })}

          {/* Expand button */}
          <button
            onClick={() => setIsExpanded(true)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-white/5 text-white/50 transition-all duration-200 hover:bg-white/15 hover:text-white"
            title="Show all widgets"
          >
            <LayoutGrid className="h-5 w-5" />
          </button>

          <div className="mx-1 h-10 w-px bg-white/10" />

          {/* Apps CTA */}
          <Link
            href="/apps"
            title={`${process.env.NEXT_PUBLIC_APP_TITLE} Apps`}
            className="flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white/80 backdrop-blur transition-all hover:bg-white/15 hover:text-white"
          >
            <AppWindow className="h-4 w-4" />
            <span className="hidden md:inline">Apps</span>
          </Link>
        </div>
      )}

      {/* Expanded Dock Mode */}
      {isExpanded && (
        <div className="w-64">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-white">Widgets</span>
              <span className="rounded-full bg-purple-600/30 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                {visibleCount}/{allWidgets.length}
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              title="Collapse"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Widget List */}
          <div className="max-h-80 overflow-y-auto p-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:cursor-default [&::-webkit-scrollbar-thumb]:cursor-default [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:hover:bg-white/30 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5">
            <div className="space-y-1">
              {allWidgets.map((widget) => {
                const isActive = visibility[widget.id];
                return (
                  <button
                    key={widget.id}
                    onClick={() => toggleWidget(widget.id)}
                    className={`group flex w-full cursor-pointer items-center gap-3 rounded-lg p-2.5 transition-all duration-200 ${
                      isActive
                        ? "bg-purple-600/20 text-white"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-all ${
                        isActive
                          ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                          : "bg-white/10 text-white/50 group-hover:bg-white/20 group-hover:text-white"
                      }`}
                    >
                      {widget.icon}
                    </div>

                    {/* Label & Description */}
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">{widget.label}</div>
                      <div className="text-[11px] text-white/40">
                        {widget.description}
                      </div>
                    </div>

                    {/* Toggle indicator */}
                    <div
                      className={`h-5 w-9 rounded-full p-0.5 transition-colors ${
                        isActive ? "bg-purple-600" : "bg-white/20"
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          isActive ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="space-y-1.5 border-t border-white/10 px-3 py-2">
            <Link
              href="/apps"
              title={`${process.env.NEXT_PUBLIC_APP_TITLE} Apps`}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 backdrop-blur transition-all hover:bg-white/15 hover:text-white"
            >
              <AppWindow className="h-3.5 w-3.5" />
              <span>Open Apps</span>
            </Link>

            <div className="h-px w-full bg-white/10" />
            <button
              onClick={() => {
                resetAllWidgetPositions();
              }}
              className="w-full cursor-pointer rounded-lg bg-purple-600/20 px-3 py-1.5 text-xs text-purple-300 transition-colors hover:bg-purple-600/30 hover:text-purple-200"
              title="Reset all widgets to their default stacked positions"
            >
              <LayoutTemplate className="mr-1 inline-block h-3 w-3" />
              Auto-arrange widgets
            </button>
            <button
              onClick={resetPosition}
              className="w-full cursor-pointer rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              Reset dock (static)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
