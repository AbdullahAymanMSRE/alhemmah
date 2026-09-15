import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("app");

  return {
    name: t("name"),
    short_name: t("name"),
    description: t("description"),
    start_url: "/",
    display: "standalone",
    background_color: "#0b0c0e",
    theme_color: "#0b0c0e",
    icons: [
      { src: "/icon.png", type: "image/png", sizes: "96x96" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
