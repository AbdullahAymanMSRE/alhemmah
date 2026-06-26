/**
 * Canonical site config for SEO. The production origin comes from
 * NEXT_PUBLIC_SITE_URL (set per-deploy); falls back to the auth URL, then localhost.
 * Always an absolute origin with no trailing slash.
 */
const raw =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.BETTER_AUTH_URL ??
  "http://localhost:3000";

export const siteUrl = raw.replace(/\/+$/, "");

export const locales = ["en", "ar"] as const;
export type SiteLocale = (typeof locales)[number];
export const defaultLocale: SiteLocale = "en";

/** The public path for a marketing page in a given locale ("/" for en, "/ar" for ar). */
export function localePath(locale: SiteLocale): string {
  return locale === "ar" ? "/ar" : "/";
}

/** Absolute URL for a locale's landing page. */
export function localeUrl(locale: SiteLocale): string {
  return `${siteUrl}${locale === "ar" ? "/ar" : ""}` || siteUrl;
}

/**
 * hreflang map for the landing pages, including x-default. Use as
 * `alternates: { canonical, languages }` in route metadata.
 */
export function landingAlternates(current: SiteLocale) {
  return {
    canonical: localeUrl(current),
    languages: {
      en: `${siteUrl}/`,
      ar: `${siteUrl}/ar`,
      "x-default": `${siteUrl}/`,
    },
  };
}
