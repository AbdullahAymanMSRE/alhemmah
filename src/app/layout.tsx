import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { Aref_Ruqaa, Cairo } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { siteUrl } from "@/lib/site";
import "./globals.css";

// Calligraphic Arabic display face, used only for the الهمّة wordmark/logo.
const logoFont = Aref_Ruqaa({
  subsets: ["arabic"],
  weight: "700",
  variable: "--font-logo",
  display: "swap",
});

// Cairo is the single UI font for both Latin and Arabic, it covers both scripts
// well, which sidesteps the cross-font fallback problem entirely.
const uiFont = Cairo({
  subsets: ["latin", "arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-base",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("app");
  const name = t("name");
  const description = t("description");

  const keywords =
    locale === "ar"
      ? [
          "جدول يومي",
          "متتبع الروتين اليومي",
          "تنظيم الوقت",
          "مخطط المهام اليومية",
          "مؤقت المهام",
          "روتين يومي",
          "تطبيق إنتاجية",
        ]
      : [
          "daily schedule tracker",
          "daily routine tracker",
          "routine planner",
          "time blocking app",
          "daily planner",
          "task timer",
          "productivity app",
          "bilingual schedule",
        ];

  return {
    metadataBase: new URL(siteUrl),
    applicationName: name,
    title: {
      default: name,
      template: `%s · ${name}`,
    },
    description,
    keywords,
    alternates: {
      languages: {
        en: "/",
        ar: "/ar",
        "x-default": "/",
      },
    },
    openGraph: {
      type: "website",
      siteName: name,
      title: name,
      description,
      url: "/",
      locale: locale === "ar" ? "ar_AR" : "en_US",
      alternateLocale: locale === "ar" ? "en_US" : "ar_AR",
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0c0e",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${uiFont.variable} ${GeistMono.variable} ${logoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
