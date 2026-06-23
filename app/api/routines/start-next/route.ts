import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import RoutineGroup from "@/models/RoutineGroup";
import RoutineItem from "@/models/RoutineItem";
import RoutineLog from "@/models/RoutineLog";

export const dynamic = "force-dynamic";
const DEV_USER_ID = "dev-local-user";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (process.env.SKIP_AUTH === "true" ? DEV_USER_ID : null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  await connectDB();

  const groups = await RoutineGroup.find({ userId, timeOfDay: { $ne: "habit" } })
    .sort({ order: 1 }).lean();

  const groupIds = groups.map((g) => g._id);
  const [items, logs] = await Promise.all([
    RoutineItem.find({ groupId: { $in: groupIds }, userId, isActive: true }).lean(),
    RoutineLog.find({ userId, date }).lean(),
  ]);

  const hasLogs = logs.length > 0;

  // in_progress counts as logged — skip past it to find the next unstarted item
  const loggedIds = new Set(logs.map((l) => l.routineItemId.toString()));

  for (const group of groups) {
    const groupItems = items
      .filter((i) => i.groupId.toString() === group._id.toString())
      .sort((a, b) => a.order - b.order);
    const next = groupItems.find((i) => !loggedIds.has(i._id.toString()));
    if (next) return NextResponse.json({ hasNext: true, hasLogs });
  }

  return NextResponse.json({ hasNext: false, hasLogs });
}
