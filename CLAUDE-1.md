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
  name,             // 'Build the App'
  description,
  status: 'active' | 'complete' | 'paused' | 'abandoned',
  targetDate,
  progressPct,      // 0-100, manually set or derived from milestones
  milestones: [{
    _id, name, targetDate, done: bool, completedAt
  }],
  createdAt
}
```

### Task
```js
{
  _id,
  userId,
  goalId,           // required — tasks always belong to a goal
  name,
  scheduledDate,    // YYYY-MM-DD — when it appears in day view
  scheduledTime,    // 'HH:MM' optional
  estimatedMinutes,
  done: bool,
  completedAt,
  note,
  createdAt
}
```

---

## Feature Build Order

### Phase 1 — Routines (current focus)
- [ ] MongoDB connection + Mongoose models
- [ ] Auth (email/password or Google OAuth)
- [ ] Seed default routine groups + items on first login
- [ ] Today view: morning group (collapses after 10am) + evening group (collapses after 10pm)
- [ ] Routine card: tap to expand actions (Start timer / Missed it / Rest+Life)
- [ ] Timer screen: ring countdown, green→amber→red color shift, actual time logged on stop
- [ ] RoutineLog write on complete/skip
- [ ] 7-day streak dots per item
- [ ] Back-entry: manual log when morning window has passed

### Phase 2 — Goals + Tasks
- [ ] Goal model + CRUD
- [ ] Milestone tracking inside goal
- [ ] Task model: scheduled to a date, linked to goal
- [ ] Tasks appear in Today view between morning and evening routines
- [ ] Goal progress card on Today view (active goal)

### Phase 3 — Virtues
- [ ] Admin seeds 13 virtues (see list below)
- [ ] Weekly rotation logic (week number % 13 → current virtue)
- [ ] Virtue detail page: name, etymology, essay
- [ ] Virtue shown on Today view header

### Phase 4 — Quotes (last)
- [ ] Admin UI to add quotes, tag to virtue
- [ ] Random quote from current virtue's pool on each app load

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
- Boston's account gets `role: 'admin'`
- Admin can: add/edit quotes, edit virtue essays/etymology
- Admin cannot be set via UI — set directly in MongoDB or via seed script
- Regular users cannot modify virtues or quotes

---

## UI Reference

### Today View Structure (top to bottom)
1. Nav bar: "A GOOD MAN" logo left, current date right
2. Virtue strip: "This Week's Virtue" eyebrow, "A Good Man Is [Virtue]" title, mini quote right
3. Morning Routine group (collapsible)
4. Divider: "Scheduled for today"
5. Goal tasks for today (if any)
6. Active goal progress card (if goal exists)
7. Evening Routine group (collapsible)
8. Bottom nav: Today / Virtues / Goals / Profile

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

## Environment Variables Needed
```
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=      # if using Google OAuth
GOOGLE_CLIENT_SECRET=  # if using Google OAuth
```

---

## Notes for Claude Code
- Always write to `/src` directory structure
- Use server components where possible, client components only where interactivity needed
- API routes under `/src/app/api/`
- Keep Mongoose models in `/src/lib/models/`
- DB connection utility in `/src/lib/mongodb.ts`
- Do not use localStorage or sessionStorage — all state lives in MongoDB
- The app should feel native on mobile Safari — test tap targets at 44px minimum
- Seed script should be idempotent (safe to run multiple times)
