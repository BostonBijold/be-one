import type { CategoryColor } from "@/lib/work/types";

// Complete literal class names: Tailwind can't detect a constructed `bg-${color}`.
// Fills take dark text, which clears WCAG AA on all of them; neutral's fill is
// too dark for that, so it takes light text.
export const COLOR_CLASSES: Record<CategoryColor, { bar: string; activeFill: string }> = {
  olive: { bar: "bg-olive", activeFill: "bg-olive text-bg" },
  "olive-light": { bar: "bg-olive-light", activeFill: "bg-olive-light text-bg" },
  gold: { bar: "bg-gold", activeFill: "bg-gold text-bg" },
  muted: { bar: "bg-muted", activeFill: "bg-muted text-bg" },
  dim: { bar: "bg-dim", activeFill: "bg-dim text-bg" },
};
export const NEUTRAL_CLASSES = { bar: "bg-border-light", activeFill: "bg-border-light text-text" };

export const COLOR_OPTIONS: Array<{ value: CategoryColor | null; name: string }> = [
  { value: null, name: "Neutral" },
  { value: "olive", name: "Olive" },
  { value: "olive-light", name: "Light olive" },
  { value: "gold", name: "Gold" },
  { value: "muted", name: "Parchment" },
  { value: "dim", name: "Stone" },
];

export function colorClasses(color: CategoryColor | null) {
  return color ? COLOR_CLASSES[color] : NEUTRAL_CLASSES;
}
