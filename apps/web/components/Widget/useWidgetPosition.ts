"use client";

import {
  getSavedWidgetPosition,
  observeWidget,
  saveWidgetPosition,
  triggerLayoutUpdate,
  unobserveWidget,
  type WidgetId,
} from "@/lib/widget-positions";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseWidgetPositionOptions {
  widgetId: WidgetId;
}

interface UseWidgetPositionReturn {
  position: { x: number; y: number };
  isPositionLoaded: boolean;
  draggableRef: React.RefObject<HTMLDivElement | null>;
  handleDragEnd: (data: { offset: { x: number; y: number } }) => void;
}

/**
 * Custom hook for widget position management
 * Handles:
 * - Loading saved position from localStorage
 * - Calculating auto-arrange position if none saved
 * - Registering with ResizeObserver for layout updates
 * - Listening for position reset events
 * - Saving position on drag end
 */
export function useWidgetPosition({
  widgetId,
}: UseWidgetPositionOptions): UseWidgetPositionReturn {
  const draggableRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);

  // Load position from localStorage on mount
  useEffect(() => {
    const saved = getSavedWidgetPosition(widgetId);

    // If there's a saved position use it. Otherwise defer to the
    // auto-arrange logic that runs after widgets have been measured.
    // Using the on-mount auto-calculation caused races where multiple
    // widgets used fallback sizes and overlapped on fresh profiles.
    if (saved) {
      setPosition(saved);
    } else {
      setPosition({ x: 0, y: 0 });
    }

    setIsPositionLoaded(true);
  }, [widgetId]);

  // Register with ResizeObserver for automatic layout updates
  useEffect(() => {
    const el = draggableRef.current;
    if (!el) return;

    observeWidget(widgetId, el);

    // Ask the layout system to recalculate after we register the element.
    // This ensures positions are computed from real measurements instead
    // of optimistic fallbacks.
    try {
      triggerLayoutUpdate();
    } catch {
      // ignore
    }

    return () => {
      unobserveWidget(widgetId);
    };
  }, [widgetId]);

  // Listen for widget position reset events
  useEffect(() => {
    const handleReset = (e: Event) => {
      const customEvent = e as CustomEvent<
        Record<string, { x: number; y: number }>
      >;
      const detail = customEvent.detail || {};

      // Check if this event is for our widget
      if (Object.prototype.hasOwnProperty.call(detail, widgetId)) {
        const newPos = detail[widgetId];
        if (newPos) {
          setPosition(newPos);
        }
      } else if (Object.keys(detail).length > 1) {
        // Full layout update (more than one widget in detail)
        const newPos = detail[widgetId];
        if (newPos) {
          setPosition(newPos);
        }
      }
    };

    window.addEventListener("widget-positions-reset", handleReset);
    return () =>
      window.removeEventListener("widget-positions-reset", handleReset);
  }, [widgetId]);

  // Handle drag end to save position
  const handleDragEnd = useCallback(
    (data: { offset: { x: number; y: number } }) => {
      const newPosition = { x: data.offset.x, y: data.offset.y };
      setPosition(newPosition);
      saveWidgetPosition(widgetId, newPosition.x, newPosition.y);
    },
    [widgetId],
  );

  return {
    position,
    isPositionLoaded,
    draggableRef,
    handleDragEnd,
  };
}
