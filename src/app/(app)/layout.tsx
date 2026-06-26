import type { Metadata } from "next";
import { requireUserId } from "@/lib/session";
import { getSettings } from "@/server/queries";
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
