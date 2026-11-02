import { NextResponse } from "next/server";
import WorkCategory from "@/models/work/WorkCategory";
import { readJsonBody, workRoute } from "@/lib/work/route";
import { assertLabelAvailable, isDuplicateKeyError, parseCategoryFields, serializeCategory } from "@/lib/work/categories";
import { seedWorkCategories } from "@/lib/work/seed";
import { WorkRequestError } from "@/lib/work/sessions";

export const dynamic = "force-dynamic";

// GET /api/work/categories[?includeArchived=true] — lazily seeds the defaults
// for a user with none. Archived rows count, so archiving everything doesn't
// bring the defaults back.
export const GET = workRoute(async ({ req, userId }) => {
  if ((await WorkCategory.countDocuments({ userId })) === 0) {
    await seedWorkCategories(userId);
  }
  const includeArchived = req.nextUrl.searchParams.get("includeArchived") === "true";
  const categories = await WorkCategory.find({ userId, ...(includeArchived ? {} : { archived: false }) })
    .sort({ order: 1 })
    .lean<Array<Parameters<typeof serializeCategory>[0]>>();
  return NextResponse.json(categories.map(serializeCategory));
});

// POST /api/work/categories — { label, color?, isBreak?, defaultDurationMin? }.
// New categories go after everything else, including archived ones, so
// restoring one puts it back where it was.
export const POST = workRoute(async ({ req, userId }) => {
  const body = await readJsonBody(req);
  const fields = parseCategoryFields({ ...body, archived: undefined, label: body.label ?? "" });
  await assertLabelAvailable(userId, fields.label!);

  await WorkCategory.init();
  const last = await WorkCategory.findOne({ userId }).sort({ order: -1 }).lean<{ order: number }>();
  try {
    const category = await WorkCategory.create({ userId, ...fields, order: (last?.order ?? -1) + 1 });
    return NextResponse.json(serializeCategory(category), { status: 201 });
  } catch (err) {
    if (isDuplicateKeyError(err)) throw new WorkRequestError(409, `You already have a "${fields.label}" category.`);
    throw err;
  }
});
