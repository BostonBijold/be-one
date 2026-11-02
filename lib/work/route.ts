import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireWorkUser, workNotFound } from "@/lib/work/guard";
import { WorkRequestError } from "@/lib/work/sessions";

// Shared wrapper for every /api/work handler: access check, DB connection, and
// turning WorkRequestError into the app's usual { error } response.
export function workRoute<Ctx = unknown>(
  handler: (args: { req: NextRequest; userId: string; ctx: Ctx }) => Promise<Response>
) {
  return async (req: NextRequest, ctx: Ctx) => {
    const user = await requireWorkUser();
    if (!user) return workNotFound();
    try {
      await connectDB();
      return await handler({ req, userId: user.userId, ctx });
    } catch (err) {
      if (err instanceof WorkRequestError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }
  };
}

export async function readJsonBody(req: NextRequest): Promise<Record<string, unknown>> {
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new WorkRequestError(400, "Invalid request body.");
  }
  return body as Record<string, unknown>;
}
