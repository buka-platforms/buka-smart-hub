"use client";

import { Input } from "@/components/ui/input";
import { useCallback, useMemo, useState } from "react";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const CYCLES = [
  {
    key: "physical",
    label: "Physical",
    period: 23,
    description: "Strength, endurance, and energy levels",
  },
  {
    key: "emotional",
    label: "Emotional",
    period: 28,
    description: "Mood, sensitivity, and creativity",
  },
  {
    key: "intellectual",
    label: "Intellectual",
    period: 33,
    description: "Analytical thinking, memory, and alertness",
  },
] as const;

const CYCLE_COLORS: Record<
  string,
  { bg: string; border: string; text: string; fill: string; line: string }
> = {
  physical: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    fill: "rgba(16,185,129,0.12)",
    line: "rgb(16,185,129)",
  },
  emotional: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-700",
    fill: "rgba(14,165,233,0.12)",
    line: "rgb(14,165,233)",
  },
  intellectual: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    fill: "rgba(244,63,94,0.12)",
    line: "rgb(244,63,94)",
  },
};

function toLocalInputDate(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function toUtcTimestamp(dateValue: string): number | null {
  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day);
}

function getCycleValue(days: number, period: number): number {
  return Math.sin((2 * Math.PI * days) / period);
}

function getPhaseLabel(value: number): string {
  const abs = Math.abs(value);
  if (abs < 0.05) return "Critical";
  if (value >= 0.7) return "Peak";
  if (value > 0) return "Positive";
  if (value <= -0.7) return "Low";
  return "Recovering";
}

function getPhaseBadgeStyle(value: number): string {
  const abs = Math.abs(value);
  if (abs < 0.05) return "bg-amber-100 text-amber-800 border-amber-200";
  if (value >= 0.7) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (value > 0) return "bg-green-50 text-green-700 border-green-200";
  if (value <= -0.7) return "bg-red-100 text-red-800 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

const FORECAST_CHART_WIDTH = 720;
const FORECAST_CHART_HEIGHT = 200;
const FORECAST_DAYS = 30;
const FORECAST_PADDING = { top: 20, bottom: 30, left: 40, right: 20 };

export default function BiorhythmClient() {
  const [birthDate, setBirthDate] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem("widgetBiorhythmBirthDate") || "";
    } catch {
      return "";
    }
  });
  const [targetDate, setTargetDate] = useState(() =>
    toLocalInputDate(new Date()),
  );

  const handleBirthDateChange = useCallback((value: string) => {
    setBirthDate(value);
    try {
      if (value) localStorage.setItem("widgetBiorhythmBirthDate", value);
      else localStorage.removeItem("widgetBiorhythmBirthDate");
    } catch {}
  }, []);

  const calculation = useMemo(() => {
    if (!birthDate) return null;
    const birthTs = toUtcTimestamp(birthDate);
    const targetTs = toUtcTimestamp(targetDate);
    if (!birthTs || !targetTs) return null;
    const days = Math.floor((targetTs - birthTs) / DAY_IN_MS);
    if (days < 0) return null;

    return {
      days,
      cycles: CYCLES.map((c) => {
        const value = getCycleValue(days, c.period);
        const phase = ((days % c.period) + c.period) % c.period;
        return { ...c, value, phase };
      }),
    };
  }, [birthDate, targetDate]);

  const forecastPath = useMemo(() => {
    if (!birthDate) return null;
    const birthTs = toUtcTimestamp(birthDate);
    const targetTs = toUtcTimestamp(targetDate);
    if (!birthTs || !targetTs) return null;
    const baseDays = Math.floor((targetTs - birthTs) / DAY_IN_MS);
    if (baseDays < 0) return null;

    const plotW =
      FORECAST_CHART_WIDTH - FORECAST_PADDING.left - FORECAST_PADDING.right;
    const plotH =
      FORECAST_CHART_HEIGHT - FORECAST_PADDING.top - FORECAST_PADDING.bottom;
    const midY = FORECAST_PADDING.top + plotH / 2;

    const paths: Record<string, { line: string; area: string }> = {};

    for (const cycle of CYCLES) {
      let linePath = "";
      let areaPath = "";
      for (let i = 0; i <= FORECAST_DAYS; i++) {
        const val = getCycleValue(baseDays + i, cycle.period);
        const x = FORECAST_PADDING.left + (i / FORECAST_DAYS) * plotW;
        const y = midY - val * (plotH / 2) * 0.9;
        linePath += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        areaPath += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      }
      const lastX = FORECAST_PADDING.left + plotW;
      const firstX = FORECAST_PADDING.left;
      areaPath += `L${lastX.toFixed(1)},${midY}L${firstX.toFixed(1)},${midY}Z`;
      paths[cycle.key] = { line: linePath, area: areaPath };
    }

    // X-axis labels (every 5 days)
    const labels: { x: number; text: string }[] = [];
    for (let i = 0; i <= FORECAST_DAYS; i += 5) {
      const d = new Date(targetTs + i * DAY_IN_MS);
      const x = FORECAST_PADDING.left + (i / FORECAST_DAYS) * plotW;
      labels.push({ x, text: `${d.getUTCMonth() + 1}/${d.getUTCDate()}` });
    }

    // Today marker
    const todayX = FORECAST_PADDING.left;

    return { paths, labels, midY, plotW, todayX };
  }, [birthDate, targetDate]);

  return (
    <div className="space-y-6">
      {/* Date inputs */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <h2 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">
          Your Dates
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="birth-date"
              className="mb-1.5 block text-sm font-medium text-slate-600"
            >
              Birth Date
            </label>
            <Input
              id="birth-date"
              type="date"
              value={birthDate}
              max={targetDate}
              onChange={(e) => handleBirthDateChange(e.target.value)}
              className="h-10"
            />
          </div>
          <div>
            <label
              htmlFor="target-date"
              className="mb-1.5 block text-sm font-medium text-slate-600"
            >
              Target Date
            </label>
            <Input
              id="target-date"
              type="date"
              value={targetDate}
              min={birthDate || undefined}
              onChange={(e) => setTargetDate(e.target.value)}
              className="h-10"
            />
          </div>
        </div>
      </div>

      {!birthDate && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
          <p className="text-sm text-amber-800">
            Enter your birth date above to see your biorhythm cycles.
          </p>
        </div>
      )}

      {birthDate && !calculation && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
          <p className="text-sm text-red-800">
            Target date must be on or after your birth date.
          </p>
        </div>
      )}

      {calculation && (
        <>
          {/* Summary */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">
                Today&apos;s Biorhythm
              </h2>
              <span className="text-xs text-slate-500">
                Day {calculation.days.toLocaleString()} of life
              </span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {calculation.cycles.map((cycle) => {
                const percentage = Math.round(cycle.value * 100);
                const colors = CYCLE_COLORS[cycle.key];
                return (
                  <div
                    key={cycle.key}
                    className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-semibold ${colors.text}`}>
                        {cycle.label}
                      </h3>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getPhaseBadgeStyle(cycle.value)}`}
                      >
                        {getPhaseLabel(cycle.value)}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="text-3xl font-bold text-slate-900 tabular-nums">
                        {percentage > 0 ? "+" : ""}
                        {percentage}%
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {cycle.description}
                      </p>
                    </div>
                    <div className="mt-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            backgroundColor: colors.line,
                            width: `${Math.abs(percentage)}%`,
                          }}
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          Cycle day {cycle.phase + 1}/{cycle.period}
                        </span>
                        <span>{cycle.period}-day cycle</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 30-day Forecast Chart */}
          {forecastPath && (
            <div className="rounded-xl border border-slate-200/80 bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">
                  30-Day Forecast
                </h2>
                <div className="flex items-center gap-3">
                  {CYCLES.map((c) => (
                    <div
                      key={c.key}
                      className="flex items-center gap-1.5 text-xs text-slate-600"
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: CYCLE_COLORS[c.key].line }}
                      />
                      {c.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <svg
                  viewBox={`0 0 ${FORECAST_CHART_WIDTH} ${FORECAST_CHART_HEIGHT}`}
                  className="h-52 w-full min-w-125"
                  aria-label="30-day biorhythm forecast chart"
                >
                  {/* Grid lines */}
                  <line
                    x1={FORECAST_PADDING.left}
                    y1={FORECAST_PADDING.top}
                    x2={FORECAST_PADDING.left + forecastPath.plotW}
                    y2={FORECAST_PADDING.top}
                    stroke="#e2e8f0"
                    strokeDasharray="4 3"
                  />
                  <line
                    x1={FORECAST_PADDING.left}
                    y1={forecastPath.midY}
                    x2={FORECAST_PADDING.left + forecastPath.plotW}
                    y2={forecastPath.midY}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />
                  <line
                    x1={FORECAST_PADDING.left}
                    y1={FORECAST_CHART_HEIGHT - FORECAST_PADDING.bottom}
                    x2={FORECAST_PADDING.left + forecastPath.plotW}
                    y2={FORECAST_CHART_HEIGHT - FORECAST_PADDING.bottom}
                    stroke="#e2e8f0"
                    strokeDasharray="4 3"
                  />

                  {/* Y-axis labels */}
                  <text
                    x={FORECAST_PADDING.left - 6}
                    y={FORECAST_PADDING.top + 4}
                    textAnchor="end"
                    className="fill-slate-400 text-[10px]"
                  >
                    +100%
                  </text>
                  <text
                    x={FORECAST_PADDING.left - 6}
                    y={forecastPath.midY + 3}
                    textAnchor="end"
                    className="fill-slate-400 text-[10px]"
                  >
                    0%
                  </text>
                  <text
                    x={FORECAST_PADDING.left - 6}
                    y={FORECAST_CHART_HEIGHT - FORECAST_PADDING.bottom + 4}
                    textAnchor="end"
                    className="fill-slate-400 text-[10px]"
                  >
                    -100%
                  </text>

                  {/* Cycle fills and lines */}
                  {CYCLES.map((c) => {
                    const colors = CYCLE_COLORS[c.key];
                    const p = forecastPath.paths[c.key];
                    return (
                      <g key={c.key}>
                        <path d={p.area} fill={colors.fill} />
                        <path
                          d={p.line}
                          fill="none"
                          stroke={colors.line}
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                      </g>
                    );
                  })}

                  {/* Today marker */}
                  <line
                    x1={forecastPath.todayX}
                    y1={FORECAST_PADDING.top}
                    x2={forecastPath.todayX}
                    y2={FORECAST_CHART_HEIGHT - FORECAST_PADDING.bottom}
                    stroke="#475569"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />
                  <text
                    x={forecastPath.todayX}
                    y={FORECAST_CHART_HEIGHT - FORECAST_PADDING.bottom + 16}
                    textAnchor="middle"
                    className="fill-slate-600 text-[10px] font-semibold"
                  >
                    Today
                  </text>

                  {/* X-axis date labels */}
                  {forecastPath.labels.slice(1).map((l) => (
                    <text
                      key={l.text}
                      x={l.x}
                      y={FORECAST_CHART_HEIGHT - FORECAST_PADDING.bottom + 16}
                      textAnchor="middle"
                      className="fill-slate-400 text-[10px]"
                    >
                      {l.text}
                    </text>
                  ))}
                </svg>
              </div>
            </div>
          )}

          {/* Cycle Information */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5">
            <h2 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">
              About Biorhythm Cycles
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
                <h3 className="font-semibold text-emerald-700">
                  Physical (23 days)
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Governs physical strength, coordination, endurance, and
                  resistance to illness. Peak days are best for intense exercise
                  and physical challenges.
                </p>
              </div>
              <div className="rounded-lg border border-sky-100 bg-sky-50/50 p-4">
                <h3 className="font-semibold text-sky-700">
                  Emotional (28 days)
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Influences mood, emotions, sensitivity, and creative
                  abilities. Peak days bring emotional stability and heightened
                  empathy.
                </p>
              </div>
              <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-4">
                <h3 className="font-semibold text-rose-700">
                  Intellectual (33 days)
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Affects analytical thinking, logic, memory, and communication.
                  Peak days are ideal for studying, problem-solving, and
                  decision-making.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
