"use client";

import {
  Bell,
  BellOff,
  CheckCircle2,
  Clock3,
  Coffee,
  FastForward,
  MessageSquare,
  MessageSquareOff,
  Pause,
  Play,
  RotateCcw,
  TimerReset,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Storage keys (shared with the widget so state stays in sync) ──
const STATE_KEY = "widgetPomodoroState";
const DURATION_KEY = "widgetPomodoroDurations";
const SETTINGS_KEY = "widgetPomodoroSettings";

// ── Types ──
type Mode = "focus" | "short_break" | "long_break";

interface Durations {
  focus: number;
  short_break: number;
  long_break: number;
}

interface PomodoroSettings {
  audioEnabled: boolean;
  notificationEnabled: boolean;
}

interface PersistedState {
  mode: Mode;
  remainingSeconds: number;
  isRunning: boolean;
  focusStreak: number;
  completedFocus: number;
}

const DEFAULT_DURATIONS: Durations = {
  focus: 25,
  short_break: 5,
  long_break: 15,
};

const DEFAULT_SETTINGS: PomodoroSettings = {
  audioEnabled: true,
  notificationEnabled: false,
};

// ── Helpers ──

function playNotificationSound() {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof window.AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    const tone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, start + dur);
      osc.start(start);
      osc.stop(start + dur);
    };
    tone(523.25, now, 0.4);
    tone(659.25, now + 0.15, 0.5);
    setTimeout(() => ctx.close(), 1000);
  } catch {
    /* ignore */
  }
}

function showBrowserNotification(mode: Mode) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const isFocus = mode === "focus";
    const n = new Notification(
      isFocus ? "🎉 Focus Complete!" : "☕ Break Over!",
      {
        body: isFocus
          ? "Great work! Time for a well-deserved break."
          : "Ready to get back to work?",
        icon: "/assets/icons/icon-192x192.png",
        tag: "pomodoro-timer",
        requireInteraction: true,
      },
    );
    setTimeout(() => n.close(), 10000);
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignore */
  }
}

function formatTime(totalSeconds: number): string {
  const m = Math.max(0, Math.floor(totalSeconds / 60));
  const s = Math.max(0, totalSeconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function modeLabel(mode: Mode): string {
  if (mode === "focus") return "Focus";
  if (mode === "short_break") return "Short Break";
  return "Long Break";
}

function modeColor(mode: Mode) {
  if (mode === "focus")
    return {
      ring: "ring-purple-500/40",
      bg: "bg-purple-500",
      bgLight: "bg-purple-50",
      text: "text-purple-600",
      border: "border-purple-200",
      button: "bg-purple-600 hover:bg-purple-500 text-white",
    };
  if (mode === "short_break")
    return {
      ring: "ring-emerald-500/40",
      bg: "bg-emerald-500",
      bgLight: "bg-emerald-50",
      text: "text-emerald-600",
      border: "border-emerald-200",
      button: "bg-emerald-600 hover:bg-emerald-500 text-white",
    };
  return {
    ring: "ring-sky-500/40",
    bg: "bg-sky-500",
    bgLight: "bg-sky-50",
    text: "text-sky-600",
    border: "border-sky-200",
    button: "bg-sky-600 hover:bg-sky-500 text-white",
  };
}

function deriveNextPhase(
  currentMode: Mode,
  prevStreak: number,
  countFocus: boolean,
) {
  if (currentMode === "focus") {
    const nextStreak = countFocus ? prevStreak + 1 : prevStreak;
    const isLong = nextStreak > 0 && nextStreak % 4 === 0;
    return {
      nextMode: (isLong ? "long_break" : "short_break") as Mode,
      nextStreak,
      addCompleted: countFocus,
    };
  }
  return {
    nextMode: "focus" as Mode,
    nextStreak: currentMode === "long_break" ? 0 : prevStreak,
    addCompleted: false,
  };
}

// ── Component ──

export default function PomodoroClient() {
  const modeRef = useRef<Mode>("focus");

  const [durations, setDurations] = useState<Durations>(() => {
    if (typeof window === "undefined") return DEFAULT_DURATIONS;
    try {
      const saved = localStorage.getItem(DURATION_KEY);
      if (saved) {
        const p = JSON.parse(saved) as Partial<Durations>;
        return {
          focus: p.focus && p.focus > 0 ? p.focus : DEFAULT_DURATIONS.focus,
          short_break:
            p.short_break && p.short_break > 0
              ? p.short_break
              : DEFAULT_DURATIONS.short_break,
          long_break:
            p.long_break && p.long_break > 0
              ? p.long_break
              : DEFAULT_DURATIONS.long_break,
        };
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_DURATIONS;
  });

  const [mode, setModeState] = useState<Mode>("focus");
  const setMode = useCallback((m: Mode) => {
    modeRef.current = m;
    setModeState(m);
  }, []);

  const [remainingSeconds, setRemainingSeconds] = useState(
    DEFAULT_DURATIONS.focus * 60,
  );
  const [isRunning, setIsRunning] = useState(false);
  const [focusStreak, setFocusStreak] = useState(0);
  const [completedFocus, setCompletedFocus] = useState(0);

  const [showCompletion, setShowCompletion] = useState(false);
  const [completedMode, setCompletedMode] = useState<Mode>("focus");

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

  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");

  // ── Load persisted state ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(STATE_KEY);
        if (raw) {
          const s = JSON.parse(raw) as PersistedState;
          modeRef.current = s.mode;
          setModeState(s.mode);
          setRemainingSeconds(s.remainingSeconds);
          setIsRunning(s.isRunning);
          setFocusStreak(s.focusStreak ?? 0);
          setCompletedFocus(s.completedFocus ?? 0);
        } else {
          setRemainingSeconds(DEFAULT_DURATIONS.focus * 60);
        }
      } catch {
        /* ignore */
      }
    });
  }, []);

  // ── Persist state ──
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(DURATION_KEY, JSON.stringify(durations));
    } catch {
      /* ignore */
    }
  }, [durations]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      queueMicrotask(() => setNotificationPermission("unsupported"));
      return;
    }
    queueMicrotask(() => setNotificationPermission(Notification.permission));
  }, []);

  // ── Update page title with timer ──
  useEffect(() => {
    if (typeof document === "undefined") return;
    const original = document.title;
    if (isRunning) {
      document.title = `${formatTime(remainingSeconds)} — ${modeLabel(mode)} | Pomodoro`;
    }
    return () => {
      document.title = original;
    };
  }, [isRunning, remainingSeconds, mode]);

  // ── Timer tick ──
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const advancePhase = useCallback(
    (opts: { countFocus: boolean; autoStart: boolean }) => {
      setIsRunning(opts.autoStart);
      setFocusStreak((prevStreak) => {
        const currentMode = modeRef.current;
        const { nextMode, nextStreak, addCompleted } = deriveNextPhase(
          currentMode,
          prevStreak,
          opts.countFocus,
        );
        if (addCompleted) setCompletedFocus((c) => c + 1);
        setMode(nextMode);
        setRemainingSeconds(durations[nextMode] * 60);
        return nextStreak;
      });
    },
    [durations, setMode],
  );

  // ── Handle timer completion ──
  useEffect(() => {
    if (!isRunning || remainingSeconds > 0) return;
    queueMicrotask(() => {
      setIsRunning(false);
      setCompletedMode(modeRef.current);
      setShowCompletion(true);
      if (settings.audioEnabled) playNotificationSound();
      if (settings.notificationEnabled)
        showBrowserNotification(modeRef.current);
    });
  }, [
    isRunning,
    remainingSeconds,
    settings.audioEnabled,
    settings.notificationEnabled,
  ]);

  const continueToNextPhase = useCallback(() => {
    setShowCompletion(false);
    advancePhase({ countFocus: true, autoStart: true });
  }, [advancePhase]);

  const skipBreak = useCallback(() => {
    setShowCompletion(false);
    if (completedMode === "focus") {
      setCompletedFocus((c) => c + 1);
      setFocusStreak((s) => s + 1);
    }
    setMode("focus");
    setRemainingSeconds(durations.focus * 60);
    setIsRunning(true);
  }, [completedMode, durations.focus, setMode]);

  const toggleAudio = useCallback(() => {
    setSettings((prev) => ({ ...prev, audioEnabled: !prev.audioEnabled }));
  }, []);

  const toggleNotification = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (settings.notificationEnabled) {
      setSettings((prev) => ({ ...prev, notificationEnabled: false }));
      return;
    }
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted")
        setSettings((prev) => ({ ...prev, notificationEnabled: true }));
    } else if (Notification.permission === "granted") {
      setSettings((prev) => ({ ...prev, notificationEnabled: true }));
    }
  }, [settings.notificationEnabled]);

  const toggleRun = useCallback(() => setIsRunning((p) => !p), []);

  const resetCurrent = useCallback(() => {
    setIsRunning(false);
    setRemainingSeconds(durations[mode] * 60);
  }, [durations, mode]);

  const resetAll = useCallback(() => {
    setIsRunning(false);
    modeRef.current = "focus";
    setModeState("focus");
    setRemainingSeconds(durations.focus * 60);
    setFocusStreak(0);
    setCompletedFocus(0);
  }, [durations.focus]);

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
      if (target === mode) setRemainingSeconds(value * 60);
    },
    [mode],
  );

  // ── Derived values ──
  const formatted = useMemo(
    () => formatTime(remainingSeconds),
    [remainingSeconds],
  );
  const progress = useMemo(() => {
    const total = durations[mode] * 60;
    if (total === 0) return 0;
    return Math.min(100, Math.max(0, (1 - remainingSeconds / total) * 100));
  }, [durations, mode, remainingSeconds]);

  const colors = modeColor(mode);

  // SVG circular progress
  const circleRadius = 90;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Streak dots (4 per cycle)
  const streakDots = useMemo(() => {
    const dots = [];
    for (let i = 0; i < 4; i++) {
      dots.push(
        i < (focusStreak % 4 === 0 && focusStreak > 0 ? 4 : focusStreak % 4),
      );
    }
    return dots;
  }, [focusStreak]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Completion overlay */}
      {showCompletion && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
              completedMode === "focus"
                ? "bg-green-100 text-green-600"
                : "bg-purple-100 text-purple-600"
            }`}
          >
            {completedMode === "focus" ? (
              <CheckCircle2 className="h-10 w-10" />
            ) : (
              <Coffee className="h-10 w-10" />
            )}
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900">
            {completedMode === "focus" ? "Focus Complete!" : "Break Over!"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {completedMode === "focus"
              ? "Great work! You've earned a break."
              : "Feeling refreshed? Let's get back to work."}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={continueToNextPhase}
              className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-sm transition-colors ${
                completedMode === "focus"
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "bg-purple-600 text-white hover:bg-purple-500"
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
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                <FastForward className="h-4 w-4" /> Skip Break
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main timer card */}
      <div
        className={`rounded-2xl border border-slate-200 bg-white shadow-sm transition-all ${showCompletion ? "pointer-events-none opacity-40" : ""}`}
      >
        {/* Mode tabs */}
        <div className="flex border-b border-slate-100">
          {(
            [
              ["focus", "Focus"],
              ["short_break", "Short Break"],
              ["long_break", "Long Break"],
            ] as [Mode, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                mode === key
                  ? `${colors.text} border-b-2 ${colors.border}`
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Timer display */}
        <div className="flex flex-col items-center px-6 py-10">
          {/* Circular progress */}
          <div className="relative flex items-center justify-center">
            <svg
              className="-rotate-90"
              width="220"
              height="220"
              viewBox="0 0 220 220"
            >
              <circle
                cx="110"
                cy="110"
                r={circleRadius}
                fill="none"
                stroke="currentColor"
                className="text-slate-100"
                strokeWidth="8"
              />
              <circle
                cx="110"
                cy="110"
                r={circleRadius}
                fill="none"
                stroke="currentColor"
                className={colors.text}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-mono text-5xl font-bold text-slate-900 tabular-nums">
                {formatted}
              </span>
              <span className="mt-1 text-sm text-slate-400">
                {isRunning ? "Running" : "Paused"}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={toggleRun}
              className={`flex h-14 w-14 items-center justify-center rounded-full shadow-sm transition-colors ${colors.button}`}
              title={isRunning ? "Pause" : "Start"}
            >
              {isRunning ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </button>
            <button
              onClick={resetCurrent}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
              title="Reset current session"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>

          {/* Streak indicator */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {streakDots.map((filled, i) => (
                <div
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${
                    filled ? colors.bg : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-slate-400">
              {focusStreak % 4}/4 until long break
            </span>
          </div>
        </div>
      </div>

      {/* Stats & Settings row */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Stats card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Session Stats
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {completedFocus}
              </p>
              <p className="text-xs text-slate-500">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{focusStreak}</p>
              <p className="text-xs text-slate-500">Streak</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {Math.round(((completedFocus * durations.focus) / 60) * 100) /
                  100 || 0}
              </p>
              <p className="text-xs text-slate-500">Hours focused</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {durations.focus}m
              </p>
              <p className="text-xs text-slate-500">Focus length</p>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <button
              onClick={resetAll}
              className="flex items-center gap-2 text-xs text-slate-400 transition-colors hover:text-slate-600"
            >
              <TimerReset className="h-3.5 w-3.5" /> Reset all progress
            </button>
          </div>
        </div>

        {/* Settings card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Settings
          </h3>

          {/* Duration controls */}
          <div className="mt-4 space-y-3">
            {(
              [
                ["focus", "Focus"],
                ["short_break", "Short Break"],
                ["long_break", "Long Break"],
              ] as [Mode, string][]
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{label}</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={durations[key]}
                    onChange={(e) =>
                      setCustomDuration(key, Number(e.target.value))
                    }
                    className="h-8 w-16 rounded-md border border-slate-200 bg-slate-50 px-2 text-center text-sm text-slate-700 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
                  />
                  <span className="text-xs text-slate-400">min</span>
                </div>
              </div>
            ))}
          </div>

          {/* Audio & notification toggles */}
          <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
            <button
              onClick={toggleAudio}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                settings.audioEnabled
                  ? "border-purple-200 bg-purple-50 text-purple-600"
                  : "border-slate-200 bg-slate-50 text-slate-400"
              }`}
              title={settings.audioEnabled ? "Sound on" : "Sound off"}
            >
              {settings.audioEnabled ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={toggleNotification}
              disabled={notificationPermission === "unsupported"}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                notificationPermission === "unsupported"
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
                  : notificationPermission === "denied"
                    ? "cursor-not-allowed border-red-200 bg-red-50 text-red-300"
                    : settings.notificationEnabled
                      ? "border-blue-200 bg-blue-50 text-blue-600"
                      : "border-slate-200 bg-slate-50 text-slate-400"
              }`}
              title={
                notificationPermission === "unsupported"
                  ? "Browser notifications not supported"
                  : notificationPermission === "denied"
                    ? "Notifications blocked — enable in browser settings"
                    : settings.notificationEnabled
                      ? "Browser notifications on"
                      : "Browser notifications off"
              }
            >
              {settings.notificationEnabled &&
              notificationPermission === "granted" ? (
                <MessageSquare className="h-4 w-4" />
              ) : (
                <MessageSquareOff className="h-4 w-4" />
              )}
            </button>
            <span className="ml-2 text-xs text-slate-400">
              {settings.audioEnabled ? "Sound on" : "Sound off"}
              {" · "}
              {settings.notificationEnabled
                ? "Notifications on"
                : "Notifications off"}
            </span>
          </div>
        </div>
      </div>

      {/* Info section */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <Clock3 className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700">
              How the Pomodoro Technique works
            </h3>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-xs leading-relaxed text-slate-500">
              <li>
                Set a <strong>focus timer</strong> (default 25 min) and work on
                a single task.
              </li>
              <li>
                When the timer rings, take a <strong>short break</strong> (5
                min).
              </li>
              <li>
                After 4 focus sessions, enjoy a <strong>long break</strong> (15
                min).
              </li>
              <li>Repeat — consistency builds deep focus over time.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
