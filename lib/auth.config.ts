import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe config (no MongoDB adapter — the driver isn't Edge-compatible).
// Used directly by middleware; extended with the adapter in lib/auth.ts for
// route handlers and server components, which run in the Node runtime.
export default {
  providers: [Google],
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
