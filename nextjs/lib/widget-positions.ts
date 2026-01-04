/**
 * Widget Position Management
 *
 * Provides centralized position management for draggable widgets,
 * including default positions and auto-arrange functionality.
 */

export type WidgetId =
  | "weather"
  | "radio"
  | "time"
  | "somafm"
  | "youtubelivetv"
  | "pomodoro";

// Storage keys for each widget's position
export const WIDGET_POSITION_KEYS: Record<WidgetId, string> = {
  weather: "widgetWeatherPosition",
  radio: "widgetRadioPlayerPosition",
  time: "widgetDateTimePosition",
  somafm: "widgetSomaFMPosition",
  youtubelivetv: "widgetYouTubeLiveTVPosition",
  pomodoro: "widgetPomodoroPosition",
};

// Order of widgets from top to bottom when auto-arranged
const WIDGET_ORDER: WidgetId[] = [
  "time",
  "radio",
  "weather",
  "somafm",
  "youtubelivetv",
  "pomodoro",
];

// Gap between widgets when auto-arranged vertically
const WIDGET_GAP = 16;

// Cached measured heights reported by widgets after render
const measuredHeights: Partial<Record<WidgetId, number>> = {};
let arrangeDebounce: ReturnType<typeof setTimeout> | null = null;

// Allow widgets to report their actual rendered height
export function setWidgetMeasuredHeight(widgetId: WidgetId, height: number) {
  if (Number.isFinite(height) && height > 0) {
    measuredHeights[widgetId] = height;

    // If user has not customized positions, re-run auto-arrange using fresh measurements
    try {
      if (!hasAnyWidgetPosition()) {
        if (arrangeDebounce) clearTimeout(arrangeDebounce);
        arrangeDebounce = setTimeout(() => {
          const positions = calculateAutoArrangePositions();
          Object.entries(positions).forEach(([id, pos]) => {
            saveWidgetPosition(id as WidgetId, pos.x, pos.y);
          });
          window.dispatchEvent(
            new CustomEvent("widget-positions-reset", { detail: positions }),
          );
        }, 50); // debounce to batch multiple height reports
      }
    } catch {
      /* ignore */
    }
  }
}

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
    youtubelivetv: { x: 0, y: 0 },
    pomodoro: { x: 0, y: 0 },
  };

  if (typeof window === "undefined") return positions;

  let currentY = 0;

  for (const widgetId of WIDGET_ORDER) {
    positions[widgetId] = { x: 0, y: currentY };

    // Prefer measured height reported by widget
    const reportedHeight = measuredHeights[widgetId];

    // Otherwise try to measure actual DOM element
    const widgetElement = document.querySelector(
      `[data-widget-id="${widgetId}"]`,
    );

    if (reportedHeight) {
      currentY += reportedHeight + WIDGET_GAP;
    } else if (widgetElement) {
      const rect = widgetElement.getBoundingClientRect();
      const height = rect.height || 0;
      measuredHeights[widgetId] = height;
      currentY += height + WIDGET_GAP;
    } else {
      // Fallback estimates if widget not rendered
      const fallbackHeights: Record<WidgetId, number> = {
        time: 150,
        radio: 160,
        weather: 170,
        somafm: 170,
        youtubelivetv: 250,
        pomodoro: 160,
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
 * Reset a single widget's position to its auto-arranged position
 * Only updates the specified widget, not all
 */
export function resetWidgetPosition(widgetId: WidgetId): void {
  if (typeof window === "undefined") return;
  const positions = calculateAutoArrangePositions();
  const position = positions[widgetId];
  if (position) {
    saveWidgetPosition(widgetId, position.x, position.y);
    window.dispatchEvent(
      new CustomEvent("widget-positions-reset", {
        detail: { [widgetId]: position },
      }),
    );
  }
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
