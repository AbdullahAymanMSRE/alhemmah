import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Personal, auth-gated areas and login forms, no value in crawling these.
      disallow: [
        "/day/",
        "/schedule",
        "/tasks",
        "/settings",
        "/sign-in",
        "/sign-up",
        "/api/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
