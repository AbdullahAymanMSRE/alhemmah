import { getRequestConfig } from "next-intl/server";
import { getUserLocale } from "./locale";

// App Router without i18n routing: the locale comes from a cookie, not the URL.
export default getRequestConfig(async () => {
  const locale = await getUserLocale();
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
