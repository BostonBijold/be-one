"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

interface Props {
  hasPassword: boolean;
}

export default function DeleteAccountForm({ hasPassword }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = confirmText === "DELETE" && (!hasPassword || password.length > 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/user/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }
      await signOut({ callbackUrl: "/login?deleted=1" });
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full py-4 rounded-card border border-burgundy/30 text-burgundy-light font-mono text-sm hover:bg-burgundy/10 transition-colors min-h-[48px]"
      >
        Delete Account
      </button>
    );
  }

  return (
    <div className="bg-card rounded-card border border-burgundy/30 p-5 space-y-3">
      <p className="font-mono text-caption uppercase tracking-widest text-burgundy-light">
        Delete Account
      </p>
      <p className="font-body text-xs text-muted">
        This permanently deletes your account and everything tied to it —
        routines, logs, goals, todos, and virtue check-in history. This cannot
        be undone.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {hasPassword && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
            className="w-full bg-bg border border-border rounded-card px-3 py-2.5 font-body text-sm text-text placeholder:text-dim outline-none focus:border-burgundy-light"
          />
        )}
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder='Type "DELETE" to confirm'
          autoComplete="off"
          className="w-full bg-bg border border-border rounded-card px-3 py-2.5 font-body text-sm text-text placeholder:text-dim outline-none focus:border-burgundy-light"
        />
        {error && <p className="text-burgundy-light text-xs">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              setPassword("");
              setConfirmText("");
              setError(null);
            }}
            className="flex-1 py-3 rounded-card border border-border text-muted font-body text-sm hover:bg-card-hover transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="flex-1 py-3 rounded-card bg-burgundy text-text font-body font-medium text-sm hover:bg-burgundy-light transition-colors disabled:opacity-40"
          >
            {isSubmitting ? "Deleting…" : "Delete Account"}
          </button>
        </div>
      </form>
    </div>
  );
}
