import WorkCategory, { type WorkCategoryColor } from "@/models/work/WorkCategory";

const DEFAULT_CATEGORIES: Array<{
  label: string;
  isBreak: boolean;
  color: WorkCategoryColor;
  defaultDurationMin: number | null;
}> = [
  { label: "Lunch", isBreak: true, color: "muted", defaultDurationMin: 30 },
  { label: "Break", isBreak: true, color: "muted", defaultDurationMin: 15 },
  { label: "Email", isBreak: false, color: "gold", defaultDurationMin: null },
  { label: "Desk Tickets", isBreak: false, color: "olive", defaultDurationMin: null },
  { label: "Dash", isBreak: false, color: "olive-light", defaultDurationMin: null },
  { label: "Project Management", isBreak: false, color: "gold", defaultDurationMin: null },
  { label: "Meetings", isBreak: false, color: "muted", defaultDurationMin: null },
  { label: "Research", isBreak: false, color: "olive-light", defaultDurationMin: null },
];

// Idempotent, including under concurrent first loads (two tabs, Strict Mode's
// double effects): upserts by the unique { userId, label } index rather than
// checking then creating.
export async function seedWorkCategories(userId: string) {
  await WorkCategory.init();
  try {
    await WorkCategory.bulkWrite(
      DEFAULT_CATEGORIES.map((category, order) => ({
        updateOne: {
          filter: { userId, label: category.label },
          update: { $setOnInsert: { ...category, order, archived: false } },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  } catch (err) {
    // A concurrent seed won the race for some labels — those rows exist, which
    // is all this needs.
    if ((err as { code?: number }).code !== 11000) throw err;
  }
}
