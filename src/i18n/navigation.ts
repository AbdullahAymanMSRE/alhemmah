import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation. These wrappers carry the active locale through the URL,
 * so following a link keeps the user in their current language instead of falling
 * back to the default. Always import Link / useRouter / usePathname / redirect from
 * here, never from `next/link` or `next/navigation`.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
