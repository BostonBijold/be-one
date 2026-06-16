import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AnalyticsView from "@/components/AnalyticsView";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const skipAuth = process.env.SKIP_AUTH === "true";
  const session = await auth();
  if (!skipAuth && !session?.user?.id) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  return (
    <AnalyticsView
      userName={session?.user?.name ?? "Developer"}
      today={today}
      skipAuth={skipAuth}
    />
  );
}
