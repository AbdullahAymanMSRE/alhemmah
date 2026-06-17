import { getSession, requireUserId } from "@/lib/session";
import { getSettings } from "@/server/queries";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const [settings, session] = await Promise.all([getSettings(userId), getSession()]);

  return (
    <SettingsForm
      language={settings.language}
      dayStartHour={settings.dayStartHour}
      email={session?.user.email ?? ""}
    />
  );
}
