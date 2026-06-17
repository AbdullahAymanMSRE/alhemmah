import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isGoogleConfigured } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export default async function SignUpPage() {
  const session = await getSession();
  if (session?.user) redirect("/");
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <AuthForm mode="sign-up" googleEnabled={isGoogleConfigured} />
    </main>
  );
}
