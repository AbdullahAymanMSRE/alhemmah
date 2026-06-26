import { defineRouting } from "next-intl/routing";

/**
 * Locale lives in the URL: English is unprefixed (canonical "/", "/day/…") and
 * Arabic is prefixed ("/ar", "/ar/day/…"). `localeDetection` is off so "/" always
 * serves English (stable canonical for SEO); the locale only changes when a link or
 * router call explicitly carries it. The cookie keeps the per-user preference in
 * sync (written from Settings, see [[server/actions]]).
 */
export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: { name: "TASKER_LOCALE", maxAge: 60 * 60 * 24 * 365 },
});

export type Locale = (typeof routing.locales)[number];
