"use client";

import { useState, useEffect } from "react";
import HabitIcon from "@/components/HabitIcon";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DailyStat {
  date: string;
  doneCount: number;
  missedCount: number;
  restCount: number;
  loggedCount: number;
  projectedMins: number;
  actualMins: number;
}

interface GroupStats {
  _id: string;
  name: string;
  totalItems: number;
  daily: DailyStat[];
  avgCompletionRate: number;
  avgActualMins: number;
  totalProjectedMins: number;
}

interface HabitStats {
  _id: string;
  name: string;
  icon: string;
  groupId: string;
  groupName: string;
  projectedMinutes: number;
  doneCount: number;
  missedCount: number;
  restCount: number;
  unloggedCount: number;
  avgActualMins: number | null;
  avgVariance: number | null;
  completionRate: number;
}

interface AnalyticsData {
  dates: string[];
  days: number;
  groups: GroupStats[];
  habits: HabitStats[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMins(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function dayLabel(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "narrow" });
}

function barColor(pct: number, hasLogs: boolean): string {
  if (!hasLogs) return "#2e2c22";
  if (pct >= 1)    return "#5a6b35";
  if (pct >= 0.75) return "#7a9248";
  if (pct >= 0.5)  return "#c47a2a";
  if (pct > 0)     return "#8b5a2b";
  return "#7a2e2e";
}

function completionBarColor(pct: number): string {
  if (pct >= 0.8) return "#5a6b35";
  if (pct >= 0.5) return "#c47a2a";
  return "#7a2e2e";
}

// ── Bar chart ─────────────────────────────────────────────────────────────────

function RoutineChart({
  daily,
  totalItems,
  showLabels,
}: {
  daily: DailyStat[];
  totalItems: number;
  showLabels: boolean;
}) {
  return (
    <div className="flex items-end gap-1" style={{ height: showLabels ? 64 : 52 }}>
      {daily.map((d) => {
        const pct = totalItems > 0 ? d.doneCount / totalItems : 0;
        const heightPct = d.loggedCount > 0 ? Math.max(6, Math.round(pct * 100)) : 6;
        const color = barColor(pct, d.loggedCount > 0);
        return (
          <div key={d.date} className="flex flex-col items-center gap-0.5 flex-1">
            <div className="w-full flex items-end" style={{ height: showLabels ? 48 : 44 }}>
              <div
                className="w-full rounded-sm"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: color,
                  minHeight: 3,
                  transition: "height 0.4s ease",
                }}
              />
            </div>
            {showLabels && (
              <span className="font-mono text-[9px] text-dim">{dayLabel(d.date)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Habit row ─────────────────────────────────────────────────────────────────

function HabitRow({ habit }: { habit: HabitStats }) {
  const pct = habit.completionRate;
  const pctDisplay = Math.round(pct * 100);
  const varianceColor =
    habit.avgVariance === null ? "text-dim"
    : habit.avgVariance > 5   ? "text-tobacco"
    : habit.avgVariance < -5  ? "text-olive-light"
    : "text-dim";

  return (
    <div className="py-3.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-5 flex items-center justify-center flex-shrink-0">
          <HabitIcon name={habit.icon} size={14} strokeWidth={1.75} className="text-muted" />
        </div>
        <span className="flex-1 font-body text-sm text-text leading-tight">{habit.name}</span>
        <span className="font-mono text-[10px] text-dim flex-shrink-0">{habit.projectedMinutes}m proj</span>
      </div>

      <div className="flex items-center gap-3 pl-7 mb-2">
        <span className="font-mono text-xs text-olive">{habit.doneCount} done</span>
        {habit.missedCount > 0 && (
          <span className="font-mono text-xs text-burgundy-light">{habit.missedCount} missed</span>
        )}
        {habit.restCount > 0 && (
          <span className="font-mono text-xs text-blue-muted">{habit.restCount} rest</span>
        )}
        {habit.unloggedCount > 0 && (
          <span className="font-mono text-xs text-dim">{habit.unloggedCount} unlogged</span>
        )}
        {habit.avgActualMins !== null && (
          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            <span className="font-mono text-xs text-muted">{habit.avgActualMins}m avg</span>
            {habit.avgVariance !== null && habit.avgVariance !== 0 && (
              <span className={`font-mono text-xs font-medium ${varianceColor}`}>
                {habit.avgVariance > 0 ? `+${habit.avgVariance}m` : `${habit.avgVariance}m`}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="pl-7">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pctDisplay}%`,
                backgroundColor: completionBarColor(pct),
                transition: "width 0.5s ease",
              }}
            />
          </div>
          <span className="font-mono text-[10px] text-dim w-8 text-right flex-shrink-0">
            {pctDisplay}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function AnalyticsContent() {
  const [days, setDays] = useState<7 | 30>(7);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);
    fetch(`/api/analytics?days=${days}`)
      .then((r) => r.json())
      .then((d: AnalyticsData) => {
        setData(d);
        setLoading(false);
      });
  }, [days]);

  const habitsByGroup = data
    ? data.groups.map((g) => ({
        group: g,
        habits: data.habits.filter((h) => h.groupId === g._id),
      }))
    : [];

  const dateRangeLabel =
    data && data.dates.length > 1
      ? `${new Date(data.dates[0] + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(data.dates[data.dates.length - 1] + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : "";

  return (
    <>
      {/* Title + day toggle */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-heading text-xl text-text">Analytics</h2>
          {dateRangeLabel && (
            <p className="font-mono text-dim text-[10px] mt-0.5 tracking-wide">{dateRangeLabel}</p>
          )}
        </div>
        <div className="flex bg-card border border-border rounded-pill p-0.5">
          <button
            onClick={() => setDays(7)}
            className={`font-mono text-xs px-3 py-1.5 rounded-pill transition-colors ${
              days === 7 ? "bg-olive text-text" : "text-dim hover:text-muted"
            }`}
          >
            7d
          </button>
          <button
            onClick={() => setDays(30)}
            className={`font-mono text-xs px-3 py-1.5 rounded-pill transition-colors ${
              days === 30 ? "bg-olive text-text" : "text-dim hover:text-muted"
            }`}
          >
            30d
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card rounded-card h-32 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Routine Performance */}
          <section className="mb-10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-dim mb-3">
              Routine Performance
            </p>
            <div className="space-y-3">
              {data.groups.filter((g) => g.totalItems > 0).map((group) => {
                const activeDays = group.daily.filter((d) => d.loggedCount > 0).length;
                const completionPct = Math.round(group.avgCompletionRate * 100);
                const variance = group.avgActualMins - group.totalProjectedMins;

                return (
                  <div key={group._id} className="bg-card rounded-card px-4 pt-4 pb-3">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-heading text-base text-text">{group.name}</h3>
                      <span
                        className="font-mono text-lg font-semibold flex-shrink-0 ml-3"
                        style={{ color: completionBarColor(group.avgCompletionRate) }}
                      >
                        {completionPct}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <span className="font-mono text-xs text-dim">
                        {fmtMins(group.totalProjectedMins)} projected
                      </span>
                      <span className="font-mono text-dim text-xs">→</span>
                      {group.avgActualMins > 0 ? (
                        <>
                          <span className="font-mono text-xs text-muted">
                            {fmtMins(group.avgActualMins)} actual avg
                          </span>
                          {variance !== 0 && (
                            <span
                              className="font-mono text-[10px] ml-auto"
                              style={{ color: variance > 0 ? "#8b5a2b" : "#7a9248" }}
                            >
                              {variance > 0 ? `+${fmtMins(variance)}` : `-${fmtMins(Math.abs(variance))}`}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="font-mono text-xs text-dim">no data yet</span>
                      )}
                    </div>

                    <RoutineChart
                      daily={group.daily}
                      totalItems={group.totalItems}
                      showLabels={days === 7}
                    />

                    {days === 30 && (
                      <p className="font-mono text-[9px] text-dim mt-1.5">
                        {dateRangeLabel} · active {activeDays} of {days} days
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Habit Breakdown */}
          <section>
            <p className="font-mono text-[10px] uppercase tracking-widest text-dim mb-3">
              Habit Breakdown
            </p>
            {habitsByGroup.filter(({ habits }) => habits.length > 0).map(({ group, habits }) => (
              <div key={group._id} className="mb-6">
                <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">
                  {group.name}
                </p>
                <div className="bg-card rounded-card px-4">
                  {habits.map((habit) => (
                    <HabitRow key={habit._id} habit={habit} />
                  ))}
                </div>
              </div>
            ))}
            {data.habits.length === 0 && (
              <div className="bg-card rounded-card px-6 py-10 text-center">
                <p className="font-mono text-dim text-sm">
                  Log some routines to see habit data here.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
