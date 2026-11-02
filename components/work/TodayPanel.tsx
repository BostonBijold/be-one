"use client";

import { elapsedSeconds, formatDuration, formatTime, formatTotal } from "@/lib/work/time";
import type { WorkSessionDTO } from "@/lib/work/types";

export default function TodayPanel({
  sessions,
  now,
  onSelect,
  onAddPast,
}: {
  sessions: WorkSessionDTO[];
  now: number;
  onSelect: (session: WorkSessionDTO) => void;
  onAddPast: () => void;
}) {
  // A running row's duration is live; stopped rows use the server's value.
  const seconds = (s: WorkSessionDTO) => (s.endTime ? (s.durationSeconds ?? 0) : elapsedSeconds(s.startTime, now));
  const total = sessions.reduce((sum, s) => sum + seconds(s), 0);
  const breaks = sessions.filter((s) => s.isBreak).reduce((sum, s) => sum + seconds(s), 0);

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-heading text-xl text-text">Today</h2>
        <button onClick={onAddPast} className="min-h-[44px] px-2 -mr-2 font-body text-sm text-gold">
          Add past block
        </button>
      </div>

      {sessions.length === 0 ? (
        <p className="py-3 font-body text-sm text-muted">No sessions yet today.</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {sessions.map((session) => (
            <li key={session._id}>
              <button
                onClick={() => onSelect(session)}
                className="w-full min-h-[44px] py-2 flex items-center gap-3 text-left hover:bg-card-hover transition-colors"
              >
                <span className="font-mono text-sm text-muted whitespace-nowrap">
                  {formatTime(session.startTime)}–
                  {session.endTime ? formatTime(session.endTime) : <span className="text-olive-light">now</span>}
                </span>
                <span className="flex-1 min-w-0 truncate font-body text-sm text-text">
                  {session.label}
                  {session.isBreak && <span className="ml-2 font-mono text-micro text-dim">break</span>}
                </span>
                <span className="font-mono text-sm text-text">{formatDuration(seconds(session))}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 font-mono text-sm">
        <p className="text-text">Total tracked: {formatTotal(total)}</p>
        <p className="text-muted mt-0.5">
          Focus {formatTotal(total - breaks)} · Break {formatTotal(breaks)}
        </p>
      </div>
    </section>
  );
}
