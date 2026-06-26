import { ogContentType, ogSize, renderOgImage } from "@/lib/og";

export const alt = "Tasker — your daily schedule, checked off and remembered.";
export const size = ogSize;
export const contentType = ogContentType;

export default function TwitterImage() {
  return renderOgImage();
}
