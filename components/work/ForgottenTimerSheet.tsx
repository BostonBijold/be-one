"use client";

import { useState } from "react";
import WorkSheet, { workFieldLabelClass, workInputClass } from "@/components/work/WorkSheet";
import { toLocalInput } from "@/lib/work/time";
import type { WorkSessionDTO } from "@/lib/work/types";

export default function ForgottenTimerSheet({
  session,
  now,
  onStopNow,
  onSetEndTime,
  onKeepRunning,
}: {
  session: WorkSessionDTO;
  now: number;
  onStopNow: () => void;
  onSetEndTime: (endTimeIso: string) => void;
  onKeepRunning: () => void;
}) {
  const [settingEnd, setSettingEnd] = useState(false);
  const [end, setEnd] = useState(() => toLocalInput(new Date(now)));
  const [error, setError] = useState<string | null>(null);
  const hours = Math.floor((now - new Date(session.startTime).getTime()) / 3_600_000);

  function submitEnd() {
    if (!end) return setError("Enter an end time.");
    const endTime = new Date(end);
    if (endTime.getTime() <= new Date(session.startTime).getTime()) {
      return setError("End time must be after the session started.");
    }
    if (endTime.getTime() > Date.now()) return setError("End time can't be in the future.");
    onSetEndTime(endTime.toISOString());
  }

  return (
    <WorkSheet title="Still running?" onClose={onKeepRunning}>
      <p className="font-body text-sm text-text">
        This session has been running for {hours} hours.
        <span className="block mt-1 font-mono text-muted">{session.label}</span>
      </p>

      {settingEnd ? (
        <>
          <div>
            <label htmlFor="work-forgotten-end" className={workFieldLabelClass}>End time</label>
            <input
              id="work-forgotten-end"
              type="datetime-local"
              value={end}
              min={toLocalInput(session.startTime)}
              max={toLocalInput(new Date(now))}
              onChange={(e) => setEnd(e.target.value)}
              className={`${workInputClass} font-mono`}
            />
          </div>
          {error && <p role="alert" className="font-body text-sm text-burgundy-light">{error}</p>}
          <button
            onClick={submitEnd}
            className="w-full min-h-[44px] py-3 rounded-lg bg-olive text-bg font-body font-medium text-sm"
          >
            Save end time
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onStopNow}
            className="w-full min-h-[44px] py-3 rounded-lg bg-olive text-bg font-body font-medium text-sm"
          >
            Stop now
          </button>
          <button
            onClick={() => setSettingEnd(true)}
            className="w-full min-h-[44px] rounded-lg border border-border-light text-text font-body text-sm"
          >
            Set end time
          </button>
        </>
      )}

      <button onClick={onKeepRunning} className="w-full min-h-[44px] font-body text-sm text-muted">
        Keep running
      </button>
    </WorkSheet>
  );
}
