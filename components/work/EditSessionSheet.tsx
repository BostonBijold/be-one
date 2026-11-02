"use client";

import { useState } from "react";
import WorkSheet, { workFieldLabelClass, workInputClass } from "@/components/work/WorkSheet";
import { workApi } from "@/lib/work/api";
import { toLocalInput } from "@/lib/work/time";
import type { WorkSessionDTO } from "@/lib/work/types";

export default function EditSessionSheet({
  session,
  onClose,
  onChanged,
}: {
  session: WorkSessionDTO;
  onClose: () => void;
  onChanged: () => void;
}) {
  const isRunning = !session.endTime;
  const initialStart = toLocalInput(session.startTime);
  const initialEnd = session.endTime ? toLocalInput(session.endTime) : "";

  const [label, setLabel] = useState(session.label);
  const [notes, setNotes] = useState(session.notes ?? "");
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function save() {
    // Only changed fields: the inputs have minute precision, so resending an
    // untouched time would silently drop its seconds.
    const body: Record<string, string> = {};
    if (label !== session.label) body.label = label;
    if (notes !== (session.notes ?? "")) body.notes = notes;
    if (start !== initialStart) {
      if (!start) return setError("Enter a start time.");
      body.startTime = new Date(start).toISOString();
    }
    if (!isRunning && end !== initialEnd) {
      if (!end) return setError("Enter an end time.");
      body.endTime = new Date(end).toISOString();
    }
    if (Object.keys(body).length === 0) return onClose();

    setSaving(true);
    setError(null);
    try {
      await workApi(`/sessions/${session._id}`, "PATCH", body);
      onChanged();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setError(null);
    try {
      await workApi(`/sessions/${session._id}`, "DELETE");
      onChanged();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <WorkSheet title="Edit session" onClose={onClose}>
      <div>
        <label htmlFor="work-edit-label" className={workFieldLabelClass}>Label</label>
        <input
          id="work-edit-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={80}
          className={workInputClass}
        />
      </div>
      <div>
        <label htmlFor="work-edit-start" className={workFieldLabelClass}>Start</label>
        <input
          id="work-edit-start"
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className={`${workInputClass} font-mono`}
        />
      </div>
      {isRunning ? (
        <p className="font-mono text-sm text-muted">Still running. Stop it to set an end time.</p>
      ) : (
        <div>
          <label htmlFor="work-edit-end" className={workFieldLabelClass}>End</label>
          <input
            id="work-edit-end"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={`${workInputClass} font-mono`}
          />
        </div>
      )}
      <div>
        <label htmlFor="work-edit-notes" className={workFieldLabelClass}>Notes</label>
        <textarea
          id="work-edit-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={workInputClass}
        />
      </div>

      {error && <p role="alert" className="font-body text-sm text-burgundy-light">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="w-full min-h-[44px] py-3 rounded-lg bg-olive text-bg font-body font-medium text-sm disabled:opacity-60"
      >
        Save
      </button>

      {confirmingDelete ? (
        <div className="flex gap-3">
          <button
            onClick={() => setConfirmingDelete(false)}
            className="flex-1 min-h-[44px] rounded-lg border border-border-light text-muted font-body text-sm"
          >
            Keep it
          </button>
          <button
            onClick={remove}
            disabled={saving}
            className="flex-1 min-h-[44px] rounded-lg bg-burgundy text-text font-body text-sm disabled:opacity-60"
          >
            Delete session
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmingDelete(true)}
          className="w-full min-h-[44px] rounded-lg border border-burgundy/30 text-burgundy-light font-body text-sm"
        >
          Delete
        </button>
      )}
    </WorkSheet>
  );
}
