import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";

export const dynamic = "force-dynamic";
import RoutineGroup from "@/models/RoutineGroup";
import RoutineItem from "@/models/RoutineItem";
import RoutineLog from "@/models/RoutineLog";

const DEV_USER_ID = "dev-local-user";

function getDates(days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toISOString().split("T")[0];
  });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId =
    session?.user?.id ?? (process.env.SKIP_AUTH === "true" ? DEV_USER_ID : null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const days = Math.min(30, Math.max(7, parseInt(req.nextUrl.searchParams.get("days") ?? "7")));
  const dates = getDates(days);

  await connectDB();

  const groups = await RoutineGroup.find({ userId }).sort({ order: 1 }).lean();
  const allItems = await RoutineItem.find({ userId, isActive: true }).lean();
  const logs = await RoutineLog.find({ userId, date: { $in: dates } }).lean();

  // Fast lookup: itemId → date → log
  const logMap: Record<string, Record<string, (typeof logs)[0]>> = {};
  for (const log of logs) {
    const id = log.routineItemId.toString();
    if (!logMap[id]) logMap[id] = {};
    logMap[id][log.date] = log;
  }

  const groupOrderMap: Record<string, number> = {};
  groups.forEach((g, i) => { groupOrderMap[g._id.toString()] = i; });

  // Sort items by group order then item order
  const sortedItems = [...allItems].sort((a, b) => {
    const go = (groupOrderMap[a.groupId.toString()] ?? 99) - (groupOrderMap[b.groupId.toString()] ?? 99);
    return go !== 0 ? go : a.order - b.order;
  });

  // ── Routine-level stats ───────────────────────────────────────────────────
  const groupStats = groups.map((group) => {
    const gId = group._id.toString();
    const items = sortedItems.filter((i) => i.groupId.toString() === gId);
    const totalItems = items.length;

    const daily = dates.map((date) => {
      let doneCount = 0, missedCount = 0, restCount = 0, actualMins = 0;
      const projectedMins = items.reduce((s, i) => s + i.projectedMinutes, 0);
      for (const item of items) {
        const log = logMap[item._id.toString()]?.[date];
        if (!log) continue;
        if (log.state === "done") { doneCount++; actualMins += log.actualMinutes ?? 0; }
        else if (log.state === "missed") missedCount++;
        else if (log.state === "rest") restCount++;
      }
      return { date, doneCount, missedCount, restCount, loggedCount: doneCount + missedCount + restCount, projectedMins, actualMins };
    });

    const activeDays = daily.filter((d) => d.loggedCount > 0);
    const avgCompletionRate =
      activeDays.length > 0
        ? activeDays.reduce((s, d) => s + d.doneCount / Math.max(totalItems, 1), 0) / activeDays.length
        : 0;
    const avgActualMins =
      activeDays.length > 0
        ? Math.round(activeDays.reduce((s, d) => s + d.actualMins, 0) / activeDays.length)
        : 0;
    const totalProjectedMins = items.reduce((s, i) => s + i.projectedMinutes, 0);

    return { _id: gId, name: group.name, totalItems, daily, avgCompletionRate, avgActualMins, totalProjectedMins };
  });

  // ── Habit-level stats ─────────────────────────────────────────────────────
  const groupNameMap = Object.fromEntries(groups.map((g) => [g._id.toString(), g.name]));

  const habitStats = sortedItems.map((item) => {
    const itemId = item._id.toString();
    const daily = dates.map((date) => {
      const log = logMap[itemId]?.[date];
      return {
        date,
        state: (log?.state ?? null) as "done" | "missed" | "rest" | null,
        actualMinutes: (log?.actualMinutes ?? null) as number | null,
      };
    });

    const doneDays = daily.filter((d) => d.state === "done");
    const doneCount = doneDays.length;
    const missedCount = daily.filter((d) => d.state === "missed").length;
    const restCount = daily.filter((d) => d.state === "rest").length;

    const isCheckbox = item.itemType === "checkbox";
    const isStopwatch = item.itemType === "stopwatch";
    const avgActualMins =
      !isCheckbox && doneDays.length > 0
        ? Math.round(doneDays.reduce((s, d) => s + (d.actualMinutes ?? item.projectedMinutes), 0) / doneDays.length)
        : null;
    // Stopwatch has no target — actual time IS the data, but variance is meaningless
    const avgVariance = avgActualMins !== null && !isStopwatch ? avgActualMins - item.projectedMinutes : null;

    const engagedDays = doneCount + missedCount; // rest and unlogged don't count
    return {
      _id: itemId,
      name: item.name,
      icon: item.icon,
      groupId: item.groupId.toString(),
      groupName: groupNameMap[item.groupId.toString()] ?? "",
      projectedMinutes: item.projectedMinutes,
      daily,
      doneCount,
      missedCount,
      restCount,
      unloggedCount: dates.length - doneCount - missedCount - restCount,
      avgActualMins,
      avgVariance,
      completionRate: engagedDays > 0 ? doneCount / engagedDays : 0,
      engagedDays,
      totalDays: dates.length,
      itemType: (item.itemType ?? "standard") as string,
    };
  });

  return NextResponse.json({ dates, days, groups: groupStats, habits: habitStats });
}
