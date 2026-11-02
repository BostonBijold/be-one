import { NextResponse } from "next/server";
import WorkCategory from "@/models/work/WorkCategory";
import { readJsonBody, workRoute } from "@/lib/work/route";
import { assertLabelAvailable, isDuplicateKeyError, parseCategoryFields, serializeCategory } from "@/lib/work/categories";
import { WorkRequestError, isValidObjectId } from "@/lib/work/sessions";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

// PATCH /api/work/categories/:id — any of { label, color, isBreak,
// defaultDurationMin, archived }. Changes apply to new sessions: past and
// running sessions keep the label and break flag they were created with.
// Categories are only ever archived, never deleted.
export const PATCH = workRoute<Ctx>(async ({ req, userId, ctx }) => {
  const { id } = ctx.params;
  if (!isValidObjectId(id)) throw new WorkRequestError(404, "Category not found.");
  const fields = parseCategoryFields(await readJsonBody(req));

  const category = await WorkCategory.findOne({ _id: id, userId });
  if (!category) throw new WorkRequestError(404, "Category not found.");

  if (fields.label !== undefined && fields.label !== category.label) {
    await assertLabelAvailable(userId, fields.label, category._id);
  }

  category.set(fields);
  try {
    await category.save();
  } catch (err) {
    if (isDuplicateKeyError(err)) throw new WorkRequestError(409, `You already have a "${fields.label}" category.`);
    throw err;
  }
  return NextResponse.json(serializeCategory(category));
});
