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

  const habitGroups = await RoutineGroup.find({ userId, timeOfDay: "habit" }).lean();
  if (!habitGroups.length) return NextResponse.json([]);

  const groupIds = habitGroups.map((g) => g._id);
  const [items, logs] = await Promise.all([
    RoutineItem.find({ groupId: { $in: groupIds }, userId, isActive: true })
      .sort({ order: 1 }).lean(),
    RoutineLog.find({ userId, date }).lean(),
  ]);

  const logMap = new Map(logs.map((l) => [l.routineItemId.toString(), l]));

  return NextResponse.json(
    items.map((i) => {
      const log = logMap.get(i._id.toString());
      return {
        _id: i._id.toString(),
        name: i.name,
        icon: i.icon,
        itemType: i.itemType,
        projectedMinutes: i.projectedMinutes,
        done: log?.state === "done",
        logId: log ? log._id.toString() : null,
      };
    })
  );
}
