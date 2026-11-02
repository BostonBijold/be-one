import { NextResponse } from "next/server";
import WorkCategory from "@/models/work/WorkCategory";
import { workRoute } from "@/lib/work/route";
import { seedWorkCategories } from "@/lib/work/seed";

export const dynamic = "force-dynamic";

// GET /api/work/categories — lazily seeds the defaults for a user with none.
export const GET = workRoute(async ({ userId }) => {
  if ((await WorkCategory.countDocuments({ userId })) === 0) {
    await seedWorkCategories(userId);
  }
  const categories = await WorkCategory.find({ userId, archived: false }).sort({ order: 1 }).lean<
    Array<{
      _id: unknown;
      label: string;
      color: string | null;
      order: number;
      isBreak: boolean;
      defaultDurationMin: number | null;
    }>
  >();
  return NextResponse.json(
    categories.map((c) => ({
      _id: String(c._id),
      label: c.label,
      color: c.color,
      order: c.order,
      isBreak: c.isBreak,
      defaultDurationMin: c.defaultDurationMin ?? null,
    }))
  );
});
