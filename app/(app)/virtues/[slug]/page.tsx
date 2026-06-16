import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import VirtueModel from "@/models/Virtue";
import { ensureVirtues, currentVirtueOrder } from "@/lib/seed-virtues";
import VirtueDetailView from "@/components/VirtueDetailView";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "bostonrbijold@gmail.com";

export default async function VirtueDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const skipAuth = process.env.SKIP_AUTH === "true";
  const session = await auth();
  if (!skipAuth && !session?.user?.id) redirect("/login");

  await connectDB();
  await ensureVirtues();

  const virtue = await VirtueModel.findOne({ slug: params.slug, isActive: true }).lean();
  if (!virtue) notFound();

  const isAdmin = skipAuth || session?.user?.email === ADMIN_EMAIL;
  const thisWeekOrder = currentVirtueOrder(new Date());

  return (
    <VirtueDetailView
      virtue={{
        _id: virtue._id.toString(),
        name: virtue.name,
        slug: virtue.slug,
        tagline: virtue.tagline,
        displayName: virtue.displayName,
        order: virtue.order,
        essay: virtue.essay ?? "",
        etymology: virtue.etymology ?? "",
      }}
      isAdmin={isAdmin}
      thisWeekOrder={thisWeekOrder}
    />
  );
}
