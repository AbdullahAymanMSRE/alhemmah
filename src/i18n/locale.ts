import { cookies } from "next/headers";
import type { Locale } from "@/i18n/routing";

export type { Locale };

const COOKIE = "TASKER_LOCALE";

/**
 * Persists the chosen UI locale to the cookie next-intl reads. The locale itself
 * now lives in the URL ([[i18n/routing]]); this keeps the saved preference in sync
 * when it is changed from Settings.
 */
export async function setUserLocale(locale: Locale): Promise<void> {
  (await cookies()).set(COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
