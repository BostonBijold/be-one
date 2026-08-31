> **Keep this file updated after any code change in this area — do not let it drift from actual implementation.**

# Routines

The Today/Routines page groups a user's daily habits into time-of-day `RoutineGroup`s (Morning, Afternoon, Evening, and any user-created "custom" groups), each containing an ordered list of `RoutineItem`s. Each item's status for a given date is tracked by a separate `RoutineLog` document, so history is never overwritten — every day gets its own log per item.

## Item types

`RoutineItem.itemType` is one of:

- **`standard`** — has a `projectedMinutes` target; tapping it opens the [timer](timer.md).
- **`stopwatch`** — no target; opens the timer in stopwatch (count-up only) mode.
- **`checkbox`** — no timer at all; a single tap marks it done.
- **`virtue_checkin`** — opens the virtue check-in modal instead of a timer (not covered by this doc).
- **`weekly_review`** — seeded with `scheduledDays: [0]` (Sunday only), so the Today-view visibility rule below already keeps it out of the list on other days. `RoutineItemRow`/`RoutineSession` additionally gate it as only *actionable* on Sundays (a separate, still-hardcoded check, kept for the case an off-schedule item gets viewed anyway — see "Off-schedule groups" below) — on a non-Sunday it shows "Sunday habit — skip or rest for today" instead of its normal action panel rather than opening the weekly review modal.
- **`routine_review`** — same `scheduledDays: [0]` seeding and Sunday-only actionability gating as `weekly_review`, but opens the Routine Review flow instead — see [routine-review.md](routine-review.md).

## Log states

A `RoutineLog` (see [routines-api.md](../api/routines-api.md)) has `state: "in_progress" | "paused" | "done" | "missed" | "rest"`, or simply has no log yet ("pending"). Neither `in_progress` nor `paused` counts as complete for a group's completion check.

- **pending** → tap opens the row and shows: Start Timer/Start Stopwatch (standard/stopwatch), a plain Done button (checkbox), or Missed/Rest buttons. If the group's scheduled window has passed ("back-entry" mode, see below), the timer button is replaced by a Done button plus a manual minutes input.
- **in_progress** → shows "▶ Resume Timer" (reopens the timer, seeded with elapsed time from the server's `startedAt`) plus Missed/Undo. The API enforces that **at most one log can be `in_progress` at a time per user** — starting a timer elsewhere auto-*completes* whatever was left running instead of leaving two things active at once (see [timer.md](timer.md)).
- **paused** → same row treatment as `in_progress` ("▶ Resume Timer", reopening wherever it was left) — this state only ever arises from jumping to a different item inside an open Routine Session, never from anything on this row itself. Tapping "Resume Timer" on a paused item reopens the session at that item rather than a standalone timer, since a paused log always carries its session anchor. See [timer.md](timer.md) for the full pause/resume mechanics.
- **done** → shows an "Edit time" button (standard/stopwatch items) that opens a manual start/end time editor, plus Missed/Rest/Undo.
- **missed** / **rest** → shows a retry action (Start Timer, or Done+minutes if in back-entry mode) plus the other skip state and Undo.
- **Undo** (any logged state) calls `onStateChange(null)`, which `DELETE`s the log entirely — the item returns to pending.
- **Manual time entry** ("Edit time" / "Log with specific times") lets the user type a start and end clock time directly; it computes minutes client-side and calls `onStateChange("done", { startedAt, completedAt })`, which bypasses the timer UI entirely and PATCHes explicit timestamps (see routines-api.md).

Implemented in `components/RoutineItemRow.tsx` (`app/api/routine-logs` is the log endpoint used by every action above — see [routines-api.md](../api/routines-api.md)).

## Time-aware collapse (today only)

Each group (except Habits, see [habits.md](habits.md)) has a `startTime` (`HH:MM`) and an implied end time, `deriveCollapseAfter`, computed as `startTime + sum(projectedMinutes of all non-checkbox items)` (`components/RoutineGroupCard.tsx`). On today's view:

- **Before `startTime`** — collapsed, shown as "starts `HH:MM`".
- **Between `startTime` and the derived end time** — expanded by default.
- **After the derived end time** — collapsed by default, and items switch into **back-entry mode**: the timer-start action is replaced by a Done button with a manual minutes input, since the scheduled window has passed.
- Once every visible item in the group is `done`/`missed`/`rest`, the card auto-collapses to a summary view after a 600ms delay (today's view only).
- **Past dates** (via the date nav) always render expanded, unconditionally, so history is fully visible — the time-window logic above only applies when viewing today.

Custom groups without a `startTime` never derive a collapse window and simply stay expanded/manually-toggleable.

## Streaks & variance

Each row shows `StreakDots` (`components/StreakDots.tsx`) — a dot strip built from `weekLogs`, one dot per day of the **fixed Sunday–Saturday calendar week** containing `today` (`lib/week-dates.ts`'s `calendarWeekDates`, computed once server-side in `app/(app)/routines/page.tsx` and passed down as `weekDates`/`weekLogs`). This is a fixed frame, not a trailing "last 7 days" window — the dot for a given weekday always sits in the same position regardless of what day it currently is. `StreakDots` has no day-letter labels at all, unlike the Analytics chart (see `analytics.md`) — deliberately a lighter-weight treatment since this strip repeats on every row — but the dot for whichever date is currently being viewed (`viewingDate` — `selectedDate` from the date nav, `today` when nothing's been navigated) still gets a small gold ring around it so it's identifiable without one. Browsing to a past date via the date nav moves this ring to that date's dot instead of leaving it on today's — e.g. viewing a Sunday highlights the first (leftmost) dot in the strip. `viewingDate` is deliberately a separate prop from `today`: which days are `pending` in the weekly-progress math (below) always stays anchored to the real date, never to whatever's being browsed. For timed items marked done, the row also shows the variance between `actualMinutes` and `projectedMinutes` (e.g. `+8m` in an "over" color, `-3m` in an "under" color).

Note this is a different week convention than virtue rotation/weekly review, which is Monday-anchored (ISO week, see `lib/virtue-dates.ts`) — "this week" is Sunday-Saturday here specifically, by design.

### Weekly schedule + success threshold

Every `RoutineItem` carries `scheduledDays` (0=Sun..6=Sat, which days it's expected — default every day) and `successThreshold` (how many of this week's *scheduled* days need to be `done`/`rest` to read as 100%, default = the number of scheduled days). Both are set/edited via the schedule row and threshold input in the item's inline edit form (`components/RoutineEditView.tsx`'s `SortableRow`, reached through "⚙ Manage" — see "Reordering & editing groups" below) or at creation time in `AddHabitSheet`'s custom-habit form. `successThreshold` is purely a weekly-analytics/streak concept and never affects Today-view visibility. **`scheduledDays` drives both** the analytics math below *and* Today-view visibility: `lib/routine-visibility.ts`'s `isItemVisibleOn` hides an item from the Today view entirely on a day outside its `scheduledDays` — it doesn't show and doesn't need a Done/Missed/Rest tap that day. See "Off-schedule groups" below for what happens when every item in a group is off for the day.

The shared math lives in `lib/routine-progress.ts`'s `computeWeeklyProgress` (imported by both `StreakDots` and the Analytics Habit Breakdown, see `analytics.md`, so the two never diverge). Each of the week's 7 days classifies into one of six states — the first two are solid fills ("something happened"), the rest are hollow, no-fill outlines distinguished by border color/style ("needs a look"), deliberately so a close-but-different fill color is never the only thing telling two states apart:

- **`done`** — logged done that day (solid fill); counts toward `successCount` regardless of how the color reads — going over time is still a win against the threshold, it just renders differently, see "Timing color" below
- **`rest`** — an intentional skip (solid blue-muted fill) — counts toward `successCount` exactly like `done`, never rendered as a fail state
- **`missed`** — an explicit Missed tap (hollow, solid red/burgundy-light border, ✕ mark where there's room) — deliberately distinct from `unlogged` below even though both are equally "not a success" for the math
- **`unlogged`** — a strictly-past scheduled day with no log at all (hollow, solid grey/dim border, no mark) — a read-time interpretation only, nothing is ever written to the database to represent it
- **`pending`** — a scheduled day that's today (and not yet resolved) or later this week (hollow, **dashed** grey/dim border — the dash is what separates it from `unlogged`'s solid border)
- **`not_scheduled`** — a day outside `scheduledDays` entirely (very faint solid fill, no border) — excluded from every count above; a log that happens to exist on a non-scheduled day (e.g. logged anyway) is invisible to this math, not a bonus

### Off-schedule groups

When every item in a `RoutineGroup` is off-schedule for the selected date (`scheduledDays` excludes that weekday for all of them), `RoutineGroupCard` renders the group collapsed by default with a short "Off today · not scheduled" note instead of the normal item list or progress summary — there's nothing to log, so no `X/Y` count or Start Routine button either. Habit groups otherwise never collapse (each `HabitItemCard` shows its own state directly, with no group-level collapse concept at all), but this "off today" note is the one exception, since there'd otherwise be nothing to render inline. The note stays tappable: expanding it shows the group's full item list (including the off-schedule items) with the normal action panel, so the user can still log a stray entry against an off-schedule item if they want to — this is deliberately not read-only.

`isGroupFullyResolved`/`findNextItemInGroup` (`lib/routine-session-actions.ts`) and `GET /api/habits` apply the same `isItemVisibleOn` filter before doing their own group-completion/list-building work, so a session never stalls waiting on an item that won't get a log today, and `FABHabitSheet`'s quick-log list never offers an off-schedule habit.

### Timing color (done days only)

A `done` day is also colored by how close `actualMinutes` came to the item's target (`projectedMinutes`) — a display-only tier, computed by the same `computeWeeklyProgress` (its `timing` field), that never affects `successCount`/`percentage`/pacing above. Only two tiers, deliberately:

- **green** (olive) — at or under target (`actualMinutes / projectedMinutes <= 1`)
- **amber** — over target by any amount, however severe — there's no third "way over" tier

**Red is reserved exclusively for `missed`** — no other day state, solid or hollow, ever renders red. Overtime, no matter how extreme, stays amber; severity within "overtime" is deliberately not surfaced as a separate color.

Only applies to `standard` (countdown) items, which are the only ones with a real time target — `checkbox` and `stopwatch` items always render `done` as green, since there's nothing to be "over" against.

The resulting percentage (`successCount / successThreshold * 100`) is **uncapped** — hitting the threshold with days to spare stays a win past 100%, it doesn't clamp back down. A three-state, non-gradient **pacing** verdict — `green` (threshold already reached), `red` (mathematically out of reach even with a perfect rest of the week: `successCount + remainingScheduled < successThreshold`), `amber` (still achievable, everything else) — drives the Analytics Habit Breakdown's bar/badge (`StreakDots` itself doesn't surface pacing, only the per-day dots).

## Reordering & editing groups

- `components/ManageRoutinesSheet.tsx` — sheet for adding/reordering/renaming groups and items.
- `components/RoutineEditView.tsx` (`app/(app)/routines/[groupId]/edit/page.tsx`) — dedicated group-edit page. Also displays each group's and item's raw Mongo `_id` read-only (`select-all`, no copy button) — these are the ids the [external API](../api/external-api.md) needs to target a specific timer. Its per-item inline edit form (`SortableRow`) is also where `scheduledDays`/`successThreshold` (see "Weekly schedule + success threshold" above) get edited after creation — a day-of-week toggle row plus a threshold input, clamped client-side to never exceed the number of selected days.
- Deleting an item is a **soft delete** (`isActive: false`, via `DELETE /api/routine-items/[id]`) — history in `RoutineLog` is preserved even after an item is removed from the active list.

### Moving items between groups

`SortableRow`'s inline edit form also has a "Move to" select, listing the user's other `RoutineGroup`s (any routine group, or the standalone Habits group — "move to Habits" and "move to another routine" are the same operation, since Habits is just a `RoutineGroup` with `timeOfDay: "habit"`). Picking one `PATCH`s the item's `groupId` (see [routines-api.md](../api/routines-api.md)) and appends it at the end of the destination; the item then drops out of the current edit screen's local list.

History is preserved automatically — `RoutineLog` keys on `{ userId, routineItemId, date }`, never `groupId`, so a move is purely a `RoutineItem.groupId` update with no log migration needed. `scheduledDays`/`successThreshold` travel with the item untouched, so weekly streak/threshold math keeps working across the move.

## The "Start Routine" sequential session

Tapping "Start Routine"/"Continue Routine" on a group (not shown for Habit groups) opens `components/RoutineSession.tsx`, which steps through that group's items one at a time in a single full-screen flow rather than expanding rows individually. Each item gets its own server-side `in_progress` record as it becomes current, and closing the session mid-item flushes that item's progress rather than discarding it — full mechanics in [timer.md](timer.md).

## Files

- `app/(app)/routines/page.tsx` — server component: auth, seeding, loads groups/items/logs for the selected date.
- `components/RoutinesView.tsx` — top-level client state: selected date, logs map, opens/closes the timer and session overlays, all the `handleStateChange`/`handleStartTimer`/… handlers.
- `components/RoutineGroupCard.tsx` — per-group card: collapse logic, completion check, renders `RoutineItemRow` (or `HabitItemCard` for Habit groups).
- `components/RoutineItemRow.tsx` — per-item row and its full action panel (all states above).
- `components/RoutineSession.tsx` — sequential multi-item session (see [timer.md](timer.md)).
- `components/DateNav.tsx` — the `< Today >` date picker driving `selectedDate`.
- `components/ManageRoutinesSheet.tsx`, `components/RoutineEditView.tsx` — group/item management (also the path for editing a Habit item — see [habits.md](habits.md)).
- `lib/routine-visibility.ts` — single source of truth for "does this item show today," `isItemVisibleOn(item, dateStr)`: true when `dateStr`'s weekday is in `item.scheduledDays` (default every day). No itemType-specific rule lives here anymore — `weekly_review`/`routine_review` read as Sunday-only purely because they're seeded with `scheduledDays: [0]` (see "Item types" above). Called from `RoutineGroupCard` (visible items + "off-schedule groups" collapse, above), `RoutinesView` (progress counts, session item list, timer auto-advance), `lib/routine-session-actions.ts` (`isGroupFullyResolved`/`findNextItemInGroup`), and `GET /api/habits`.
- `lib/routine-progress.ts` — the shared weekly-progress math (see "Weekly schedule + success threshold" above).
- `lib/seed.ts` — idempotent seeding of default groups/items for new users.

## Depends on

[`docs/api/routines-api.md`](../api/routines-api.md) — routine groups, routine items, and routine logs endpoints. [`routine-review.md`](routine-review.md) for the `routine_review` item type's own flow.
