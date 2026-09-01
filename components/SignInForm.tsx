"use client";

import { useState, useTransition } from "react";
import { signInAction } from "@/lib/auth-actions";

export default function SignInForm({ redirectTo }: { redirectTo: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await signInAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <input
        type="email"
        name="email"
        placeholder="Email"
        autoComplete="email"
        required
        className="w-full bg-bg border border-border rounded-card px-3 py-2.5 font-body text-sm text-text placeholder:text-dim outline-none focus:border-olive"
      />
      <input
        type="password"
        name="password"
        placeholder="Password"
        autoComplete="current-password"
        required
        className="w-full bg-bg border border-border rounded-card px-3 py-2.5 font-body text-sm text-text placeholder:text-dim outline-none focus:border-olive"
      />
      {error && <p className="text-burgundy-light text-xs">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-olive text-bg py-3 rounded-card font-body font-medium text-sm hover:bg-olive-light transition-colors disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
