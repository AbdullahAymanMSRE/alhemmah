import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { siteUrl } from "@/lib/site";
import type { SiteLocale } from "@/lib/site";

/**
 * Public, indexable marketing page shown to logged-out visitors. Rendered for an
 * explicit locale (en at "/", ar at "/ar") so it works regardless of cookie. Carries
 * the keyword copy and JSON-LD that the auth-gated app cannot.
 */
export async function Landing({ locale }: { locale: SiteLocale }) {
  const t = await getTranslations({ locale, namespace: "landing" });
  const ta = await getTranslations({ locale, namespace: "app" });
  const year = 2026;

  const features = [
    { title: t("f1Title"), body: t("f1Body") },
    { title: t("f2Title"), body: t("f2Body") },
    { title: t("f3Title"), body: t("f3Body") },
    { title: t("f4Title"), body: t("f4Body") },
    { title: t("f5Title"), body: t("f5Body") },
    { title: t("f6Title"), body: t("f6Body") },
  ];
  const steps = [
    { title: t("step1Title"), body: t("step1Body") },
    { title: t("step2Title"), body: t("step2Body") },
    { title: t("step3Title"), body: t("step3Body") },
  ];
  const faqs = [
    { q: t("q1"), a: t("a1") },
    { q: t("q2"), a: t("a2") },
    { q: t("q3"), a: t("a3") },
    { q: t("q4"), a: t("a4") },
  ];

  const otherLocaleHref = locale === "ar" ? "/" : "/ar";

  // Structured data: WebSite + free WebApplication + FAQ. Helps rich results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: ta("name"),
        url: siteUrl,
        inLanguage: ["en", "ar"],
      },
      {
        "@type": "WebApplication",
        name: ta("name"),
        url: siteUrl,
        description: t("metaDescription"),
        applicationCategory: "ProductivityApplication",
        operatingSystem: "Web",
        inLanguage: ["en", "ar"],
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: features.map((f) => f.title),
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    // Direction is set explicitly from the page's own locale so the Arabic landing
    // renders RTL even if the document-level dir hasn't resolved yet.
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="min-h-dvh">
      <script
        type="application/ld+json"
        // JSON.stringify output is safe to inline here.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <span
            dir="rtl"
            className="font-[family-name:var(--font-logo)] text-3xl leading-none"
          >
            الهمّة
          </span>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href={otherLocaleHref}
              className="rounded-md px-3 py-1.5 text-muted transition-colors hover:text-foreground"
            >
              {t("langSwitch")}
            </Link>
            <Link
              href="/sign-in"
              className="rounded-md px-3 py-1.5 text-muted transition-colors hover:text-foreground"
            >
              {t("ctaSecondary")}
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md bg-accent px-3.5 py-1.5 font-medium text-accent-foreground transition-opacity hover:opacity-90"
            >
              {t("ctaPrimary")}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5">
        {/* Hero */}
        <section className="flex flex-col items-center py-20 text-center sm:py-28">
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
            {t("eyebrow")}
          </span>
          <h1 className="mt-6 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-lg text-muted">
            {t("heroSubtitle")}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="rounded-lg bg-accent px-6 py-3 font-medium text-accent-foreground transition-opacity hover:opacity-90"
            >
              {t("ctaPrimary")}
            </Link>
            <Link
              href="/sign-in"
              className="rounded-lg border border-border-strong px-6 py-3 font-medium text-foreground transition-colors hover:bg-surface"
            >
              {t("ctaSecondary")}
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="py-12">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            {t("featuresTitle")}
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-surface p-5"
              >
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="py-12">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            {t("howTitle")}
          </h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="rounded-xl border border-border bg-surface p-5"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong text-sm font-semibold text-accent">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="py-12">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            {t("faqTitle")}
          </h2>
          <div className="mx-auto mt-10 max-w-2xl divide-y divide-border rounded-xl border border-border bg-surface">
            {faqs.map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="cursor-pointer list-none font-medium">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="my-12 rounded-2xl border border-border bg-surface px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{t("ctaTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">{t("ctaBody")}</p>
          <Link
            href="/sign-up"
            className="mt-7 inline-block rounded-lg bg-accent px-6 py-3 font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            {t("ctaPrimary")}
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-5 py-8 text-sm text-faint sm:flex-row">
          <span>{t("footerRights", { year })}</span>
          <span className="auto-dir">{t("footerTagline")}</span>
        </div>
      </footer>
    </div>
  );
}
