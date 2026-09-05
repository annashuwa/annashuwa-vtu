import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "ans_session";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/airtime",
  "/airtime-cash",
  "/data",
  "/electricity",
  "/cable",
  "/exam-pins",
  "/wallet",
  "/transactions",
  "/receipt",
  "/profile",
];

const ADMIN_PREFIXES = ["/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const needsAdmin = ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // Presence-only gate. Authoritative session checks (Express-backed) run in layouts.
  if ((needsAuth || needsAdmin) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if ((pathname === "/login" || pathname === "/register") && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/airtime/:path*",
    "/airtime-cash/:path*",
    "/data/:path*",
    "/electricity/:path*",
    "/cable/:path*",
    "/exam-pins/:path*",
    "/wallet/:path*",
    "/transactions/:path*",
    "/receipt/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};