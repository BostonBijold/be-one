# Work Time Tracker (`/work`) — Build Spec for Be One

> **Corrections:** [`work-spec-corrections.md`](work-spec-corrections.md) amends this spec and takes precedence wherever the two disagree. Once Phase 1 ships, [`work.md`](work.md) and [`../api/work-api.md`](../api/work-api.md) are the source of truth for built behavior; this file remains the plan for later phases.

> **Status:** Experiment. Built inside the Be One repo, isolated so it can be extracted into its own repo later. Browser app only: do not touch `ios/`, `capacitor.config.ts`, or any native plugin code.
> **Scope of this document:** Phase 1 (MVP) is fully specified. Phases 2–5 are outlined and must not be started until Phase 1 is accepted.

---

## 1. Read First (before writing any code)

Read these in the repo and match their conventions. Do not guess at names or tokens.

- `docs/project-structure.md` and `docs/features/timer.md` — the timer model this tracker borrows patterns from.
- `docs/api/routines-api.md` — to match the API response and error shape conventions.
- `tailwind.config.*`, `app/globals.css`, `app/layout.tsx` — design tokens and font setup.
- `components/TimerScreen.tsx` — ring visuals, elapsed-time pattern, color thresholds.
- `lib/mongoose.ts`, `lib/auth.ts`, `lib/admin.ts`, `middleware.ts` — shared infrastructure this feature may import.
- `models/RoutineLog.ts` — how `userId` is typed and referenced, so work models match it exactly.
- `lib/seed.ts` — the idempotent-seed pattern.

Note: local dev may run with `SKIP_AUTH` and the `dev-local-user` identity. `/work` must work in that mode too.

---

## 2. Hard Constraints: Isolation (Extraction-Ready)

This feature must be removable from Be One in about a day. These rules are mandatory.

**R1. Namespace everything.** All work code lives only in these paths:

| Kind | Path |
|---|---|
| Pages | `app/(work)/work/**` |
| API routes | `app/api/work/**` |
| Components | `components/work/**` |
| Logic / hooks / helpers | `lib/work/**` |
| Models | `models/work/**` |
| Docs | `docs/features/work.md`, `docs/api/work-api.md` |

No work file goes in a shared folder.

**R2. One-way dependencies.** Work code may import only this shared infrastructure:
- `lib/mongoose.ts` (DB connection)
- `lib/auth.ts` (session)
- `lib/admin.ts` (`isAdmin(email)`)
- Tailwind config, `globals.css`, and the font setup from `app/layout.tsx`

Nothing outside the R1 paths may import from the work paths.

**R3. Do not modify existing models or collections.** No new fields on `User`, `RoutineLog`, `RoutineItem`, or anything else. Work data lives only in the work collections, keyed by `userId`, with no references into routine collections.

**R4. Copy, don't edit, shared UI and timer code.** If you want a pattern from `TimerScreen.tsx`, `useRingDrag.ts`, or `TimelineBar.tsx`, copy it into `components/work/` or `lib/work/`. Do not modify the Be One originals and do not import them. Presentational components are copied, not shared.

**R5. Separate layout, not the bottom nav.** The page lives in its own route group, `app/(work)/work/`, with its own `layout.tsx`. It must NOT inherit `app/(app)/layout.tsx` and must NOT appear in the bottom nav. There is no link to `/work` from Be One's UI in Phase 1; reach it by URL.

**R6. Access gate in one place.** `app/(work)/work/layout.tsx` checks the session and calls `isAdmin(email)`; non-admins get `notFound()`. Every `/api/work/**` handler performs the same check through one shared helper, `lib/work/guard.ts`. Changing who can use `/work` later is a one-file edit. Auth itself still goes through the existing `middleware.ts` (do not add `/work` to the public routes).

**R7. No cross-feature data.** No combined "personal + work" dashboard, no reads of routine/habit/virtue data, and no writes to them.

**R8. Google Calendar is fully separate (Phase 2).** Its own OAuth client, its own token storage collection, its own routes under `/api/work/calendar/**`. Do not add the Calendar scope to the existing Auth.js Google provider.

**R9. Do not edit** `components/BottomNav.tsx`, `app/(app)/**`, the FAB, `app-intents`, `external` API routes, or `lib/routine-*`. The work tracker's timer is independent of the routine single-active-timer invariant.

---

## 3. Design: Follow Be One

The work tracker must look like it belongs to Be One. Pull tokens from the existing Tailwind config and CSS; do not hardcode hex values where a token exists. Reference values:

| Role | Value |
|---|---|
| Background | `#18160f` (dark only; no light mode) |
| Primary text | parchment `#e8e0cc` |
| Success / running | olive `#5a6b35` (plus the existing `olive-light` token) |
| Accent | gold `#c4a84a` |
| Warning / running over target | existing `amber` token |
| Over target, ring only | existing burgundy used in `TimerScreen` |
| Dividers / pending fill | existing `border-light` token |

**Typography**
- **IBM Plex Mono** for the running clock, durations, start/end times, and report numbers.
- **Playfair Display** for page and section headings only.
- Use whatever body font Be One already sets; do not add fonts.

**Rules**
- Restrained and stoic: no emoji, no gradients, no bright or neon colors, no celebratory animation.
- Red is reserved for destructive actions and errors. Never use it for categories.
- Category buttons draw their default colors from the existing palette (olive, gold, parchment-dim, and muted variants of those). Default colors must work on the dark background without clashing.
- Timer ring: copy the `TimerScreen` behavior. With a target (Pomodoro or a category's `defaultDurationMin`), the ring runs olive (0–74%), amber (75–99%), burgundy (at or over target), and the clock flips to `+MM:SS` over target. With no target (the free stopwatch case), the ring is always olive and fills over a 30-minute soft cap, as stopwatch items do today.
- Match the existing component feel: rounded buttons, the same sheet/modal style, and the same spacing scale as `AddHabitSheet.tsx` and friends.

**Browser behavior**
- Set `document.title` to `HH:MM:SS · Label` while a session runs, and restore it on stop.
- Desktop (≥ `lg`): two panes. Left pane is sticky and holds the timer; right pane scrolls. Below `lg`: stack, timer on top, buttons below.
- Add a short keyboard-friendly path: focusing the "Add your own" input and pressing Enter starts a session. No global hotkeys in Phase 1 (they conflict with typing).

---

## 4. Layout (Phase 1)

```
┌─────────────────────────────┬──────────────────────────────────┐
│  Current Session            │  Categories (3×3 grid)           │
│                             │                                  │
│  Dash                       │  [Lunch]   [Break]    [Email]    │
│  00:23:14   (ring)          │  [Tickets] [Dash]     [PM]       │
│                             │  [Meetings][Research] [+ Custom] │
│  [ Stop ]                   │                                  │
│                             │  Add your own: [ label…   ⏎ ]    │
│  Notes (optional)           │                                  │
│                             │  Today                           │
│                             │  09:00–09:45  Dash        0:45   │
│                             │  09:50–10:20  Tickets     0:30   │
│                             │  Total tracked: 1h 15m           │
│                             │  Focus 1h 15m · Break 0m         │
└─────────────────────────────┴──────────────────────────────────┘
```

- Idle state: the left pane shows "Nothing running" and the clock at `00:00:00`; tapping any category starts a session.
- Running state: tapping a different category stops the current session and starts the new one in a single server call (no prompt).
- The ninth tile, "+ Custom", focuses the "Add your own" input. Free-text sessions use a neutral color.
- A "Break" session is any session whose category has `isBreak: true`. Breaks are timed like any session and are excluded from "Focus" totals.
- Today's list is editable per row (see 6.4).

---

## 5. Data Model (Mongoose; match `userId` type used by `RoutineLog`)

### `models/work/WorkCategory.ts` → collection `workcategories`
```ts
{
  userId,                       // same type/ref convention as RoutineLog.userId
  label: string,
  color: string,                // hex from the palette, or null → neutral
  order: number,                // 0–7 for the grid (the 9th tile is the Custom tile)
  isBreak: boolean,
  defaultDurationMin?: number,  // optional target; enables the ring color states
  archived: boolean,            // default false; soft-delete
  createdAt, updatedAt
}
```
Index: `{ userId: 1, order: 1 }`.

### `models/work/WorkSession.ts` → collection `worksessions`
```ts
{
  userId,
  categoryId?: ObjectId,        // null for free-text sessions
  label: string,                // denormalized for reporting; survives category rename/delete
  isBreak: boolean,             // denormalized
  startTime: Date,              // UTC; set server-side
  endTime: Date | null,         // null while running
  durationSeconds?: number,     // computed server-side on stop and on time edits
  notes?: string,
  source: "timer" | "manual",   // Phase 5 adds "calendar-import"
  pomodoroType?: "focus" | "short" | "long" | null, // Phase 3; field reserved, unused in Phase 1
  createdAt, updatedAt
}
```
Indexes:
- `{ userId: 1, startTime: -1 }`
- **Unique partial** `{ userId: 1 }` where `endTime: null`. This enforces one running session per user at the database level, so two tabs cannot start two sessions.

### Deferred (do not create in Phase 1)
`workPreferences` (Phase 3), calendar token collection (Phase 2).

### Seed
`lib/work/seed.ts`: idempotent, run lazily on first authenticated call to `GET /api/work/categories` if the user has zero categories. Defaults, in order: Lunch (`isBreak`), Break (`isBreak`), Email, Desk Tickets, Dash, Project Management, Meetings, Research. Do not seed any other collection.

---

## 6. Behavior (Phase 1)

All times are stored in UTC. The client displays local time and sends `?localDate=YYYY-MM-DD` (computed with `toLocaleDateString("en-CA")`) for "today" queries, as `/api/analytics` does. Never derive "today" from server UTC.

### 6.1 Start
`POST /api/work/sessions/start` with `{ categoryId }` or `{ label }`.
1. If a session is running, stop it first (set `endTime = now`, compute duration) in the same request.
2. Create the new session with `startTime = now` (server clock).
3. Return the new session and, if one was stopped, the stopped session.

Handle the unique-index conflict gracefully: on duplicate-key error, re-fetch the running session and retry the stop-then-start once.

### 6.2 Stop
`POST /api/work/sessions/:id/stop` with optional `{ notes }`.
- `endTime = now`; `durationSeconds = round((endTime - startTime) / 1000)`, computed on the server. The client-sent clock is never trusted.
- Stopping an already-stopped session is a no-op that returns the existing record (idempotent).

### 6.3 Live timer (client)
Copy the `TimerScreen` approach:
- `startTime` from the server is the source of truth.
- Display `elapsed = Date.now() - startTime`, recomputed on a 1-second `setInterval` that is purely cosmetic.
- Recompute immediately on `visibilitychange`, `focus`, and `pageshow`.
- On page load, `GET /api/work/sessions/active`; if a session is running, resume the display from its `startTime`. No heartbeat is needed.
- Multi-tab: when the window regains focus, re-fetch the active session so a start or stop in another tab is reflected.

**Forgotten timer guard:** if the running session is older than 12 hours on load, show a sheet: "This session has been running for N hours." Actions: "Stop now" or "Set end time" (a time picker bounded by `startTime` and now).

### 6.4 Edit and delete
- Tap a row in Today to open an edit sheet: label, notes, start time, end time (running sessions allow editing start only).
- Validate `endTime > startTime`, and that the edited range does not overlap another session. Show a clear inline error on overlap; do not auto-adjust other sessions.
- Recompute `durationSeconds` server-side on any time edit.
- Delete requires a confirm step.
- `source` stays `"timer"` for edited timer sessions.

### 6.5 Manual entry (Phase 1, minimal)
"Add past block" action in Today's header: pick a category or type a label, date, start time, end time. Creates a `source: "manual"` session with the same overlap validation.

### 6.6 Summary
Today panel shows the list, total tracked, and the Focus vs Break split (`isBreak` false vs true). Totals include the running session's live elapsed time.

---

## 7. API (Phase 1)

All routes: authenticate, call the `lib/work/guard.ts` admin check, scope every query by `userId`. Match the response and error shapes in `routines-api.md`.

```
GET    /api/work/categories                    list (seeds defaults on first call)
GET    /api/work/sessions/active               the running session or null
GET    /api/work/sessions?date=YYYY-MM-DD      sessions for the local day (use localDate param pattern)
POST   /api/work/sessions/start                { categoryId | label }
POST   /api/work/sessions/:id/stop             { notes? }
POST   /api/work/sessions                      manual entry (6.5)
PATCH  /api/work/sessions/:id                  edit (6.4)
DELETE /api/work/sessions/:id
```

Category editing (`POST`/`PATCH`/`DELETE /api/work/categories`) is Phase 2.

---

## 8. Phases

**Phase 1: MVP (this build).** Everything in sections 4–7. Fixed seeded categories, free-text sessions, live timer, edit/delete/manual entry, daily summary, `document.title`, forgotten-timer guard.

**Phase 2: Categories and Calendar.**
- Category editing: rename, recolor, reorder, replace, archive.
- Google Calendar per R8. Separate OAuth client; scope `calendar.events` only; refresh token stored encrypted in its own collection. Create the event on start, patch its end on stop and on edits, delete on delete. One event per session. Breaks are not sent to Calendar by default (a setting can enable them). Store `googleCalendarEventId` and `googleCalendarId` on the session. Test in a desktop browser first.

**Phase 3: Pomodoro.** `workPreferences` collection. Focus/short/long modes (25/5, 50/10, custom), countdown ring with the target color states, auto-start or wait for the next block, long break every N focus blocks. Sessions get `pomodoroType`.

**Phase 4: Reports.** `/work/reports`: time per category by day, week, and month; focus vs break; longest uninterrupted block; hour-of-day heatmap; this week vs last week; CSV/JSON export. Follow the visual conventions of `AnalyticsContent` (olive/amber on dark), copied rather than imported per R4.

**Phase 5: Polish.** Drag-to-reorder, "block future time", reverse Calendar sync (polling), optional offline queue. Any combined personal+work view is a deliberate decision that breaks R7; discuss before building.

---

## 9. Documentation (part of the work, not optional)

Follow the existing convention: each doc starts with `> **Keep this file updated after any code change in this area — do not let it drift from actual implementation.**`

- Create `docs/features/work.md` (behavior, files, depends-on).
- Create `docs/api/work-api.md` (routes, shapes, errors).
- Add rows for both to the Feature Docs and API Docs tables in `docs/project-structure.md`, and add `app/(work)/`, `components/work/`, `lib/work/`, `models/work/` to the Folder Map with a note that the feature is isolated and extraction-ready.
- Never put secrets or connection strings in docs; reference env var names only.

---

## 10. Extraction Check (run before calling any phase done)

1. **No inbound imports.** This must return nothing:
   `grep -rEn "from ['\"].*(lib/work|components/work|models/work|app/\(work\))" app components lib models --include=*.ts --include=*.tsx | grep -vE "^(app/\(work\)|app/api/work|components/work|lib/work|models/work)"`
2. **No outbound imports beyond R2.** Every import in work files that points outside the work paths must be one of: `lib/mongoose`, `lib/auth`, `lib/admin`, config/CSS/fonts, or a third-party package.
3. **No modified shared files.** `git diff --stat` shows changes only under the R1 paths plus `docs/project-structure.md`.
4. **Layout isolation.** `/work` renders without the bottom nav; a non-admin user gets a 404 on `/work` and on every `/api/work/**` route.
5. **Dev mode.** `/work` works with `SKIP_AUTH` / `dev-local-user`.

---

## 11. Phase 1 Acceptance Criteria

- [ ] Clicking a category starts a session; clicking another stops the first and starts the second in one call.
- [ ] Only one session can be running per user, even with two tabs open (the database index enforces it).
- [ ] Closing and reopening the tab resumes the running timer at the correct elapsed time; switching away and back snaps the display immediately.
- [ ] Durations are computed server-side; editing times recomputes them.
- [ ] Overlapping edits and manual entries are rejected with a clear message.
- [ ] A session older than 12 hours triggers the forgotten-timer sheet.
- [ ] Today's total and the Focus/Break split include the live session.
- [ ] `document.title` shows the running timer.
- [ ] Visually consistent with Be One: dark palette, IBM Plex Mono for numbers, Playfair for headings, no red outside destructive/error states.
- [ ] Desktop two-pane and mobile stacked layouts both work.
- [ ] All section 10 checks pass and the docs in section 9 exist.

---

## 12. Decisions Already Made (from the original spec's open questions)

- Separate collections, not embedded under `User`.
- One Calendar event per session (Phase 2), not a single extended "running" event.
- Breaks stay internal to the app by default; a setting can send them to Calendar.
- Categories are a fixed seeded set in Phase 1; full editing arrives in Phase 2. "Add your own" free-text is in Phase 1.
- No server heartbeat: server-stamped `startTime` plus recompute-on-focus is sufficient.
- Work and routine timers are independent; starting one never stops the other.
