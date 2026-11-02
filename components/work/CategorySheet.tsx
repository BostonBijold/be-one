"use client";

import { useState } from "react";
import { COLOR_OPTIONS, colorClasses } from "@/components/work/categoryColors";
import WorkSheet, { workFieldLabelClass, workInputClass } from "@/components/work/WorkSheet";
import { workApi } from "@/lib/work/api";
import type { CategoryColor, WorkCategoryDTO } from "@/lib/work/types";

// Creates a category, or edits and archives an existing one.
export default function CategorySheet({
  category,
  onClose,
  onChanged,
}: {
  category: WorkCategoryDTO | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [label, setLabel] = useState(category?.label ?? "");
  const [color, setColor] = useState<CategoryColor | null>(category?.color ?? null);
  const [isBreak, setIsBreak] = useState(category?.isBreak ?? false);
  const [target, setTarget] = useState(category?.defaultDurationMin?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(path: string, method: string, body: unknown) {
    setSaving(true);
    setError(null);
    try {
      await workApi(path, method, body);
      onChanged();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  function save() {
    const defaultDurationMin = target.trim() === "" ? null : Number(target);
    const body = { label, color, isBreak, defaultDurationMin };
    if (category) send(`/categories/${category._id}`, "PATCH", body);
    else send("/categories", "POST", body);
  }

  return (
    <WorkSheet title={category ? "Edit button" : "New button"} onClose={onClose}>
      <div>
        <label htmlFor="work-category-label" className={workFieldLabelClass}>Label</label>
        <input
          id="work-category-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={80}
          autoComplete="off"
          className={workInputClass}
        />
      </div>

      <div>
        <span className={workFieldLabelClass}>Color</span>
        <div className="flex gap-1" role="group" aria-label="Color">
          {COLOR_OPTIONS.map((option) => {
            const selected = option.value === color;
            return (
              <button
                key={option.name}
                type="button"
                onClick={() => setColor(option.value)}
                aria-label={option.name}
                aria-pressed={selected}
                className={`flex-1 h-11 rounded-lg border flex items-center justify-center ${
                  selected ? "border-text" : "border-transparent"
                }`}
              >
                <span className={`w-6 h-6 rounded-full ${colorClasses(option.value).bar}`} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="work-category-target" className={workFieldLabelClass}>Target minutes (optional)</label>
        <input
          id="work-category-target"
          type="number"
          inputMode="numeric"
          min={1}
          max={1440}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className={`${workInputClass} font-mono`}
        />
      </div>

      <label className="flex items-center gap-3 min-h-[44px] font-body text-sm text-text">
        <input
          type="checkbox"
          checked={isBreak}
          onChange={(e) => setIsBreak(e.target.checked)}
          className="w-5 h-5 accent-olive"
        />
        Counts as a break, not focus time
      </label>

      {error && <p role="alert" className="font-body text-sm text-burgundy-light">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="w-full min-h-[44px] py-3 rounded-lg bg-olive text-bg font-body font-medium text-sm disabled:opacity-60"
      >
        {category ? "Save" : "Add button"}
      </button>

      {category && (
        <button
          onClick={() => send(`/categories/${category._id}`, "PATCH", { archived: true })}
          disabled={saving}
          className="w-full min-h-[44px] rounded-lg border border-border-light text-muted font-body text-sm disabled:opacity-60"
        >
          Archive
        </button>
      )}
    </WorkSheet>
  );
}
