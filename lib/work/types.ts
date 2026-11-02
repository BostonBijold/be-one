// Client-side shapes of the /api/work responses. Kept apart from the models so
// client components never pull Mongoose into their bundle.
export type CategoryColor = "olive" | "olive-light" | "gold" | "muted" | "dim";

export interface WorkCategoryDTO {
  _id: string;
  label: string;
  color: CategoryColor | null;
  order: number;
  isBreak: boolean;
  defaultDurationMin: number | null;
  archived: boolean;
}

export interface WorkSessionDTO {
  _id: string;
  categoryId: string | null;
  label: string;
  isBreak: boolean;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  notes: string | null;
  source: "timer" | "manual";
  timeZone: string;
}

export type StartTarget = { categoryId: string } | { label: string };
