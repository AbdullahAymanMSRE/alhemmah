import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getSession } from "@/lib/session";
import { getSettings } from "@/server/queries";
import { TodayRedirect } from "@/components/TodayRedirect";
import { Landing } from "@/components/Landing";
import { landingAlternates } from "@/lib/site";
import type { SiteLocale } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing" });
  return {
    title: { absolute: t("metaTitle") },
    description: t("metaDescription"),
    alternates: landingAlternates(locale as SiteLocale),
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: locale === "ar" ? "/ar" : "/",
      locale: locale === "ar" ? "ar_AR" : "en_US",
    },
  };
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Logged-in: bounce to today (client-computed local date) in the user's saved
  // language. Logged-out: the public landing for this URL's locale, the canonical,
  // indexable entry point.
  const session = await getSession();
  if (session?.user) {
    const settings = await getSettings(session.user.id);
    return (
      <TodayRedirect
        dayStartHour={settings.dayStartHour}
        locale={settings.language}
      />
    );
  }
  return <Landing locale={locale as SiteLocale} />;
}
