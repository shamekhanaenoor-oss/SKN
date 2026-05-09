import { createFileRoute } from "@tanstack/react-router";
import ExpensesPage from "@/pages/ExpensesPage";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/expenses")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><ExpensesPage /></RequireAcademicYear></AppLayout></RequireAuth>;
}
