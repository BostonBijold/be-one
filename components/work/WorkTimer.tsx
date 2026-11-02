"use client";

import { elapsedSeconds, formatClock, formatOver } from "@/lib/work/time";
import type { WorkSessionDTO } from "@/lib/work/types";

const STOPWATCH_SOFT_CAP = 30 * 60; // ring fills over 30 minutes, stays full after
const R = 88;
const CIRCUMFERENCE = 2 * Math.PI * R;

// Same ring behavior as TimerScreen, copied rather than imported (R4), with
// tokens in place of its hardcoded colors.
function ringState(elapsed: number, targetSeconds: number | null) {
  if (targetSeconds === null) {
    return { ratio: Math.min(elapsed / STOPWATCH_SOFT_CAP, 1), stroke: "stroke-olive", fill: "fill-olive", isOver: false };
  }
  const ratio = elapsed / targetSeconds;
  if (ratio >= 1) return { ratio: 1, stroke: "stroke-burgundy", fill: "fill-burgundy", isOver: true };
  if (ratio >= 0.75) return { ratio, stroke: "stroke-amber", fill: "fill-amber", isOver: false };
  return { ratio, stroke: "stroke-olive", fill: "fill-olive", isOver: false };
}

export default function WorkTimer({
  session,
  targetMinutes,
  now,
}: {
  session: WorkSessionDTO | null;
  targetMinutes: number | null;
  now: number;
}) {
  const elapsed = session ? elapsedSeconds(session.startTime, now) : 0;
  const targetSeconds = session && targetMinutes ? targetMinutes * 60 : null;
  const { ratio, stroke, fill, isOver } = ringState(elapsed, targetSeconds);

  const caption = !session
    ? "idle"
    : isOver
      ? "over target"
      : targetMinutes
        ? `of ${targetMinutes}m target`
        : "elapsed";

  return (
    <div className="relative w-56 h-56 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r={R} fill="none" strokeWidth="10" className="stroke-border" />
        {session && (
          <>
            <circle
              cx="100"
              cy="100"
              r={R}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
              className={stroke}
              style={{ transition: "stroke-dashoffset 0.95s linear, stroke 0.4s ease" }}
            />
            <circle
              cx={100 + R * Math.cos(ratio * 2 * Math.PI)}
              cy={100 + R * Math.sin(ratio * 2 * Math.PI)}
              r={9}
              className={fill}
            />
          </>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span
          className={`font-mono text-[2rem] font-semibold leading-none ${isOver ? "text-burgundy-light" : "text-text"}`}
          role="timer"
        >
          {isOver && targetSeconds !== null ? formatOver(elapsed - targetSeconds) : formatClock(elapsed)}
        </span>
        <span className="font-mono text-xs text-muted mt-1">{caption}</span>
      </div>
    </div>
  );
}
