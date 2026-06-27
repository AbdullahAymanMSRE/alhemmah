import { ogContentType, ogSize, renderOgImage } from "@/lib/og";
import { routing } from "@/i18n/routing";

export const alt = "Alhemmah: your daily schedule, checked off and remembered.";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return renderOgImage(locale);
}
