// Pure visibility rule — safe to import from client components. Single
// source of truth for "does this item show today" — every call site
// (Today view, group-completion checks, session advance, /api/habits)
// routes through this rather than re-deriving the check.
//
// weekly_review/routine_review are visible only on Sundays purely because
// they're seeded with scheduledDays: [0] — there's no itemType-specific
// rule left here, just the general scheduledDays check below.
export function isItemVisibleOn(
  item: {
    itemType?: "standard" | "stopwatch" | "checkbox" | "virtue_checkin" | "weekly_review" | "routine_review";
    scheduledDays?: number[];
  },
  dateStr: string
): boolean {
  const scheduledDays = item.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6];
  const weekday = new Date(dateStr + "T12:00:00").getDay();
  return scheduledDays.includes(weekday);
}
