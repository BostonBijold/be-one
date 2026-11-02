# Work Time Tracker: Build Spec Corrections

> **Status:** Pre-build corrections to the [Work Time Tracker Build Spec](work-spec.md), reviewed against the repo on 2026-11-02.
> **Precedence:** Where this file and the Build Spec disagree, this file wins. Anything not mentioned here stays as the Build Spec describes it.
> **Lifetime:** Once Phase 1 ships, `docs/features/work.md` and `docs/api/work-api.md` become the source of truth and this file can be deleted.

---

## 1. Data Storage: New Collections Only

All work values are saved in new, work-only MongoDB collections. No field is added to any existing collection, which keeps R3 intact.

| Collection | Model | Stores |
|---|---|---|
| `workcategories` | `models/work/WorkCategory.ts` | Each user's category tiles, including color token, break flag, and target duration |
| `worksessions` | `models/work/WorkSession.ts` | Every timed or manual session, including label, times, duration, notes, and time zone |

Mongoose creates both collections the first time they are written to, so no migration is needed. Set each collection name explicitly in its schema options so it survives model renames and extraction.

Values introduced by these corrections are stored as follows:

| New value | Collection | Field |
|---|---|---|
| Session time zone | `worksessions` | `timeZone` |
| Category color token (replaces hex) | `workcategories` | `color` |
| Seeded target durations | `workcategories` | `defaultDurationMin` |

### 1.1 `WorkCategory` (replaces Build Spec section 5)

```ts
const WorkCategorySchema = new Schema<IWorkCategory>(
  {
    userId: { type: String, required: true },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    color: {
      type: String,
      enum: ["olive", "olive-light", "gold", "muted", "dim", null],
      default: null, // null = neutral
    },
    order: { type: Number, required: true },
    isBreak: { type: Boolean, default: false },
    defaultDurationMin: { type: Number, default: null },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "workcategories" }
);

WorkCategorySchema.index({ userId: 1, order: 1 });
WorkCategorySchema.index({ userId: 1, label: 1 }, { unique: true, name: "unique_category_label_per_user" });
```

`color` stores a Tailwind token name, not a hex value. Tokens can change, as they did in the readability pass, and stored hex values would go stale.

### 1.2 `WorkSession` (replaces Build Spec section 5)

```ts
const WorkSessionSchema = new Schema<IWorkSession>(
  {
    // A String, like RoutineLog.userId. Do NOT copy RoutineLog's `index: true`; see below.
    userId: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "WorkCategory", default: null },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    isBreak: { type: Boolean, default: false },
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null }, // must be explicitly null while running
    durationSeconds: { type: Number, default: null },
    notes: { type: String, default: null },
    source: { type: String, enum: ["timer", "manual"], required: true },
    pomodoroType: { type: String, enum: ["focus", "short", "long", null], default: null }, // reserved for Phase 3
    timeZone: { type: String, required: true }, // IANA name from the client, e.g. "America/Denver"
  },
  { timestamps: true, collection: "worksessions" }
);

WorkSessionSchema.index({ userId: 1, startTime: -1 });
WorkSessionSchema.index(
  { userId: 1 },
  {
    unique: true,
    name: "one_running_session_per_user",
    partialFilterExpression: { endTime: null },
  }
);
```

Requirements for the running-session index:

- **No `index: true` on `userId`.** It would create a plain index with the default name `userId_1`. An unnamed unique partial index on the same key would want that name too, and auto-indexing failures do not fail requests. The result could be no uniqueness enforcement at all.
- **Surface index failures.** After `connectDB()`, `POST /api/work/sessions/start` must `await WorkSession.init()` so an index build failure becomes a visible error.
- **Verify on the first build.** Confirm the index exists with `db.worksessions.getIndexes()`. If the server rejects the `{ endTime: null }` filter, use `{ endTime: { $type: "null" } }`.

`timeZone` is required on both session-creating routes. The client sends `Intl.DateTimeFormat().resolvedOptions().timeZone`. Phase 4's hour-of-day report depends on it, and old sessions cannot be backfilled accurately later.

### 1.3 Seed (replaces Build Spec section 5, "Seed")

`lib/work/seed.ts` runs lazily from `GET /api/work/categories` when the user has no categories. Do not follow the pattern in `lib/seed.ts`: its check-then-create approach can race, and React Strict Mode runs effects twice in dev.

Use `bulkWrite` with one upsert per category, filtered on `{ userId, label }` and using `$setOnInsert`.

| Order | Label | `isBreak` | `color` | `defaultDurationMin` |
|---|---|---|---|---|
| 0 | Lunch | true | `muted` | 30 |
| 1 | Break | true | `muted` | 15 |
| 2 | Email | false | `gold` | none |
| 3 | Desk Tickets | false | `olive` | none |
| 4 | Dash | false | `olive-light` | none |
| 5 | Project Management | false | `gold` | none |
| 6 | Meetings | false | `muted` | none |
| 7 | Research | false | `olive-light` | none |

The Lunch and Break targets make the target ring states reachable and testable in Phase 1, since category editing does not arrive until Phase 2.

---

## 2. Behavior and API Corrections

### 2.1 Local day queries (replaces the `localDate` guidance in sections 6 and 7)

`RoutineLog` can use `localDate` because it stores a date string. `WorkSession` stores only UTC timestamps, so a bare `YYYY-MM-DD` does not tell the server where the user's day begins.

```
GET /api/work/sessions?from=<ISO>&to=<ISO>
```

- The client computes `from` and `to` from its own local midnight boundaries.
- A session matches when `startTime >= from` and `startTime < to`.
- A session crossing midnight belongs entirely to the day it started.
- A running session that started yesterday stays in the Current Session pane but is not counted in today's list or totals.
- Return `400` if either parameter is missing or invalid, or if `from >= to`.

### 2.2 Stop with a chosen end time (amends section 6.2)

`POST /api/work/sessions/:id/stop` accepts `{ notes?, endTime? }`.

- Without `endTime`, the server uses its own current time.
- With `endTime`, the value must be after `startTime` and no later than the server's current time. Otherwise return `400`.
- Apply the update conditionally on `{ _id, userId, endTime: null }`. If nothing matches and the session exists, return it unchanged, ignoring `endTime`. Return `404` if it does not exist.
- The forgotten-timer sheet's "Set end time" action uses this route.

The server still computes `durationSeconds`. The rule against trusting the client clock applies to "now", not to a time the user deliberately picks.

### 2.3 Notes and running-session edits (amends sections 6.2 and 6.4)

| Session state | Editable through `PATCH` |
|---|---|
| Running | `label`, `notes`, `startTime` |
| Stopped | `label`, `notes`, `startTime`, `endTime` |

- Notes autosave through a debounced `PATCH` while the user types.
- Before switching category or stopping, the client awaits any pending notes save.
- On `pagehide`, the client flushes pending notes with `fetch(..., { keepalive: true })`.

### 2.4 Forgotten-timer guard (amends section 6.3)

- Run the 12-hour check on load, `focus`, `visibilitychange`, and `pageshow`.
- Also run it before starting a new session. If the running session is 12 hours or older, show the sheet instead of switching.
- Hold the tapped category and start it once the sheet is resolved. Dismissing the sheet cancels the start.

### 2.5 Validation (amends sections 6.1, 6.4, and 6.5)

| Rule | Response |
|---|---|
| Stopped or manual session has `endTime <= startTime` | `400` |
| Manual or edited `endTime` is in the future | `400` |
| Running session's edited `startTime` is in the future | `400` |
| Label is empty after trimming, or longer than 80 characters | `400` |
| Edited or manual range overlaps another session | `409` with `{ error }` |

Overlap check:

- Exclude the session being edited.
- Treat a running session's end as the server's current time.
- Sessions overlap when `other.startTime < newEnd` and `otherEnd > newStart`.
- Check all of the user's sessions, not only those on the displayed day.

On the client, clamp displayed elapsed time to a minimum of 0 to absorb clock differences between client and server.

---

## 3. Access Guard (amends R6)

`lib/work/guard.ts` is the only access check and the only place that knows about `dev-local-user`. The layout and every API route use it, and neither calls `isAdmin` directly.

```ts
export async function requireWorkUser(): Promise<{ userId: string } | null> {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) return null;
  const userId =
    session?.user?.id ?? (process.env.SKIP_AUTH === "true" ? "dev-local-user" : null);
  return userId ? { userId } : null;
}
```

- `app/(work)/work/layout.tsx` calls `notFound()` when the result is `null`.
- API routes return `404` with `{ error: "Not found" }` when the result is `null`.
- The guard must not exit early on a null session, because `SKIP_AUTH` has none.
- `isAdmin` always returns true under `SKIP_AUTH`, so test the non-admin `404` with a real non-admin login and `SKIP_AUTH` unset.

---

## 4. Layout and Styling Corrections

### 4.1 Page scrolling (amends section 3, "Browser behavior")

`app/globals.css` fixes `body` in place with `overflow: hidden`, and `app/(app)/layout.tsx` supplies the scroll container `/work` does not inherit. The work layout must supply its own, for example `h-full overflow-y-auto overscroll-none`, including safe-area padding. The sticky left pane sticks relative to this container.

### 4.2 Width exception

The desktop two-pane layout is a deliberate exception to the 420px maximum width in `CLAUDE.md`. Below `lg`, keep the stacked layout within `max-w-mobile`.

### 4.3 Design tokens (replaces the section 3 table)

`tailwind.config.ts` is the source of truth. Use token names and do not copy hex values.

| Role | Token |
|---|---|
| Background | `bg` |
| Card surface | `card` |
| Primary text | `text` |
| Secondary text | `muted` |
| Dimmest allowed text | `dim` |
| Success / running | `olive` |
| Accent | `gold` |
| Warning ring (75–99% of target) | `amber` |
| Over-target ring | `burgundy` |
| Over-target clock, errors, destructive text | `burgundy-light` |
| Dividers / pending fill | `border-light` |

The Build Spec's `#5a6b35` olive and `#e8e0cc` parchment are out of date, and its "parchment-dim" token does not exist.

Also follow these rules:

- **Do not copy ring colors from `TimerScreen`.** `components/TimerScreen.tsx` still hardcodes the old `#5a6b35` olive. Copy the behavior and use tokens.
- **Text contrast.** Olive fills take dark text (`bg-olive text-bg`). Text must meet WCAG AA against `card`.
- **Minimum sizes.** Text uses `text-micro` (11px) or larger. Inline icons are at least 13px. Tap targets are at least 44px.
- **Category color classes.** Map each token to complete literal class names in `components/work/`. Tailwind cannot detect a constructed class such as `` `bg-${color}` ``.
- **Class locations.** Tailwind does not scan `lib/`, so class names must not live in `lib/work/**`.

### 4.4 Red rule (replaces the section 3 rule and the section 11 wording)

Red is for destructive actions, errors, and the over-target timer state only. It is never a category color. When over target, the ring uses `burgundy` and the `+MM:SS` clock uses `burgundy-light`, which removes the "ring only" limit.

### 4.5 Tab title (amends section 3)

Browsers slow timers in hidden tabs, sometimes to once a minute.

- While the tab is visible, show `HH:MM:SS · Label`.
- While hidden, show `HH:MM · Label`.
- The work layout sets `Work` as its metadata title, and that is what gets restored on stop.

---

## 5. Extraction Check Corrections (amends section 10)

### 5.1 Replace check 1

The original command has unquoted `--include` globs. In zsh it fails with `no matches found`, prints nothing to stdout, and looks like a pass. It also misses dynamic imports, side-effect imports, relative imports, and root files.

Run this from the repo root. It must print nothing:

```sh
grep -rEn --include='*.ts' --include='*.tsx' \
  "['\"][^'\"]*(lib/work|components/work|models/work|\(work\)|\.\.?/work)(/[^'\"]*)?['\"]" \
  app components lib models middleware.ts \
  | grep -vE '^(app/\(work\)|app/api/work|components/work|lib/work|models/work)/'
```

### 5.2 Amend check 3

Allowed changes are the R1 paths, `docs/project-structure.md`, `docs/features/work-spec.md`, and this file.

### 5.3 Amend check 4

Run the non-admin part with a real non-admin login and `SKIP_AUTH` unset (see section 3).

---

## 6. Added Phase 1 Acceptance Criteria

Add these to section 11:

- [ ] Two simultaneous `POST /api/work/sessions/start` requests leave exactly one running session.
- [ ] `db.worksessions.getIndexes()` shows `one_running_session_per_user` as unique and partial.
- [ ] Running a `GET /api/work/categories` request twice at once creates no duplicate categories.
- [ ] No fields or documents are added to any existing collection.
- [ ] Every session stores a valid `timeZone`.
- [ ] Sessions appear on the correct local day, including one that crosses midnight.
- [ ] "Set end time" stores the chosen time and computes the duration from it.
- [ ] Notes survive switching category and closing the tab.
- [ ] A tab left open for 12 hours or more shows the forgotten-timer sheet before a category tap can switch sessions.
- [ ] Manual entries and edits that end in the future are rejected, and a range overlapping the running session is rejected.
- [ ] The page scrolls on desktop and mobile, and the left pane stays sticky on desktop.
- [ ] Lunch and Break show the olive, amber, and burgundy ring states.

Replace the section 11 item on `document.title` with: "The tab title shows `HH:MM:SS` while visible and `HH:MM` while hidden."

Replace "no red outside destructive/error states" with: "no red outside destructive actions, errors, and the over-target timer state."

---

## 7. Requirements Before Later Phases

**Before `/work` opens to non-admins:**
- Add `workcategories`, `worksessions`, and any later work collections to `DELETE /api/user/delete-account`. Phase 1 deliberately leaves them out to honor the isolation rules, which means deleting the admin account would leave its work data behind.
- Add work data to the "Content you create" list in `app/privacy/page.tsx`.

**Phase 2 (Google Calendar):**
- Google refresh tokens expire after 7 days while an OAuth app is in Testing status, so plan for reconnecting or for publishing the app.
- `calendar.events` is a sensitive scope, so publishing may require Google's verification.
- Name the encryption key env var before building. Document only the name, per the secrets policy.
- Renaming or archiving categories must keep labels unique per user under `unique_category_label_per_user`, or that index must change.
