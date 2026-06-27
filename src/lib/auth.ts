import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/db";

const googleConfigured =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

// Where the app is served. better-auth derives its base URL from this and rejects
// any request whose Origin is not trusted ("Invalid origin"). We list both the
// apex and www host so a www/apex mismatch (or a redirect between them) can't 403.
const baseURL =
  process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL;

const trustedOrigins = [
  "http://localhost:3000",
  "https://alhemmah.com",
  "https://www.alhemmah.com",
];

export const auth = betterAuth({
  baseURL,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  // Google is only registered when credentials are present, so the app runs
  // with email/password alone until Google OAuth is configured.
  socialProviders: googleConfigured
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : {},
  // nextCookies must be the last plugin so it can set cookies on server actions.
  plugins: [nextCookies()],
});

export const isGoogleConfigured = googleConfigured;
