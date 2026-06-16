import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import RoutineGroup from "@/models/RoutineGroup";
import RoutineItem from "@/models/RoutineItem";
import RoutineLog from "@/models/RoutineLog";
import VirtueModel from "@/models/Virtue";
import { seedDefaultRoutines, ensureAfternoonGroup, ensureHabitsGroup, ensureVirtueCheckInItems } from "@/lib/seed";
import { ensureVirtues, currentVirtueOrder } from "@/lib/seed-virtues";
import RoutinesView from "@/components/RoutinesView";

const ADMIN_EMAIL = "bostonrbijold@gmail.com";

export const dynamic = "force-dynamic";

const DEV_USER_ID = "dev-local-user";

function getWeekDates(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i)); // oldest → newest, today last
    return d.toISOString().split("T")[0];
  });
}

export default async function RoutinesPage({
  searchParams,
}: {
  searchParams?: { startNext?: string; addHabit?: string };
}) {
  const skipAuth = process.env.SKIP_AUTH === "true";
  const session = await auth();

  if (!skipAuth && !session?.user?.id) redirect("/login");

  const userId = session?.user?.id ?? (skipAuth ? DEV_USER_ID : null);
  if (!userId) redirect("/login");

  const userName = session?.user?.name ?? "Developer";
  const userImage = session?.user?.image ?? null;

  await connectDB();

  // First-time seeds
  const groupCount = await RoutineGroup.countDocuments({ userId });
  if (groupCount === 0) await seedDefaultRoutines(userId);
  else await ensureAfternoonGroup(userId); // backfill for existing users
  await ensureHabitsGroup(userId);
  await ensureVirtueCheckInItems(userId);

  // Backfill startTime for groups created before this field existed
  await RoutineGroup.updateOne(
    { userId, timeOfDay: "morning", startTime: { $in: [null, undefined] } },
    { $set: { startTime: "06:00" } }
  );
  await RoutineGroup.updateOne(
    { userId, timeOfDay: "evening", startTime: { $in: [null, undefined] } },
    { $set: { startTime: "18:00" } }
  );
  await RoutineGroup.updateOne(
    { userId, name: "Afternoon Routine", startTime: { $in: [null, undefined] } },
    { $set: { startTime: "12:00", collapseAfter: "17:00" } }
  );

  await ensureVirtues();

  // Current virtue
  const virtueOrder = currentVirtueOrder(new Date());
  const virtueDoc = await VirtueModel.findOne({ order: virtueOrder, isActive: true }).lean();
  const currentVirtue = virtueDoc
    ? {
        _id: virtueDoc._id.toString(),
        name: virtueDoc.name,
        slug: virtueDoc.slug,
        tagline: virtueDoc.tagline,
        displayName: virtueDoc.displayName,
        order: virtueDoc.order,
        essay: virtueDoc.essay ?? "",
        etymology: virtueDoc.etymology ?? "",
      }
    : null;

  const isAdmin = skipAuth || session?.user?.email === ADMIN_EMAIL;

  const today = new Date().toISOString().split("T")[0];
  const weekDates = getWeekDates();

  const groups = await RoutineGroup.find({ userId }).sort({ order: 1 }).lean();

  const groupsWithItems = await Promise.all(
    groups.map(async (group) => {
      const items = await RoutineItem.find({
        groupId: group._id,
        userId,
        isActive: true,
      })
        .sort({ order: 1 })
        .lean();

      return {
        _id: group._id.toString(),
        name: group.name,
        timeOfDay: group.timeOfDay as "morning" | "evening" | "custom" | "habit",
        startTime: group.startTime ?? null,
        collapseAfter: group.collapseAfter ?? null,
        order: group.order,
        items: items.map((item) => ({
          _id: item._id.toString(),
          name: item.name,
          icon: item.icon,
          projectedMinutes: item.projectedMinutes,
          order: item.order,
          itemType: item.itemType,
        })),
      };
    })
  );

  // Today's logs for initial state
  const todayLogs = await RoutineLog.find({ userId, date: today }).lean();
  const initialLogs = todayLogs.map((l) => ({
    _id: l._id.toString(),
    routineItemId: l.routineItemId.toString(),
    date: l.date,
    actualMinutes: l.actualMinutes ?? undefined,
    state: l.state as "done" | "missed" | "rest",
  }));

  // 7-day streak logs
  const rawWeekLogs = await RoutineLog.find({
    userId,
    date: { $in: weekDates },
  }).lean();

  const weekLogs = rawWeekLogs.map((l) => ({
    routineItemId: l.routineItemId.toString(),
    date: l.date,
    state: l.state as "done" | "missed" | "rest",
  }));

  return (
    <RoutinesView
      groups={groupsWithItems}
      initialLogs={initialLogs}
      weekLogs={weekLogs}
      weekDates={weekDates}
      today={today}
      userName={userName}
      userImage={userImage}
      skipAuth={skipAuth}
      currentVirtue={currentVirtue}
      isAdmin={isAdmin}
      autoStartNext={!!searchParams?.startNext}
      autoAddHabit={!!searchParams?.addHabit}
    />
  );
}
