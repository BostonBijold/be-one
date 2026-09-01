import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

// Edge-safe auth instance (no MongoDB adapter) — middleware runs on the Edge runtime.
const { auth } = NextAuth(authConfig);

const PUBLIC_PAGE_PATHS = new Set(["/login", "/signup"]);

// Pages that must stay reachable regardless of auth state — no redirect
// either way. Unlike PUBLIC_PAGE_PATHS (login/signup), a signed-in user
// isn't bounced off these into /routines, since e.g. the privacy policy
// needs to work identically for a logged-out App Store reviewer and a
// logged-in user checking it from within the app.
const ALWAYS_ACCESSIBLE_PATHS = new Set(["/privacy"]);

export default auth((req) => {
  // Local dev escape hatch — lets you work without Google OAuth creds configured.
  // Never set SKIP_AUTH in the Vercel production environment.
  if (process.env.SKIP_AUTH === "true") return;

  const { pathname } = req.nextUrl;
  if (ALWAYS_ACCESSIBLE_PATHS.has(pathname)) return;

  const isLoggedIn = !!req.auth;
  const isApiRoute = pathname.startsWith("/api");
  const isPublicPage = PUBLIC_PAGE_PATHS.has(pathname);

  console.log(`[middleware] ${pathname} — isLoggedIn:${isLoggedIn} isPublicPage:${isPublicPage} isApiRoute:${isApiRoute} token:`, JSON.stringify(req.auth));

  if (isLoggedIn && isPublicPage) {
    return Response.redirect(new URL("/routines", req.nextUrl.origin));
  }

  if (!isLoggedIn && !isPublicPage) {
    if (isApiRoute) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  // Run on everything except static assets, images, PWA files, NextAuth's own
  // callback/session endpoints, and the external API (those must stay
  // reachable without a session — api/auth to establish one, api/external
  // because it's authenticated by its own API key instead and is called by
  // things like a Shortcuts App Intent that never has a session cookie to
  // send — see docs/features/app-intents.md).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/external|manifest\\.json|sw\\.js|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
