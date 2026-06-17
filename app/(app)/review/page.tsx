import { redirect } from "next/navigation";

export default function ReviewRedirect({
  searchParams,
}: {
  searchParams?: { mode?: string; date?: string; return?: string };
}) {
  const params = new URLSearchParams();
  if (searchParams?.mode) params.set("mode", searchParams.mode);
  if (searchParams?.date) params.set("date", searchParams.date);
  if (searchParams?.return) params.set("return", searchParams.return);
  const qs = params.toString();
  redirect(`/virtues${qs ? `?${qs}` : ""}`);
}
