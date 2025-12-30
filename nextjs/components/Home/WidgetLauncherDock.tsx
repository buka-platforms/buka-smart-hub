"use client";

import { widgetVisibilityAtom, type WidgetId } from "@/data/store";
import {
  ControlFrom,
  controls,
  events,
  position as positionPlugin,
  useCompartment,
  useDraggable,
} from "@neodrag/react";
import { useAtom } from "jotai";
import {
  Clock,
  CloudSun,
  GripVertical,
  LayoutGrid,
  Radio,
  X,
} from "lucide-react";
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
];

// Mini dock shows first N widgets
const MINI_DOCK_COUNT = 3;

export default function WidgetLauncherDock() {
  const draggableRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);

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

  // Save position on drag end
  const handleDragEnd = useCallback(
    (data: { offset: { x: number; y: number } }) => {
      const newPosition = { x: data.offset.x, y: data.offset.y };
      setPosition(newPosition);
      try {
        localStorage.setItem(DOCK_POSITION_KEY, JSON.stringify(newPosition));
      } catch {
        // Ignore errors
      }
    },
    []
  );

  // Toggle widget visibility
  const toggleWidget = useCallback(
    (widgetId: WidgetId) => {
      setVisibility((prev) => {
        const newVisibility = { ...prev, [widgetId]: !prev[widgetId] };
        try {
          localStorage.setItem(
            WIDGET_VISIBILITY_KEY,
            JSON.stringify(newVisibility)
          );
        } catch {
          // Ignore errors
        }
        return newVisibility;
      });
    },
    [setVisibility]
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

  // Reactive position plugin
  const positionCompartment = useCompartment(
    () => positionPlugin({ current: position }),
    [position.x, position.y]
  );

  useDraggable(draggableRef, () => [
    controls({
      block: ControlFrom.selector("button, a"),
    }),
    events({
      onDragEnd: handleDragEnd,
    }),
    positionCompartment,
  ]);

  // Get widgets to show in mini dock
  const miniDockWidgets = WIDGETS.slice(0, MINI_DOCK_COUNT);
  const allWidgets = WIDGETS;

  // Count visible widgets
  const visibleCount = Object.values(visibility).filter(Boolean).length;

  // Always render so ref is attached, use opacity to hide when not loaded
  const isVisible = isPositionLoaded;

  return (
    <div
      ref={draggableRef}
      className={`pointer-events-auto absolute bottom-6 left-3 z-50 flex transform-gpu cursor-grab overflow-hidden rounded-2xl bg-black/80 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl will-change-transform transition-opacity duration-200 data-[neodrag-state=dragging]:cursor-grabbing md:left-6 ${
        isExpanded ? "flex-col" : "flex-row"
      } ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      {/* Drag Handle - Visual indicator for dragging */}
      <div
        className={`flex items-center justify-center border-white/10 p-3 text-white/40 transition-colors hover:bg-white/10 hover:text-white/70 ${
          isExpanded ? "border-b" : "border-r"
        }`}
        title="Drag to move dock"
      >
        <GripVertical className="h-5 w-5" />
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
                  className={`group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition-all duration-200 ${
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
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-white/5 text-white/50 transition-all duration-200 hover:bg-white/15 hover:text-white"
              title="Show all widgets"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
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
            <div className="max-h-80 overflow-y-auto p-2">
              <div className="space-y-1">
                {allWidgets.map((widget) => {
                  const isActive = visibility[widget.id];
                  return (
                    <button
                      key={widget.id}
                      onClick={() => toggleWidget(widget.id)}
                      className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl p-2.5 transition-all duration-200 ${
                        isActive
                          ? "bg-purple-600/20 text-white"
                          : "text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all ${
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
            <div className="border-t border-white/10 px-3 py-2">
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
