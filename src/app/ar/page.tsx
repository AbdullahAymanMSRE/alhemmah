import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { getSettings } from "@/server/queries";
import { TodayRedirect } from "@/components/TodayRedirect";
import { Landing } from "@/components/Landing";
import { landingAlternates } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: "ar", namespace: "landing" });
  return {
    title: { absolute: t("metaTitle") },
    description: t("metaDescription"),
    alternates: landingAlternates("ar"),
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: "/ar",
      locale: "ar_AR",
    },
  };
}

export default async function ArabicHome() {
  const session = await getSession();
  if (session?.user) {
    const settings = await getSettings(session.user.id);
    return <TodayRedirect dayStartHour={settings.dayStartHour} />;
  }
  return <Landing locale="ar" />;
}
