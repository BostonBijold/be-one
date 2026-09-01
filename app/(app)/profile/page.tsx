import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import User from "@/models/User";
import ProfileView from "@/components/ProfileView";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const skipAuth = process.env.SKIP_AUTH === "true";
  const session = await auth();
  if (!skipAuth && !session?.user?.id) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  let hasPassword = false;
  if (session?.user?.id) {
    await connectDB();
    const user = await User.findById(session.user.id).select("passwordHash").lean();
    hasPassword = !!user?.passwordHash;
  }

  return (
    <ProfileView
      name={session?.user?.name ?? "Developer"}
      email={session?.user?.email ?? "dev@local"}
      today={today}
      skipAuth={skipAuth ?? false}
      hasPassword={hasPassword}
    />
  );
}
