import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Only the public, indexable landing pages. The auth-gated app is intentionally
// excluded. Each entry lists its hreflang alternates.
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = { en: `${siteUrl}/`, ar: `${siteUrl}/ar` };
  return [
    {
      url: `${siteUrl}/`,
      changeFrequency: "monthly",
      priority: 1,
      alternates: { languages },
    },
    {
      url: `${siteUrl}/ar`,
      changeFrequency: "monthly",
      priority: 0.9,
      alternates: { languages },
    },
  ];
}
