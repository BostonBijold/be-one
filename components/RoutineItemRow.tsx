"use client";

import { useState } from "react";
import StreakDots from "@/components/StreakDots";
import HabitIcon from "@/components/HabitIcon";
import type { RoutineLogEntry } from "@/components/RoutinesView";
import type { LogState } from "@/models/RoutineLog";

export interface RowItem {
  _id: string;
  name: string;
  icon: string;
  projectedMinutes: number;
  order: number;
  itemType?: "standard" | "checkbox" | "virtue_checkin" | "weekly_review";
}

interface Props {
  item: RowItem;
  log?: RoutineLogEntry;
  weekLogs: Array<{ date: string; state: LogState }>;
  weekDates: string[];
  isExpanded: boolean;
  isBackEntry: boolean;
  selectedDate: string;
  onToggleExpand: () => void;
  onStartTimer: () => void;
  onStateChange: (state: LogState | null, opts?: { actualMinutes?: number; isBackEntry?: boolean }) => void;
  onOpenCheckIn?: () => void;
  onOpenReview?: () => void;
}

function fmtMins(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const BORDER: Record<LogState, string> = {
  done:   "border-l-[3px] border-l-olive",
  missed: "border-l-[3px] border-l-burgundy",
  rest:   "border-l-[3px] border-l-blue-muted",
};

const BADGE: Record<LogState, string> = {
  done:   "text-olive bg-olive/10",
  missed: "text-burgundy-light bg-burgundy/10",
  rest:   "text-blue-muted bg-blue-muted/10",
};

const LABEL: Record<LogState, string> = {
  done:   "Done",
  missed: "Missed",
  rest:   "Rest",
};

export default function RoutineItemRow({
  item, log, weekLogs, weekDates,
  isExpanded, isBackEntry, selectedDate,
  onToggleExpand, onStartTimer, onStateChange,
  onOpenCheckIn, onOpenReview,
}: Props) {
  const state = log?.state ?? null;
  const [backMins, setBackMins] = useState(String(item.projectedMinutes));

  // Day-of-week for the selected date (0=Sun)
  const dow = new Date(selectedDate + "T12:00:00").getDay();
  const isSunday = dow === 0;
  const isCheckbox = item.itemType === "checkbox";
  const isSpecial = item.itemType === "virtue_checkin" || item.itemType === "weekly_review";
  const variance =
    !isCheckbox && state === "done" && log?.actualMinutes != null
      ? log.actualMinutes - item.projectedMinutes
      : null;

  return (
    <div className={state ? BORDER[state] : ""}>
      {/* Tap row */}
      <button
        onClick={onToggleExpand}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left min-h-[54px] transition-colors ${
          isExpanded ? "bg-card-hover" : ""
        }`}
      >
        <div className="w-7 flex items-center justify-center flex-shrink-0">
          <HabitIcon name={item.icon} size={18} className="text-muted" />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={`font-body text-sm leading-tight ${
              state === "done"
                ? "text-dim line-through"
                : state === "missed"
                ? "text-dim"
                : "text-text"
            }`}
          >
            {item.name}
          </p>
          <div className="mt-1.5">
            <StreakDots logs={weekLogs} dates={weekDates} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {state ? (
            <>
              {variance !== null && (
                <span
                  className={`font-mono text-xs ${
                    variance > 0 ? "text-tobacco" : "text-olive-light"
                  }`}
                >
                  {variance > 0 ? `+${variance}m` : `${variance}m`}
                </span>
              )}
              <span className={`font-mono text-xs px-2 py-0.5 rounded-pill ${BADGE[state]}`}>
                {LABEL[state]}
              </span>
            </>
          ) : isCheckbox ? (
            <span className="font-mono text-dim text-xs">checkbox</span>
          ) : (
            <span className="font-mono text-dim text-xs">{fmtMins(item.projectedMinutes)}</span>
          )}
          <span className="text-dim text-[10px] ml-1">{isExpanded ? "▾" : "▸"}</span>
        </div>
      </button>

      {/* Action panel */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {!state ? (
            <>
              {/* Special item types */}
              {item.itemType === "virtue_checkin" && (
                <button
                  onClick={onOpenCheckIn}
                  className="w-full flex items-center justify-between bg-gold/10 hover:bg-gold/20 border border-gold/30 text-text py-3 px-4 rounded-card transition-colors min-h-[44px]"
                >
                  <span className="font-body text-sm font-medium">✦ Check In</span>
                  <span className="font-mono text-gold text-xs">{fmtMins(item.projectedMinutes)}</span>
                </button>
              )}

              {item.itemType === "weekly_review" && (
                isSunday ? (
                  <button
                    onClick={onOpenReview}
                    className="w-full flex items-center justify-between bg-gold/10 hover:bg-gold/20 border border-gold/30 text-text py-3 px-4 rounded-card transition-colors min-h-[44px]"
                  >
                    <span className="font-body text-sm font-medium">☰ Weekly Review</span>
                    <span className="font-mono text-gold text-xs">{fmtMins(item.projectedMinutes)}</span>
                  </button>
                ) : (
                  <div className="px-4 py-3 rounded-card bg-bg border border-border">
                    <p className="font-mono text-xs text-dim">Sunday habit — skip or rest for today</p>
                  </div>
                )
              )}

              {/* Checkbox: simple done, no timer */}
              {isCheckbox && (
                <button
                  onClick={() => onStateChange("done", { isBackEntry })}
                  className="w-full flex items-center justify-center gap-2 bg-olive/10 hover:bg-olive/20 border border-olive/30 text-text py-3 px-4 rounded-card transition-colors min-h-[44px]"
                >
                  <span className="font-body text-sm font-medium">✓ Done</span>
                </button>
              )}

              {/* Standard: timer or back-entry */}
              {!isSpecial && !isCheckbox && (
                isBackEntry ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onStateChange("done", {
                          actualMinutes: Math.max(1, parseInt(backMins) || item.projectedMinutes),
                          isBackEntry: true,
                        })
                      }
                      className="flex-1 flex items-center justify-center gap-2 bg-olive/10 hover:bg-olive/20 border border-olive/30 text-text py-3 px-4 rounded-card transition-colors min-h-[44px]"
                    >
                      <span className="font-body text-sm font-medium">✓ Done</span>
                    </button>
                    <div className="flex items-center gap-1 bg-bg border border-border rounded-card px-3 py-2 min-h-[44px]">
                      <input
                        type="number"
                        min={1}
                        value={backMins}
                        onChange={(e) => setBackMins(e.target.value)}
                        className="w-10 bg-transparent font-mono text-sm text-text outline-none text-right"
                      />
                      <span className="font-mono text-dim text-xs">m</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={onStartTimer}
                    className="w-full flex items-center justify-between bg-olive/10 hover:bg-olive/20 border border-olive/30 text-text py-3 px-4 rounded-card transition-colors min-h-[44px]"
                  >
                    <span className="font-body text-sm font-medium">▶ Start Timer</span>
                    <span className="font-mono text-olive-light text-xs">{fmtMins(item.projectedMinutes)}</span>
                  </button>
                )
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => onStateChange("missed", { isBackEntry })}
                  className="flex-1 border border-burgundy/40 hover:border-burgundy text-burgundy-light py-2.5 rounded-card text-sm font-body transition-colors min-h-[44px]"
                >
                  ✗ Missed
                </button>
                <button
                  onClick={() => onStateChange("rest", { isBackEntry })}
                  className="flex-1 border border-blue-muted/40 hover:border-blue-muted text-blue-muted py-2.5 rounded-card text-sm font-body transition-colors min-h-[44px]"
                >
                  ~ Rest
                </button>
              </div>
            </>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {state !== "done" && !isSpecial && !isCheckbox && (
                isBackEntry ? (
                  <div className="flex items-center gap-2 flex-1">
                    <button
                      onClick={() =>
                        onStateChange("done", {
                          actualMinutes: Math.max(1, parseInt(backMins) || item.projectedMinutes),
                          isBackEntry: true,
                        })
                      }
                      className="flex-1 border border-olive/40 text-olive py-2.5 rounded-card text-sm font-body min-h-[44px]"
                    >
                      ✓ Done
                    </button>
                    <div className="flex items-center gap-1 bg-bg border border-border rounded-card px-3 py-2 min-h-[44px]">
                      <input
                        type="number"
                        min={1}
                        value={backMins}
                        onChange={(e) => setBackMins(e.target.value)}
                        className="w-10 bg-transparent font-mono text-sm text-text outline-none text-right"
                      />
                      <span className="font-mono text-dim text-xs">m</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={onStartTimer}
                    className="flex-1 border border-olive/40 text-olive py-2.5 rounded-card text-sm font-body min-h-[44px]"
                  >
                    ▶ Retimer
                  </button>
                )
              )}
              {state !== "missed" && (
                <button
                  onClick={() => onStateChange("missed", { isBackEntry })}
                  className="flex-1 border border-burgundy/40 text-burgundy-light py-2.5 rounded-card text-sm font-body min-h-[44px]"
                >
                  ✗ Missed
                </button>
              )}
              {state !== "rest" && (
                <button
                  onClick={() => onStateChange("rest", { isBackEntry })}
                  className="flex-1 border border-blue-muted/40 text-blue-muted py-2.5 rounded-card text-sm font-body min-h-[44px]"
                >
                  ~ Rest
                </button>
              )}
              <button
                onClick={() => onStateChange(null)}
                className="flex-1 border border-border-light text-dim py-2.5 rounded-card text-sm font-body min-h-[44px]"
              >
                Undo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
