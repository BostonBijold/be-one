import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import RoutineGroup from "@/models/RoutineGroup";
import RoutineItem from "@/models/RoutineItem";
import RoutineLog from "@/models/RoutineLog";

const DEV_USER_ID = "dev-local-user";

// Actual-minute offsets per morning habit (30 values, one per day oldest→today)
// Workout runs consistently long — this is the interesting analytics signal
const MORNING_ACTUALS: Record<string, number[]> = {
  "Morning Shower":   [9,10, 8,12,10, 8,11, 9,10, 8,10,12, 9,10, 8,11,10, 9,10, 8,10,12, 9, 8,10,11, 9,10, 8,10],
  "Get Dressed":      [10, 9,10,12, 9,10, 8,11,10, 9,10, 8,12,10, 9,10,11, 9,10, 8, 9,10,12,10, 9, 8,10,11,10, 9],
  "Cook Breakfast":   [18,22,20,25,18,20,22,19,20,25,18,22,20,19,25,20,18,22,20,19,22,18,20,25,19,20,22,18,20,22],
  "Eat Breakfast":    [20,18,22,20,15,20,22,18,20,22,15,20,18,22,20,18,20,22,15,20,18,20,22,18,15,20,22,18,20,20],
  "Morning Workout":  [52,55,50,58,53,48,60,52,55,50,53,58,52,55,50,60,53,55,52,58,50,55,60,52,53,55,58,50,52,55],
  "Meditate":         [10,12,10, 8,10,15,10,10, 8,12,10,10, 8,12,10,10,12, 8,10,10,12,10, 8,10,15,10, 8,12,10,10],
  "Read Scriptures / Morning Reading": [15,18,20,15,17,20,15,18,22,15,17,20,18,15,20,17,15,18,20,15,17,15,20,18,15,22,17,15,18,20],
};

// Evening habit miss/rest pattern — indexed 0 (30 days ago) → 29 (today)
const EVENING_MISSED: Record<string, number[]> = {
  "Evening Workout":      [2, 5, 9,14,17,21,25],
  "Cook Dinner":          [18],
  "Eat Dinner":           [],
  "Family Time":          [],
  "Evening Walk":         [0, 3, 6, 9,12,15,18,21,24,27],
  "Wind Down / Stretch":  [1, 5,10,14,19,23,28],
  "Read":                 [4,11,17,22,26],
  // Journal is the hardest — missed every other night (even-indexed days)
  "Journal":              [0,2,4,6,8,10,12,14,16,18,20,22,24,26,28],
  "Brush Teeth / Hygiene": [],
};

const EVENING_REST: Record<string, number[]> = {
  "Evening Workout": [26],    // intentional rest day
  "Family Time":     [7, 21], // away from home
};

// Actual minutes for evening habits (when done) — vary around projected
const EVENING_OFFSETS: Record<string, number[]> = {
  "Evening Workout":      [5,10, 8,15, 7, 0,12, 5, 8,15, 3,10, 8, 5, 0,15, 7,10, 5,12, 0, 8,15, 5, 7,10,12, 0, 5,10],
  "Cook Dinner":          [5,-2, 8, 3,-5, 5, 8,-2, 0, 5, 3,-2, 5, 8,-5, 5,-2, 3, 5,-2, 8, 5, 3,-2, 5, 8,-2, 5, 3,-2],
  "Eat Dinner":           [5, 3, 8, 5, 0, 5, 8, 3, 5, 8, 0, 5, 3, 8, 5, 0, 5, 8, 3, 5, 8, 0, 5, 3, 8, 5, 0, 8, 3, 5],
  "Family Time":          [20,10,15,30,-5,20,30,10,15,20, 5,30,10,15,20,-5,30,10,20,15,30, 5,10,20,15,30,10,20,15,20],
  "Evening Walk":         [5,-2, 5,10,-5, 5,10,-2, 5,10, 0, 5,-2,10, 5, 0, 5,10,-2, 5,10,-5, 5, 0, 5,10,-2, 5, 0, 5],
  "Wind Down / Stretch":  [2,-2, 5, 3, 0, 5, 3,-2, 5, 2, 0, 5,-2, 3, 5, 0, 5, 3,-2, 5, 2, 0, 5, 3,-2, 5, 0, 3, 5, 2],
  "Read":                 [5, 8,15, 5, 0,10,15, 5, 8,15, 0, 5, 8,15, 5, 0,15, 5, 8,15, 5, 0, 8,15, 5, 8, 0, 5,15, 8],
  "Journal":              [2, 3, 5, 2, 0, 5, 3, 2, 5, 3, 0, 5, 2, 3, 5, 0, 5, 3, 2, 5, 3, 0, 5, 2, 3, 5, 0, 3, 5, 2],
  "Brush Teeth / Hygiene":[0, 2, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 1, 0],
};

function getDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

export async function GET() {
  if (process.env.SKIP_AUTH !== "true") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }

  await connectDB();

  const groups = await RoutineGroup.find({ userId: DEV_USER_ID }).sort({ order: 1 }).lean();
  const items  = await RoutineItem.find({ userId: DEV_USER_ID, isActive: true }).lean();

  if (groups.length === 0) {
    return NextResponse.json(
      { error: "No routine groups found — visit /routines first to trigger the seed." },
      { status: 400 }
    );
  }

  const morningGroup = groups.find((g) => g.timeOfDay === "morning");
  const eveningGroup = groups.find((g) => g.timeOfDay === "evening");

  if (!morningGroup || !eveningGroup) {
    return NextResponse.json({ error: "Missing morning or evening group." }, { status: 400 });
  }

  const morningItems = items
    .filter((i) => i.groupId.toString() === morningGroup._id.toString())
    .sort((a, b) => a.order - b.order);

  const eveningItems = items
    .filter((i) => i.groupId.toString() === eveningGroup._id.toString())
    .sort((a, b) => a.order - b.order);

  // Wipe existing logs for the past 30 days so this is idempotent
  const dates = Array.from({ length: 30 }, (_, i) => getDate(29 - i));
  await RoutineLog.deleteMany({ userId: DEV_USER_ID, date: { $in: dates } });

  const logs: object[] = [];

  for (let dayIdx = 0; dayIdx < 30; dayIdx++) {
    const date = dates[dayIdx]; // dayIdx 0 = 30 days ago, 29 = today
    const isToday = dayIdx === 29;

    // ── Morning: perfect every day ──────────────────────────────────────────
    for (const item of morningItems) {
      const offsets = MORNING_ACTUALS[item.name];
      const actualMinutes = offsets
        ? offsets[dayIdx]
        : item.projectedMinutes;

      logs.push({
        userId: DEV_USER_ID,
        routineItemId: item._id,
        date,
        state: "done",
        actualMinutes,
        isBackEntry: !isToday,
        createdAt: new Date(date + "T08:30:00"),
      });
    }

    // ── Evening: staggered ──────────────────────────────────────────────────
    for (const item of eveningItems) {
      const missedDays = EVENING_MISSED[item.name] ?? [];
      const restDays   = EVENING_REST[item.name]   ?? [];

      let state: "done" | "missed" | "rest";
      if (restDays.includes(dayIdx))   state = "rest";
      else if (missedDays.includes(dayIdx)) state = "missed";
      else state = "done";

      const offsets = EVENING_OFFSETS[item.name] ?? [];
      const actualMinutes =
        state === "done"
          ? Math.max(1, item.projectedMinutes + (offsets[dayIdx] ?? 0))
          : undefined;

      logs.push({
        userId: DEV_USER_ID,
        routineItemId: item._id,
        date,
        state,
        actualMinutes,
        isBackEntry: !isToday,
        createdAt: new Date(date + "T20:00:00"),
      });
    }
  }

  await RoutineLog.insertMany(logs);

  const summary = {
    daysSeeded: 30,
    logsInserted: logs.length,
    morning: `${morningItems.length} habits — all done every day`,
    evening: {
      totalHabits: eveningItems.length,
      patterns: {
        "Evening Workout":     "7 misses, 1 rest day",
        "Cook Dinner":         "1 miss (takeout night)",
        "Family Time":         "2 rest days (away)",
        "Evening Walk":        "10 misses (weather/tired)",
        "Wind Down / Stretch": "7 misses",
        "Read":                "5 misses",
        "Journal":             "15 misses — hardest habit (every other night)",
        "Eat Dinner":          "perfect",
        "Brush Teeth / Hygiene": "perfect",
      },
    },
  };

  return NextResponse.json(summary);
}
