import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SignUpForm from "@/components/SignUpForm";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const session = await auth();
  const destination = searchParams.callbackUrl || "/welcome";
  if (session) redirect(destination);

  return (
    <main className="min-h-dvh bg-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-mobile">
        <div className="mb-10">
          <h1 className="font-heading text-5xl text-text leading-tight mb-3">
            A Good Man
          </h1>
          <p className="text-muted font-body text-base">
            Create your account.
          </p>
        </div>

        <SignUpForm redirectTo={destination} />

        <p className="text-muted text-xs text-center mt-8">
          Already have an account?{" "}
          <Link href={`/login?callbackUrl=${encodeURIComponent(destination)}`} className="text-gold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
