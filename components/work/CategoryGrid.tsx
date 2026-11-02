"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import ArchivedCategoriesSheet from "@/components/work/ArchivedCategoriesSheet";
import CategorySheet from "@/components/work/CategorySheet";
import { colorClasses } from "@/components/work/categoryColors";
import { workInputClass } from "@/components/work/WorkSheet";
import { formatDuration, sessionSeconds } from "@/lib/work/time";
import type { StartTarget, WorkCategoryDTO, WorkSessionDTO } from "@/lib/work/types";

// Built for fingers: big targets, no long-press text selection, no double-tap
// zoom delay. Widths are three or four to a row less the gaps, with a sliver
// spare so subpixel rounding can't push the last one onto the next row. A wrap
// layout rather than a CSS grid, so a short last row can be centered.
const TILE_CLASS =
  "w-[calc((100%-1rem-0.4px)/3)] md:w-[calc((100%-2.25rem-0.4px)/4)] min-h-[76px] md:min-h-[88px] py-2 rounded-lg flex flex-col items-center justify-center select-none touch-manipulation [-webkit-tap-highlight-color:transparent] transition-colors";
// Hover only where a real pointer exists: on touch screens, hover styles stick
// to whatever was tapped last.
const TILE_PRESS_CLASS = "[@media(hover:hover)]:hover:bg-card-hover active:bg-card-hover";

export default function CategoryGrid({
  categories,
  sessions,
  now,
  activeCategoryId,
  onStart,
  onChanged,
}: {
  categories: WorkCategoryDTO[]; // including archived
  sessions: WorkSessionDTO[]; // today's
  now: number;
  activeCategoryId: string | null;
  onStart: (target: StartTarget) => void;
  onChanged: () => void;
}) {
  const [oneOffLabel, setOneOffLabel] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [sheet, setSheet] = useState<WorkCategoryDTO | "new" | "archived" | null>(null);

  const visible = categories.filter((c) => !c.archived);
  const archived = categories.filter((c) => c.archived);

  const secondsToday = new Map<string, number>();
  for (const session of sessions) {
    if (!session.categoryId) continue;
    secondsToday.set(session.categoryId, (secondsToday.get(session.categoryId) ?? 0) + sessionSeconds(session, now));
  }

  function submitOneOff(e: React.FormEvent) {
    e.preventDefault();
    const label = oneOffLabel.trim();
    if (!label) return;
    onStart({ label });
    setOneOffLabel("");
  }

  return (
    <section>
      <h2 className="sr-only font-heading">Categories</h2>

      <div className="flex items-center gap-3 mb-3">
        <form onSubmit={submitOneOff} className="flex-1 min-w-0">
          <label htmlFor="work-one-off-label" className="sr-only">
            One-off session
          </label>
          <input
            id="work-one-off-label"
            value={oneOffLabel}
            onChange={(e) => setOneOffLabel(e.target.value)}
            placeholder="One-off: type a label, press Enter"
            maxLength={80}
            enterKeyHint="go"
            autoComplete="off"
            className={workInputClass}
          />
        </form>
        <button
          onClick={() => setIsEditing((editing) => !editing)}
          className="min-h-[44px] px-2 font-body text-sm text-gold"
        >
          {isEditing ? "Done" : "Edit"}
        </button>
      </div>

      {isEditing && <p className="mb-3 text-center font-body text-sm text-muted">Tap a button to change or archive it.</p>}

      <div data-work-buttons className="flex flex-wrap justify-center gap-2 md:gap-3">
        {visible.map((category) => {
          const colors = colorClasses(category.color);
          const isActive = category._id === activeCategoryId;
          const seconds = secondsToday.get(category._id) ?? 0;
          return (
            <button
              key={category._id}
              onClick={() => (isEditing ? setSheet(category) : onStart({ categoryId: category._id }))}
              aria-pressed={isEditing ? undefined : isActive}
              className={`${TILE_CLASS} relative overflow-hidden px-3 border text-center font-body text-sm md:text-base leading-snug ${
                isActive
                  ? `${colors.activeFill} border-transparent font-medium`
                  : `bg-card text-text ${TILE_PRESS_CLASS} ${isEditing ? "border-border-light border-dashed" : "border-border"}`
              }`}
            >
              {!isActive && <span className={`absolute inset-y-0 left-0 w-1 ${colors.bar}`} aria-hidden="true" />}
              <span className="block line-clamp-2 break-words">{category.label}</span>
              {seconds >= 60 && (
                <span className={`block mt-0.5 font-mono text-caption ${isActive ? "" : "text-muted"}`}>
                  {formatDuration(seconds)}
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={() => setSheet("new")}
          className={`${TILE_CLASS} ${TILE_PRESS_CLASS} px-3 border border-dashed border-border-light font-body text-sm md:text-base text-muted gap-1`}
        >
          <Plus size={14} aria-hidden="true" />
          New
        </button>
      </div>

      {isEditing && (
        <button
          onClick={() => setSheet("archived")}
          className="block mx-auto mt-2 min-h-[44px] px-2 font-body text-sm text-muted"
        >
          Archived ({archived.length})
        </button>
      )}

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
