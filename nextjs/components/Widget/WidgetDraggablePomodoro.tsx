"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { widgetVisibilityAtom } from "@/data/store";
import { resetWidgetPosition } from "@/lib/widget-positions";
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
  Bell,
  BellOff,
  CheckCircle2,
  Clock3,
  Coffee,
  FastForward,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  TimerReset,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWidgetPosition } from "./useWidgetPosition";

const STATE_KEY = "widgetPomodoroState";
const DURATION_KEY = "widgetPomodoroDurations";
const SETTINGS_KEY = "widgetPomodoroSettings";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";

interface PomodoroSettings {
  audioEnabled: boolean;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  audioEnabled: true,
};

// Play notification sound using Web Audio API
function playNotificationSound() {
  try {
    const AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof window.AudioContext })
        .webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Create a pleasant bell-like chime (two tones)
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = freq;
      osc.type = "sine";

      // Envelope: quick attack, sustain, slow decay
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Play a two-note chime (C5, E5)
    playTone(523.25, now, 0.4); // C5
    playTone(659.25, now + 0.15, 0.5); // E5

    // Clean up after sounds finish
    setTimeout(() => ctx.close(), 1000);
  } catch {
    /* ignore audio errors */
  }
}

type Mode = "focus" | "short_break" | "long_break";

type Durations = {
  focus: number; // minutes
  short_break: number;
  long_break: number;
};

type PhaseAdvance = {
  nextMode: Mode;
  nextStreak: number;
  addCompleted: boolean;
};

const DEFAULT_DURATIONS: Durations = {
  focus: 25,
  short_break: 5,
  long_break: 15,
};

interface PersistedState {
  mode: Mode;
  remainingSeconds: number;
  isRunning: boolean;
  focusStreak: number;
  completedFocus: number;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.max(0, Math.floor(totalSeconds / 60));
  const seconds = Math.max(0, totalSeconds % 60);
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `${mm}:${ss}`;
}

function modeLabel(mode: Mode): string {
  if (mode === "focus") return "Focus";
  if (mode === "short_break") return "Short Break";
  return "Long Break";
}

function deriveNextPhase(
  currentMode: Mode,
  prevStreak: number,
  countFocus: boolean,
): PhaseAdvance {
  if (currentMode === "focus") {
    const nextStreak = countFocus ? prevStreak + 1 : prevStreak;
    const isLongBreak = nextStreak > 0 && nextStreak % 4 === 0;
    const nextMode: Mode = isLongBreak ? "long_break" : "short_break";
    return { nextMode, nextStreak, addCompleted: countFocus };
  }

  // From any break back to focus
  const nextStreak = currentMode === "long_break" ? 0 : prevStreak;
  return { nextMode: "focus", nextStreak, addCompleted: false };
}

export default function WidgetDraggablePomodoro() {
  const {
    position,
    isPositionLoaded,
    draggableRef,
    handleDragEnd: baseHandleDragEnd,
  } = useWidgetPosition({ widgetId: "pomodoro" });

  // Ref to track latest mode for use inside callbacks (avoids stale closure)
  const modeRef = useRef<Mode>("focus");

  // Timer state
  const [durations, setDurations] = useState<Durations>(() => {
    if (typeof window === "undefined") return DEFAULT_DURATIONS;
    try {
      const saved = localStorage.getItem(DURATION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Durations>;
        return {
          focus:
            parsed.focus && parsed.focus > 0
              ? parsed.focus
              : DEFAULT_DURATIONS.focus,
          short_break:
            parsed.short_break && parsed.short_break > 0
              ? parsed.short_break
              : DEFAULT_DURATIONS.short_break,
          long_break:
            parsed.long_break && parsed.long_break > 0
              ? parsed.long_break
              : DEFAULT_DURATIONS.long_break,
        };
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_DURATIONS;
  });

  const [mode, setModeState] = useState<Mode>("focus");

  // Wrapper to keep ref in sync with state
  const setMode = useCallback((newMode: Mode) => {
    modeRef.current = newMode;
    setModeState(newMode);
  }, []);

  const [remainingSeconds, setRemainingSeconds] = useState(
    DEFAULT_DURATIONS.focus * 60,
  );
  const [isRunning, setIsRunning] = useState(false);
  const [focusStreak, setFocusStreak] = useState(0);
  const [completedFocus, setCompletedFocus] = useState(0);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);

  // Completion modal state
  const [showCompletion, setShowCompletion] = useState(false);
  const [completedMode, setCompletedMode] = useState<Mode>("focus");

  // Settings
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      /* ignore */
    }
    return DEFAULT_SETTINGS;
  });

  // Load saved timer state
  useEffect(() => {
    if (typeof window === "undefined") return;
    queueMicrotask(() => {
      try {
        const savedState = localStorage.getItem(STATE_KEY);
        if (savedState) {
          const parsed = JSON.parse(savedState) as PersistedState;
          modeRef.current = parsed.mode;
          setModeState(parsed.mode);
          setRemainingSeconds(parsed.remainingSeconds);
          setIsRunning(parsed.isRunning);
          setFocusStreak(parsed.focusStreak ?? 0);
          setCompletedFocus(parsed.completedFocus ?? 0);
        } else {
          setRemainingSeconds((prev) =>
            Math.max(prev, DEFAULT_DURATIONS.focus * 60),
          );
        }
      } catch {
        /* ignore */
      }
    });
  }, []);

  // Persist timer state
  useEffect(() => {
    if (typeof window === "undefined") return;
    const state: PersistedState = {
      mode,
      remainingSeconds,
      isRunning,
      focusStreak,
      completedFocus,
    };
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [mode, remainingSeconds, isRunning, focusStreak, completedFocus]);

  // Persist durations
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(DURATION_KEY, JSON.stringify(durations));
    } catch {
      /* ignore */
    }
  }, [durations]);

  // Persist settings
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  // Timer tick
  useEffect(() => {
    if (!isRunning) return undefined;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Transition happens in effect below via dependency change
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const advancePhase = useCallback(
    (opts: { countFocus: boolean; autoStart: boolean }) => {
      setIsRunning(opts.autoStart);
      setFocusStreak((prevStreak) => {
        // Use ref to get current mode (avoids stale closure issues)
        const currentMode = modeRef.current;
        const { nextMode, nextStreak, addCompleted } = deriveNextPhase(
          currentMode,
          prevStreak,
          opts.countFocus,
        );

        if (addCompleted) {
          setCompletedFocus((c) => c + 1);
        }

        setMode(nextMode);
        setRemainingSeconds(durations[nextMode] * 60);

        return nextStreak;
      });
    },
    [durations, setMode],
  );

  // Handle timer completion - show completion modal when timer reaches 0
  useEffect(() => {
    if (!isRunning || remainingSeconds > 0) return;
    // Wrap in queueMicrotask to avoid synchronous setState in effect warning
    queueMicrotask(() => {
      setIsRunning(false);
      setCompletedMode(modeRef.current);
      setShowCompletion(true);

      // Play audio notification
      if (settings.audioEnabled) {
        playNotificationSound();
      }
    });
  }, [isRunning, remainingSeconds, settings.audioEnabled]);

  // Continue to next phase (called from completion modal)
  const continueToNextPhase = useCallback(() => {
    setShowCompletion(false);
    advancePhase({ countFocus: true, autoStart: true });
  }, [advancePhase]);

  // Skip break and go back to focus
  const skipBreak = useCallback(() => {
    setShowCompletion(false);
    // If we just completed focus, still count it but go to focus instead of break
    if (completedMode === "focus") {
      setCompletedFocus((c) => c + 1);
      setFocusStreak((s) => s + 1);
    }
    setMode("focus");
    setRemainingSeconds(durations.focus * 60);
    setIsRunning(true);
  }, [completedMode, durations.focus, setMode]);

  // Toggle audio setting
  const toggleAudio = useCallback(() => {
    setSettings((prev) => ({ ...prev, audioEnabled: !prev.audioEnabled }));
  }, []);

  const toggleRun = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  const resetCurrent = useCallback(() => {
    setIsRunning(false);
    setRemainingSeconds(durations[mode] * 60);
  }, [durations, mode]);

  const switchMode = useCallback(
    (target: Mode) => {
      setIsRunning(false);
      setMode(target);
      setRemainingSeconds(durations[target] * 60);
    },
    [durations, setMode],
  );

  const setCustomDuration = useCallback(
    (target: Mode, value: number) => {
      if (Number.isNaN(value) || value <= 0) return;
      setDurations((prev) => ({ ...prev, [target]: value }));
      if (target === mode) {
        setRemainingSeconds(value * 60);
      }
    },
    [mode],
  );

  // Reactive position plugin
  const positionCompartment = useCompartment(
    () => positionPlugin({ current: position }),
    [position.x, position.y],
  );

  useDraggable(draggableRef, () => [
    controls({ block: ControlFrom.selector("a, button, input") }),
    events({ onDragEnd: baseHandleDragEnd }),
    positionCompartment,
  ]);

  const isVisible = isPositionLoaded && visibility.pomodoro !== false;
  const formatted = useMemo(
    () => formatTime(remainingSeconds),
    [remainingSeconds],
  );
  const progress = useMemo(() => {
    const total = durations[mode] * 60;
    if (total === 0) return 0;
    return Math.min(100, Math.max(0, (1 - remainingSeconds / total) * 100));
  }, [durations, mode, remainingSeconds]);

  return (
    <DropdownMenu
      open={moreMenuOpen}
      onOpenChange={setMoreMenuOpen}
      modal={false}
    >
      <div
        ref={draggableRef}
        data-widget-id="pomodoro"
        className={`pointer-events-auto absolute z-50 flex transform-gpu cursor-grab rounded-lg bg-black/85 shadow-lg ring-1 ring-white/15 backdrop-blur-md transition-[opacity,transform] duration-300 will-change-transform data-[neodrag-state=dragging]:cursor-grabbing data-[neodrag-state=dragging]:shadow-none data-[neodrag-state=dragging]:transition-none ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {/* Vertical label */}
        <div className="flex items-center justify-center border-r border-white/10 px-1">
          <span className="transform-[rotate(180deg)] text-[10px] font-semibold tracking-widest text-white/50 uppercase [writing-mode:vertical-rl]">
            Pomodoro
          </span>
        </div>

        {/* Main column */}
        <div className="relative flex w-80 flex-col">
          {/* Completion Modal Overlay */}
          {showCompletion && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-r-lg bg-black/95 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 px-4 text-center">
                {/* Icon */}
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full ${
                    completedMode === "focus"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-purple-500/20 text-purple-400"
                  }`}
                >
                  {completedMode === "focus" ? (
                    <CheckCircle2 className="h-7 w-7" />
                  ) : (
                    <Coffee className="h-7 w-7" />
                  )}
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-semibold text-white">
                    {completedMode === "focus"
                      ? "Focus Complete!"
                      : "Break Over!"}
                  </span>
                  <span className="text-sm text-white/60">
                    {completedMode === "focus"
                      ? "Great work! Ready for a break?"
                      : "Time to get back to work!"}
                  </span>
                </div>

                {/* Buttons */}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={continueToNextPhase}
                    className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                      completedMode === "focus"
                        ? "bg-purple-500 text-white hover:bg-purple-400"
                        : "bg-green-500 text-white hover:bg-green-400"
                    }`}
                  >
                    {completedMode === "focus" ? (
                      <>
                        <Coffee className="h-4 w-4" /> Take Break
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" /> Start Focus
                      </>
                    )}
                  </button>

                  {completedMode === "focus" && (
                    <button
                      onClick={skipBreak}
                      className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/20"
                    >
                      <FastForward className="h-4 w-4" /> Skip Break
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white/80">
                <Clock3 className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">
                  {modeLabel(mode)}
                </span>
                <span className="text-[11px] text-white/50">
                  Sessions: {completedFocus} • Streak: {focusStreak}/4
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-white/50">
              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-purple-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-baseline justify-between px-3 pt-3">
            <div className="flex flex-col">
              <span className="font-mono text-4xl font-semibold text-white tabular-nums">
                {formatted}
              </span>
              <span className="text-[11px] text-white/50">
                {isRunning ? "Running" : "Paused"}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleRun}
                className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 transition-colors ${isRunning ? "bg-red-500/20 text-red-200 hover:bg-red-500/30" : "bg-green-500/20 text-green-200 hover:bg-green-500/30"}`}
                title={isRunning ? "Pause" : "Start"}
              >
                {isRunning ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={resetCurrent}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/20"
                title="Reset current session"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={toggleAudio}
                className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 transition-colors ${
                  settings.audioEnabled
                    ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                    : "bg-white/10 text-white/50 hover:bg-white/20"
                }`}
                title={settings.audioEnabled ? "Sound on" : "Sound off"}
              >
                {settings.audioEnabled ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <BellOff className="h-4 w-4" />
                )}
              </button>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/20"
                  title="More options"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2 px-3 pb-3 text-[11px] text-white/70">
            {(
              [
                ["focus", "Focus"],
                ["short_break", "Short"],
                ["long_break", "Long"],
              ] as [Mode, string][]
            ).map(([key, label]) => (
              <div
                key={key}
                className={`flex flex-col rounded-md border border-white/10 bg-white/5 p-2 ${mode === key ? "ring-1 ring-purple-500/50" : ""}`}
                onClick={() => switchMode(key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") switchMode(key);
                }}
              >
                <div className="flex items-center justify-between text-[10px] text-white/60">
                  <span>{label}</span>
                  <TimerReset className="h-3 w-3 text-white/40" />
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={durations[key]}
                    onChange={(e) =>
                      setCustomDuration(key, Number(e.target.value))
                    }
                    className="h-8 w-full rounded-md border border-white/10 bg-black/30 px-2 text-xs text-white outline-none focus:border-purple-500/60"
                    title={`Minutes for ${label.toLowerCase()}`}
                  />
                  <span className="text-[10px] text-white/50">min</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DropdownMenuContent align="end" sideOffset={6} className="min-w-40">
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault();
            setMoreMenuOpen(false);
            setVisibility((prev) => ({ ...prev, pomodoro: false }));
            try {
              localStorage.setItem(
                WIDGET_VISIBILITY_KEY,
                JSON.stringify({ ...visibility, pomodoro: false }),
              );
            } catch {}
          }}
        >
          Hide widget
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setMoreMenuOpen(false);
            resetCurrent();
          }}
          className="cursor-pointer"
        >
          Reset current session
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setMoreMenuOpen(false);
            setIsRunning(false);
            modeRef.current = "focus";
            setModeState("focus");
            setRemainingSeconds(durations.focus * 60);
            setFocusStreak(0);
            setCompletedFocus(0);
          }}
          className="cursor-pointer"
        >
          Reset all progress
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setMoreMenuOpen(false);
            requestAnimationFrame(() => resetWidgetPosition("pomodoro"));
          }}
          className="cursor-pointer"
        >
          Reset widget position
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
