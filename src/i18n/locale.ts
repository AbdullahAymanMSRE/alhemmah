import { cookies } from "next/headers";

export type Locale = "en" | "ar";

const COOKIE = "TASKER_LOCALE";
export const defaultLocale: Locale = "en";

/** Reads the UI locale from the cookie (no URL prefix; per-user preference). */
export async function getUserLocale(): Promise<Locale> {
  const value = (await cookies()).get(COOKIE)?.value;
  return value === "ar" || value === "en" ? value : defaultLocale;
}

/** Persists the chosen UI locale to the cookie. */
export async function setUserLocale(locale: Locale): Promise<void> {
  (await cookies()).set(COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
