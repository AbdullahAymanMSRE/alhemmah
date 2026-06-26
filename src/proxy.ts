import { NextResponse, type NextRequest } from "next/server";

/**
 * Sets `x-app-locale` on the request so the document (html lang/dir) and next-intl
 * resolve the right language. The public landing pages are locale-addressable for
 * SEO/hreflang — "/" is the canonical English page and "/ar" the Arabic one — so
 * their locale is forced by URL, not the cookie. Everywhere else (the auth-gated
 * app) keeps the per-user cookie locale.
 *
 * (Next.js 16 renamed the `middleware` file convention to `proxy`.)
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookie = req.cookies.get("TASKER_LOCALE")?.value;

  let locale: string;
  if (pathname === "/ar" || pathname.startsWith("/ar/")) locale = "ar";
  else if (pathname === "/") locale = "en";
  else locale = cookie ?? "en";
  if (locale !== "ar" && locale !== "en") locale = "en";

  const headers = new Headers(req.headers);
  headers.set("x-app-locale", locale);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Run on pages, not on static assets, image optimizer, or metadata files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|opengraph-image|twitter-image|manifest.webmanifest|robots.txt|sitemap.xml).*)",
  ],
};
