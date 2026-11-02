import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireWorkUser } from "@/lib/work/guard";

export const metadata: Metadata = { title: "Work" };

export default async function WorkLayout({ children }: { children: React.ReactNode }) {
  if (!(await requireWorkUser())) notFound();

  // Own scroll container: globals.css fixes body with overflow hidden, and the
  // one the rest of the app scrolls in belongs to app/(app)/layout.tsx.
  // color-scheme gives native controls and scrollbars their dark versions.
  return <div className="h-full overflow-y-auto overscroll-none [color-scheme:dark]">{children}</div>;
}
