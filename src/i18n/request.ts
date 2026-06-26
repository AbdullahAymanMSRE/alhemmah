import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";
import { getUserLocale } from "./locale";

// Locale resolution: the middleware sets `x-app-locale` (URL-forced on the public
// landing pages for SEO, cookie-based in the app). Fall back to the cookie directly
// in case the middleware didn't run for this request.
export default getRequestConfig(async () => {
  const header = (await headers()).get("x-app-locale");
  const locale =
    header === "ar" || header === "en" ? header : await getUserLocale();
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
