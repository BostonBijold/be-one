# A Good Man — Project Brief for Claude Code

## Vision
A stoic, masculine habit tracker and personal growth app rooted in virtue philosophy.
The goal: help the user *be* a good man, not just discuss it (Marcus Aurelius).
Inspired by Ben Franklin's 13 virtues (weekly focus rotation), agile project methodology,
and the insight that routines have a *projected* vs *actual* time — and the gap between
those two is where self-knowledge lives.

Primary user: Boston (the developer, building this for himself first).
Built mobile-first as a Vercel web app, designed to eventually become a native iOS/Android app.
The data layer must stay consistent for that future migration (MongoDB + REST API).

---

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: MongoDB via Mongoose
- **Auth**: Auth.js (NextAuth v5)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (free tier)
- **Future**: React Native wrapper around same API

---

## Design System

### Colors
```
bg-primary:     #18160f   (warm near-black — all backgrounds)
bg-card:        #211f17   (card surfaces)
bg-card-hover:  #2a2720
text-primary:   #e8e0cc   (parchment white)
text-muted:     #9a9280
text-dim:       #5a5548
olive:          #5a6b35   (primary action, streaks, done states)
olive-light:    #7a9248
gold:           #c4a84a   (virtue accent, etymology highlights)
tobacco:        #8b5a2b   (warnings, past-window states)
burgundy:       #7a2e2e   (missed, over-timer states)
burgundy-light: #a03a3a
amber:          #c47a2a   (timer warning — 75% of target elapsed)
blue-muted:     #4a7a9a   (goal/task layer — distinct from routine layer)
border:         #2e2c22
border-light:   #3d3b2e
```

### Typography
- **Headings/Virtue names**: Playfair Display (serif, italic for virtue word)
- **Data/Timers/Labels**: IBM Plex Mono
- **Body/UI**: Inter
- All loaded via Google Fonts

### Border Radius
- Cards: 12px
- Buttons: 8px
- Badges/pills: 20px (full round)
- Bottom sheet / modals: 16px top corners

### Layout
- Max width: 420px, centered
- Mobile-first
- Bottom navigation bar (Today, Virtues, Goals, Profile)

---

## Data Models
> **These are the original pre-build schemas — several have drifted significantly from the real Mongoose models.** Notably: `User` has no `role` field (see "Admin Role" below) and gained `passwordHash`/`apiKey`/`selectedPhilosophyId`/Live-Activity-token fields; `Virtue` is now scoped to a `Philosophy` (see "Virtue List" below) and `RoutineGroup`/`RoutineItem`/`RoutineLog` all gained substantially more fields (item types, weekly schedule, session/pause state); `HabitGoalLink` was never built at all. For the real shape, read the files directly in `models/` or see `docs/features/*.md`. Kept below for original design intent, not as ground truth.

### User
```js
{
  _id, email, name,
  role: 'user' | 'admin',
  createdAt
}
```

### RoutineGroup
```js
{
  _id,
  userId,           // null = default/seed group, userId = custom
  name,             // 'Morning Routine', 'Evening Routine', etc.
  timeOfDay: 'morning' | 'evening' | 'custom',
  collapseAfter,    // '10:00' for morning, '22:00' for evening, null for custom
  order,            // display order
  isDefault: bool
}
```

### RoutineItem
```js
{
  _id,
  groupId,
  userId,           // null = default seed item
  name,             // 'Morning Shower'
  icon,             // emoji string '🚿'
  projectedMinutes, // user's intention
  order,
  isActive: bool,
  linkedGoalId      // optional — ties this routine to a Goal
}
```

### RoutineLog
```js
{
  _id,
  userId,
  routineItemId,
  date,             // YYYY-MM-DD
  actualMinutes,    // null if skipped
  state: 'done' | 'missed' | 'rest',
  // 'missed' = breaks streak, honest record
  // 'rest'   = intentional skip, protects streak (sick kid, late flight, rest day)
  note,             // optional manual back-entry note
  isBackEntry: bool,
  createdAt
}
```

### Virtue (admin-seeded, not user-editable)
```js
{
  _id,
  name,             // 'Disciplined'
  slug,             // 'disciplined'
  displayName,      // 'A Good Man Is Disciplined'
  order,            // 1-13, determines weekly rotation
  etymology,        // text block — word origin, reclaimed meaning
  essay,            // short essay (written by Boston over time)
  isActive: bool
}
```

### Quote (admin-only, add later)
```js
{
  _id,
  text,
  author,
  source,           // optional book/speech
  virtueId,         // which virtue this belongs to
  addedBy,          // admin userId
  createdAt
}
```

### Goal
```js
{
  _id,
  userId,
  name,               // 'Lose 20 lbs', 'Build the App', 'Write a Book'
  description,
  status: 'active' | 'complete' | 'paused' | 'abandoned',
  targetDate,

  // Progress — derived from lowest available unit (see calculation rules below)
  // If milestones+tasks exist → task completion drives %
  // If milestones only → milestone completion drives %
  // If neither → manual progressPct
  progressPct,        // 0-100, computed or manual

  // Outcome tracking (for correlation goals — e.g. weight, revenue, pages written)
  outcomeMetric: {
    label,            // 'Weight (lbs)', 'Pages Written'
    targetValue,      // 160, 100
    unit,             // 'lbs', 'pages'
  },
  outcomeLog: [{      // periodic manual check-ins
    _id, value, date, note
  }],

  milestones: [{
    _id,
    name,
    targetDate,
    order,
    complete,         // DERIVED — true when all tasks done (or manually if no tasks)
    completedAt,
    tasks: [{
      _id,
      name,
      done: bool,
      completedAt,
      scheduledDate,  // YYYY-MM-DD — if set, appears in Today view on that date
      scheduledTime,  // 'HH:MM' optional
      estimatedMinutes,
      note
    }]
  }],

  createdAt
}
```

### HabitGoalLink
```js
{
  _id,
  userId,
  routineItemId,      // the habit
  goalId,             // the goal it relates to

  relationshipType: 'correlation' | 'accumulation',
  // correlation: habit adherence shown as context on goal (gym → weight loss)
  //              completing habit does NOT auto-advance goal progress
  // accumulation: each habit completion ticks a counter toward goal target
  //               (page/day → 100 pages) — BUILD LATER

  // accumulation only (leave null for correlation):
  unitPerCompletion,  // 1
  unit,               // 'page'
  targetCount,        // 100
}
```

---

## Feature Build Order

> **This checklist is the original pre-build plan and is kept only for history — it undersells and in places misdescribes what actually shipped.** For accurate, actively-maintained detail, use [`docs/project-structure.md`](docs/project-structure.md) and the docs it links (`docs/features/*.md`, `docs/api/*.md`), not this section. See "Current App State" below for a real summary.

### Phase 1 — Routines — BUILT, well beyond this list
- [x] MongoDB connection + Mongoose models
- [x] Auth (email/password or Google OAuth) — see `docs/project-structure.md`'s Authentication section
- [x] Seed default routine groups + items on first login
- [x] Today view — evolved into Morning/Afternoon(custom)/Evening groups plus a standalone, never-collapsing **Habits** group (`timeOfDay: "habit"`, not in the original plan) — see `docs/features/routines.md`, `docs/features/habits.md`
- [x] Routine card: tap to expand actions (Start timer / Missed it / Rest+Life) — plus `checkbox`/`stopwatch` item types, per-item weekly schedule (`scheduledDays`) + `successThreshold`, and conditional ("do you need to do this today?") items not in the original plan
- [x] Timer screen: ring countdown, green→amber→red color shift, actual time logged on stop — plus drag-to-set-time, pause/resume across a sequential "Start Routine" session, and a Live Activity (Lock Screen/Dynamic Island) mirror — see `docs/features/timer.md`, `docs/features/live-activity.md`
- [x] RoutineLog write on complete/skip — plus `in_progress`/`paused` states and a persisted `RoutineSession` record
- [x] 7-day streak dots per item — schedule/threshold-aware, not a flat 7-day window
- [x] Back-entry: manual log when the scheduled window has passed

### Phase 2 — Goals + Tasks — BUILT, with real gaps from the original plan
- [x] Goal model + CRUD (name, description, targetDate, outcomeMetric)
- [x] Milestones inside goal (ordered, with targetDate)
- [x] Tasks inside milestones (scheduledDate optional)
- [x] Progress calculation — lowest unit wins (implemented exactly as specced, see `docs/features/goals.md`)
      - Milestone.complete is DERIVED, but write-time-derived and persisted, not recomputed on read — has a known staleness edge case, see `docs/features/goals.md`
- [ ] **`HabitGoalLink` model was never built** — doesn't exist anywhere in code. `RoutineItem.linkedGoalId` exists in the schema but no API route ever sets it. There is currently no way to link a habit to a goal at all.
- [ ] Habit adherence % on goal detail — not built (blocked on the above)
- [ ] Outcome log — **schema-only**: `outcomeLog` exists on `Goal` but no API route ever writes to it; the goal-detail UI only reads (always empty) — see `docs/features/goals.md`
- [ ] **Tasks do NOT appear in the Today view** — contrary to the original plan, nothing queries `Goal.milestones[].tasks[]` from the Routines page. What *does* appear in Today view is the separate, later-added standalone `Todo` model (`docs/features/todos.md`) — goal tasks and todos are two unrelated collections sharing only a creation UI (`FABTaskSheet`).
- [ ] Active goal progress card on Today view — not built
- [x] Goal detail page: progress bar, milestones+tasks, outcome-metric card (read-only display, see above)

### Phase 3 — Virtues — BUILT, but redesigned around a "Philosophy" marketplace
- [x] Weekly rotation logic — generalized from a hardcoded `% 13` to `% virtueCount`, since virtue sets are no longer a single fixed list — see below
- [x] Virtue detail page: name, etymology, essay (two separate UIs — a full page and a bottom sheet — see `docs/features/virtues.md`)
- [x] Virtue shown on Today view (banner + bottom-sheet detail)
- **Redesigned, not just built**: virtues are no longer one hardcoded 13-item list. Admins create named **Philosophy** virtue sets (e.g. "A Good Man," "Franklin's 13 Virtues") and each user picks one via a marketplace; rotation, check-in, and weekly review all read whichever philosophy is currently selected. Also added: progressive virtue stacking (a new user's check-in list grows week over week rather than showing all virtues immediately), an admin virtue/philosophy management UI, and a "Duplicate philosophy" action. See `docs/features/virtues.md` for the full model — it also documents where this diverges from the "Virtue Check-in System"/"Admin Role" sections further down in this file (see the caveats added there).

### Phase 4 — Quotes — BUILT (this file previously said "NOT BUILT," which was wrong)
- [x] Admin UI to add quotes, tag to virtue
- [x] Random quote from current virtue's pool (loading screen, date-pinned) + a separate fully-random pick (nav button) — see `docs/api/quotes-api.md`

### Built, but not part of any phase above — the original plan didn't anticipate these
- **Todos** — a standalone quick-capture list (`models/Todo.ts`), unrelated to Goals despite a shared creation UI — see `docs/features/todos.md`.
- **Analytics dashboard** — 7-day fixed-week / 30-day rolling views, schedule-aware per-habit pacing — see `docs/features/analytics.md`.
- **Routine Review** — a separate weekly flow (distinct from the virtue weekly review) for reviewing a routine group's goal times, start time, and item order against real rolling averages — see `docs/features/routine-review.md`.
- **Live Activity** (Lock Screen/Dynamic Island timer) and **App Intents** (Shortcuts/Siri/Spotlight "Trigger Habit") — native iOS features, the first custom native code in this project — see `docs/features/live-activity.md`, `docs/features/app-intents.md`.
- **Email/password auth, password change, and a Privacy Policy page** — added for App Store review parity — see `docs/project-structure.md`'s Authentication section.

---

## Routine Behavior Rules

### Time-Aware Collapse
- Morning routine auto-collapses after 10:00am local time
- Evening routine auto-collapses after 10:00pm local time
- Collapsed state shows: group name, dot summary, time-warning badge
- Expanding a past-window group shows a "Back-entry" banner above items
- Custom groups do not auto-collapse

### Skip Types
Two distinct skip states — must be visually and semantically different:

**Missed it** (`state: 'missed'`)
- User forgot, chose not to, couldn't be bothered
- Breaks streak — red dot in history
- Honest record of not doing it

**Rest / Life** (`state: 'rest'`)
- Intentional, justified skip
- Examples: rest day, sick child, late flight, vacation, injury
- Protects streak — blue dot in history
- App never punishes the user for living life

### Variance Tracking
Every RoutineLog with `state: 'done'` stores `actualMinutes`.
Over time this builds a picture of projected vs actual per item.
Analytics (Phase 1 end): show average actual vs projected per item,
identify where the user consistently over/under-runs.

---

## Goal Rules

### Progress Calculation
Use the lowest available unit — never mix levels:
```
if (goal has milestones with tasks):
  progress = tasks_done / tasks_total
elif (goal has milestones, no tasks):
  progress = milestones_complete / milestones_total
else:
  progress = goal.progressPct  // manual
```
Milestone.complete is always DERIVED (all tasks done), never set manually.
Example: 2 milestones × 3 tasks = 6 total. 3 done = 50%.

### Habit-Goal Relationship
Two types — build correlation now, accumulation later:

**Correlation** (e.g. gym → weight loss)
- Habit adherence shown as *context* on goal detail page
- "Last 30 days: Gym 75% of planned"
- Does NOT drive goal progress percentage
- User draws conclusions — app shows data, doesn't assume causation

**Accumulation** (e.g. page/day → 100 pages) — BUILD LATER
- Each habit completion ticks a unit counter
- Progress = (completions × unitPerCompletion) / targetCount
- Same HabitGoalLink model, just `relationshipType: 'accumulation'`

### Outcome Logging
For goals with a measurable outcome (weight, revenue, etc.):
- User logs check-ins manually: value + date + optional note
- Shown as a line chart on goal detail page over time
- Target value shown as a horizontal reference line
- This is separate from progress % — it's the real-world result

### Today View — Task Appearance
> **Not built this way.** Goal tasks never appear on the Today view — nothing queries `Goal.milestones[].tasks[]` from the Routines page. The standalone `Todo` model (`docs/features/todos.md`, added later, not in this file's original plan) fills the "today + overdue" role instead, but it has no relationship to Goals at all. See the Phase 2 checklist above.
- Tasks with `scheduledDate === today` appear between morning and evening routines
- Tasks without scheduledDate live in goal backlog only (not in Today view)
- Tasks show: goal name tag (blue), task name, time if scheduled, checkbox
- Checking a task updates milestone completion, which updates goal progress

---

## Default Seed Data

### Morning Routine (collapseAfter: '10:00')
| name | icon | projectedMinutes |
|---|---|---|
| Morning Shower | 🚿 | 10 |
| Get Dressed | 👔 | 10 |
| Cook Breakfast | 🍳 | 20 |
| Eat Breakfast | 🥚 | 20 |
| Morning Workout | 🏋️ | 45 |
| Meditate | 🧘 | 10 |
| Read Scriptures / Morning Reading | 📖 | 15 |

### Evening Routine (collapseAfter: '22:00')
| name | icon | projectedMinutes |
|---|---|---|
| Evening Workout | 🏋️ | 45 |
| Cook Dinner | 🍽️ | 30 |
| Eat Dinner | 🥩 | 30 |
| Family Time | 👨‍👩‍👧‍👦 | 60 |
| Evening Walk | 🚶 | 20 |
| Wind Down / Stretch | 🧘 | 15 |
| Read | 📚 | 20 |
| Journal | 📓 | 15 |
| Brush Teeth / Hygiene | 🪥 | 10 |

---

## Virtue List (13 — weekly rotation)
> **This is now one of two seeded Philosophies ("A Good Man," slug `agm`), not the app's only virtue set.** A second, "Franklin's 13 Virtues" (slug `franklin-13`), was seeded alongside it, and admins can create more. See `docs/features/virtues.md`.

Seed these in order. Essays and etymology to be added by Boston over time.

1. Disciplined — *dis·ci·pli·na*, instruction/training. Not punishment — studenthood of self.
2. Present — fully here, not elsewhere. Phone down, eyes up.
3. Patient — practiced stillness. Requires discipline as foundation.
4. Humble — knows what he doesn't know. Foundation of learning.
5. Honest — with himself first, then others.
6. Courageous — acts despite fear. Distinct from fearlessness.
7. Genuine / His Own Man — aligned inside and out. Not performing.
8. Responsible — owns outcomes, doesn't deflect.
9. Provider — not just financial. Presence, safety, stability.
10. Strong — physical and moral. Both require training.
11. Intentional — choices are deliberate, not reactive.
12. Faithful — to his values, his people, his word.
13. Servant Leader — leads by example and sacrifice, not authority.

---

## Admin Role
> **Not implemented as described below** — `models/User.ts` has no `role` field. Admin status is a hardcoded email check, `lib/admin.ts`'s `isAdmin(email)` (plus a `SKIP_AUTH` dev fallback), imported by every admin-gated route/page. See `docs/features/virtues.md`.
- Admin can: add/edit quotes, edit virtue essays/etymology, and manage the Philosophy/Virtue marketplace (add philosophies, add/reorder/edit/deactivate virtues, duplicate a philosophy)
- Admin cannot be set via UI — the email is hardcoded in `lib/admin.ts`
- Regular users cannot modify virtues, philosophies, or quotes

---

## Current App State (as of Sep 2 2026)
Every top-level tab is built. This section replaces the old "as of Jun 16 2025" snapshot, which predated most of the app (it still described Goals as "IN PROGRESS" and Review as "NOT BUILT," and Quotes as unbuilt, all wrong for a long time). For real detail, use `docs/project-structure.md` and the feature/API docs it links — this is a summary, not the source of truth.

- **Routines**: BUILT — time-of-day groups (Morning/Afternoon/Evening + user-created custom groups) plus a standalone, never-collapsing **Habits** group; time-aware collapse, weekly schedule (`scheduledDays`) + success-threshold streak math, back-entry, a sequential "Start Routine" session with live projected-finish/timeline, drag-to-set-time, and a Lock Screen/Dynamic Island Live Activity mirror. See `docs/features/routines.md`, `habits.md`, `timer.md`, `live-activity.md`.
- **Analytics**: BUILT — 7-day fixed-calendar-week / 30-day rolling toggle, schedule-aware per-habit pacing breakdown. See `docs/features/analytics.md`.
- **Goals**: BUILT, with real gaps from the original plan — milestones/tasks and lowest-unit-wins progress work as designed; habit-goal linking (`HabitGoalLink`) was never built, outcome logging is schema-only (no write path), and goal tasks do **not** appear on the Today view. See `docs/features/goals.md`.
- **Todos**: BUILT — a standalone quick-capture list, not part of the original plan; unrelated to Goals despite sharing a creation UI. See `docs/features/todos.md`.
- **Virtues** (was "Review" in the original plan — see below): BUILT, redesigned around an admin-managed **Philosophy** marketplace (multiple named virtue sets, not one hardcoded 13-item list) with progressive virtue stacking for new users. Daily yes/no check-in + Sunday weekly review both work, but the "honesty rules" this file describes further down (no editing past answers, locked after Sunday) are **not enforced server-side** — only a client-side convenience. See `docs/features/virtues.md`.
- **Routine Review**: BUILT — a separate weekly flow (not in the original plan) for reviewing a routine group's goal times/start time/order against real rolling averages. See `docs/features/routine-review.md`.
- **Quotes**: BUILT — `Quote` model, admin authoring UI, loading-screen virtue-pinned pick + nav-button random pick. See `docs/api/quotes-api.md`.
- **Auth**: BUILT — Google OAuth and email/password (added for App Store review parity), plus in-app password change, self-service in-app account deletion (`DELETE /api/user/delete-account`, purges every user-scoped collection), and a Privacy Policy page. See `docs/project-structure.md`'s Authentication section.
- **App Intents / Live Activity**: BUILT — native iOS-only features (Shortcuts/Siri/Spotlight "Trigger Habit," and a Lock Screen/Dynamic Island timer), the first custom native code in this project. See `docs/features/app-intents.md`, `live-activity.md`.
- **FAB** (center bottom nav): BUILT — dial opening quick actions (resume the active timer, add a standalone habit, add a task/todo).
- **Store**: a "Coming Soon" stub page exists at `/store` but nothing in the app currently links to it.

**Bottom nav (actual, differs from the original plan below):**
1. Routines (far left) — Today view
2. Analytics — habit trends, variance, adherence
3. *(FAB, center)* — quick actions dial
4. Goals — goal list + Upcoming To-Dos backlog
5. Virtues (far right) — daily check-in, weekly review, philosophy marketplace — not "Review"; `/review` still exists as a redirect shim to `/virtues` for old links

**Top nav** (`components/Header.tsx`):
- Left: static logo mark — **not currently a link** to anything
- Center: **"Be One"** + date — the in-app title has diverged from this file's "A Good Man" branding; `app/layout.tsx`'s `<title>` metadata still says "A Good Man" while the rendered header and the iOS bundle id (`com.bostonbijold.beone`) both say "Be One." Worth a deliberate decision, not silently picking one.
- Right: profile avatar (initial letter — not a Google icon — opens `/profile`)

---

## UI Reference

### Today View Structure (top to bottom)
> **Superseded — see "Current App State" above for what actually shipped.** Analytics and Virtues moved to their own bottom-nav tabs rather than living inline on this page; goal tasks never got a Today-view presence (standalone `Todo`s did instead); the virtue card is a "This Week's Virtue" banner + Manage button, not literally this wording. Kept below for the original intent, not as a live spec.
1. Top nav: logo left, "Be One / [date]" center, profile avatar right
2. Virtue card: "This Week's Virtue" banner with chevron → virtue detail
3. Date navigator: < Today >
4. X/14 progress counter + progress bar
5. Morning Routine group (collapsible, time-aware)
6. Standalone Todos due today (+ overdue carry-forward) — not goal tasks, see `docs/features/todos.md`
7. Afternoon Routine group (collapsible, time-aware)
8. Evening Routine group (collapsible, time-aware)
9. Habits group (never collapses)
10. Bottom nav: Routines / Analytics / [FAB] / Goals / Virtues

### Routine Group — Time-Aware Collapse Logic
Each RoutineGroup has: expectedStartTime, expectedEndTime, bufferMinutes
```
Before expectedStartTime     → collapsed (not yet)
Between start and end        → expanded (active window)
Within bufferMinutes after end → expanded with "back-entry" banner (manual logging)
After buffer expires         → collapsed (window passed, dots show summary)
```
Morning: ~4:30am–10:00am | Afternoon: ~4:00pm–6:00pm | Evening: ~6:00pm–10:00pm
User can customize these times per group in settings.

### Timer Screen
- Full screen takeover
- Ring countdown (SVG circle, stroke animates)
- Color states: olive (on track) → amber (75% elapsed) → burgundy (over target)
- Over-target shows +MM:SS in burgundy
- Pause / Resume / Log buttons
- Recent history below (last 5 logs for this item)

### Routine Card States
- **open**: pending, dark card, "Pending" badge, tap expands to 3 actions
- **done**: olive border, "Done" badge, variance shown (+/-Xm)
- **missed**: burgundy border, "Missed" badge
- **rest**: blue-muted border, "Rest" badge

---

## Virtue Check-in System

> **Built largely as specced below, with two real gaps — see `docs/features/virtues.md` for the authoritative version.** (1) The whole system now sits under an admin-managed **Philosophy** marketplace rather than one hardcoded 13-virtue list — see the "Virtue List" caveat above. (2) The "Check-in Honesty Rules" section further down claims "no editing past answers" and "locked after Sunday midnight" — **neither is enforced server-side**; the write route is an unconditional upsert, and only the loose today-ish date-band check and a client-side disabled button exist in code.

### Overview
Two special RoutineItem types that live inside routine groups like any other habit.
User can move them between routine groups (e.g. move Daily Check-in from evening to afternoon).
Instead of opening a timer, they open a modal specific to their type.

### RoutineItem — Special Types
Add `itemType` field to RoutineItem:
```js
itemType: 'standard' | 'virtue_checkin' | 'weekly_review'
// standard = normal timer habit (default)
// virtue_checkin = opens daily virtue modal (no timer)
// weekly_review = opens weekly recap modal (no timer, Sunday only)
```

### Seed: Add to Evening Routine
| name | icon | itemType | projectedMinutes | order |
|---|---|---|---|---|
| Virtue Check-in | 🧭 | virtue_checkin | 5 | second to last |
| (Sunday only) Weekly Review | 📋 | weekly_review | 10 | last |

Weekly Review item is visible every day but:
- Mon-Sat: tapping it shows "This is a Sunday habit" — skip options only, no modal
- Sunday: tapping it opens the full weekly review modal

### Daily Virtue Check-in Modal
Triggered by tapping Start on a `virtue_checkin` routine item.
- Header: "A Good Man Is [This Week's Virtue]" + short virtue description
- Below: list of all 13 virtues, each with YES / NO toggle (both required — must pick one)
- Submit button → saves VirtueCheckIn doc, marks routine item as done
- Same skip options as any routine: Missed it / Rest+Life (does not open modal)
- Can only submit for today or yesterday (yesterday allowed before Sunday review locks the week)

### Weekly Review Modal
Triggered by tapping Start on a `weekly_review` routine item on Sunday evening.
- Auto-generated — no user input required
- Shows: "This week's virtue: Patience"
- Summary table: each of 13 virtues with X/7 score
- Highlights: strongest virtue this week, virtue that needs work
- Habit adherence for the week (linked habits only)
- Next week's virtue preview: name + description
- Single confirm button: "Got it. Start next week." → locks week, rotates virtue

### VirtueCheckIn Schema
```js
{
  _id,
  userId,
  date,               // YYYY-MM-DD — the day being checked in
  weekStartDate,      // YYYY-MM-DD — Sunday of that week
  answers: [{
    virtueId,
    answer: 'yes' | 'no'  // both options required, no blank answers
  }],
  createdAt
}
```

### Virtue Rotation Rules
- Virtues rotate weekly, Sunday night (midnight Sun→Mon)
- Rotation is calendar-based: weekNumber % 13 → virtue index
- Does NOT require user to complete weekly review to rotate (calendar drives it)
- Weekly review just surfaces the summary before the new week starts
- User start-of-week day: Monday (future setting: user can change to Sunday/Saturday)

### Check-in Honesty Rules
- User can submit for TODAY or YESTERDAY only
- No editing past answers once submitted
- No back-filling beyond yesterday
- Attempting to check in 2+ days ago: "You can only check in for today or yesterday"
- This is intentional — mirrors Franklin's pen-and-ink honesty
- Once Sunday midnight passes, that week's data is read-only

### Review Tab — Historical View
- List of past weeks (most recent first)
- Each week shows: virtue name, top score, lowest score, overall completion %
- Tap a week → full weekly summary (same layout as the Sunday modal, read-only)
- Chart: 13 virtues over time (last 4 weeks or all time toggle)
- Identifies patterns: "You consistently mark Humility high, Discipline low"

---

## Environment Variables Needed
Names only, per `docs/project-structure.md`'s Secrets Policy — never write actual values into this file or any doc it links. The names below were wrong until this update (Auth.js v5 uses `AUTH_*`, not `NEXTAUTH_*`/`GOOGLE_CLIENT_*`); this now matches actual `.env.local`:
```
MONGODB_URI=
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
SKIP_AUTH=             # local-dev-only auth bypass — never set in production
APNS_KEY_ID=           # Apple Push Notifications Auth Key — see docs/features/live-activity.md
APNS_TEAM_ID=          # X3DPK5Y29G
APNS_PRIVATE_KEY=      # contents of the downloaded .p8 file
```

---

## Notes for Claude Code
> The two directory-structure bullets below were wrong for the life of this project so far — there is no `/src` anywhere in this repo. Fixed to match reality; see `docs/project-structure.md` for the full folder map.
- Write to the actual repo layout: `app/` (pages + API routes under `app/api/`), `components/`, `lib/`, `models/` — all at the repo root, no `/src` wrapper
- Use server components where possible, client components only where interactivity needed
- Keep Mongoose models in `models/` (not `lib/models/`)
- DB connection utilities are `lib/mongoose.ts` (Mongoose) and `lib/mongodb-client.ts` (raw driver, for the NextAuth adapter)
- Do not use localStorage or sessionStorage — all state lives in MongoDB
- The app should feel native on mobile Safari — test tap targets at 44px minimum
- Seed script should be idempotent (safe to run multiple times)
- Keep `docs/project-structure.md` and `docs/features/*.md`/`docs/api/*.md` in sync with any code change in their area — they say so themselves at the top of each file, and this section of `CLAUDE.md` drifting for over a year is exactly the failure mode that instruction exists to prevent
