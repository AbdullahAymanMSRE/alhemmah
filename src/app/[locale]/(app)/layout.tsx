import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { requireUserId } from "@/lib/session";
import { ensureTemplateSeeded, getSettings } from "@/server/queries";
import type { Locale } from "@/i18n/routing";
import { Nav } from "@/components/Nav";

// The whole authenticated app is private, keep it out of search indexes.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await requireUserId();
  // Every authenticated page passes through here, so this is where a user who has
  // no Template gets the starter one. Cheap after the first call (a flag check).
  await ensureTemplateSeeded(userId, (await getLocale()) as Locale);
  const settings = await getSettings(userId);

  return (
    <div className="min-h-dvh">
      <Nav dayStartHour={settings.dayStartHour} />
      <main className="mx-auto w-full max-w-2xl px-4 py-6 transition-[max-width] has-[[data-wide]]:max-w-5xl">
        {children}
      </main>
    </div>
  );
}
