/**
 * Widget Position Management - Masonry Grid Layout System
 *
 * Features:
 * - Smart masonry grid layout (Pinterest-style)
 * - ResizeObserver for real-time height change detection
 * - Smooth animated transitions when layout changes
 * - Visibility-aware recalculation
 * - Responsive column distribution based on viewport
 * - Debounced batch updates for optimal performance
 */

export type WidgetId =
  | "weather"
  | "radio"
  | "time"
  | "somafm"
  | "youtubelivetv"
  | "quran"
  | "pomodoro"
  | "onlineradioboxnowplaying";

// Storage keys for each widget's position
export const WIDGET_POSITION_KEYS: Record<WidgetId, string> = {
  weather: "widgetWeatherPosition",
  radio: "widgetRadioPlayerPosition",
  time: "widgetDateTimePosition",
  quran: "widgetQuranPosition",
  somafm: "widgetSomaFMPosition",
  youtubelivetv: "widgetYouTubeLiveTVPosition",
  pomodoro: "widgetPomodoroPosition",
  onlineradioboxnowplaying: "widgetOnlineRadioBoxNowPlayingPosition",
};

// Priority order for widgets - higher priority widgets get placed first
// This determines visual hierarchy in the masonry grid
const WIDGET_PRIORITY: WidgetId[] = [
  "time", // Most important - always top-left
  "radio", // Primary audio control
  "quran",
  "weather", // Quick glance info
  "pomodoro", // Productivity tool
  "somafm", // Secondary audio
  "youtubelivetv", // Video content (larger)
  "onlineradioboxnowplaying", // Dynamic content (can be tall)
];

// Layout configuration
const CONFIG = {
  WIDGET_GAP: 12, // Gap between widgets
  COLUMN_GAP: 12, // Gap between columns
  VIEWPORT_PADDING_TOP: 96, // Top padding (avoid header)
  VIEWPORT_PADDING_BOTTOM: 100, // Bottom padding (avoid dock)
  MIN_COLUMN_WIDTH: 280, // Minimum widget width
  MAX_COLUMNS: 4, // Maximum number of columns
  DEBOUNCE_MS: 100, // Debounce time for layout recalculation
  ANIMATION_DURATION: 300, // CSS transition duration in ms
  SETTLE_MS: 200, // Wait this long after initial measurements complete
};

// Cached measured dimensions for each widget
interface WidgetDimensions {
  width: number;
  height: number;
  lastUpdate: number;
}

const measuredDimensions: Map<WidgetId, WidgetDimensions> = new Map();
const visibleWidgets: Set<WidgetId> = new Set();
const pendingInitialMeasurements: Set<WidgetId> = new Set();

// ResizeObserver instance (singleton)
let resizeObserver: ResizeObserver | null = null;
const observedElements: Map<WidgetId, HTMLElement> = new Map();

// Debounce timer for layout recalculation
let layoutDebounce: ReturnType<typeof setTimeout> | null = null;
// Final settle timer to wait a short period after all initial measurements
// complete before performing the first layout. This prevents layout from
// running too early while async content (images, API data) is still settling.
let finalSettleTimer: ReturnType<typeof setTimeout> | null = null;
let isAutoArrangeEnabled = true;

/**
 * Initialize or get the ResizeObserver singleton
 */
function getResizeObserver(): ResizeObserver | null {
  if (typeof window === "undefined" || typeof ResizeObserver === "undefined") {
    return null;
  }

  if (!resizeObserver) {
    resizeObserver = new ResizeObserver((entries) => {
      let hasChanges = false;

      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const widgetId = el.dataset.widgetId as WidgetId | undefined;

        if (!widgetId) continue;

        const { width, height } = entry.contentRect;
        const current = measuredDimensions.get(widgetId);

        // Check if dimensions actually changed (with threshold)
        const threshold = 2;
        if (
          !current ||
          Math.abs(current.width - width) > threshold ||
          Math.abs(current.height - height) > threshold
        ) {
          measuredDimensions.set(widgetId, {
            width: Math.ceil(width),
            height: Math.ceil(height),
            lastUpdate: Date.now(),
          });
          // When ResizeObserver reports the element size, consider the
          // initial measurement for that widget confirmed so initial
          // pending flags don't prevent layout.
          if (pendingInitialMeasurements.has(widgetId)) {
            pendingInitialMeasurements.delete(widgetId);
          }
          // If no more pending initial measurements, start a short settle
          // timer before triggering the layout so async content can finish
          // rendering (images, API-driven height changes).
          if (pendingInitialMeasurements.size === 0) {
            if (finalSettleTimer) clearTimeout(finalSettleTimer);
            // Only schedule the final settle layout if auto-arrange is enabled
            // and there are no user-saved widget positions. Respect manual placements.
            if (isAutoArrangeEnabled && !hasAnyWidgetPosition()) {
              finalSettleTimer = setTimeout(() => {
                finalSettleTimer = null;
                scheduleLayoutUpdate();
              }, CONFIG.SETTLE_MS);
            }
          }
          hasChanges = true;
        }
      }

      if (hasChanges && isAutoArrangeEnabled) {
        // If a final settle timer is active, let it trigger the layout. If
        // not, proceed with the normal debounced schedule.
        if (!finalSettleTimer) scheduleLayoutUpdate();
      }
    });
  }

  return resizeObserver;
}

/**
 * Register a widget element for observation
 * Called by widgets when they mount
 */
export function observeWidget(widgetId: WidgetId, element: HTMLElement): void {
  const observer = getResizeObserver();
  if (!observer) return;

  // Unobserve previous element if exists
  const prev = observedElements.get(widgetId);
  if (prev) {
    observer.unobserve(prev);
  }

  // Observe new element
  observer.observe(element);
  observedElements.set(widgetId, element);
  visibleWidgets.add(widgetId);
  pendingInitialMeasurements.add(widgetId); // Mark as pending initial measurement

  // Initial measurement - delay slightly to allow content to load
  // We rely on ResizeObserver to confirm and clear the "pending" flag.
  // If ResizeObserver is not available (older browsers), clear the
  // pending flag after a slightly longer timeout.
  setTimeout(() => {
    if (observedElements.has(widgetId) && element.isConnected) {
      const rect = element.getBoundingClientRect();
      measuredDimensions.set(widgetId, {
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height),
        lastUpdate: Date.now(),
      });

      // If ResizeObserver isn't present, treat this as the confirmation
      if (!getResizeObserver()) {
        pendingInitialMeasurements.delete(widgetId);
        if (pendingInitialMeasurements.size === 0) {
          if (finalSettleTimer) clearTimeout(finalSettleTimer);
          if (isAutoArrangeEnabled) {
            finalSettleTimer = setTimeout(() => {
              finalSettleTimer = null;
              scheduleLayoutUpdate();
            }, CONFIG.SETTLE_MS);
          }
        }
      }

      // Trigger layout update if auto-arrange is enabled and no saved positions exist
      if (isAutoArrangeEnabled && !hasAnyWidgetPosition()) {
        scheduleLayoutUpdate();
      }
    }
  }, 200);
}

/**
 * Unregister a widget element from observation
 * Called by widgets when they unmount
 */
export function unobserveWidget(widgetId: WidgetId): void {
  const observer = getResizeObserver();
  const element = observedElements.get(widgetId);

  if (observer && element) {
    observer.unobserve(element);
  }

  observedElements.delete(widgetId);
  visibleWidgets.delete(widgetId);
}

/**
 * Mark a widget as visible/hidden for layout calculations
 */
export function setWidgetVisible(widgetId: WidgetId, visible: boolean): void {
  if (visible) {
    visibleWidgets.add(widgetId);
  } else {
    visibleWidgets.delete(widgetId);
  }

  if (isAutoArrangeEnabled && !hasAnyWidgetPosition()) {
    scheduleLayoutUpdate();
  }
}

/**
 * Schedule a debounced layout update
 */
function scheduleLayoutUpdate(): void {
  // If a final settle timer is active it means we're already waiting for a
  // short settle period before the initial layout — clear it because an
  // explicit schedule should take precedence.
  if (finalSettleTimer) {
    clearTimeout(finalSettleTimer);
    finalSettleTimer = null;
  }

  if (layoutDebounce) {
    clearTimeout(layoutDebounce);
  }

  layoutDebounce = setTimeout(() => {
    layoutDebounce = null;

    // Check if all visible widgets have valid measured heights
    const allWidgetsMeasured = Array.from(visibleWidgets).every((widgetId) => {
      const dims = measuredDimensions.get(widgetId);
      return dims && dims.height > 0;
    });

    // Only perform layout update if all widgets are measured and no pending initial measurements
    if (allWidgetsMeasured && pendingInitialMeasurements.size === 0) {
      performLayoutUpdate();
    } else {
      // If not all widgets are measured, try again after a short delay
      scheduleLayoutUpdate();
    }
  }, CONFIG.DEBOUNCE_MS);
}

/**
 * Perform the actual layout update
 */
function performLayoutUpdate(): void {
  if (typeof window === "undefined") return;

  const positions = calculateAutoArrangePositions();

  // Save positions for widgets that do NOT already have a user-saved position.
  Object.entries(positions).forEach(([id, pos]) => {
    const wid = id as WidgetId;
    const saved = getSavedWidgetPosition(wid);
    if (!saved) {
      try {
        saveWidgetPosition(wid, pos.x, pos.y);
      } catch {
        // ignore storage errors
      }
    }
  });

  // Always dispatch the full set of positions so the UI can update visually.
  window.dispatchEvent(
    new CustomEvent("widget-positions-reset", { detail: positions }),
  );
}

/**
 * Legacy function for backward compatibility
 * Now uses the ResizeObserver system internally
 */
export function setWidgetMeasuredHeight(widgetId: WidgetId, height: number) {
  if (!Number.isFinite(height) || height <= 0) return;

  const current = measuredDimensions.get(widgetId);
  measuredDimensions.set(widgetId, {
    width: current?.width || 320,
    height: Math.ceil(height),
    lastUpdate: Date.now(),
  });

  if (isAutoArrangeEnabled && !hasAnyWidgetPosition()) {
    scheduleLayoutUpdate();
  }
}

/**
 * Calculate optimal number of columns based on viewport
 */
function calculateColumnCount(availableWidth: number): number {
  const minWidth = CONFIG.MIN_COLUMN_WIDTH + CONFIG.COLUMN_GAP;
  const maxPossible = Math.floor(availableWidth / minWidth);
  return Math.max(1, Math.min(maxPossible, CONFIG.MAX_COLUMNS));
}

/**
 * Get widget dimensions with fallbacks
 */
function getWidgetDimensions(widgetId: WidgetId): {
  width: number;
  height: number;
} {
  const measured = measuredDimensions.get(widgetId);
  if (measured && measured.height > 0) {
    return { width: measured.width, height: measured.height };
  }

  // Fallback heights based on widget type
  const fallbacks: Record<WidgetId, { width: number; height: number }> = {
    time: { width: 320, height: 138 },
    radio: { width: 340, height: 148 },
    weather: { width: 290, height: 158 },
    quran: { width: 340, height: 224 },
    somafm: { width: 360, height: 220 },
    youtubelivetv: { width: 360, height: 280 },
    pomodoro: { width: 340, height: 280 },
    onlineradioboxnowplaying: { width: 340, height: 420 },
  };

  return fallbacks[widgetId] || { width: 320, height: 160 };
}

/**
 * Calculate auto-arrange positions using masonry grid algorithm
 * Widgets are placed in the column with the shortest height (Pinterest-style)
 */
export function calculateAutoArrangePositions(): Record<
  WidgetId,
  { x: number; y: number }
> {
  const positions: Record<WidgetId, { x: number; y: number }> = {
    time: { x: 0, y: 0 },
    radio: { x: 0, y: 0 },
    quran: { x: 0, y: 0 },
    weather: { x: 0, y: 0 },
    somafm: { x: 0, y: 0 },
    youtubelivetv: { x: 0, y: 0 },
    pomodoro: { x: 0, y: 0 },
    onlineradioboxnowplaying: { x: 0, y: 0 },
  };

  if (typeof window === "undefined") return positions;

  // Get widgets in priority order. Use DOM presence as the primary signal so
  // elements that exist but haven't yet registered with the ResizeObserver
  // (or been added to `visibleWidgets`) are still considered during the
  // initial auto-arrange calculation. This prevents later-mounting widgets
  // from being ignored and causing overlapping placements.
  const widgetsToLayout = WIDGET_PRIORITY.filter((id) => {
    const el = document.querySelector(`[data-widget-id="${id}"]`);
    return !!el;
  });

  if (widgetsToLayout.length === 0) return positions;

  // Calculate available space
  const availableWidth = window.innerWidth - 32; // 16px padding each side
  const columnCount = calculateColumnCount(availableWidth);

  // Calculate column width (all columns same width for clean grid)
  // Find max widget width to use as column width
  let maxWidgetWidth = CONFIG.MIN_COLUMN_WIDTH;
  for (const widgetId of widgetsToLayout) {
    const dims = getWidgetDimensions(widgetId);
    maxWidgetWidth = Math.max(maxWidgetWidth, dims.width);
  }

  const columnWidth = Math.min(
    maxWidgetWidth,
    Math.floor(
      (availableWidth - (columnCount - 1) * CONFIG.COLUMN_GAP) / columnCount,
    ),
  );

  // Initialize column heights (tracking the bottom of each column)
  const columnHeights: number[] = new Array(columnCount).fill(0);
  const columnX: number[] = [];

  // Calculate X position for each column
  for (let i = 0; i < columnCount; i++) {
    columnX[i] = i * (columnWidth + CONFIG.COLUMN_GAP);
  }

  // Place each widget in the shortest column (masonry algorithm)
  for (const widgetId of widgetsToLayout) {
    const dims = getWidgetDimensions(widgetId);

    // Find the column with minimum height
    let minColumnIndex = 0;
    let minHeight = columnHeights[0];

    for (let i = 1; i < columnCount; i++) {
      if (columnHeights[i] < minHeight) {
        minHeight = columnHeights[i];
        minColumnIndex = i;
      }
    }

    // Calculate position
    const x = columnX[minColumnIndex];
    const y = columnHeights[minColumnIndex];

    positions[widgetId] = { x, y };

    // Update column height
    columnHeights[minColumnIndex] += dims.height + CONFIG.WIDGET_GAP;
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
          parsed &&
          typeof parsed.x === "number" &&
          typeof parsed.y === "number"
        );
      }
    } catch {
      // Ignore
    }
    return false;
  });
}

/**
 * Enable or disable auto-arrange behavior
 */
export function setAutoArrangeEnabled(enabled: boolean): void {
  isAutoArrangeEnabled = enabled;
}

/**
 * Force a layout recalculation
 * Useful after visibility changes
 */
export function triggerLayoutUpdate(): void {
  if (typeof window === "undefined") return;
  // If the user has any saved widget positions, respect those manual placements
  // and do not run an automatic re-arrange which would overwrite them.
  if (hasAnyWidgetPosition()) return;

  scheduleLayoutUpdate();
}

/**
 * Reset all widget positions to their default (auto-arranged) positions
 * Measures actual widget sizes for accurate positioning
 */
export function resetAllWidgetPositions(): void {
  if (typeof window === "undefined") return;

  // Clear saved positions first
  Object.values(WIDGET_POSITION_KEYS).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  });

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

  // Remove saved position for this widget
  try {
    localStorage.removeItem(WIDGET_POSITION_KEYS[widgetId]);
  } catch {
    // Ignore
  }

  const positions = calculateAutoArrangePositions();

  // Save all positions to ensure consistency
  Object.entries(positions).forEach(([id, pos]) => {
    saveWidgetPosition(id as WidgetId, pos.x, pos.y);
  });

  // Dispatch event with all positions
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

/**
 * Swap positions between two widgets.
 * If a widget does not have a saved position, its auto-arranged position
 * is used as fallback. After swapping, saved positions are updated and
 * a full layout event is dispatched so the UI can animate the change.
 */
export function swapWidgetPositions(a: WidgetId, b: WidgetId): void {
  if (typeof window === "undefined") return;

  try {
    const positions = calculateAutoArrangePositions();

    const aSaved = getSavedWidgetPosition(a) ?? positions[a];
    const bSaved = getSavedWidgetPosition(b) ?? positions[b];

    // Swap and persist
    saveWidgetPosition(a, bSaved.x, bSaved.y);
    saveWidgetPosition(b, aSaved.x, aSaved.y);

    // Build detail containing current saved positions for all widgets
    const detail: Record<string, { x: number; y: number }> = {};
    Object.keys(WIDGET_POSITION_KEYS).forEach((id) => {
      const wid = id as WidgetId;
      const sv = getSavedWidgetPosition(wid) ?? positions[wid];
      detail[id] = sv;
    });

    // Dispatch full layout update so components can animate to new slots
    window.dispatchEvent(new CustomEvent("widget-positions-reset", { detail }));
  } catch {
    // ignore storage errors
  }
}

/**
 * Get all currently visible widgets
 */
export function getVisibleWidgets(): WidgetId[] {
  return Array.from(visibleWidgets);
}

/**
 * Get layout configuration (for debugging or external use)
 */
export function getLayoutConfig() {
  return { ...CONFIG };
}
