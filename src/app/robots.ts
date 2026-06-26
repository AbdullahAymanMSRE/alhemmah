import type { MetadataRoute } from "next";

const siteUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Personal, auth-gated areas — no value in crawling these.
      disallow: ["/day/", "/schedule", "/tasks", "/settings", "/api/"],
    },
    host: siteUrl,
  };
}
