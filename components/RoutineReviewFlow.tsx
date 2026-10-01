"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { X, GripVertical, ChevronLeft, Check } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import HabitIcon from "@/components/HabitIcon";
import TimelineBar from "@/components/TimelineBar";
import { computeReviewTimeline } from "@/lib/routine-review-timeline";
import { assignItemColors } from "@/lib/review-colors";
import { staticBaselineFinish } from "@/lib/projected-finish";
import type { ReviewEntryPoint } from "@/models/RoutineLog";

interface GroupOption {
  _id: string;
  name: string;
  itemCount: number;
}

interface ReviewItem {
  _id: string;
  name: string;
  icon: string;
  order: number;
  projectedMinutes: number;
  avgActualMins: number | null;
}

interface ReviewData {
  group: { _id: string; name: string; startTime: string | null };
  items: ReviewItem[];
  avgStartMinutesUtc: number | null;
  startTimeSampleSize: number;
}

// What's actually committed to the DB for a group right now — diffed against
// that group's first-loaded ReviewData to build the log's reviewMetadata.
interface SavedState {
  goals: Record<string, number>;
  startTime: string | null;
  order: string[];
}

interface GroupChanges {
  itemGoalChanges: Array<{ routineItemId: string; oldMinutes: number; newMinutes: number }>;
  startTimeChange?: { old: string | null; new: string | null };
  reorder?: { old: string[]; new: string[] };
}

interface Props {
  date: string;
  initialGroupId: string | null;
  groupOptions: GroupOption[];
  entryPoint: ReviewEntryPoint;
  returnTo: string | null;
  reviewItemId: string | null;
}

type Screen = "pick" | "review";
type LeaveTarget = "exit" | "pick";

const timeFmt: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12: true };

function fmtDateLabel(d: Date | null): string {
  return d ? d.toLocaleTimeString("en-US", timeFmt) : "—";
}

function fmtClockLabel(hhmm: string | null): string {
  if (!hhmm) return "—";
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-US", timeFmt);
}

function utcMinsPlusDurationToLocalLabel(utcMins: number, durationMins: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMinutes(utcMins + durationMins);
  return d.toLocaleTimeString("en-US", timeFmt);
}

function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

function initialSavedState(data: ReviewData): SavedState {
  return {
    goals: Object.fromEntries(data.items.map((i) => [i._id, i.projectedMinutes])),
    startTime: data.group.startTime ?? null,
    order: data.items.map((i) => i._id),
  };
}

function diffGroup(original: ReviewData, saved: SavedState): GroupChanges {
  const itemGoalChanges = original.items
    .filter((i) => saved.goals[i._id] !== undefined && saved.goals[i._id] !== i.projectedMinutes)
    .map((i) => ({ routineItemId: i._id, oldMinutes: i.projectedMinutes, newMinutes: saved.goals[i._id] }));
  const originalOrder = original.items.map((i) => i._id);
  const originalStart = original.group.startTime ?? null;
  return {
    itemGoalChanges,
    ...(saved.startTime !== originalStart ? { startTimeChange: { old: originalStart, new: saved.startTime } } : {}),
    ...(!sameOrder(saved.order, originalOrder) ? { reorder: { old: originalOrder, new: saved.order } } : {}),
  };
}

function hasChanges(c: GroupChanges): boolean {
  return c.itemGoalChanges.length > 0 || !!c.startTimeChange || !!c.reorder;
}

// ── Item row — color swatch, always-visible goal input, drag handle ──────────

function ItemRow({
  item,
  color,
  value,
  savedMinutes,
  onChange,
  onCommitBlur,
}: {
  item: ReviewItem;
  color: string;
  value: string;
  savedMinutes: number;
  onChange: (v: string) => void;
  onCommitBlur: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item._id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 20 : undefined,
    boxShadow: `inset 3px 0 0 ${color}`,
  };
  const proposed = parseInt(value);
  const edited = Number.isFinite(proposed) && proposed !== item.projectedMinutes;
  const showUseAvg = item.avgActualMins !== null && proposed !== item.avgActualMins;

  return (
    <div ref={setNodeRef} style={style} className="bg-card flex items-center gap-2 pl-2 pr-3 py-2 min-h-[60px]">
      <button
        {...listeners}
        {...attributes}
        className="text-dim cursor-grab active:cursor-grabbing flex-shrink-0 w-8 h-11 flex items-center justify-center touch-none"
        aria-label={`Drag to reorder ${item.name}`}
      >
        <GripVertical size={16} />
      </button>
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <HabitIcon name={item.icon} size={15} className="text-muted flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm text-text truncate">{item.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-mono text-[10px] text-muted">
            {item.avgActualMins !== null ? `avg ${item.avgActualMins}m` : "no avg yet"}
          </span>
          {edited && <span className="font-mono text-[10px] text-dim">was {item.projectedMinutes}m</span>}
          {showUseAvg && (
            <button
              onClick={() => onChange(String(item.avgActualMins))}
              className="font-mono text-[10px] text-gold border border-gold/40 rounded-pill px-2 py-0.5"
            >
              Use avg
            </button>
          )}
        </div>
      </div>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommitBlur}
        aria-label={`${item.name} goal minutes`}
        className={`w-14 h-11 bg-bg border rounded-lg px-2 text-center font-mono text-sm text-text outline-none focus:border-olive ${
          proposed !== savedMinutes ? "border-gold/60" : "border-border"
        }`}
      />
      <span className="font-mono text-[10px] text-dim flex-shrink-0">min</span>
    </div>
  );
}

// ── Main flow ─────────────────────────────────────────────────────────────────

export default function RoutineReviewFlow({
  date, initialGroupId, groupOptions, entryPoint, returnTo, reviewItemId,
}: Props) {
  const router = useRouter();
  const flowStartedAt = useRef(Date.now());

  const [screen, setScreen] = useState<Screen>(initialGroupId ? "review" : "pick");
  const [groupId, setGroupId] = useState<string | null>(initialGroupId);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Session-wide, keyed by groupId. `originals` is each group's first fetch
  // — the Goal bar's baseline and the "old" side of every logged change,
  // never refetched on a revisit — and `saved` is what's been committed since.
  const [originals, setOriginals] = useState<Record<string, ReviewData>>({});
  const [saved, setSaved] = useState<Record<string, SavedState>>({});
  const [visited, setVisited] = useState<string[]>([]);

  // Staged edits for the group on screen — nothing is written until Save or Finish.
  const [draftGoals, setDraftGoals] = useState<Record<string, string>>({});
  const [draftStart, setDraftStart] = useState("");
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  const [colors, setColors] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<LeaveTarget | null>(null);

  const reviewData = groupId ? originals[groupId] ?? null : null;
  const savedState = groupId ? saved[groupId] ?? null : null;

  function loadDraftFrom(s: SavedState) {
    setDraftGoals(Object.fromEntries(Object.entries(s.goals).map(([id, m]) => [id, String(m)])));
    setDraftStart(s.startTime ?? "");
    setDraftOrder(s.order);
    setColors((prev) => assignItemColors(s.order, prev));
  }

  function openGroup(id: string) {
    setGroupId(id);
    setScreen("review");
    setJustSaved(false);
    setSaveError(false);
    setVisited((v) => (v.includes(id) ? v : [...v, id]));
    // Revisit within the same session: restore from what's committed instead
    // of refetching, so the Goal bar keeps the session's original baseline.
    if (saved[id]) loadDraftFrom(saved[id]);
  }

  useEffect(() => {
    if (initialGroupId) openGroup(initialGroupId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!groupId || originals[groupId]) return;
    setLoading(true);
    setLoadError(false);
    fetch(`/api/routine-review?groupId=${groupId}&localDate=${date}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data: ReviewData) => {
        const s = initialSavedState(data);
        setOriginals((prev) => ({ ...prev, [groupId]: data }));
        setSaved((prev) => ({ ...prev, [groupId]: s }));
        loadDraftFrom(s);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, date]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = draftOrder.findIndex((id) => id === active.id);
    const newIndex = draftOrder.findIndex((id) => id === over.id);
    const next = arrayMove(draftOrder, oldIndex, newIndex);
    setDraftOrder(next);
    setColors((prev) => assignItemColors(next, prev));
    setJustSaved(false);
  }

  // A blank/invalid input previews as the committed value rather than 0, so
  // the Proposed bar never collapses a segment mid-typing.
  function proposedMinutes(id: string): number {
    const n = parseInt(draftGoals[id]);
    return Number.isFinite(n) && n >= 1 ? n : savedState?.goals[id] ?? 0;
  }

  const itemsById = useMemo(
    () => Object.fromEntries((reviewData?.items ?? []).map((i) => [i._id, i])),
    [reviewData]
  );
  const orderedItems = draftOrder.map((id) => itemsById[id]).filter((i): i is ReviewItem => !!i);

  const dirtyGoalIds = savedState
    ? draftOrder.filter((id) => proposedMinutes(id) !== savedState.goals[id])
    : [];
  const startDirty = savedState ? (draftStart || null) !== savedState.startTime : false;
  const orderDirty = savedState ? !sameOrder(draftOrder, savedState.order) : false;
  const dirty = dirtyGoalIds.length > 0 || startDirty || orderDirty;

  // Staged edits only live in this component — warn before a reload/close
  // would drop them. (In-app nav is already covered: BottomNav hides itself on
  // this route, so ✕ / Finish are the only ways out.)
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Commits the on-screen group's staged edits and stays put. Never navigates
  // — only finish() does that.
  async function saveGroup(): Promise<boolean> {
    if (!groupId || !savedState || !dirty) return true;
    setSaving(true);
    setSaveError(false);
    try {
      const writes: Promise<Response>[] = dirtyGoalIds.map((id) =>
        fetch(`/api/routine-items/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectedMinutes: proposedMinutes(id) }),
        })
      );
      if (startDirty) {
        writes.push(
          fetch(`/api/routines/${groupId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ startTime: draftStart || null }),
          })
        );
      }
      if (orderDirty) {
        writes.push(
          fetch("/api/routine-items/reorder", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: draftOrder.map((id, idx) => ({ _id: id, order: idx })) }),
          })
        );
      }
      const results = await Promise.all(writes);
      if (results.some((r) => !r.ok)) throw new Error("save failed");

      const nextSaved: SavedState = {
        goals: { ...savedState.goals, ...Object.fromEntries(dirtyGoalIds.map((id) => [id, proposedMinutes(id)])) },
        startTime: draftStart || null,
        order: draftOrder,
      };
      setSaved((prev) => ({ ...prev, [groupId]: nextSaved }));
      loadDraftFrom(nextSaved);
      setJustSaved(true);
      return true;
    } catch {
      setSaveError(true);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function finish(opts: { commit: boolean }) {
    if (finishing) return;
    setFinishing(true);
    if (opts.commit && !(await saveGroup())) {
      setFinishing(false);
      setPendingLeave(null);
      return;
    }

    // `saved` state may not have flushed yet after saveGroup — rebuild the
    // current group's committed state from the draft it just wrote.
    const savedNow: Record<string, SavedState> = { ...saved };
    if (opts.commit && groupId && dirty) {
      savedNow[groupId] = { goals: { ...savedState!.goals, ...Object.fromEntries(draftOrder.map((id) => [id, proposedMinutes(id)])) }, startTime: draftStart || null, order: draftOrder };
    }

    const reviewed = visited.filter((id) => originals[id] && savedNow[id]);
    const perGroup = reviewed.map((id) => ({ groupId: id, ...diffGroup(originals[id], savedNow[id]) }));
    const changesMade = perGroup.some(hasChanges);
    const actualMinutes = Math.max(1, Math.round((Date.now() - flowStartedAt.current) / 60000));

    const compact = (c: GroupChanges) => ({
      ...(c.itemGoalChanges.length > 0 ? { itemGoalChanges: c.itemGoalChanges } : {}),
      ...(c.startTimeChange ? { startTimeChange: c.startTimeChange } : {}),
      ...(c.reorder ? { reorder: c.reorder } : {}),
    });

    if (reviewItemId) {
      const [first, ...rest] = perGroup;
      await fetch("/api/routine-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routineItemId: reviewItemId,
          date,
          state: changesMade ? "done" : "rest",
          actualMinutes,
          reviewMetadata: first
            ? {
                entryPoint,
                groupId: first.groupId,
                changesMade,
                ...compact(first),
                ...(rest.length > 0
                  ? { additionalGroups: rest.map((g) => ({ groupId: g.groupId, ...compact(g) })) }
                  : {}),
              }
            : undefined,
        }),
      });
    }

    router.push(returnTo === "analytics" ? "/analytics" : "/routines");
  }

  function requestLeave(target: LeaveTarget) {
    if (dirty && screen === "review") { setPendingLeave(target); return; }
    if (target === "exit") finish({ commit: false });
    else setScreen("pick");
  }

  async function resolveLeave(commit: boolean) {
    const target = pendingLeave;
    if (!target) return;
    if (target === "exit") return finish({ commit });
    if (commit && !(await saveGroup())) { setPendingLeave(null); return; }
    if (!commit && savedState) loadDraftFrom(savedState);
    setPendingLeave(null);
    setScreen("pick");
  }

  // ── Bars ──
  const originalItems = reviewData?.items ?? [];
  const goalTimeline = computeReviewTimeline(originalItems.map((i) => ({ id: i._id, minutes: i.projectedMinutes })));
  const avgTimeline = computeReviewTimeline(originalItems.map((i) => ({ id: i._id, minutes: i.avgActualMins ?? i.projectedMinutes })));
  const proposedTimeline = computeReviewTimeline(orderedItems.map((i) => ({ id: i._id, minutes: proposedMinutes(i._id) })));

  const toSegments = (t: typeof goalTimeline) =>
    t.segments.map((s) => ({ id: s.id, pct: s.pct, color: colors[s.id] ?? "#3d3b2e", label: itemsById[s.id]?.name }));

  const originalStart = reviewData?.group.startTime ?? null;
  const goalEnd = staticBaselineFinish(date, originalStart, goalTimeline.totalMinutes);
  const proposedEnd = staticBaselineFinish(date, draftStart || null, proposedTimeline.totalMinutes);

  const hasAnyAvg = originalItems.some((i) => i.avgActualMins !== null);
  const hasAvgStart = reviewData != null && reviewData.avgStartMinutesUtc != null && reviewData.startTimeSampleSize >= 2;
  const avgStartLabel = hasAvgStart ? utcMinsPlusDurationToLocalLabel(reviewData!.avgStartMinutesUtc!, 0) : "—";
  const avgEndLabel = hasAvgStart
    ? utcMinsPlusDurationToLocalLabel(reviewData!.avgStartMinutesUtc!, avgTimeline.totalMinutes)
    : "—";

  const canPickAnother = groupOptions.length > 0;
  const showReview = screen === "review" && !loading && reviewData && savedState;

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto max-w-mobile">
        <header className="flex items-center gap-2 px-4 pt-10 pb-4 border-b border-border">
          {screen === "review" && canPickAnother && (
            <button
              onClick={() => requestLeave("pick")}
              disabled={finishing}
              className="w-9 h-11 -ml-2 flex-shrink-0 flex items-center justify-center text-dim"
              aria-label="Choose another routine"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-widest text-gold mb-0.5">Routine Review</p>
            <h1 className="font-heading text-lg text-text truncate">
              {screen === "review" ? reviewData?.group.name ?? "Loading…" : "Choose a routine"}
            </h1>
          </div>
          <button
            onClick={() => requestLeave("exit")}
            disabled={finishing}
            className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-card text-dim disabled:opacity-50"
            aria-label="Close review"
          >
            <X size={16} />
          </button>
        </header>

        {pendingLeave && (
          <div className="mx-4 mt-3 rounded-card border border-tobacco/50 bg-card px-4 py-3">
            <p className="font-body text-sm text-text mb-2.5">You have unsaved changes to this routine.</p>
            <div className="flex gap-2">
              <button
                onClick={() => resolveLeave(true)}
                disabled={saving || finishing}
                className="flex-1 bg-olive text-text py-2.5 rounded-lg font-body text-sm min-h-[44px] disabled:opacity-50"
              >
                {saving || finishing ? "Saving…" : pendingLeave === "exit" ? "Save & exit" : "Save"}
              </button>
              <button
                onClick={() => resolveLeave(false)}
                disabled={saving || finishing}
                className="flex-1 border border-border text-muted py-2.5 rounded-lg font-body text-sm min-h-[44px] disabled:opacity-50"
              >
                Discard
              </button>
              <button
                onClick={() => setPendingLeave(null)}
                disabled={saving || finishing}
                className="px-3 text-dim font-mono text-xs min-h-[44px]"
              >
                Keep editing
              </button>
            </div>
          </div>
        )}

        {/* Group picker — only when no groupId was passed in */}
        {screen === "pick" && (
          <div className="px-4 pt-5 pb-10 space-y-2">
            <p className="font-mono text-[10px] text-dim mb-2">Which routine do you want to review?</p>
            {groupOptions.length === 0 && (
              <p className="font-mono text-xs text-dim py-8 text-center">No timed routines to review yet.</p>
            )}
            {groupOptions.map((g) => {
              const changed = originals[g._id] && saved[g._id] && hasChanges(diffGroup(originals[g._id], saved[g._id]));
              return (
                <button
                  key={g._id}
                  onClick={() => openGroup(g._id)}
                  className="w-full flex items-center justify-between bg-card rounded-card border border-border px-4 py-3.5 hover:bg-card-hover transition-colors min-h-[54px]"
                >
                  <span className="font-body text-sm text-text">{g.name}</span>
                  <span className="flex items-center gap-2">
                    {visited.includes(g._id) && (
                      <span className={`font-mono text-[10px] rounded-pill px-2 py-0.5 border ${changed ? "text-olive-light border-olive/40" : "text-dim border-border"}`}>
                        {changed ? "Updated" : "Reviewed"}
                      </span>
                    )}
                    <span className="font-mono text-dim text-xs">{g.itemCount} habits</span>
                  </span>
                </button>
              );
            })}
            {visited.length > 0 && (
              <button
                onClick={() => finish({ commit: false })}
                disabled={finishing}
                className="w-full mt-4 bg-olive text-text py-3.5 rounded-card font-body text-sm font-medium min-h-[44px] disabled:opacity-50"
              >
                {finishing ? "Finishing…" : "Finish review"}
              </button>
            )}
          </div>
        )}

        {screen === "review" && loading && (
          <p className="text-dim font-mono text-xs text-center py-16">Loading…</p>
        )}
        {screen === "review" && loadError && (
          <p className="text-burgundy-light font-mono text-xs text-center py-16">Couldn&apos;t load this routine.</p>
        )}

        {showReview && (
          <>
            {/* Graph block — sticky so the bars stay in view while editing a long list */}
            <div className="sticky top-0 z-10 bg-bg px-4 pt-4 pb-3 border-b border-border space-y-3">
              <TimelineBar
                size="lg"
                title="Goal"
                totalLabel={fmtDuration(goalTimeline.totalMinutes)}
                segments={toSegments(goalTimeline)}
                startLabel={fmtClockLabel(originalStart)}
                endLabel={fmtDateLabel(goalEnd)}
              />
              {hasAnyAvg ? (
                <TimelineBar
                  size="lg"
                  title="Actual avg · 28 days"
                  totalLabel={fmtDuration(avgTimeline.totalMinutes)}
                  segments={toSegments(avgTimeline)}
                  startLabel={avgStartLabel}
                  endLabel={avgEndLabel}
                />
              ) : (
                <p className="font-mono text-[10px] text-dim">Actual avg: not enough logged days yet.</p>
              )}
              <TimelineBar
                size="lg"
                title="Proposed"
                totalLabel={fmtDuration(proposedTimeline.totalMinutes)}
                segments={toSegments(proposedTimeline)}
                startLabel={fmtClockLabel(draftStart || null)}
                endLabel={fmtDateLabel(proposedEnd)}
              />
            </div>

            <div className="px-4 pt-4 pb-32 space-y-5">
              <div>
                <p className="font-mono text-[10px] text-dim mb-2">
                  Edit a goal or tap Use avg — the Proposed bar updates as you go. Drag ⋮⋮ to reorder.
                </p>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={draftOrder} strategy={verticalListSortingStrategy}>
                    <div className="rounded-card overflow-hidden divide-y divide-border border border-border">
                      {orderedItems.map((item) => (
                        <ItemRow
                          key={item._id}
                          item={item}
                          color={colors[item._id] ?? "#3d3b2e"}
                          value={draftGoals[item._id] ?? ""}
                          savedMinutes={savedState!.goals[item._id]}
                          onChange={(v) => {
                            setDraftGoals((prev) => ({ ...prev, [item._id]: v }));
                            setJustSaved(false);
                          }}
                          onCommitBlur={() => {
                            const n = parseInt(draftGoals[item._id]);
                            if (!Number.isFinite(n) || n < 1) {
                              setDraftGoals((prev) => ({ ...prev, [item._id]: String(savedState!.goals[item._id]) }));
                            }
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-dim block mb-1.5" htmlFor="review-start">
                  Start time
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="review-start"
                    type="time"
                    value={draftStart}
                    onChange={(e) => { setDraftStart(e.target.value); setJustSaved(false); }}
                    className={`w-36 h-11 bg-bg border rounded-lg px-3 font-mono text-sm text-text outline-none focus:border-olive ${
                      startDirty ? "border-gold/60" : "border-border"
                    }`}
                  />
                  <div className="font-mono text-[10px] text-dim leading-relaxed">
                    {proposedEnd && (
                      <p>Projected finish <span className="text-text">{fmtDateLabel(proposedEnd)}</span></p>
                    )}
                    <p>Usually {avgStartLabel} → {avgEndLabel}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action bar — BottomNav is hidden on this route, so this owns the bottom edge */}
            <div
              className="fixed bottom-0 left-0 right-0 z-20 bg-bg border-t border-border"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="mx-auto max-w-mobile px-4 py-3">
                {saveError && (
                  <p className="font-mono text-[10px] text-burgundy-light mb-2">Couldn&apos;t save — try again.</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={saveGroup}
                    disabled={!dirty || saving || finishing}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-olive/40 text-olive-light py-3 rounded-card font-body text-sm min-h-[44px] disabled:opacity-40"
                  >
                    {saving ? "Saving…" : justSaved && !dirty ? (<><Check size={14} /> Saved</>) : "Save changes"}
                  </button>
                  <button
                    onClick={() => finish({ commit: true })}
                    disabled={saving || finishing}
                    className="flex-1 bg-olive text-text py-3 rounded-card font-body text-sm font-medium min-h-[44px] disabled:opacity-50"
                  >
                    {finishing ? "Finishing…" : "Finish review"}
                  </button>
                </div>
                {canPickAnother && justSaved && !dirty && (
                  <button
                    onClick={() => setScreen("pick")}
                    className="w-full mt-1 font-mono text-[11px] text-gold min-h-[36px]"
                  >
                    Review another routine ›
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
