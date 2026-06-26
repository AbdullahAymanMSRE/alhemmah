import { redirect } from "@/i18n/navigation";

// Tasks and Schedule were merged into one Plan page at /schedule (ADR 0002).
export default async function TasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  redirect({ href: "/schedule", locale: (await params).locale });
}
