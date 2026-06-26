import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";

/** Returns the current session (or null). Server-only. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Returns the authenticated user id, or redirects to /sign-in.
 * Every data query is scoped by this id, see docs/adr/0001.
 */
export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (session?.user) return session.user.id;
  // `redirect` throws (NEXT_REDIRECT) at runtime; the `throw` just satisfies the
  // type checker that this branch never returns.
  throw redirect({ href: "/sign-in", locale: await getLocale() });
}
