"use client";

import { useState, useEffect, useRef } from "react";

export interface TimerItem {
  _id: string;
  name: string;
  icon: string;
  projectedMinutes: number;
}

interface Props {
  item: TimerItem;
  onComplete: (actualMinutes: number) => void;
  onMissed: () => void;
  onClose: () => void;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function TimerScreen({ item, onComplete, onMissed, onClose }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const target = item.projectedMinutes * 60;

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const isOver = elapsed >= target && target > 0;
  const ratio = target > 0 ? elapsed / target : 0;
  const is75 = ratio >= 0.75;

  const r = 88;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - Math.min(ratio, 1));

  // olive → amber at 75% → burgundy at 100%
  const ringColor = isOver ? "#7a2e2e" : is75 ? "#c47a2a" : "#5a6b35";
  const timeColor = isOver ? "#a03a3a" : "#e8e0cc";

  const remaining = Math.max(0, target - elapsed);
  const overAmount = Math.max(0, elapsed - target);
  const timeDisplay = isOver
    ? `+${pad(Math.floor(overAmount / 60))}:${pad(overAmount % 60)}`
    : `${pad(Math.floor(remaining / 60))}:${pad(remaining % 60)}`;

  const actualMinutes = Math.max(1, Math.round(elapsed / 60));

  return (
    <div className="fixed inset-0 bg-bg z-50 flex flex-col max-w-mobile mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-10 pb-2">
        <button
          onClick={onClose}
          className="font-mono text-dim text-sm min-h-[44px] pr-4 flex items-center"
        >
          ← back
        </button>
        <div className="text-right">
          <p className="font-mono text-dim text-[10px] uppercase tracking-wider">target</p>
          <p className="font-mono text-muted text-sm">{item.projectedMinutes}m</p>
        </div>
      </div>

      {/* Item */}
      <div className="text-center px-4 mt-6">
        <span className="text-5xl block mb-3 leading-none">{item.icon}</span>
        <h2 className="font-heading text-2xl text-text">{item.name}</h2>
      </div>

      {/* Ring */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-56 h-56">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            {/* Track */}
            <circle cx="100" cy="100" r={r} fill="none" stroke="#2e2c22" strokeWidth="10" />
            {/* Progress */}
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

      {/* Controls */}
      <div className="px-4 pb-12 space-y-3 w-full">
        <button
          onClick={() => onComplete(actualMinutes)}
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
