import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * next-intl's locale routing. Reads the locale from the URL prefix ("/ar/…") or
 * defaults to English (unprefixed), keeps the locale cookie in sync, and rewrites
 * unprefixed paths to the internal `[locale]` segment.
 *
 * (Next.js 16 renamed the `middleware` file convention to `proxy`.)
 */
export const proxy = createMiddleware(routing);

export const config = {
  // Run on pages, not on API routes, Next internals, static assets, or metadata files.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon|opengraph-image|twitter-image|manifest.webmanifest|robots.txt|sitemap.xml).*)",
  ],
};
