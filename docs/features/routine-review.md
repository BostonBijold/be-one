> **Keep this file updated after any code change in this area — do not let it drift from actual implementation.**

# Routine Review

A separate weekly reflection loop from the virtue weekly review ([virtues.md](virtues.md)) — this one looks at whether a routine *group*'s goal times, start time, and item order still match reality, using each item's real rolling-average duration as evidence. It reuses the `virtue_checkin`/`weekly_review` item-type pattern rather than inventing a parallel mechanism.

## Item type & seeding

`RoutineItem.itemType: "routine_review"` — seeded once per user via `lib/seed.ts`'s `ensureRoutineReviewItem`, an exact copy of `ensureVirtueCheckInItems`'s pattern: idempotent (bails if a `routine_review` item already exists for the user), appended to the end of the evening group. Kept as its own seed function rather than folded into `ensureVirtueCheckInItems` since it shipped later and the two are independently toggleable.

Like `weekly_review`, it's only actionable on Sundays — `lib/routine-visibility.ts`'s `isItemVisibleOn` hides it entirely on any other day, and `RoutineItemRow.tsx`'s Sunday-gated render block is a copy of `weekly_review`'s (see [routines.md](routines.md#item-types)).

## Entry points

Three, all opening the same flow at `app/(app)/routines/review/page.tsx` → `components/RoutineReviewFlow.tsx`:

- **`sunday_prompt`** — tapping the seeded evening item on a Sunday. `RoutinesView.tsx` routes to `/routines/review?date=…&entryPoint=sunday_prompt&return=routines` with **no `groupId`** — the seeded item isn't scoped to one routine group, so the flow opens on the group picker instead (below).
- **`analytics_button`** — a "Review" pill next to each routine group's completion % on the Analytics page (`components/AnalyticsContent.tsx`). Already has a `groupId`, so it skips the picker and opens straight to the review screen.
- **`notification`** — not built. Reserved in the `ReviewEntryPoint` type (`models/RoutineLog.ts`) for a future "it's been over a month since your last review" nudge, computed per group from the most recent `done` `routine_review` log — the same `RoutineLog.findOne({ userId, routineItemId, state: "done" }).sort({ date: -1 })` pattern used everywhere else in the app for "when did I last do X," not something bespoke.

## Group picker

Only rendered when no `groupId` was passed in. Lists the user's routine groups (name + count of "timeable" items — see below), loaded server-side in `app/(app)/routines/review/page.tsx` directly from `RoutineGroup`/`RoutineItem` rather than through `GET /api/routines` (that route is stale — see [routines-api.md](../api/routines-api.md) — and doesn't need touching for this feature). A group with zero timeable items is filtered out of the list entirely.

The picker is not a one-way door: from a group's review screen, the header's ‹ (or "Review another routine ›" after a save) returns here, so one `sunday_prompt` session can review several groups. Groups already opened this session get a "Reviewed" / "Updated" tag, and once any group has been opened the picker shows its own "Finish review" button. The `analytics_button` entry has no picker (no `groupOptions` are loaded), so it's always a single-group session with no ‹.

## The data: `GET /api/routine-review?groupId=X&localDate=YYYY-MM-DD`

A sibling to `/api/analytics`, not a parameter on it — see [routines-api.md](../api/routines-api.md#routine-review) for the full response shape. Two choices worth calling out:

- **Timeable items only** — items with `itemType` `checkbox`/`virtue_checkin`/`weekly_review`/`routine_review` are excluded from the review entirely, the same "no real time target" convention `RoutineItemRow.tsx`'s `isTimeable` already uses.
- **28-day trailing window, no outlier rejection** — a deliberate choice, not an oversight. The window is long enough for a rolling average to be meaningful without trimmed means or outlier exclusion, on the reasoning that weekly-or-longer aggregation already smooths over one-off anomalies. In practice, a single extreme stray log (e.g. a forgotten-and-later-closed timer) *can* still skew an average when the window has very few samples — that's accepted, not a bug, per the same reasoning `lib/routine-progress.ts` and the Analytics dashboard already apply elsewhere.

## The review screen (one per group)

A single screen per group — the earlier four-step Timeline → Goals → Order stepping is gone, because splitting the graph from its numbers meant always remembering one while looking at the other. Top to bottom: header (group name), the graph block, the item list, the start time, and a fixed Save / Finish action bar. `BottomNav` hides itself on `/routines/review` (see `components/BottomNav.tsx`), so the ✕ and Finish are the only ways out and the action bar owns the bottom edge.

### Graph block — three bars

Sticky at the top of the scroll area, so it stays in view while editing a long list. Three `components/TimelineBar.tsx` bars at `size="lg"` (see [timer.md](timer.md#live-routine-timeline) for the shared component), each with a title and a **total duration label** ("47 min", "1 hr 12 min") above it and start → end clock times below:

| Bar | Minutes per item | Order | Start → end |
|---|---|---|---|
| **Goal** | the session's *original* `projectedMinutes` | original order | the group's original `startTime` → `staticBaselineFinish(start, total)` |
| **Actual avg** | `avgActualMins` (falls back to the goal when an item has no average) | original order | the API's `avgStartMinutesUtc` → that plus the total (needs ≥2 sampled days, else "—"); replaced by a "not enough logged days" note when no item has any average |
| **Proposed** | each item's *currently edited* goal, live | the staged order | the staged start time → `staticBaselineFinish(start, total)` — the same value as the "Projected finish" label next to the start-time input |

Goal and Actual avg don't change during the session. Proposed re-renders on every keystroke, "Use avg" tap, drag, or start-time change. A blank or invalid input previews as the item's last-saved value rather than 0, so a segment never collapses mid-typing. All three are built by `lib/routine-review-timeline.ts`'s `computeReviewTimeline` (flat `{id, minutes}[]` → proportional segments, none of `lib/routine-timeline.ts`'s live done/active/pending state).

**Per-item colors.** Segments are colored per item, not per bar, and that item's row in the list below uses the same color (a swatch dot plus a 3px inset left edge). The list is the legend. Colors come from `lib/review-colors.ts`: a fixed 9-color muted palette (gold, blue-muted, clay, mauve, sage teal, khaki, steel blue, dusty rose, slate violet) chosen to sit on the warm near-black and to stay clear of the live session's olive/amber/burgundy pacing colors, so this never reads as "on pace / behind." `assignItemColors(orderedIds, existing)` keys colors by **item id**, so an item has the same color in all three bars even when Proposed's order differs. On load it cycles the palette in list order. After a drag it keeps every existing color unless the item now shares one with a list neighbor (only possible with more than 9 items), and then recolors just that item with the least-used color that differs from both neighbors. This replaces the old flat two-color Goal-gold / Average-blue scheme. Bars are now told apart by their titles and position.

Segments draw the item's name inside them (truncated) when they're at least 9% of the bar. Narrower segments rely on the colored list.

### Item list

One row per timeable item, in the **staged order**: drag handle, color swatch, icon, name, `avg Xm` (or "no avg yet"), "was Xm" once the goal has been edited away from the session original, a "Use avg" pill whenever the input differs from the average, and an always-visible numeric goal input (44px tall). An input with an unsaved change gets a gold border. Always-visible inputs replace the old tap-to-expand `GoalEditRow`, which on a phone hid exactly the number you were trying to compare against the bar. Reuses only the minutes-input pattern, not `RoutineEditView.tsx`'s full type/icon/schedule form.

**Order is edited right here**, via each row's grip, using the same `@dnd-kit` sensors/pattern as `RoutineEditView.tsx`'s `SortableRow` (200ms touch delay, so scrolling and typing don't start drags). There's no separate order list anymore, and the Proposed bar's segment order follows the list.

Reordering is scoped to the timeable items: their `order` values are reassigned `0..n-1` among themselves via the existing `PATCH /api/routine-items/reorder`, reused verbatim. A group's non-timeable items (checkbox items, the special item types) keep whatever `order` they already had, which can leave duplicate order values across the two subsets. Both subsets still sort correctly within themselves, but a mixed-list rendering elsewhere in the app that doesn't separate timeable from non-timeable could see a tie. Not addressed here — flagging so it isn't mistaken for a regression if noticed later.

### Start time

Below the list: an editable start-time input, with a "Projected finish" label (staged start + Proposed total via `staticBaselineFinish`, identical to the Proposed bar's end) and "Usually X → Y" (the Actual avg bar's times).

### Staging, Save, and leaving — the staging decision

**Every edit is staged locally and nothing is written until Save or Finish.** That applies to goal minutes, start time, and order alike. Previously goal edits `PATCH`ed immediately while start time and order were staged. Staging everything fits the "Proposed" model, since the user is previewing a change rather than making one per keystroke, and it gives the screen one consistent "unsaved changes" state.

- **Save changes** commits this group's staged edits (`PATCH /api/routine-items/[id]` per changed goal, `PATCH /api/routines/[groupId]` for start time, `PATCH /api/routine-items/reorder` for order, all in parallel), then **stays on the screen** with a "Saved ✓" state. It never navigates. If any write fails it shows "Couldn't save — try again" and keeps the draft.
- **Finish review** saves any staged edits first, then calls `finish()`.
- **✕** and **‹ (back to picker)** with unsaved edits show an inline prompt — Save (& exit) / Discard / Keep editing — instead of silently dropping or committing them. With nothing unsaved they act immediately.
- A `beforeunload` guard covers reloads/closes while there are unsaved edits. Staged state is component-only, per CLAUDE.md's no-localStorage rule.

Session state keeps, per group: `originals` (the group's **first** `GET /api/routine-review` response, never refetched on a revisit, so the Goal bar and the "old" side of every logged change stay anchored to the session's starting point) and `saved` (what's committed to the DB since). Logged changes are a diff of `saved` against `originals`, not a running list of edits. Saving twice, or changing a value and then changing it back, logs the net result. A group whose edits all reverted logs no change for that group.

### The "Save ends the flow" bug (fixed)

Reported: after picking a group from the picker and saving, the review ended instead of letting the user keep editing. The per-row `GoalEditRow` Save never called `finish()` or navigated. The only control that saved the start time and order was Screen 3's "Finish review" button, which showed "Saving…" and was also the only path to `finish()`. `finish()` ends with `router.push` back to `/routines` or `/analytics`. So any save of start time/order ended the session, and the `sunday_prompt` path had no way back to the picker to review another group. Fixed by separating the two: Save commits and stays; only ✕ and Finish call `finish()`, and the picker can be revisited.

## Finishing, or declining

Closing the flow (the header's ✕, from the picker or a review screen) and "Finish review" (on the review screen's action bar, or on the picker once a group has been opened) both call the same `finish()` in `components/RoutineReviewFlow.tsx`. There's no separate "decline" code path. Finish saves staged edits first, and ✕ asks first when there are any (see above). It writes the terminal log for the day's `routine_review` item via the existing `POST /api/routine-logs`, extended to accept an optional `reviewMetadata` field (see [routines-api.md](../api/routines-api.md#routine-logs)):

- **`state: "done"`** if anything was actually changed in **any** group reviewed this session (net of reverts — see the diffing above).
- **`state: "rest"`** otherwise — mirrors the existing Rest/Life convention (an intentional skip that doesn't break a streak), not `"missed"`; `"missed"` only ever arises the passive way any item goes unlogged for the day, not from inside this flow.
- **`actualMinutes`** is the flow's own real wall-clock duration (`Date.now() - flowStartedAt`, minimum 1), not a hardcoded value.
- **`reviewMetadata`** is only attached once at least one group has actually been loaded. Declining from the picker before opening anything writes a plain `rest` log with no metadata, since there's nothing meaningful to attribute it to yet.

`reviewMetadata` shape (`models/RoutineLog.ts`): `entryPoint`, `groupId`, `changesMade`, and optional `itemGoalChanges`/`startTimeChange`/`reorder`, each populated only when that kind of change happened. There is still exactly one `routine_review` log per day (the unique `{userId, routineItemId, date}` key), so a multi-group session maps onto it this way: the top-level `groupId` and change fields describe the **first** group opened, which in a single-group session (the common case, and the only possible one from `analytics_button`) is the same as before. Each later group goes in `additionalGroups: [{ groupId, itemGoalChanges?, startTimeChange?, reorder? }]`. `changesMade` is session-wide. The future `notification` nudge's "last reviewed" lookup per group should therefore match on `reviewMetadata.groupId` **or** `reviewMetadata.additionalGroups.groupId`. See [routines-api.md](../api/routines-api.md#routine-logs) for the full field shapes.

## Future work, not built now

A recommendation comparing the actual completion order captured in `RoutineSession.completionSequence` (see [timer.md](timer.md#a-persisted-session-record)) against the intended order, surfaced next to the item list's drag order — e.g. "you tend to finish ten minutes faster in this order." No read endpoint exists yet for `RoutineSession` records (see routines-api.md); this is where that logic should live once one does.

## Files

- `models/RoutineItem.ts` — `"routine_review"` added to the `itemType` union/enum.
- `models/RoutineLog.ts` — `reviewMetadata` (optional, only ever set on a `routine_review` item's log, including `additionalGroups` for multi-group sessions) and the `ReviewEntryPoint` type.
- `lib/seed.ts` — `ensureRoutineReviewItem`.
- `lib/routine-visibility.ts` — Sunday-only gating, shared with `weekly_review`.
- `components/RoutineItemRow.tsx` — the Sunday-gated dispatch button (`onOpenRoutineReview`).
- `components/RoutinesView.tsx`, `components/RoutineGroupCard.tsx` — wiring `onOpenRoutineReview` down to the row and building the `sunday_prompt` URL.
- `components/AnalyticsContent.tsx` — the per-group "Review" button building the `analytics_button` URL.
- `app/(app)/routines/review/page.tsx` — server page: resolves the `routine_review` item id, and the group-picker's group list when no `groupId` is given.
- `components/RoutineReviewFlow.tsx` — the client flow itself: group picker plus the single combined per-group review screen (`ItemRow`, staging, `saveGroup`, `finish`).
- `lib/routine-review-timeline.ts` — `computeReviewTimeline`, the static Goal/Actual avg/Proposed segment math.
- `lib/review-colors.ts` — `REVIEW_PALETTE` and `assignItemColors`, the per-item, identity-keyed segment/row colors.
- `components/TimelineBar.tsx` — the shared presentational bar, also used by the live session. The review flow uses its optional `title`/`totalLabel`/segment `label`/`size="lg"` props (see [timer.md](timer.md)).
- `components/BottomNav.tsx` — hides itself on `/routines/review` so staged edits can't be dropped by a nav tap.
- `app/api/routine-review/route.ts` — the per-group goal-vs-average data endpoint.
- `app/api/routine-logs/route.ts` — `POST` extended to accept and store `reviewMetadata`.

## Depends on

[`docs/api/routines-api.md`](../api/routines-api.md) — the `routine_review` item type, the `reviewMetadata` log shape, and `GET /api/routine-review`. [`timer.md`](timer.md) for `TimelineBar`/`staticBaselineFinish` reuse. [`virtues.md`](virtues.md) for the parallel (but separate) weekly virtue review this sits alongside.
