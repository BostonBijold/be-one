// Pure visibility rule — safe to import from client components.
// Weekly Review only appears in the routine list on Sundays.
export function isItemVisibleOn(
  item: { itemType?: "standard" | "stopwatch" | "checkbox" | "virtue_checkin" | "weekly_review" },
  dateStr: string
): boolean {
  if (item.itemType === "weekly_review") {
    return new Date(dateStr + "T12:00:00").getDay() === 0;
  }
  return true;
}
