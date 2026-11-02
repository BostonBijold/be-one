"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { workFieldLabelClass, workInputClass } from "@/components/work/WorkSheet";
import type { CategoryColor, StartTarget, WorkCategoryDTO } from "@/lib/work/types";

// Complete literal class names: Tailwind can't detect a constructed `bg-${color}`.
const COLOR_CLASSES: Record<CategoryColor, { bar: string; activeBorder: string }> = {
  olive: { bar: "bg-olive", activeBorder: "border-olive" },
  "olive-light": { bar: "bg-olive-light", activeBorder: "border-olive-light" },
  gold: { bar: "bg-gold", activeBorder: "border-gold" },
  muted: { bar: "bg-muted", activeBorder: "border-muted" },
  dim: { bar: "bg-dim", activeBorder: "border-dim" },
};
const NEUTRAL_CLASSES = { bar: "bg-border-light", activeBorder: "border-muted" };

export default function CategoryGrid({
  categories,
  activeCategoryId,
  onStart,
}: {
  categories: WorkCategoryDTO[];
  activeCategoryId: string | null;
  onStart: (target: StartTarget) => void;
}) {
  const [customLabel, setCustomLabel] = useState("");
  const customInputRef = useRef<HTMLInputElement>(null);

  function submitCustom(e: React.FormEvent) {
    e.preventDefault();
    const label = customLabel.trim();
    if (!label) return;
    onStart({ label });
    setCustomLabel("");
  }

  return (
    <section>
      <h2 className="font-heading text-xl text-text mb-3">Categories</h2>
      <div className="grid grid-cols-3 gap-2">
        {categories.map((category) => {
          const colors = category.color ? COLOR_CLASSES[category.color] : NEUTRAL_CLASSES;
          const isActive = category._id === activeCategoryId;
          return (
            <button
              key={category._id}
              onClick={() => onStart({ categoryId: category._id })}
              aria-pressed={isActive}
              className={`relative overflow-hidden min-h-[68px] px-2.5 pt-3.5 pb-2.5 rounded-lg border bg-card hover:bg-card-hover text-left font-body text-sm leading-snug text-text transition-colors ${
                isActive ? colors.activeBorder : "border-border"
              }`}
            >
              <span className={`absolute top-0 left-0 right-0 h-1 ${colors.bar}`} aria-hidden="true" />
              {category.label}
            </button>
          );
        })}
        <button
          onClick={() => customInputRef.current?.focus()}
          className="min-h-[68px] px-2.5 py-2.5 rounded-lg border border-dashed border-border-light hover:bg-card-hover font-body text-sm text-muted flex items-center justify-center gap-1 transition-colors"
        >
          <Plus size={14} aria-hidden="true" />
          Custom
        </button>
      </div>

      <form onSubmit={submitCustom} className="mt-4">
        <label htmlFor="work-custom-label" className={workFieldLabelClass}>
          Add your own
        </label>
        <input
          id="work-custom-label"
          ref={customInputRef}
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          placeholder="Label, then Enter"
          maxLength={80}
          enterKeyHint="go"
          autoComplete="off"
          className={workInputClass}
        />
      </form>
    </section>
  );
}
