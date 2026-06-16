import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import RoutineGroup from "@/models/RoutineGroup";
import RoutineItem from "@/models/RoutineItem";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const groups = await RoutineGroup.find({ userId: session.user.id }).sort({ order: 1 }).lean();

  const groupsWithItems = await Promise.all(
    groups.map(async (group) => {
      const items = await RoutineItem.find({
        groupId: group._id,
        userId: session.user.id,
        isActive: true,
      })
        .sort({ order: 1 })
        .lean();

      return {
        _id: group._id.toString(),
        name: group.name,
        type: group.type,
        order: group.order,
        items: items.map((item) => ({
          _id: item._id.toString(),
          name: item.name,
          icon: item.icon,
          projectedMinutes: item.projectedMinutes,
          order: item.order,
        })),
      };
    })
  );

  return NextResponse.json(groupsWithItems);
}
