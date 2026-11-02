> **Keep this file updated after any code change in this area — do not let it drift from actual implementation.**

# Work Time Tracker (`/work`)

A browser-only experiment for tracking time at work: tap a category, a timer runs, and the day builds into a list with totals. Reached by URL only — nothing in Be One links to it. Built to be removable in about a day, so it is deliberately isolated from the rest of the app. Routes and shapes are in [`work-api.md`](../api/work-api.md). Later phases are planned in [`work-spec.md`](work-spec.md) as amended by [`work-spec-corrections.md`](work-spec-corrections.md).

## Isolation

All work code lives in `app/(work)/work/`, `app/api/work/`, `components/work/`, `lib/work/`, and `models/work/`. Nothing outside those paths imports from them. Work code imports only `lib/mongoose.ts`, `lib/auth.ts`, and `lib/admin.ts` from the rest of the app, plus Tailwind tokens and the root layout's fonts. Shared UI is copied, not imported, so the ring and sheet here are copies of the patterns in `TimerScreen.tsx` and `AddHabitSheet.tsx`.

The work timer is independent of the routine timer: starting one never stops the other.

To check the import boundary, run this from the repo root. It must print nothing:

```sh
grep -rEn --include='*.ts' --include='*.tsx' \
  "['\"][^'\"]*(lib/work|components/work|models/work|\(work\)|\.\.?/work)(/[^'\"]*)?['\"]" \
  app components lib models middleware.ts \
  | grep -vE '^(app/\(work\)|app/api/work|components/work|lib/work|models/work)/'
```

## Access

`lib/work/guard.ts`'s `requireWorkUser()` is the only access check and the only place that knows about `dev-local-user`. The layout and every API route use it, so changing who can use `/work` is an edit to that one function.

- Non-admins get a 404 on the page and on every API route.
- Logged-out requests are handled earlier by `middleware.ts`, as for the rest of the app: pages redirect to `/login`, and API routes return `401`.
- `isAdmin` always returns true under `SKIP_AUTH`, so testing the non-admin 404 needs a real non-admin login with `SKIP_AUTH` unset.

## Data

Two work-only collections hold everything. No existing collection is touched.

**`workcategories`** (`models/work/WorkCategory.ts`): `userId`, `label`, `color`, `order`, `isBreak`, `defaultDurationMin`, `archived`.
- `color` is a Tailwind token name, not a hex value, so stored rows can't go stale when the palette changes.
- Indexes: `{ userId, order }`, and unique `{ userId, label }`.

**`worksessions`** (`models/work/WorkSession.ts`): `userId`, `categoryId`, `label`, `isBreak`, `startTime`, `endTime`, `durationSeconds`, `notes`, `source`, `pomodoroType` (reserved for Phase 3), `timeZone`.
- `label` and `isBreak` are denormalized, so reports survive category changes.
- `timeZone` is the client's IANA name, kept for Phase 4's hour-of-day report.
- Indexes: `{ userId, startTime: -1 }`, and `one_running_session_per_user`, which is unique on `{ userId }` where `endTime` is null.

`userId` on `WorkSession` deliberately omits `RoutineLog`'s `index: true`. That would create a plain index with the default name `userId_1`, and a conflict with the partial index would fail silently, since auto-index failures don't fail requests. `POST /sessions/start` also awaits `WorkSession.init()`, so a failed index build surfaces as an error.

### Seed

`GET /api/work/categories` seeds eight defaults for a user with no categories: Lunch and Break (`isBreak`, with 30- and 15-minute targets), Email, Desk Tickets, Dash, Project Management, Meetings, and Research. `lib/work/seed.ts` upserts by the unique `{ userId, label }` index rather than checking then creating, so concurrent first loads can't create duplicates.

The seed only runs for a user with no category rows at all, so archiving every button doesn't bring the defaults back.

### Managing categories

The grid grows with the list: there is no limit on buttons, and a "New" tile always comes last. "Edit" in the Categories header switches tiles from starting a session to opening a sheet for label, color, target minutes, and whether the button counts as a break.

- **Archive, never delete.** Archiving hides a button and keeps its row. "Archived (n)", shown while editing, lists them with a Restore action, and a restored button returns to its old position.
- **Changes apply to new sessions.** Past and running sessions keep the label and break flag they were created with, so renaming a button doesn't rewrite history. A running session's ring does follow an edited target.
- **Archiving a running button** leaves the session running with its target intact.
- **Labels are unique per user,** ignoring case and including archived buttons. Reusing an archived label returns a message pointing at Restore.
- **New buttons go last.** There is no way to reorder buttons yet.

This takes the category-editing part of Phase 2 early, apart from reordering. The free-text input is now labeled "One-off session" rather than "Add your own", since "New" is what adds a button.

## Behavior

**Starting and switching.** Tapping a category or pressing Enter in "One-off session" starts a session. If one is running, the same server call stops it, using one timestamp for both so they touch without overlapping. Tapping the category already running does nothing. If two requests race, the database index allows only one running session, the loser retries once, and a second loss returns `409`.

**The clock.** `startTime` from the server is the source of truth, and elapsed time is always `now - startTime`, clamped at 0. The 1-second tick is cosmetic, so throttling can't lose time. The display recomputes on `visibilitychange`, `focus`, and `pageshow`, and those also re-fetch, so changes from another tab appear on return. A tab left open past midnight rolls over to the new day.

**The ring.** With a target, from a category's `defaultDurationMin`, it runs olive to 74%, amber to 99%, then burgundy, and the clock flips to `+MM:SS` in `burgundy-light`. With no target it stays olive and fills over a 30-minute soft cap. It uses tokens rather than `TimerScreen`'s hardcoded colors, which still include the old olive.

**Tab title.** `HH:MM:SS · Label` while visible, `HH:MM · Label` while hidden because browsers throttle hidden tabs, and `Work` when idle.

**Notes.** The draft autosaves 800ms after typing stops, and is saved before switching or stopping. On `pagehide` or when the tab is hidden, it's sent with `keepalive`, so it survives closing the tab.

**Forgotten timer.** A session running 12 hours or more shows a sheet on load and whenever the page regains focus, because switching would otherwise silently record the whole gap.
- Actions are Stop now, Set end time, and Keep running.
- Keep running stops the sheet reappearing for that session until the page reloads, but tapping a category still shows it.
- A tap that triggers the sheet is held and runs once the session is stopped. Keep running cancels it.
- The sheet closes if another tab stopped or replaced the session.

**Day attribution.** The client queries from its own local midnight to the next, and a session belongs entirely to the day it started. A running session from yesterday stays in the Current Session pane but isn't counted in today's list or totals.

**Editing.** Tapping a Today row opens a sheet for label, start, end, and notes, and running sessions have no end field. Only changed fields are sent, because the time inputs have minute precision and resending an untouched time would drop its seconds. Changing a label also changes what the session counts as: it takes on the category with that exact label, or becomes free-text and not a break if none matches. Delete needs a confirm step.

**Add past block.** Category or typed label, start, and end, created with `source: "manual"`. The form only adds blocks to today, because there is no view of other days yet and a block added for one would disappear. The API still accepts any past date.

**Validation.** End times can't be in the future, end must be after start, and ranges can't overlap another session. A running session counts as ending now, and the check covers all sessions, not just the displayed day. There is no transaction around the check and the write, so two simultaneous edits could still overlap. That's acceptable for one person's own data.

## Layout

The work layout provides its own scroll container, because `app/globals.css` fixes `body` with `overflow: hidden` and the app's usual scroll container belongs to `app/(app)/layout.tsx`. It also sets `color-scheme: dark`, which gives native inputs, pickers, checkboxes, and scrollbars their dark versions.

At `lg` and up, the page fills the window as two full-height panes, a deliberate exception to the app's 420px maximum width:
- **Left:** the session name, ring, Stop, notes, and Today. Once Today's list runs out of room it scrolls on its own with its totals pinned below it, and it scrolls to the newest row when one is added.
- **Right:** the one-off input and Edit at the top, then the buttons in four columns, scrolling on their own. Adding buttons never moves the timer or Today.

Everything is centered on the screen rather than aligned to the top, at every size, whenever it fits. In two panes, each column centers on its own, so the left and right content won't line up exactly. Content that doesn't fit still scrolls from its top. A short last row of buttons is centered too, which is why the buttons use a wrapping flex layout rather than a CSS grid.

A browser on a tablet is the main use, so the two tablet orientations get the most care:
- **Landscape** (usually `lg` and up) uses the two panes above.
- **Portrait** (`md`, up to 1023px) stacks timer, buttons, then Today at full width, with four columns of buttons. The ring sits beside the session name and Stop, which keeps the timer row short and puts the buttons in the middle of the screen.

Phones stack the same way within `max-w-mobile`, with the ring above its controls and three columns of buttons. The stacking order is the DOM order, and CSS grid placement rearranges it at wider sizes.

The ring is 288px at `lg` when the window is at least 800px tall, and 240px when shorter, so Today keeps room on small laptops. Notes stay collapsed behind "+ Add note" unless the session already has some.

**Buttons.** Each is a large touch target (88px tall from `md`, 76px on phones) with its label centered, a color bar on its left edge, and today's time for that category once it reaches a minute, counting only sessions still linked to the category. The running button fills with its color and takes dark text. Hover styles only apply where the device has a real pointer, since on touch screens they stick to whatever was tapped last, and buttons block long-press text selection and double-tap zoom. Those classes are complete literals in `components/work/categoryColors.ts`, since Tailwind can't detect constructed names. Tailwind doesn't scan `lib/`, so class names can't live in `lib/work/`.

Times in the Today list follow the browser's locale, as the native time inputs do.

## Files

| File | Purpose |
|---|---|
| `app/(work)/work/layout.tsx`, `page.tsx` | Access gate, scroll container, page entry |
| `components/work/WorkTracker.tsx` | Page composition and sheet state |
| `components/work/WorkTimer.tsx` | Ring and clock |
| `components/work/CategoryGrid.tsx` | Category tiles, edit mode, and "One-off session" |
| `components/work/CategorySheet.tsx`, `ArchivedCategoriesSheet.tsx` | Create, edit, archive, and restore buttons |
| `components/work/categoryColors.ts` | Literal color bar and fill classes, and the color picker's options |
| `components/work/TodayPanel.tsx` | Today's list and totals |
| `components/work/EditSessionSheet.tsx`, `AddPastBlockSheet.tsx`, `ForgottenTimerSheet.tsx` | Sheets |
| `components/work/WorkSheet.tsx` | Bottom-sheet shell and shared input classes |
| `lib/work/useWorkTracker.ts` | Client state: fetching, notes autosave, forgotten-timer logic, tab title |
| `lib/work/api.ts`, `time.ts`, `types.ts` | Client fetch wrapper, time helpers, response types |
| `lib/work/guard.ts` | Access check |
| `lib/work/route.ts` | Handler wrapper: access, DB connection, error responses |
| `lib/work/sessions.ts` | Server validation, overlap check, conditional stop, serialization |
| `lib/work/categories.ts` | Server validation, label uniqueness check, serialization for categories |
| `lib/work/seed.ts` | Default categories |

## Known gaps

- **No view of other days.** The list only shows today, so a session that started yesterday can't be seen or edited once it stops, and neither can one whose start is edited onto another day. Planned alongside reports.
- **Account deletion** does not purge work collections, because the isolation rules forbid editing `DELETE /api/user/delete-account`. Add them, and add work data to `app/privacy/page.tsx`, before opening `/work` to non-admins.
- **No automated tests.** The repo has no test runner, and adding one would break the isolation rules, so Phase 1 was verified with throwaway scripts that are not checked in.
