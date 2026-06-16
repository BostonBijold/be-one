import HabitTemplate from "@/models/HabitTemplate";

const SYSTEM_TEMPLATES = [
  // ── Morning ──────────────────────────────────────────────────────────────
  { name: "Morning Shower",                   icon: "droplets",   defaultProjectedMinutes: 10, category: "hygiene",      timeOfDay: "morning" },
  { name: "Get Dressed",                       icon: "shirt",      defaultProjectedMinutes: 10, category: "hygiene",      timeOfDay: "morning" },
  { name: "Cook Breakfast",                    icon: "flame",      defaultProjectedMinutes: 20, category: "nutrition",    timeOfDay: "morning" },
  { name: "Eat Breakfast",                     icon: "utensils",   defaultProjectedMinutes: 20, category: "nutrition",    timeOfDay: "morning" },
  { name: "Morning Workout",                   icon: "dumbbell",   defaultProjectedMinutes: 45, category: "fitness",      timeOfDay: "morning" },
  { name: "Meditate",                          icon: "wind",       defaultProjectedMinutes: 10, category: "mindfulness",  timeOfDay: "morning" },
  { name: "Read Scriptures / Morning Reading", icon: "book-open",  defaultProjectedMinutes: 15, category: "reading",      timeOfDay: "morning" },
  { name: "Cold Shower",                       icon: "zap",        defaultProjectedMinutes: 5,  category: "hygiene",      timeOfDay: "morning" },
  { name: "Morning Walk",                      icon: "sun",        defaultProjectedMinutes: 20, category: "fitness",      timeOfDay: "morning" },
  { name: "Gratitude Journal",                 icon: "star",       defaultProjectedMinutes: 10, category: "mindfulness",  timeOfDay: "morning" },
  { name: "Review Day's Plan",                 icon: "list-checks",defaultProjectedMinutes: 10, category: "productivity", timeOfDay: "morning" },
  { name: "Vitamins / Supplements",            icon: "pill",       defaultProjectedMinutes: 2,  category: "hygiene",      timeOfDay: "morning" },

  // ── Evening ───────────────────────────────────────────────────────────────
  { name: "Evening Workout",                   icon: "dumbbell",   defaultProjectedMinutes: 45, category: "fitness",      timeOfDay: "evening" },
  { name: "Cook Dinner",                       icon: "flame",      defaultProjectedMinutes: 30, category: "nutrition",    timeOfDay: "evening" },
  { name: "Eat Dinner",                        icon: "utensils",   defaultProjectedMinutes: 30, category: "nutrition",    timeOfDay: "evening" },
  { name: "Family Time",                       icon: "users",      defaultProjectedMinutes: 60, category: "family",       timeOfDay: "evening" },
  { name: "Evening Walk",                      icon: "footprints", defaultProjectedMinutes: 20, category: "fitness",      timeOfDay: "evening" },
  { name: "Wind Down / Stretch",               icon: "wind",       defaultProjectedMinutes: 15, category: "fitness",      timeOfDay: "evening" },
  { name: "Read",                              icon: "book-open",  defaultProjectedMinutes: 20, category: "reading",      timeOfDay: "evening" },
  { name: "Journal",                           icon: "pen-line",   defaultProjectedMinutes: 15, category: "mindfulness",  timeOfDay: "evening" },
  { name: "Brush Teeth / Hygiene",             icon: "sparkles",   defaultProjectedMinutes: 10, category: "hygiene",      timeOfDay: "evening" },
  { name: "Review the Day",                    icon: "moon",       defaultProjectedMinutes: 10, category: "productivity", timeOfDay: "evening" },
  { name: "Prepare Tomorrow",                  icon: "list-checks",defaultProjectedMinutes: 10, category: "productivity", timeOfDay: "evening" },
  { name: "Evening Prayer / Reflection",       icon: "cross",      defaultProjectedMinutes: 10, category: "mindfulness",  timeOfDay: "evening" },

  // ── Any time ──────────────────────────────────────────────────────────────
  { name: "Drink Water",                       icon: "droplets",   defaultProjectedMinutes: 2,  category: "nutrition",    timeOfDay: "any" },
  { name: "Run",                               icon: "activity",   defaultProjectedMinutes: 30, category: "fitness",      timeOfDay: "any" },
  { name: "Pray",                              icon: "cross",      defaultProjectedMinutes: 10, category: "mindfulness",  timeOfDay: "any" },
  { name: "Call Family / Friend",              icon: "phone",      defaultProjectedMinutes: 15, category: "family",       timeOfDay: "any" },
  { name: "Read Non-Fiction",                  icon: "book-open",  defaultProjectedMinutes: 20, category: "reading",      timeOfDay: "any" },
  { name: "Practice Skill",                    icon: "target",     defaultProjectedMinutes: 30, category: "productivity", timeOfDay: "any" },
] as const;

export const DEFAULT_MORNING_NAMES = [
  "Morning Shower",
  "Get Dressed",
  "Cook Breakfast",
  "Eat Breakfast",
  "Morning Workout",
  "Meditate",
  "Read Scriptures / Morning Reading",
];

export const DEFAULT_EVENING_NAMES = [
  "Evening Workout",
  "Cook Dinner",
  "Eat Dinner",
  "Family Time",
  "Evening Walk",
  "Wind Down / Stretch",
  "Read",
  "Journal",
  "Brush Teeth / Hygiene",
];

// Idempotent — always updates icon so changes propagate to existing data
export async function ensureSystemTemplates() {
  await HabitTemplate.bulkWrite(
    SYSTEM_TEMPLATES.map((t) => ({
      updateOne: {
        filter: { name: t.name, isSystem: true },
        update: {
          $setOnInsert: { createdBy: null, isActive: true },
          $set: {
            icon: t.icon,
            defaultProjectedMinutes: t.defaultProjectedMinutes,
            category: t.category,
            timeOfDay: t.timeOfDay,
          },
        },
        upsert: true,
      },
    }))
  );
}
