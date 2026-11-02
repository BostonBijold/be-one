> **Keep this file updated after any code change in this area — do not let it drift from actual implementation.**

# Work API

Covers `/api/work/**`, the backend for [`features/work.md`](../features/work.md).

**Auth**: every handler goes through `lib/work/guard.ts`'s `requireWorkUser()` by way of `lib/work/route.ts`'s `workRoute` wrapper. Logged-out requests get `401` from `middleware.ts`. Anyone who isn't an admin gets `404` with `{ error: "Not found" }`. Under `SKIP_AUTH`, the user is `dev-local-user`. Every query is scoped by `userId`, so another user's session id returns `404`.

**Errors**: `{ error: string }` with the status listed below. Messages are written to be shown to the user as they are.

**Session shape**, returned by every session route:

```ts
{
  _id: string,
  categoryId: string | null,  // null = free-text
  label: string,
  isBreak: boolean,
  startTime: string,          // ISO, UTC
  endTime: string | null,     // null = running
  durationSeconds: number | null,
  notes: string | null,
  source: "timer" | "manual",
  timeZone: string,           // IANA name
}
```

## `GET /api/work/categories`

Seeds the eight defaults if the user has no categories, then returns the non-archived ones sorted by `order`:

```ts
Array<{ _id, label, color: "olive" | "olive-light" | "gold" | "muted" | "dim" | null, order, isBreak, defaultDurationMin: number | null }>
```

`color` is a Tailwind token name, and `null` means neutral. Creating and editing categories is Phase 2.

## `GET /api/work/sessions/active`

The running session, or `null`.

## `GET /api/work/sessions?from=<ISO>&to=<ISO>`

Sessions with `from <= startTime < to`, sorted by `startTime`. The client computes the range from its own local midnights. A session crossing midnight belongs to the day it started.

`400` if either parameter is missing or invalid, or if `from >= to`.

## `POST /api/work/sessions/start`

Body: `{ categoryId, timeZone }` or `{ label, timeZone }`. Stops whatever is running and starts the new session, with one server timestamp for both.

`201`: `{ session, stopped: session | null }`.

| Status | When |
|---|---|
| `400` | Invalid body, missing or invalid `timeZone`, or a label that is empty or over 80 characters |
| `404` | Category not found, or archived |
| `409` | Lost a race with another start twice in a row |

## `POST /api/work/sessions`

Manual past block. Body: `{ categoryId | label, startTime, endTime, timeZone, notes? }`. Creates a session with `source: "manual"`.

`201`: the session.

| Status | When |
|---|---|
| `400` | As for start, plus an invalid date, `endTime <= startTime`, `endTime` in the future, or notes over 5000 characters |
| `404` | Category not found, or archived |
| `409` | The range overlaps another session |

## `POST /api/work/sessions/:id/stop`

Body: `{ notes?, endTime? }`. The body is required, and may be `{}`. Without `endTime`, the server uses its own current time. `endTime` is for a time the user deliberately picked, as in the forgotten-timer sheet. The server always computes `durationSeconds`.

Stopping a stopped session is a no-op that returns the existing record, ignoring `endTime` and `notes`. The update is conditional on `endTime: null`, so a stop that loses a race returns what the winner recorded.

`200`: the session.

| Status | When |
|---|---|
| `400` | Invalid body or date, `endTime <= startTime`, `endTime` in the future, or notes over 5000 characters |
| `404` | Session not found |

## `PATCH /api/work/sessions/:id`

Body: any of `{ label, notes, startTime, endTime }`. A running session can't take `endTime`, because that's what `/stop` is for. `source` never changes.

Changing `label` also updates `categoryId` and `isBreak`: they follow the category with that exact label, or become `null` and `false` if none matches. Changing a stopped session's times recomputes `durationSeconds`.

`200`: the session.

| Status | When |
|---|---|
| `400` | Invalid body, label, notes, or date; `endTime` on a running session; `endTime <= startTime`; or a time in the future |
| `404` | Session not found |
| `409` | The new range overlaps another session. A running session counts as ending now |

## `DELETE /api/work/sessions/:id`

`200`: `{ ok: true }`. `404` if not found. Running sessions can be deleted too.
