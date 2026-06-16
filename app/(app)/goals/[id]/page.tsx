import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import GoalModel, { serializeGoal } from "@/models/Goal";
import GoalDetailView from "@/components/GoalDetailView";

export const dynamic = "force-dynamic";

const DEV_USER_ID = "dev-local-user";

export default async function GoalDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const skipAuth = process.env.SKIP_AUTH === "true";
  const session = await auth();
  if (!skipAuth && !session?.user?.id) redirect("/login");

  const userId = session?.user?.id ?? (skipAuth ? DEV_USER_ID : null);
  if (!userId) redirect("/login");

  await connectDB();
  const goal = await GoalModel.findOne({ _id: params.id, userId }).lean().catch(() => null);
  if (!goal) notFound();

  const today = new Date().toISOString().split("T")[0];

  return (
    <GoalDetailView
      initialGoal={serializeGoal(goal)}
      today={today}
    />
  );
}
