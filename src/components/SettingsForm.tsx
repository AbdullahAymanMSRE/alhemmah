"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { updateSettings } from "@/server/actions";
import type { Locale } from "@/i18n/locale";

export function SettingsForm({
  language,
  dayStartHour,
  email,
}: {
  language: Locale;
  dayStartHour: number;
  email: string;
}) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [, start] = useTransition();

  function setLanguage(lang: Locale) {
    start(async () => {
      await updateSettings({ language: lang });
      router.refresh();
    });
  }
  function setDayStart(hour: number) {
    start(async () => {
      await updateSettings({ dayStartHour: hour });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">{t("title")}</h1>

      <section className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t("language")}</span>
        <div className="flex gap-2">
          <Toggle active={language === "en"} onClick={() => setLanguage("en")}>
            {t("english")}
          </Toggle>
          <Toggle active={language === "ar"} onClick={() => setLanguage("ar")}>
            {t("arabic")}
          </Toggle>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t("dayStart")}</span>
        <select
          value={dayStartHour}
          onChange={(e) => setDayStart(Number(e.target.value))}
          className="h-10 w-32 rounded-md border border-border bg-surface px-3 text-sm tabular-nums outline-none focus:border-border-strong"
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
        </select>
        <p className="text-xs text-faint">{t("dayStartHint")}</p>
      </section>

      <section className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t("account")}</span>
        <span className="auto-dir text-sm text-muted">{email}</span>
      </section>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-md border px-4 py-2 text-sm transition-colors " +
        (active
          ? "border-border-strong bg-surface-2 text-foreground"
          : "border-border text-muted hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}
