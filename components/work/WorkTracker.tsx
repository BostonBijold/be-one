"use client";

import { useState } from "react";
import AddPastBlockSheet from "@/components/work/AddPastBlockSheet";
import CategoryGrid from "@/components/work/CategoryGrid";
import EditSessionSheet from "@/components/work/EditSessionSheet";
import ForgottenTimerSheet from "@/components/work/ForgottenTimerSheet";
import TodayPanel from "@/components/work/TodayPanel";
import WorkTimer from "@/components/work/WorkTimer";
import { workFieldLabelClass, workInputClass } from "@/components/work/WorkSheet";
import type { WorkSessionDTO } from "@/lib/work/types";
import { useWorkTracker } from "@/lib/work/useWorkTracker";

export default function WorkTracker() {
  const tracker = useWorkTracker();
  const { active, categories, now } = tracker;
  const [editing, setEditing] = useState<WorkSessionDTO | null>(null);
  const [addingPast, setAddingPast] = useState(false);

  const activeCategory = active ? categories.find((c) => c._id === active.categoryId) : undefined;

  function openEdit(session: WorkSessionDTO) {
    // A running row's notes may be ahead of the list by an unsaved draft.
    setEditing(session._id === active?._id ? { ...session, notes: tracker.notes } : session);
  }

  return (
    <div className="mx-auto w-full max-w-mobile lg:max-w-5xl px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10">
      <section className="lg:sticky lg:top-6 lg:self-start">
        <h1 className="font-heading text-2xl text-text">Current Session</h1>
        <p className="mt-1 mb-5 font-body text-base text-muted min-h-6 truncate">
          {active ? active.label : "Nothing running"}
        </p>

        <WorkTimer session={active} targetMinutes={activeCategory?.defaultDurationMin ?? null} now={now} />

        {active && (
          <div className="mt-6 space-y-4">
            <button
              onClick={tracker.stop}
              className="w-full min-h-[44px] py-3.5 rounded-lg bg-olive text-bg font-body font-medium text-base"
            >
              Stop
            </button>
            <div>
              <label htmlFor="work-notes" className={workFieldLabelClass}>
                Notes (optional)
              </label>
              <textarea
                id="work-notes"
                value={tracker.notes}
                onChange={(e) => tracker.setNotes(e.target.value)}
                rows={3}
                className={workInputClass}
              />
            </div>
          </div>
        )}
      </section>

      <div className="mt-8 lg:mt-0 space-y-8">
        {tracker.error && (
          <p role="alert" className="font-body text-sm text-burgundy-light">
            {tracker.error}
          </p>
        )}

        {tracker.loading ? (
          <p className="font-mono text-sm text-muted">Loading…</p>
        ) : (
          <>
            <CategoryGrid
              categories={categories}
              activeCategoryId={active?.categoryId ?? null}
              onStart={tracker.start}
            />
            <TodayPanel
              sessions={tracker.sessions}
              now={now}
              onSelect={openEdit}
              onAddPast={() => setAddingPast(true)}
            />
          </>
        )}
      </div>

      {editing && (
        <EditSessionSheet
          key={editing._id}
          session={editing}
          onClose={() => setEditing(null)}
          onChanged={tracker.refresh}
        />
      )}
      {addingPast && (
        <AddPastBlockSheet
          categories={categories}
          onClose={() => setAddingPast(false)}
          onChanged={tracker.refresh}
        />
      )}
      {tracker.forgottenOpen && active && (
        <ForgottenTimerSheet
          key={active._id}
          session={active}
          now={now}
          onStopNow={() => tracker.resolveForgotten()}
          onSetEndTime={(endTime) => tracker.resolveForgotten(endTime)}
          onKeepRunning={tracker.dismissForgotten}
        />
      )}
    </div>
  );
}
