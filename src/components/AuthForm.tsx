"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
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
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border-strong bg-surface text-sm font-medium transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            <GoogleIcon />
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

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.8591-3.0477.8591-2.344 0-4.3282-1.5831-5.0359-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.9641 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.9641 10.71z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9641 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
      />
    </svg>
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
