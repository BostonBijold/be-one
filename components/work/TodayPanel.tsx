"use client";

import { useEffect, useRef } from "react";
import { formatDuration, formatTime, formatTotal, sessionSeconds } from "@/lib/work/time";
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
  const total = sessions.reduce((sum, s) => sum + sessionSeconds(s, now), 0);
  const breaks = sessions.filter((s) => s.isBreak).reduce((sum, s) => sum + sessionSeconds(s, now), 0);

  // The list scrolls on its own at lg, and the newest session is at the bottom.
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [sessions.length]);

  return (
    <section className="lg:h-full lg:flex lg:flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-heading text-xl text-text">Today</h2>
        <button onClick={onAddPast} className="min-h-[44px] px-2 -mr-2 font-body text-sm text-gold">
          Add past block
        </button>
      </div>

      {sessions.length === 0 ? (
        <p className="py-3 text-center font-body text-sm text-muted">No sessions yet today.</p>
      ) : (
        <ul ref={listRef} className="divide-y divide-border border-y border-border lg:min-h-0 lg:overflow-y-auto">
          {sessions.map((session) => (
            <li key={session._id}>
              <button
                onClick={() => onSelect(session)}
                className="w-full min-h-[44px] py-2 flex items-center gap-3 text-left touch-manipulation [@media(hover:hover)]:hover:bg-card-hover active:bg-card-hover transition-colors"
              >
                <span className="font-mono text-sm text-muted whitespace-nowrap">
                  {formatTime(session.startTime)}–
                  {session.endTime ? formatTime(session.endTime) : <span className="text-olive-light">now</span>}
                </span>
                <span className="flex-1 min-w-0 truncate font-body text-sm text-text">
                  {session.label}
                  {session.isBreak && <span className="ml-2 font-mono text-micro text-dim">break</span>}
                </span>
                <span className="pr-1 font-mono text-sm text-text">{formatDuration(sessionSeconds(session, now))}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 text-center font-mono text-sm">
        <p className="text-text">Total tracked: {formatTotal(total)}</p>
        <p className="text-muted mt-0.5">
          Focus {formatTotal(total - breaks)} · Break {formatTotal(breaks)}
        </p>
      </div>
    </section>
  );
}
