import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { convertArabic } from "arabic-reshaper";

// Shared 1200×630 social card. Dark, flat, no gradients, matches the app theme.
export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

// satori (next/og) can't render Arabic with the built-in font and doesn't accept
// woff2, so we fetch woff faces: Aref Ruqaa for the calligraphic الهمّة logo and
// Cairo (latin + arabic) for the tagline in either language. Fetched once and
// memoised across renders.
const FONT_URLS = [
  "https://cdn.jsdelivr.net/npm/@fontsource/aref-ruqaa@5/files/aref-ruqaa-arabic-700-normal.woff",
  "https://cdn.jsdelivr.net/npm/@fontsource/cairo@5/files/cairo-latin-600-normal.woff",
  "https://cdn.jsdelivr.net/npm/@fontsource/cairo@5/files/cairo-arabic-600-normal.woff",
];

/**
 * Lay out an Arabic string for satori: greedily wrap words into lines (logical,
 * top-to-bottom order) of at most `maxChars`, reshape each line into joined
 * presentation forms, then reverse it so it reads right-to-left when satori draws
 * it left-to-right. Returns one display-ready string per line.
 */
function arabicLines(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.map((line) => [...convertArabic(line)].reverse().join(""));
}

let fontsPromise: Promise<ArrayBuffer[]> | null = null;
function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all(
      FONT_URLS.map((url) => fetch(url).then((res) => res.arrayBuffer())),
    );
  }
  return fontsPromise;
}

/** Locale-aware social card: same design in both languages, tagline translated. */
export async function renderOgImage(locale: string) {
  const t = await getTranslations({ locale, namespace: "app" });
  const [arefRuqaa, cairoLatin, cairoArabic] = await loadFonts();
  const isArabic = locale === "ar";

  // satori doesn't apply Arabic contextual joining, so letters render disconnected.
  // Reshape the Arabic tagline into pre-joined presentation forms. The logo stays
  // raw: the calligraphic Aref Ruqaa face crashes satori's GSUB parser on the
  // reshaped forms, and renders الهمّة acceptably without reshaping.
  const logo = "الهمّة";
  // Arabic needs manual layout (see helpers below): satori neither joins nor
  // bidi-orders Arabic, and it would wrap a naively-reversed string into the wrong
  // line order. So we wrap into logical-order lines and reverse each one. English
  // is a single string that wraps naturally.
  const taglineLines = isArabic ? arabicLines(t("tagline"), 26) : [t("tagline")];

  return new ImageResponse(
    (
      <div
        dir={isArabic ? "rtl" : "ltr"}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "90px 100px",
          background: "#0b0c0e",
          color: "#e8eaed",
          fontFamily: "Cairo",
        }}
      >
        {/* Brand mark + calligraphic الهمّة logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 104,
              height: 104,
              borderRadius: 24,
              background: "#141619",
              border: "1px solid #282c33",
            }}
          >
            <svg width="64" height="64" viewBox="0 0 32 32" fill="none">
              <path
                d="M9 16.5l4.5 4.5L23 11"
                stroke="#6f8cff"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div
            style={{
              fontFamily: "Aref Ruqaa",
              fontSize: 110,
              lineHeight: 1,
              paddingBottom: 22,
            }}
          >
            {logo}
          </div>
        </div>

        {/* Tagline (translated) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: isArabic ? "flex-end" : "flex-start",
            marginTop: 54,
            fontSize: 50,
            lineHeight: 1.35,
            color: "#969ca6",
            maxWidth: 960,
          }}
        >
          {taglineLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>

        {/* Accent underline */}
        <div
          style={{
            marginTop: 50,
            width: 128,
            height: 6,
            borderRadius: 3,
            background: "#6f8cff",
          }}
        />
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Aref Ruqaa", data: arefRuqaa, weight: 700, style: "normal" },
        // Two Cairo faces under one family: satori falls back across them per glyph,
        // covering Latin (English tagline) and Arabic (Arabic tagline).
        { name: "Cairo", data: cairoLatin, weight: 600, style: "normal" },
        { name: "Cairo", data: cairoArabic, weight: 600, style: "normal" },
      ],
    },
  );
}
