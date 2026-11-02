import { Types } from "mongoose";
import WorkCategory, { WORK_CATEGORY_COLORS, type WorkCategoryColor } from "@/models/work/WorkCategory";
import { WorkRequestError, parseLabel } from "@/lib/work/sessions";

const MAX_TARGET_MINUTES = 24 * 60;

export interface CategoryFields {
  label?: string;
  color?: WorkCategoryColor | null;
  isBreak?: boolean;
  defaultDurationMin?: number | null;
  archived?: boolean;
}

// Reads whichever category fields the request includes, validating each.
export function parseCategoryFields(body: Record<string, unknown>): CategoryFields {
  const fields: CategoryFields = {};
  if (body.label !== undefined) fields.label = parseLabel(body.label);
  if (body.color !== undefined) {
    if (body.color !== null && !WORK_CATEGORY_COLORS.includes(body.color as WorkCategoryColor)) {
      throw new WorkRequestError(400, "Invalid color.");
    }
    fields.color = body.color as WorkCategoryColor | null;
  }
  if (body.isBreak !== undefined) {
    if (typeof body.isBreak !== "boolean") throw new WorkRequestError(400, "Invalid break setting.");
    fields.isBreak = body.isBreak;
  }
  if (body.defaultDurationMin !== undefined) {
    const target = body.defaultDurationMin;
    if (target !== null && (!Number.isInteger(target) || (target as number) < 1 || (target as number) > MAX_TARGET_MINUTES)) {
      throw new WorkRequestError(400, `Target must be a whole number of minutes, up to ${MAX_TARGET_MINUTES}.`);
    }
    fields.defaultDurationMin = target as number | null;
  }
  if (body.archived !== undefined) {
    if (typeof body.archived !== "boolean") throw new WorkRequestError(400, "Invalid archived setting.");
    fields.archived = body.archived;
  }
  return fields;
}

// Case-insensitive and includes archived categories, so "email" can't sit
// beside "Email" and a label freed by archiving comes back through Restore
// rather than as a duplicate.
export async function assertLabelAvailable(userId: string, label: string, excludeId?: Types.ObjectId) {
  const clash = await WorkCategory.findOne({
    userId,
    label,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  })
    .collation({ locale: "en", strength: 2 })
    .lean<{ label: string; archived: boolean }>();
  if (!clash) return;
  throw new WorkRequestError(
    409,
    clash.archived
      ? `"${clash.label}" is archived. Restore it instead.`
      : `You already have a "${clash.label}" category.`
  );
}

export function isDuplicateKeyError(err: unknown) {
  return (err as { code?: number }).code === 11000;
}

export function serializeCategory(c: {
  _id: unknown;
  label: string;
  color?: string | null;
  order: number;
  isBreak: boolean;
  defaultDurationMin?: number | null;
  archived?: boolean;
}) {
  return {
    _id: String(c._id),
    label: c.label,
    color: c.color ?? null,
    order: c.order,
    isBreak: c.isBreak,
    defaultDurationMin: c.defaultDurationMin ?? null,
    archived: c.archived ?? false,
  };
}
