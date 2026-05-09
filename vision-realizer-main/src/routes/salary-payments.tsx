import { createFileRoute } from "@tanstack/react-router";
import SalaryPaymentsPage from "@/pages/SalaryPaymentsPage";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/salary-payments")({
  component: Page,
});

function Page() {
  return <RequireAuth><AppLayout><RequireAcademicYear><SalaryPaymentsPage /></RequireAcademicYear></AppLayout></RequireAuth>;
}
