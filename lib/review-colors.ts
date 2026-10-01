// Per-item segment colors for the Routine Review flow (see
// components/RoutineReviewFlow.tsx). Each item keeps one color across the
// Goal / Actual avg / Proposed bars and its own row in the list below, so the
// list doubles as the bars' legend — colors are keyed by item id, never by
// position in a bar. Muted, earthy tones that sit on the app's warm
// near-black, deliberately avoiding the live session's olive/amber/burgundy
// pacing colors so this never reads as "on pace / behind."

export const REVIEW_PALETTE = [
  "#c4a84a", // gold
  "#6390b0", // blue-muted
  "#b5835a", // clay
  "#8f6f9a", // dusk mauve
  "#5f9488", // sage teal
  "#a89a72", // khaki
  "#6a8fb8", // steel blue
  "#b07070", // dusty rose
  "#7f7fb0", // slate violet
] as const;

// Assigns a color to every id so that no two neighbors in `orderedIds` share
// one. Ids that already have a color in `existing` keep it unless it now
// collides with a neighbor (only possible after a reorder with more items
// than palette colors) — identity stays stable, and only a forced conflict
// recolors an item. New/conflicting ids take the least-used color that
// differs from both neighbors, which on a fresh list just cycles the palette.
export function assignItemColors(
  orderedIds: string[],
  existing: Record<string, string> = {}
): Record<string, string> {
  const result: Record<string, string> = {};
  const usage = new Map<string, number>(REVIEW_PALETTE.map((c) => [c, 0]));

  orderedIds.forEach((id, i) => {
    const prev = i > 0 ? result[orderedIds[i - 1]] : undefined;
    const next = i < orderedIds.length - 1 ? existing[orderedIds[i + 1]] : undefined;
    let color = existing[id];
    if (!color || color === prev) {
      const candidates = REVIEW_PALETTE.filter((c) => c !== prev && c !== next);
      const pool = candidates.length > 0 ? candidates : REVIEW_PALETTE.filter((c) => c !== prev);
      color = pool.reduce((best, c) => ((usage.get(c) ?? 0) < (usage.get(best) ?? 0) ? c : best), pool[0]);
    }
    result[id] = color;
    usage.set(color, (usage.get(color) ?? 0) + 1);
  });

  return result;
}
