/**
 * Widget Position Management
 *
 * Provides centralized position management for draggable widgets,
 * including default positions and auto-arrange functionality.
 */

export type WidgetId = "weather" | "radio" | "time" | "somafm";

// Storage keys for each widget's position
export const WIDGET_POSITION_KEYS: Record<WidgetId, string> = {
  weather: "widgetDraggableWeatherPosition",
  radio: "widgetDraggableRadioPlayerPosition",
  time: "widgetDraggableDateTimePosition",
  somafm: "widgetDraggableSomaFMPosition",
};

// Order of widgets from top to bottom when auto-arranged
const WIDGET_ORDER: WidgetId[] = ["time", "radio", "weather", "somafm"];

// Gap between widgets when auto-arranged vertically
const WIDGET_GAP = 12;

/**
 * Calculate auto-arrange positions by measuring actual DOM elements
 * This provides accurate positioning regardless of widget dimensions
 */
export function calculateAutoArrangePositions(): Record<
  WidgetId,
  { x: number; y: number }
> {
  const positions: Record<WidgetId, { x: number; y: number }> = {
    time: { x: 0, y: 0 },
    radio: { x: 0, y: 0 },
    weather: { x: 0, y: 0 },
    somafm: { x: 0, y: 0 },
  };

  if (typeof window === "undefined") return positions;

  let currentY = 0;

  for (const widgetId of WIDGET_ORDER) {
    positions[widgetId] = { x: 0, y: currentY };

    // Try to measure the actual widget width from DOM
    const widgetElement = document.querySelector(
      `[data-widget-id="${widgetId}"]`,
    );
    if (widgetElement) {
      const rect = widgetElement.getBoundingClientRect();
      currentY += rect.height + WIDGET_GAP;
    } else {
      // Fallback estimates if widget not rendered
      const fallbackHeights: Record<WidgetId, number> = {
        time: 150,
        radio: 160,
        weather: 150,
        somafm: 160,
      };
      currentY += fallbackHeights[widgetId] + WIDGET_GAP;
    }
  }

  return positions;
}

/**
 * Get saved position from localStorage for a specific widget
 */
export function getSavedWidgetPosition(
  widgetId: WidgetId,
): { x: number; y: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(WIDGET_POSITION_KEYS[widgetId]);
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

/**
 * Save position to localStorage for a specific widget
 */
export function saveWidgetPosition(
  widgetId: WidgetId,
  x: number,
  y: number,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      WIDGET_POSITION_KEYS[widgetId],
      JSON.stringify({ x, y }),
    );
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if any widget has a saved position (user has moved widgets before)
 */
export function hasAnyWidgetPosition(): boolean {
  if (typeof window === "undefined") return false;
  return Object.values(WIDGET_POSITION_KEYS).some((key) => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        return (
          typeof parsed.x === "number" &&
          typeof parsed.y === "number" &&
          (parsed.x !== 0 || parsed.y !== 0)
        );
      }
    } catch {
      // Ignore
    }
    return false;
  });
}

/**
 * Reset all widget positions to their default (auto-arranged) positions
 * Measures actual widget sizes for accurate positioning
 */
export function resetAllWidgetPositions(): void {
  if (typeof window === "undefined") return;

  // Calculate positions based on actual widget measurements
  const positions = calculateAutoArrangePositions();

  Object.entries(positions).forEach(([widgetId, position]) => {
    saveWidgetPosition(widgetId as WidgetId, position.x, position.y);
  });

  // Dispatch a custom event with the calculated positions
  window.dispatchEvent(
    new CustomEvent("widget-positions-reset", { detail: positions }),
  );
}

/**
 * Clear all widget position data from localStorage
 */
export function clearAllWidgetPositions(): void {
  if (typeof window === "undefined") return;
  Object.values(WIDGET_POSITION_KEYS).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  });

  // Dispatch event with calculated positions for initial layout
  const positions = calculateAutoArrangePositions();
  window.dispatchEvent(
    new CustomEvent("widget-positions-reset", { detail: positions }),
  );
}
