import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

// Edge-safe auth instance (no MongoDB adapter) — middleware runs on the Edge runtime.
const { auth } = NextAuth(authConfig);

const PUBLIC_PAGE_PATHS = new Set(["/login"]);

export default auth((req) => {
  // Local dev escape hatch — lets you work without Google OAuth creds configured.
  // Never set SKIP_AUTH in the Vercel production environment.
  if (process.env.SKIP_AUTH === "true") return;

  const { pathname } = req.nextUrl;
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
    return Response.redirect(new URL("/login", req.nextUrl.origin));
  }
});

export const config = {
  // Run on everything except static assets, images, PWA files, and NextAuth's
  // own callback/session endpoints (those must stay reachable to complete sign-in).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|manifest\\.json|sw\\.js|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
