import type { CategoryColor } from "@/lib/work/types";

// Complete literal class names: Tailwind can't detect a constructed `bg-${color}`.
export const COLOR_CLASSES: Record<CategoryColor, { bar: string; activeBorder: string }> = {
  olive: { bar: "bg-olive", activeBorder: "border-olive" },
  "olive-light": { bar: "bg-olive-light", activeBorder: "border-olive-light" },
  gold: { bar: "bg-gold", activeBorder: "border-gold" },
  muted: { bar: "bg-muted", activeBorder: "border-muted" },
  dim: { bar: "bg-dim", activeBorder: "border-dim" },
};
export const NEUTRAL_CLASSES = { bar: "bg-border-light", activeBorder: "border-muted" };

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
