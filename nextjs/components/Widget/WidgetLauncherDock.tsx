"use client";

import { widgetVisibilityAtom, type WidgetId } from "@/data/store";
import { resetAllWidgetPositions } from "@/lib/widget-positions";
import { useAtom } from "jotai";
import {
  AppWindow,
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
    id: "onlineradiobox",
    label: "Now Playing",
    icon: <Rss className="h-5 w-5" />,
    description: "Live radio now playing list",
  },
];

// Mini dock shows first N widgets
const MINI_DOCK_COUNT = 3;

export default function WidgetLauncherDock() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Load position and visibility from localStorage
  useEffect(() => {
    queueMicrotask(() => {
      try {
        // Load dock position
        const savedPosition = localStorage.getItem(DOCK_POSITION_KEY);
        if (savedPosition) {
          const parsed = JSON.parse(savedPosition);
          if (typeof parsed.x === "number" && typeof parsed.y === "number") {
            setPosition(parsed);
          }
        }

        // Load widget visibility
        const savedVisibility = localStorage.getItem(WIDGET_VISIBILITY_KEY);
        if (savedVisibility) {
          const parsed = JSON.parse(savedVisibility);
          setVisibility((prev) => ({ ...prev, ...parsed }));
        }
      } catch {
        // Ignore errors
      }
      setIsPositionLoaded(true);
    });
  }, [setVisibility]);

  // Custom drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Don't drag if clicking on a button or interactive element
      if ((e.target as HTMLElement).closest("button, a, input")) {
        return;
      }
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [position],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Don't drag if touching a button or interactive element
      if ((e.target as HTMLElement).closest("button, a, input")) {
        return;
      }
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [position],
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
      try {
        localStorage.setItem(DOCK_POSITION_KEY, JSON.stringify(position));
      } catch {
        // Ignore errors
      }
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

  // Toggle widget visibility
  const toggleWidget = useCallback(
    (widgetId: WidgetId) => {
      setVisibility((prev) => {
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

  // Reset dock position
  const resetPosition = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    try {
      localStorage.setItem(DOCK_POSITION_KEY, JSON.stringify({ x: 0, y: 0 }));
    } catch {
      // Ignore errors
    }
  }, []);

  // Get widgets to show in mini dock
  const miniDockWidgets = WIDGETS.slice(0, MINI_DOCK_COUNT);
  const allWidgets = WIDGETS;

  // Count visible widgets
  const visibleCount = Object.values(visibility).filter(Boolean).length;

  // Always render so ref is attached, use opacity to hide when not loaded
  const isVisible = isPositionLoaded;

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
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      className={`pointer-events-auto absolute top-5 left-3 z-50 flex transform-gpu cursor-grab overflow-hidden rounded-lg bg-black/80 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl transition-opacity duration-200 will-change-transform md:top-5 md:left-4 ${
        isDragging ? "cursor-grabbing" : ""
      } ${isExpanded ? "flex-col" : "flex-row"} ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      {/* Drag Handle - Visual indicator for dragging */}
      <div
        className={`flex shrink-0 items-center justify-center border-white/10 text-white/40 transition-colors select-none hover:bg-white/10 hover:text-white/70 ${
          isExpanded ? "border-b px-3 py-2" : "border-r p-3"
        }`}
        title="Drag to move dock"
      >
        <GripVertical className={isExpanded ? "h-4 w-4" : "h-5 w-5"} />
        {isExpanded && (
          <span className="ml-2 text-xs font-medium">Drag to move</span>
        )}
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
              Reset dock position
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
