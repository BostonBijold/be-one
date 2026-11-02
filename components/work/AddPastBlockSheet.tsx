"use client";

import { useState } from "react";
import WorkSheet, { workFieldLabelClass, workInputClass } from "@/components/work/WorkSheet";
import { workApi } from "@/lib/work/api";
import { clientTimeZone, localDayKey } from "@/lib/work/time";
import type { WorkCategoryDTO } from "@/lib/work/types";

const CUSTOM = "custom";

export default function AddPastBlockSheet({
  categories,
  onClose,
  onChanged,
}: {
  categories: WorkCategoryDTO[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [categoryChoice, setCategoryChoice] = useState(categories[0]?._id ?? CUSTOM);
  const [label, setLabel] = useState("");
  const [date, setDate] = useState(() => localDayKey(new Date()));
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!date || !start || !end) return setError("Enter a date, start time, and end time.");
    setSaving(true);
    setError(null);
    try {
      await workApi("/sessions", "POST", {
        ...(categoryChoice === CUSTOM ? { label } : { categoryId: categoryChoice }),
        startTime: new Date(`${date}T${start}`).toISOString(),
        endTime: new Date(`${date}T${end}`).toISOString(),
        timeZone: clientTimeZone(),
      });
      onChanged();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <WorkSheet title="Add past block" onClose={onClose}>
      <div>
        <label htmlFor="work-past-category" className={workFieldLabelClass}>Category</label>
        <select
          id="work-past-category"
          value={categoryChoice}
          onChange={(e) => setCategoryChoice(e.target.value)}
          className={workInputClass}
        >
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.label}</option>
          ))}
          <option value={CUSTOM}>Type a label</option>
        </select>
      </div>
      {categoryChoice === CUSTOM && (
        <div>
          <label htmlFor="work-past-label" className={workFieldLabelClass}>Label</label>
          <input
            id="work-past-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            className={workInputClass}
          />
        </div>
      )}
      <div>
        <label htmlFor="work-past-date" className={workFieldLabelClass}>Date</label>
        <input
          id="work-past-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`${workInputClass} font-mono`}
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <label htmlFor="work-past-start" className={workFieldLabelClass}>Start</label>
          <input
            id="work-past-start"
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={`${workInputClass} font-mono`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <label htmlFor="work-past-end" className={workFieldLabelClass}>End</label>
          <input
            id="work-past-end"
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={`${workInputClass} font-mono`}
          />
        </div>
      </div>

      {error && <p role="alert" className="font-body text-sm text-burgundy-light">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="w-full min-h-[44px] py-3 rounded-lg bg-olive text-bg font-body font-medium text-sm disabled:opacity-60"
      >
        Add block
      </button>
    </WorkSheet>
  );
}
