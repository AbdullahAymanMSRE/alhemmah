import { getSession } from "@/lib/session";
import { isGoogleConfigured } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { redirect } from "@/i18n/navigation";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await getSession();
  if (session?.user) redirect({ href: "/", locale: (await params).locale });
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <AuthForm mode="sign-up" googleEnabled={isGoogleConfigured} />
    </main>
  );
}
