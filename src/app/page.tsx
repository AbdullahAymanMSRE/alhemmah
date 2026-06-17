import { requireUserId } from "@/lib/session";
import { getSettings } from "@/server/queries";
import { TodayRedirect } from "@/components/TodayRedirect";

export default async function Home() {
  const userId = await requireUserId();
  const settings = await getSettings(userId);
  return <TodayRedirect dayStartHour={settings.dayStartHour} />;
}
