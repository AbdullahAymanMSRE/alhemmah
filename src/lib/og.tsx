import { ImageResponse } from "next/og";

// Shared 1200×630 social card. Dark, flat, no gradients — matches the app theme.
export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

export function renderOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "90px 100px",
          background: "#0b0c0e",
          color: "#e8eaed",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand mark + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 96,
              height: 96,
              borderRadius: 22,
              background: "#141619",
              border: "1px solid #282c33",
            }}
          >
            <svg width="60" height="60" viewBox="0 0 32 32" fill="none">
              <path
                d="M9 16.5l4.5 4.5L23 11"
                stroke="#6f8cff"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ fontSize: 68, fontWeight: 700, letterSpacing: -2 }}>
            Tasker
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 56,
            fontSize: 46,
            lineHeight: 1.25,
            color: "#969ca6",
            maxWidth: 900,
          }}
        >
          Your daily schedule, checked off and remembered.
        </div>

        {/* Accent underline */}
        <div
          style={{
            marginTop: 48,
            width: 120,
            height: 6,
            borderRadius: 3,
            background: "#6f8cff",
          }}
        />
      </div>
    ),
    ogSize,
  );
}
