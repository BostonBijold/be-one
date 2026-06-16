import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import RoutineItem from "@/models/RoutineItem";
import VirtueModel from "@/models/Virtue";
import VirtueCheckIn from "@/models/VirtueCheckIn";
import { ensureVirtues, currentVirtueOrder } from "@/lib/seed-virtues";
import ReviewView from "@/components/ReviewView";

export const dynamic = "force-dynamic";

const DEV_USER_ID = "dev-local-user";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams?: { mode?: string; date?: string; return?: string };
}) {
  const skipAuth = process.env.SKIP_AUTH === "true";
  const session = await auth();
  if (!skipAuth && !session?.user?.id) redirect("/login");

  const userId = session?.user?.id ?? (skipAuth ? DEV_USER_ID : null);
  if (!userId) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  await connectDB();
  await ensureVirtues();

  const virtueOrder = currentVirtueOrder(new Date());
  const virtueDoc = await VirtueModel.findOne({ order: virtueOrder, isActive: true }).lean();
  const currentVirtue = virtueDoc
    ? {
        name: virtueDoc.name,
        displayName: virtueDoc.displayName,
        tagline: virtueDoc.tagline,
        order: virtueDoc.order,
        slug: virtueDoc.slug,
      }
    : null;

  const [checkinItem, weeklyReviewItem, todayCheckIn] = await Promise.all([
    RoutineItem.findOne({ userId, itemType: "virtue_checkin" }).lean(),
    RoutineItem.findOne({ userId, itemType: "weekly_review" }).lean(),
    VirtueCheckIn.findOne({ userId, date: today }).lean(),
  ]);

  const mode = searchParams?.mode === "checkin" || searchParams?.mode === "weekly"
    ? searchParams.mode
    : null;

  return (
    <ReviewView
      userName={session?.user?.name ?? "Developer"}
      userImage={session?.user?.image ?? null}
      today={today}
      skipAuth={skipAuth ?? false}
      currentVirtue={currentVirtue}
      checkinItemId={checkinItem ? checkinItem._id.toString() : null}
      weeklyReviewItemId={weeklyReviewItem ? weeklyReviewItem._id.toString() : null}
      initialMode={mode}
      initialDate={searchParams?.date ?? null}
      returnTo={searchParams?.return ?? null}
      hasCheckedInToday={!!todayCheckIn}
    />
  );
}
