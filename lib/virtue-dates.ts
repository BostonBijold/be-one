// Pure date helpers — safe to import from client components.
// No mongoose/model imports here.

// ISO week number (1-based)
export function isoWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

// Returns Monday (start of ISO week) for a given date as YYYY-MM-DD
export function weekStartDate(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon ...
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

// Returns the virtue order (1-13) for the given date
export function currentVirtueOrder(date: Date = new Date()): number {
  return ((isoWeekNumber(date) - 1) % 13) + 1;
}
