import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Returns the current session (or null). Server-only. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Returns the authenticated user id, or redirects to /sign-in.
 * Every data query is scoped by this id — see docs/adr/0001.
 */
export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.user) {
    redirect("/sign-in");
  }
  return session.user.id;
}
