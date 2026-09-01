"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Pencil } from "lucide-react";
import HabitIcon from "@/components/HabitIcon";

export interface TimerItem {
  _id: string;
  name: string;
  icon: string;
  projectedMinutes: number;
  itemType?: string;
}

interface Props {
  item: TimerItem;
  initialElapsed?: number; // seconds already elapsed (from server startedAt on resume)
  // elapsedOverrideSeconds is only set once the user has manually edited the
  // time via the pencil control below — lets the caller re-derive startedAt
  // from that corrected value instead of trusting the server's own timer,
  // which has no way to know about a manual correction.
  onComplete: (actualMinutes: number, elapsedOverrideSeconds?: number) => void;
  onMissed: () => void;
  onClose: () => void;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

const STOPWATCH_SOFT_CAP = 30 * 60; // ring fills over 30 minutes, stays full after

export default function TimerScreen({ item, initialElapsed = 0, onComplete, onMissed, onClose }: Props) {
  const isStopwatch = item.itemType === "stopwatch";

  const [elapsed, setElapsed] = useState(initialElapsed);
  const [isRunning, setIsRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // elapsed is derived from real wall-clock time, not from counting interval ticks —
  // ticks get throttled/suspended when the PWA is backgrounded or the screen locks,
  // so a naive "+1 every 1000ms" counter silently loses however long you were away.
  // baseElapsedRef = seconds banked before the current running segment started.
  // runStartRef = Date.now() when the current running segment began (null if paused).
  const baseElapsedRef = useRef(initialElapsed);
  const runStartRef = useRef<number | null>(null);

  // Manual correction for elapsed time — needed because the server's own
  // record of startedAt keeps ticking through any local Pause (Pause only
  // stops this screen's own display, it never tells the server), so a
  // habit paused mid-timer would otherwise log more time than was actually
  // spent. Editing here sets the visible/local elapsed directly and, once
  // used at least once, tells the caller to derive startedAt from this
  // corrected value on completion instead of trusting the server's clock.
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editMinutes, setEditMinutes] = useState("0");
  const [editSeconds, setEditSeconds] = useState("00");
  const wasEditedRef = useRef(false);

  const openTimeEditor = useCallback(() => {
    setEditMinutes(String(Math.floor(elapsed / 60)));
    setEditSeconds(String(elapsed % 60).padStart(2, "0"));
    setIsEditingTime(true);
  }, [elapsed]);

  const saveTimeEdit = useCallback(() => {
    const mins = Math.max(0, Math.floor(Number(editMinutes)) || 0);
    const secs = Math.min(59, Math.max(0, Math.floor(Number(editSeconds)) || 0));
    const next = mins * 60 + secs;
    baseElapsedRef.current = next;
    runStartRef.current = isRunning ? Date.now() : null;
    setElapsed(next);
    wasEditedRef.current = true;
    setIsEditingTime(false);
  }, [editMinutes, editSeconds, isRunning]);

  const recompute = useCallback(() => {
    if (runStartRef.current != null) {
      const delta = Math.floor((Date.now() - runStartRef.current) / 1000);
      setElapsed(baseElapsedRef.current + delta);
    }
  }, []);

  useEffect(() => {
    if (isRunning) {
      runStartRef.current = Date.now();
      recompute();
      intervalRef.current = setInterval(recompute, 1000);
    } else {
      if (runStartRef.current != null) {
        baseElapsedRef.current += Math.floor((Date.now() - runStartRef.current) / 1000);
        runStartRef.current = null;
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, recompute]);

  // Force an immediate resync the moment the app comes back to the foreground —
  // don't wait for the next 1s tick to correct the frozen display.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") recompute();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, [recompute]);

  const actualMinutes = Math.max(1, Math.round(elapsed / 60));
  const handleComplete = () => onComplete(actualMinutes, wasEditedRef.current ? elapsed : undefined);

  // Inline mm/ss editor, dropped in place of the "remaining"/"over
  // target"/"elapsed" caption under the ring in both modes below.
  const timeEditor = isEditingTime ? (
    <div className="flex items-center justify-center gap-2 mt-1">
      <input
        type="number"
        inputMode="numeric"
        value={editMinutes}
        onChange={(e) => setEditMinutes(e.target.value)}
        className="w-12 py-1 rounded bg-card border border-border-light text-center font-mono text-sm text-text"
        aria-label="Minutes"
      />
      <span className="font-mono text-dim text-sm">m</span>
      <input
        type="number"
        inputMode="numeric"
        value={editSeconds}
        onChange={(e) => setEditSeconds(e.target.value)}
        className="w-12 py-1 rounded bg-card border border-border-light text-center font-mono text-sm text-text"
        aria-label="Seconds"
      />
      <span className="font-mono text-dim text-sm">s</span>
      <button onClick={saveTimeEdit} className="ml-1 font-mono text-olive-light text-xs px-2 py-1 min-h-[32px]">
        Save
      </button>
      <button onClick={() => setIsEditingTime(false)} className="font-mono text-dim text-xs px-2 py-1 min-h-[32px]">
        Cancel
      </button>
    </div>
  ) : (
    <button
      onClick={openTimeEditor}
      className="flex items-center gap-1 mt-1 mx-auto font-mono text-xs text-dim min-h-[32px] px-2"
      aria-label="Edit elapsed time"
    >
      <Pencil size={11} />
      edit time
    </button>
  );

  // ── Countdown mode ───────────────────────────────────────────────────────────
  if (!isStopwatch) {
    const target = item.projectedMinutes * 60;
    const isOver = elapsed >= target && target > 0;
    const ratio = target > 0 ? elapsed / target : 0;
    const is75 = ratio >= 0.75;
    const r = 88;
    const circumference = 2 * Math.PI * r;
    const dashOffset = circumference * (1 - Math.min(ratio, 1));
    const ringColor = isOver ? "#7a2e2e" : is75 ? "#c47a2a" : "#5a6b35";
    const timeColor = isOver ? "#a03a3a" : "#e8e0cc";
    const remaining = Math.max(0, target - elapsed);
    const overAmount = Math.max(0, elapsed - target);
    const timeDisplay = isOver
      ? `+${pad(Math.floor(overAmount / 60))}:${pad(overAmount % 60)}`
      : `${pad(Math.floor(remaining / 60))}:${pad(remaining % 60)}`;

    return (
      <div className="fixed inset-0 bg-bg z-50 flex flex-col max-w-mobile mx-auto">
        <div className="flex items-center justify-between px-4 pt-10 pb-2">
          <button onClick={onClose} className="font-mono text-dim text-sm min-h-[44px] pr-4 flex items-center">
            ← back
          </button>
          <div className="text-right">
            <p className="font-mono text-dim text-[10px] uppercase tracking-wider">target</p>
            <p className="font-mono text-muted text-sm">{item.projectedMinutes}m</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col select-none">
          <div className="text-center px-4 mt-6">
            <div className="flex justify-center mb-3">
              <HabitIcon name={item.icon} size={44} strokeWidth={1.25} className="text-text" />
            </div>
            <h2 className="font-heading text-2xl text-text">{item.name}</h2>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-56 h-56">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r={r} fill="none" stroke="#2e2c22" strokeWidth="10" />
                <circle
                  cx="100" cy="100" r={r}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{ transition: "stroke-dashoffset 0.95s linear, stroke 0.4s ease" }}
                />
                {/* Handle at the arc's tip — purely visual */}
                <circle
                  cx={100 + r * Math.cos(Math.min(ratio, 1) * 2 * Math.PI)}
                  cy={100 + r * Math.sin(Math.min(ratio, 1) * 2 * Math.PI)}
                  r={9}
                  fill={ringColor}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <span className="font-mono text-[2.5rem] font-semibold leading-none" style={{ color: timeColor }}>
                  {timeDisplay}
                </span>
                <span className="font-mono text-xs text-dim mt-1">
                  {isOver ? "over target" : "remaining"}
                </span>
              </div>
            </div>
          </div>

          {timeEditor}
        </div>

        <div className="px-4 pb-12 space-y-3 w-full">
          <button
            onClick={handleComplete}
            className="w-full py-4 rounded-card bg-olive text-text font-body font-medium text-base"
          >
            Done · log {actualMinutes}m
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => setIsRunning((r) => !r)}
              className="flex-1 py-3.5 rounded-card border border-border-light text-muted font-body text-sm min-h-[44px]"
            >
              {isRunning ? "Pause" : "Resume"}
            </button>
            <button
              onClick={onMissed}
              className="flex-1 py-3.5 rounded-card border border-burgundy/30 text-burgundy-light font-body text-sm min-h-[44px]"
            >
              Missed it
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Stopwatch mode ───────────────────────────────────────────────────────────
  const r = 88;
  const circumference = 2 * Math.PI * r;
  const ratio = Math.min(elapsed / STOPWATCH_SOFT_CAP, 1);
  const dashOffset = circumference * (1 - ratio);
  const timeDisplay = `${pad(Math.floor(elapsed / 60))}:${pad(elapsed % 60)}`;

  return (
    <div className="fixed inset-0 bg-bg z-50 flex flex-col max-w-mobile mx-auto">
      <div className="flex items-center justify-between px-4 pt-10 pb-2">
        <button onClick={onClose} className="font-mono text-dim text-sm min-h-[44px] pr-4 flex items-center">
          ← back
        </button>
        <div className="text-right">
          <p className="font-mono text-dim text-[10px] uppercase tracking-wider">stopwatch</p>
          <p className="font-mono text-muted text-sm">no target</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col select-none">
        <div className="text-center px-4 mt-6">
          <div className="flex justify-center mb-3">
            <HabitIcon name={item.icon} size={44} strokeWidth={1.25} className="text-text" />
          </div>
          <h2 className="font-heading text-2xl text-text">{item.name}</h2>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-56 h-56">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r={r} fill="none" stroke="#2e2c22" strokeWidth="10" />
              <circle
                cx="100" cy="100" r={r}
                fill="none"
                stroke="#5a6b35"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 0.95s linear" }}
              />
              {/* Handle at the arc's tip — purely visual */}
              <circle
                cx={100 + r * Math.cos(ratio * 2 * Math.PI)}
                cy={100 + r * Math.sin(ratio * 2 * Math.PI)}
                r={9}
                fill="#5a6b35"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <span className="font-mono text-[2.5rem] font-semibold leading-none text-text">
                {timeDisplay}
              </span>
              <span className="font-mono text-xs text-dim mt-1">elapsed</span>
            </div>
          </div>
        </div>

        {timeEditor}
      </div>

      <div className="px-4 pb-12 space-y-3 w-full">
        <button
          onClick={handleComplete}
          className="w-full py-4 rounded-card bg-olive text-text font-body font-medium text-base"
        >
          Done · log {actualMinutes}m
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => setIsRunning((r) => !r)}
            className="flex-1 py-3.5 rounded-card border border-border-light text-muted font-body text-sm min-h-[44px]"
          >
            {isRunning ? "Pause" : "Resume"}
          </button>
          <button
            onClick={onMissed}
            className="flex-1 py-3.5 rounded-card border border-burgundy/30 text-burgundy-light font-body text-sm min-h-[44px]"
          >
            Missed it
          </button>
        </div>
      </div>
    </div>
  );
}
