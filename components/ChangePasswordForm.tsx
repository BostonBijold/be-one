"use client";

import { useState } from "react";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="Current password"
        autoComplete="current-password"
        required
        className="w-full bg-bg border border-border rounded-card px-3 py-2.5 font-body text-sm text-text placeholder:text-dim outline-none focus:border-olive"
      />
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New password (min 8 characters)"
        autoComplete="new-password"
        minLength={8}
        required
        className="w-full bg-bg border border-border rounded-card px-3 py-2.5 font-body text-sm text-text placeholder:text-dim outline-none focus:border-olive"
      />
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm new password"
        autoComplete="new-password"
        minLength={8}
        required
        className="w-full bg-bg border border-border rounded-card px-3 py-2.5 font-body text-sm text-text placeholder:text-dim outline-none focus:border-olive"
      />
      {error && <p className="text-burgundy-light text-xs">{error}</p>}
      {success && <p className="text-olive-light text-xs">Password updated.</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 rounded-card bg-olive text-bg font-body font-medium text-sm hover:bg-olive-light transition-colors disabled:opacity-60"
      >
        {isSubmitting ? "Updating…" : "Update Password"}
      </button>
    </form>
  );
}
