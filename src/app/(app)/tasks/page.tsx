import { redirect } from "next/navigation";

// Tasks and Schedule were merged into one Plan page at /schedule (ADR 0002).
export default function TasksPage() {
  redirect("/schedule");
}
