"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import ArchivedCategoriesSheet from "@/components/work/ArchivedCategoriesSheet";
import CategorySheet from "@/components/work/CategorySheet";
import { colorClasses } from "@/components/work/categoryColors";
import { workFieldLabelClass, workInputClass } from "@/components/work/WorkSheet";
import type { StartTarget, WorkCategoryDTO } from "@/lib/work/types";

export default function CategoryGrid({
  categories,
  activeCategoryId,
  onStart,
  onChanged,
}: {
  categories: WorkCategoryDTO[]; // including archived
  activeCategoryId: string | null;
  onStart: (target: StartTarget) => void;
  onChanged: () => void;
}) {
  const [oneOffLabel, setOneOffLabel] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [sheet, setSheet] = useState<WorkCategoryDTO | "new" | "archived" | null>(null);

  const visible = categories.filter((c) => !c.archived);
  const archived = categories.filter((c) => c.archived);

  function submitOneOff(e: React.FormEvent) {
    e.preventDefault();
    const label = oneOffLabel.trim();
    if (!label) return;
    onStart({ label });
    setOneOffLabel("");
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-heading text-xl text-text">Categories</h2>
        <button
          onClick={() => setIsEditing((editing) => !editing)}
          className="min-h-[44px] px-2 -mr-2 font-body text-sm text-gold"
        >
          {isEditing ? "Done" : "Edit"}
        </button>
      </div>

      {isEditing && <p className="mb-2 font-body text-sm text-muted">Tap a button to change or archive it.</p>}

      <div className="grid grid-cols-3 gap-2">
        {visible.map((category) => {
          const colors = colorClasses(category.color);
          const isActive = category._id === activeCategoryId;
          return (
            <button
              key={category._id}
              onClick={() => (isEditing ? setSheet(category) : onStart({ categoryId: category._id }))}
              aria-pressed={isEditing ? undefined : isActive}
              className={`relative overflow-hidden min-h-[68px] px-2.5 pt-3.5 pb-2.5 rounded-lg border bg-card hover:bg-card-hover text-left font-body text-sm leading-snug text-text transition-colors ${
                isActive ? colors.activeBorder : isEditing ? "border-border-light border-dashed" : "border-border"
              }`}
            >
              <span className={`absolute top-0 left-0 right-0 h-1 ${colors.bar}`} aria-hidden="true" />
              <span className="line-clamp-3 break-words">{category.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setSheet("new")}
          className="min-h-[68px] px-2.5 py-2.5 rounded-lg border border-dashed border-border-light hover:bg-card-hover font-body text-sm text-muted flex items-center justify-center gap-1 transition-colors"
        >
          <Plus size={14} aria-hidden="true" />
          New
        </button>
      </div>

      {isEditing && (
        <button
          onClick={() => setSheet("archived")}
          className="mt-2 min-h-[44px] pr-2 font-body text-sm text-muted"
        >
          Archived ({archived.length})
        </button>
      )}

      <form onSubmit={submitOneOff} className="mt-4">
        <label htmlFor="work-one-off-label" className={workFieldLabelClass}>
          One-off session
        </label>
        <input
          id="work-one-off-label"
          value={oneOffLabel}
          onChange={(e) => setOneOffLabel(e.target.value)}
          placeholder="Label, then Enter"
          maxLength={80}
          enterKeyHint="go"
          autoComplete="off"
          className={workInputClass}
        />
      </form>

      {sheet === "archived" ? (
        <ArchivedCategoriesSheet categories={archived} onClose={() => setSheet(null)} onChanged={onChanged} />
      ) : (
        sheet && (
          <CategorySheet
            key={sheet === "new" ? "new" : sheet._id}
            category={sheet === "new" ? null : sheet}
            onClose={() => setSheet(null)}
            onChanged={onChanged}
          />
        )
      )}
    </section>
  );
}
