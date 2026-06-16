import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import GoalsView from "@/components/GoalsView";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const skipAuth = process.env.SKIP_AUTH === "true";
  const session = await auth();
  if (!skipAuth && !session?.user?.id) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  return (
    <GoalsView
      userName={session?.user?.name ?? "Developer"}
      today={today}
      skipAuth={skipAuth}
    />
  );
}
