"use client";

import {
  getSavedWidgetPosition,
  observeWidget,
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
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);

  // Load position from localStorage on mount
  useEffect(() => {
    const saved = getSavedWidgetPosition(widgetId);
    setPosition(saved ?? { x: 0, y: 0 });
    setIsPositionLoaded(true);
  }, [widgetId]);

  // Register with ResizeObserver for automatic layout updates
  useEffect(() => {
    // The consumer should register their element via observeWidget when
    // they have a DOM ref. This hook focuses on position state and
    // listening for layout reset events.
    try {
      triggerLayoutUpdate();
    } catch {}
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

  return { position, isPositionLoaded };
}
