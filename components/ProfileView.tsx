"use client";

import { signOut } from "next-auth/react";
import Header from "@/components/Header";

interface Props {
  name: string;
  email: string;
  today: string;
  skipAuth: boolean;
}

export default function ProfileView({ name, email, today, skipAuth }: Props) {
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-mobile px-4 pb-28">
        <Header userName={name} today={today} skipAuth={skipAuth} />

        <div className="mt-4 space-y-4">
          {/* Identity card */}
          <div className="bg-card rounded-card border border-border p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-olive/20 flex items-center justify-center flex-shrink-0">
                <span className="font-mono text-olive text-xl font-bold">
                  {name[0]?.toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-heading text-lg text-text truncate">{name}</p>
                <p className="font-mono text-dim text-xs mt-0.5 truncate">{email}</p>
              </div>
            </div>
          </div>

          {/* Sign out */}
          {!skipAuth && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full py-4 rounded-card border border-burgundy/30 text-burgundy-light font-mono text-sm hover:bg-burgundy/10 transition-colors min-h-[48px]"
            >
              Sign out
            </button>
          )}

          {skipAuth && (
            <div className="px-4 py-3 rounded-card bg-tobacco/10 border border-tobacco/20">
              <p className="font-mono text-tobacco text-xs">
                Dev mode — auth is bypassed (SKIP_AUTH=true)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
