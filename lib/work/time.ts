function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export const FORGOTTEN_AFTER_MS = 12 * 60 * 60 * 1000;

export function clientTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Local midnight to next local midnight. Built from calendar fields rather than
// adding 24 hours, so DST days come out right.
export function localDayRange(now: Date) {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { from, to };
}

export function localDayKey(date: Date) {
  return date.toLocaleDateString("en-CA"); // YYYY-MM-DD in local tz
}

// Clamped at 0 to absorb clock differences between client and server.
export function elapsedSeconds(startTime: string, nowMs: number) {
  return Math.max(0, Math.floor((nowMs - new Date(startTime).getTime()) / 1000));
}

export function formatClock(seconds: number) {
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}

export function formatClockMinutes(seconds: number) {
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}`;
}

export function formatOver(seconds: number) {
  return `+${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}

// 0:45 — the Today list's duration column.
export function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 3600)}:${pad(Math.floor((seconds % 3600) / 60))}`;
}

// 1h 15m — the Today totals.
export function formatTotal(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

// Value format for <input type="datetime-local">, in local time.
export function toLocalInput(value: string | Date) {
  const d = new Date(value);
  return `${localDayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
