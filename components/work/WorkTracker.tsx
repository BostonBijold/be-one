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

// Collapsed until asked for, unless the session already has notes. Keyed by
// session, so a new session starts collapsed again.
function SessionNotes({ notes, onChange }: { notes: string; onChange: (value: string) => void }) {
  const [opened, setOpened] = useState(false);

  if (!opened && !notes) {
    return (
      <button onClick={() => setOpened(true)} className="w-full min-h-[44px] font-body text-sm text-muted">
        + Add note
      </button>
    );
  }
  return (
    <div>
      <label htmlFor="work-notes" className={workFieldLabelClass}>
        Notes (optional)
      </label>
      <textarea
        id="work-notes"
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        autoFocus={opened}
        className={workInputClass}
      />
    </div>
  );
}

export default function WorkTracker() {
  const tracker = useWorkTracker();
  const { active, allCategories, now } = tracker;
  const [editing, setEditing] = useState<WorkSessionDTO | null>(null);
  const [addingPast, setAddingPast] = useState(false);

  const categories = allCategories.filter((c) => !c.archived);
  const activeCategory = active ? allCategories.find((c) => c._id === active.categoryId) : undefined;

  function openEdit(session: WorkSessionDTO) {
    // A running row's notes may be ahead of the list by an unsaved draft.
    setEditing(session._id === active?._id ? { ...session, notes: tracker.notes } : session);
  }

  // In DOM order timer, buttons, Today, which is how it stacks on phones and
  // tablets in portrait, centered on the screen when it all fits. At md the
  // timer section lays out side by side, so the buttons sit in the middle of a
  // tall screen. At lg the grid puts Today under the timer and gives the buttons
  // the whole right column, so the two can each grow and scroll without moving
  // the other. The 1fr rows center the left column: they only take what's left
  // once Today's list has room, and a long list shrinks to fit and scrolls.
  return (
    <div className="mx-auto w-full min-h-full flex flex-col justify-center max-w-mobile md:max-w-3xl lg:max-w-6xl lg:h-full px-4 md:px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] lg:pb-6 lg:grid lg:justify-normal lg:grid-cols-[minmax(340px,2fr)_minmax(0,3fr)] lg:grid-rows-[1fr_auto_minmax(200px,auto)_1fr] lg:gap-x-10">
      <section className="md:grid md:grid-cols-[auto_minmax(0,1fr)] md:gap-x-8 lg:block lg:col-start-1 lg:row-start-2">
        <h1 className="sr-only font-heading">Current Session</h1>
        <p
          className={`mb-4 min-h-8 text-center font-body text-2xl font-medium truncate md:col-start-2 md:row-start-1 ${active ? "text-text md:self-end" : "text-muted md:row-span-2 md:self-center"}`}
        >
          {active ? active.label : "Nothing running"}
        </p>

        <div className="md:col-start-1 md:row-start-1 md:row-span-2">
          <WorkTimer session={active} targetMinutes={activeCategory?.defaultDurationMin ?? null} now={now} />
        </div>

        {active && (
          <div className="mt-5 md:mt-0 lg:mt-5 space-y-2 md:col-start-2 md:row-start-2">
            <button
              onClick={tracker.stop}
              className="w-full min-h-[56px] py-3.5 rounded-lg bg-olive text-bg font-body font-medium text-base select-none touch-manipulation"
            >
              Stop
            </button>
            <SessionNotes key={active._id} notes={tracker.notes} onChange={tracker.setNotes} />
          </div>
        )}
      </section>

      {/* An auto margin centers without clipping the top once buttons overflow. */}
      <div className="mt-8 lg:mt-0 lg:col-start-2 lg:row-start-1 lg:row-span-4 lg:min-h-0 lg:overflow-y-auto lg:flex lg:flex-col">
        <div className="lg:my-auto">
          {tracker.error && (
            <p role="alert" className="mb-4 text-center font-body text-sm text-burgundy-light">
              {tracker.error}
            </p>
          )}
          {tracker.loading ? (
            <p className="text-center font-mono text-sm text-muted">Loading…</p>
          ) : (
            <CategoryGrid
              categories={allCategories}
              sessions={tracker.sessions}
              now={now}
              activeCategoryId={active?.categoryId ?? null}
              onStart={tracker.start}
              onChanged={tracker.refresh}
            />
          )}
        </div>
      </div>

      {!tracker.loading && (
        <div className="mt-8 lg:mt-4 lg:col-start-1 lg:row-start-3 lg:min-h-0">
          <TodayPanel
            sessions={tracker.sessions}
            now={now}
            onSelect={openEdit}
            onAddPast={() => setAddingPast(true)}
          />
        </div>
      )}

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
