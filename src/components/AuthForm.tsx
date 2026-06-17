"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

export function AuthForm({
  mode,
  googleEnabled,
}: {
  mode: Mode;
  googleEnabled: boolean;
}) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result =
        mode === "sign-up"
          ? await authClient.signUp.email({ name, email, password })
          : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(
          mode === "sign-in" ? t("invalidCredentials") : t("errorGeneric"),
        );
        setPending(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError(t("errorGeneric"));
      setPending(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setPending(true);
    await authClient.signIn.social({ provider: "google", callbackURL: "/" });
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-6 text-xl font-semibold">
        {mode === "sign-in" ? t("signInTitle") : t("signUpTitle")}
      </h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {mode === "sign-up" && (
          <Field
            label={t("name")}
            value={name}
            onChange={setName}
            type="text"
            autoComplete="name"
            required
          />
        )}
        <Field
          label={t("email")}
          value={email}
          onChange={setEmail}
          type="email"
          autoComplete="email"
          required
        />
        <Field
          label={t("password")}
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          required
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 h-10 rounded-md bg-accent text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending
            ? mode === "sign-in"
              ? t("signingIn")
              : t("signingUp")
            : mode === "sign-in"
              ? t("signIn")
              : t("signUp")}
        </button>
      </form>

      {googleEnabled && (
        <>
          <div className="my-4 flex items-center gap-3 text-xs text-faint">
            <span className="h-px flex-1 bg-border" />
            {t("or")}
            <span className="h-px flex-1 bg-border" />
          </div>
          <button
            onClick={onGoogle}
            disabled={pending}
            className="h-10 w-full rounded-md border border-border-strong bg-surface text-sm font-medium transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            {t("continueWithGoogle")}
          </button>
        </>
      )}

      <p className="mt-6 text-sm text-muted">
        {mode === "sign-in" ? t("noAccount") : t("haveAccount")}{" "}
        <Link
          href={mode === "sign-in" ? "/sign-up" : "/sign-in"}
          className="text-accent hover:underline"
        >
          {mode === "sign-in" ? t("signUp") : t("signIn")}
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  autoComplete,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <input
        className="h-10 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-border-strong"
        type={type}
        value={value}
        autoComplete={autoComplete}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
