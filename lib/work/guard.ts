import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

const DEV_USER_ID = "dev-local-user";

// The only access check for /work and the only place that knows about
// dev-local-user. Changing who can use /work is an edit to this one function.
// Must not exit early on a null session: SKIP_AUTH has none, and isAdmin is
// what lets it through.
export async function requireWorkUser(): Promise<{ userId: string } | null> {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) return null;
  const userId = session?.user?.id ?? (process.env.SKIP_AUTH === "true" ? DEV_USER_ID : null);
  return userId ? { userId } : null;
}

export function workNotFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
